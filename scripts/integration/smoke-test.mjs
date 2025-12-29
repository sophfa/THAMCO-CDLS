const loansBase = process.env.LOANS_API_URL;
const inventoryBase = process.env.INVENTORY_API_URL;

const missing = [];
if (!loansBase) missing.push("LOANS_API_URL");
if (!inventoryBase) missing.push("INVENTORY_API_URL");

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const joinUrl = (base, path) => {
  const trimmedBase = base.replace(/\/$/, "");
  const trimmedPath = path.replace(/^\//, "");
  return `${trimmedBase}/${trimmedPath}`;
};

async function requestJson(url, label) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    console.error(`${label} returned non-JSON response.`);
    console.error(text.slice(0, 300));
    process.exit(1);
  }
  return { ok: response.ok, status: response.status, body };
}

const ACTIVE_LOAN_STATUSES = new Set([
  "Requested",
  "Approved",
  "Collected",
  "Overdue",
]);

function getActiveLoanCount(stats) {
  const byStatus = stats?.byStatus ?? {};
  return Object.entries(byStatus).reduce((sum, [status, count]) => {
    if (ACTIVE_LOAN_STATUSES.has(status)) {
      return sum + (Number.isFinite(count) ? count : 0);
    }
    return sum;
  }, 0);
}

(async () => {
  console.log("Running cross-service availability integration test...");

  const loansUrl = joinUrl(loansBase, "loans");
  const loansResponse = await requestJson(loansUrl, "Loans API");
  if (!loansResponse.ok) {
    console.error(`Loans API returned HTTP ${loansResponse.status}.`);
    console.error(loansResponse.body);
    process.exit(1);
  }

  const loansBody = loansResponse.body;
  if (!loansBody || loansBody.success !== true || !Array.isArray(loansBody.data)) {
    console.error("Loans API response missing success=true or data array.");
    console.error(loansBody);
    process.exit(1);
  }

  const alternateId = (id) => {
    const devMatch = /^DEV-(\\d+)$/i.exec(id);
    if (devMatch) return `PROD-${devMatch[1]}`;
    const prodMatch = /^PROD-(\\d+)$/i.exec(id);
    if (prodMatch) return `DEV-${prodMatch[1]}`;
    return null;
  };

  let candidate = null;
  let candidateInventoryId = null;
  let candidateStock = null;
  let activeLoansBefore = null;

  for (const loan of loansBody.data) {
    const deviceId = loan?.deviceId;
    if (!deviceId) continue;

    const idsToTry = [deviceId];
    const alternate = alternateId(deviceId);
    if (alternate) idsToTry.push(alternate);

    for (const id of idsToTry) {
      const inventoryUrl = joinUrl(inventoryBase, `inventory/${id}`);
      const inventoryResponse = await requestJson(inventoryUrl, "Inventory API");
      if (inventoryResponse.ok && inventoryResponse.body?.success) {
        const stockValue = inventoryResponse.body?.data?.stock;
        if (typeof stockValue !== "number" || Number.isNaN(stockValue)) {
          continue;
        }

        const historyUrl = joinUrl(
          loansBase,
          `loans/device/${encodeURIComponent(deviceId)}`
        );
        const historyResponse = await requestJson(
          historyUrl,
          "Loans Device History"
        );
        if (!historyResponse.ok) {
          continue;
        }

        const activeCount = getActiveLoanCount(historyResponse.body?.stats);
        if (activeCount < 1 || !ACTIVE_LOAN_STATUSES.has(loan.status)) {
          continue;
        }

        candidate = loan;
        candidateInventoryId = id;
        candidateStock = stockValue;
        activeLoansBefore = activeCount;
        break;
      }
    }

    if (candidate) {
      break;
    }
  }

  if (!candidate || !candidateInventoryId || activeLoansBefore === null) {
    console.error("No active loan with matching inventory record found.");
    process.exit(1);
  }

  const availabilityBefore = Math.max(candidateStock - activeLoansBefore, 0);
  console.log(
    `Using loan ${candidate.id} (device ${candidate.deviceId}) with inventory ${candidateInventoryId}, stock ${candidateStock}, active loans ${activeLoansBefore}, available ${availabilityBefore}`
  );

  const returnUrl = joinUrl(loansBase, `loans/${candidate.id}`);
  const returnResponse = await fetch(returnUrl, {
    method: "PATCH",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!returnResponse.ok) {
    const text = await returnResponse.text();
    console.error(`Return loan failed: HTTP ${returnResponse.status}`);
    console.error(text.slice(0, 300));
    process.exit(1);
  }

  const maxAttempts = 6;
  const delayMs = 2000;
  let updated = false;
  let activeLoansAfter = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const historyUrl = joinUrl(
      loansBase,
      `loans/device/${encodeURIComponent(candidate.deviceId)}`
    );
    const historyResponse = await requestJson(
      historyUrl,
      "Loans Device History"
    );
    if (!historyResponse.ok) {
      continue;
    }

    activeLoansAfter = getActiveLoanCount(historyResponse.body?.stats);
    console.log(`Attempt ${attempt}: active loans=${activeLoansAfter}`);
    if (activeLoansAfter < activeLoansBefore) {
      updated = true;
      break;
    }
  }

  if (!updated) {
    console.error("Active loan count did not decrease after loan return.");
    process.exit(1);
  }

  const availabilityAfter = Math.max(candidateStock - activeLoansAfter, 0);
  if (availabilityAfter <= availabilityBefore) {
    console.error(
      `Availability did not increase (before ${availabilityBefore}, after ${availabilityAfter}).`
    );
    process.exit(1);
  }

  console.log("Integration test passed.");
})();
