<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>
    <div class="tabs" role="tablist" aria-label="Admin dashboard sections">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-pill"
        role="tab"
        :aria-selected="activeTab === t.key"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        <span class="tab-label">{{ t.label }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'overview'">
      <div class="toolbar actions">
        <button class="refresh" @click="loadLoans" :disabled="loading">
          Refresh
        </button>
        <span v-if="loading">Loading…</span>
        <span v-if="error" class="error">{{ error }}</span>
      </div>

      <div v-if="!loading && loans.length === 0" class="empty">
        No loans found.
      </div>

      <!-- Requested (highest urgency) -->
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Requested ({{ requestedLoans.length }})</h2>
            <p class="section-subtitle">
              New reservations awaiting your approval.
            </p>
          </div>
        </div>
        <div v-if="requestedLoans.length === 0" class="info">
          No loans in this state.
        </div>
        <div v-else class="card-list">
          <article
            v-for="loan in requestedLoans"
            :key="loan.id"
            class="reservation-card"
          >
            <div class="reservation-card-contents">
              <img
                v-if="loan.deviceImage"
                :src="loan.deviceImage"
                alt=""
                class="reservation-image"
              />
              <div class="reservation-card-info">
                <div class="reservation-card-header">
                  <div class="reservation-title">
                    <div>
                      <strong>{{ loan.deviceName || loan.deviceId }}</strong>
                      <div class="reservation-subtitle">#{{ loan.id }}</div>
                    </div>
                  </div>
                  <span class="chip" :class="statusClass(loan.status)">
                    {{ loan.status || "Unknown" }}
                  </span>
                </div>
                <div class="reservation-footer">
                  <div class="reservation-dates">
                    <div>
                      <label>Requested</label>
                      <span>{{ formatDate(loan.createdAt) }}</span>
                    </div>
                    <div>
                      <label>Collect</label>
                      <span>{{ formatDate(loan.from) }}</span>
                    </div>
                    <div>
                      <label>Return</label>
                      <span>{{ formatDate(loan.till) }}</span>
                    </div>
                  </div>
                  <div class="reservation-actions">
                    <button class="primary-btn" @click="approve(loan)">
                      Approve
                    </button>
                    <button class="cancel-btn" @click="deny(loan)">Deny</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Approved (awaiting collection) -->
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Approved ({{ approvedLoans.length }})</h2>
            <p class="section-subtitle">
              Devices cleared for pickup but not yet collected.
            </p>
          </div>
        </div>
        <div v-if="approvedLoans.length === 0" class="info">
          No loans in this state.
        </div>
        <div v-else class="card-list">
          <article
            v-for="loan in approvedLoans"
            :key="loan.id"
            class="reservation-card"
          >
            <div class="reservation-card-contents">
              <img
                v-if="loan.deviceImage"
                :src="loan.deviceImage"
                alt=""
                class="reservation-image"
              />
              <div class="reservation-card-info">
                <div class="reservation-card-header">
                  <div class="reservation-title">
                    <div>
                      <strong>{{ loan.deviceName || loan.deviceId }}</strong>
                      <div class="reservation-subtitle">#{{ loan.id }}</div>
                    </div>
                  </div>
                  <span class="chip" :class="statusClass(loan.status)">
                    {{ loan.status || "Unknown" }}
                  </span>
                </div>
                <div class="reservation-footer">
                  <div class="reservation-dates">
                    <div>
                      <label>Collect</label>
                      <span>{{ formatDate(loan.from) }}</span>
                    </div>
                    <div>
                      <label>Return</label>
                      <span>{{ formatDate(loan.till) }}</span>
                    </div>
                  </div>
                  <div class="reservation-actions">
                    <button class="cancel-btn" @click="cancel(loan)">
                      Cancel
                    </button>
                    <button class="primary-btn" @click="markCollected(loan)">
                      Mark Collected
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Collected (due soonest first) -->
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Collected ({{ collectedLoans.length }})</h2>
            <p class="section-subtitle">
              Devices currently on loan and due for return.
            </p>
          </div>
        </div>
        <div v-if="collectedLoans.length === 0" class="info">
          No loans in this state.
        </div>
        <div v-else class="card-list">
          <article
            v-for="loan in collectedLoans"
            :key="loan.id"
            class="reservation-card"
          >
            <div class="reservation-card-contents">
              <img
                v-if="loan.deviceImage"
                :src="loan.deviceImage"
                alt=""
                class="reservation-image"
              />
              <div class="reservation-card-info">
                <div class="reservation-card-header">
                  <div class="reservation-title">
                    <div>
                      <strong>{{ loan.deviceName || loan.deviceId }}</strong>
                      <div class="reservation-subtitle">#{{ loan.id }}</div>
                    </div>
                  </div>
                  <span class="chip" :class="statusClass(loan.status)">
                    {{ loan.status || "Unknown" }}
                  </span>
                </div>
                <div class="reservation-footer">
                  <div class="reservation-dates">
                    <div>
                      <label>Due</label>
                      <span>{{ formatDate(loan.till) }}</span>
                    </div>
                  </div>
                  <div class="reservation-actions">
                    <button
                      class="secondary-btn"
                      @click="revertCollected(loan)"
                    >
                      Undo Collected
                    </button>
                    <button class="primary-btn" @click="markReturned(loan)">
                      Confirm Return
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Rejected/Returned (lowest urgency) -->
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Rejected ({{ rejectedLoans.length }})</h2>
            <p class="section-subtitle">Recently denied loan requests.</p>
          </div>
        </div>
        <div v-if="rejectedLoans.length === 0" class="info">
          No loans in this state.
        </div>
        <div v-else class="card-list">
          <article
            v-for="loan in rejectedLoans"
            :key="loan.id"
            class="reservation-card"
          >
            <div class="reservation-card-contents">
              <img
                v-if="loan.deviceImage"
                :src="loan.deviceImage"
                alt=""
                class="reservation-image"
              />
              <div class="reservation-card-info">
                <div class="reservation-card-header">
                  <div class="reservation-title">
                    <div>
                      <strong>{{ loan.deviceName || loan.deviceId }}</strong>
                      <div class="reservation-subtitle">#{{ loan.id }}</div>
                    </div>
                  </div>
                  <span class="chip" :class="statusClass(loan.status)">
                    {{ loan.status || "Unknown" }}
                  </span>
                </div>
                <div class="reservation-footer">
                  <div class="reservation-dates">
                    <div>
                      <label>Updated</label>
                      <span>{{ formatDate(loan.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <div>
            <h2>Returned ({{ returnedLoans.length }})</h2>
            <p class="section-subtitle">Loans successfully closed out.</p>
          </div>
        </div>
        <div v-if="returnedLoans.length === 0" class="info">
          No loans in this state.
        </div>
        <div v-else class="card-list">
          <article
            v-for="loan in returnedLoans"
            :key="loan.id"
            class="reservation-card"
          >
            <div class="reservation-card-contents">
              <img
                v-if="loan.deviceImage"
                :src="loan.deviceImage"
                alt=""
                class="reservation-image"
              />
              <div class="reservation-card-info">
                <div class="reservation-card-header">
                  <div class="reservation-title">
                    <div>
                      <strong>{{ loan.deviceName || loan.deviceId }}</strong>
                      <div class="reservation-subtitle">#{{ loan.id }}</div>
                    </div>
                  </div>
                  <span class="chip" :class="statusClass(loan.status)">
                    {{ loan.status || "Unknown" }}
                  </span>
                </div>
                <div class="reservation-footer">
                  <div class="reservation-dates">
                    <div>
                      <label>Returned</label>
                      <span>{{ formatDate(loan.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
    <div v-if="activeTab === 'waitlist'">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Waitlist Count</th>
            <th>Users</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in waitlistSummaries" :key="item.deviceId">
            <td>{{ item.deviceName || item.deviceId }}</td>
            <td>{{ item.waitlist.length }}</td>
            <td>
              <div v-for="entry in item.waitlist" :key="entry.userId">
                {{ entry.position }}. {{ entry.userId }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'history'">
      <LoanHistoryView />
    </div>

    <div v-if="activeTab === 'reports'" class="tab-placeholder">
      <h2>Insights & Reports</h2>
      <p>
        Coming soon: download-ready summaries for monthly loan activity,
        utilization, and outstanding actions.
      </p>
      <ul>
        <li>Top loaned devices</li>
        <li>Collection vs return compliance</li>
        <li>Waitlist conversion trends</li>
      </ul>
    </div>

    <div v-if="activeTab === 'calendar'" class="tab-placeholder">
      <h2>Calendar View</h2>
      <p>
        Visualize loans, collections, and returns laid out on a timeline to plan
        staffing and device handovers.
      </p>
      <p class="muted">
        Integration with Outlook/Google Calendar will live here once available.
      </p>
    </div>

    <div v-if="activeTab === 'settings'" class="tab-placeholder">
      <h2>Admin Settings</h2>
      <p>Adjust loan windows, reminder cadence, and notification routing.</p>
      <ul>
        <li>Loan duration defaults</li>
        <li>Escalation thresholds</li>
        <li>Dashboard personalization</li>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import type { Loan } from "../types/models";
import {
  listAllLoans,
  authorizeLoan,
  returnLoan,
  cancelLoan,
  markLoanCollected,
  getWaitlistForDevice,
  revertLoanCollection,
  rejectLoan,
} from "../services/api/loansService";
import { getProductById } from "../services/api/catalogueService";
import LoanHistoryView from "./LoanHistoryView.vue";

type AdminTab =
  | "overview"
  | "history"
  | "waitlist"
  | "reports"
  | "calendar"
  | "settings";
const tabs: { key: AdminTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "Loan History" },
  { key: "waitlist", label: "Waitlists" },
  { key: "reports", label: "Reports" },
  { key: "calendar", label: "Calendar" },
  { key: "settings", label: "Settings" },
];

const activeTab = ref<AdminTab>("overview");
const loans = ref<Loan[]>([]);
const loading = ref(false);
const error = ref("");

function formatDate(d: string | Date) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}

function statusClass(status?: string) {
  return (status || "unknown").toLowerCase();
}

const requestedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Requested")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
);

const approvedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Approved")
    .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
);

const collectedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Collected")
    .sort((a, b) => new Date(a.till).getTime() - new Date(b.till).getTime())
);

const rejectedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Rejected")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
);

const returnedLoans = computed(() =>
  loans.value
    .filter((l) => l.status === "Returned")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
);

async function loadLoans() {
  loading.value = true;
  error.value = "";
  try {
    loans.value = await listAllLoans();
    await Promise.all(
      loans.value.map(async (loan) => {
        try {
          const product = await getProductById(loan.deviceId);
          (loan as any).deviceName = product.name;
          (loan as any).deviceImage =
            (product as any).deviceImage ?? (product as any).imageUrl;
        } catch (e) {
          console.warn(
            `Failed to fetch product details for ${loan.deviceId}`,
            e
          );
        }
      })
    );
    console.log("loans: ", loans.value);
  } catch (e: any) {
    error.value = e?.message || "Failed to load loans";
  } finally {
    loading.value = false;
  }

  async function loadWaitlistSummaries(force = false) {
    if (!force && waitlistSummaries.value.length > 0) {
      return;
    }

    waitlistLoading.value = true;
    waitlistError.value = "";

    try {
      if (loans.value.length === 0) {
        await loadLoans();
      }

      const deviceIds = Array.from(
        new Set(loans.value.map((loan) => loan.deviceId))
      );
      const summaries: WaitlistSummary[] = [];

      for (const deviceId of deviceIds) {
        try {
          const waitlistData = await getWaitlistForDevice(deviceId);
          const waitlistEntries = Array.isArray(waitlistData?.waitlist)
            ? waitlistData.waitlist
            : [];

          if (waitlistEntries.length === 0) {
            continue;
          }

          let deviceName: string | undefined;
          try {
            const product = await getProductById(deviceId);
            deviceName = product?.name ?? deviceId;
          } catch (productError) {
            console.warn(
              `Failed to fetch product info for ${deviceId}`,
              productError
            );
          }

          const mappedEntries: WaitlistEntrySummary[] = waitlistEntries.map(
            (entry: any, index: number) => ({
              userId:
                typeof entry === "string"
                  ? entry
                  : entry?.userId ?? entry?.id ?? `User-${index + 1}`,
              position: entry?.position ?? index + 1,
            })
          );

          summaries.push({
            deviceId,
            deviceName,
            waitlist: mappedEntries,
          });
        } catch (waitlistErr) {
          console.warn(`Failed to load waitlist for ${deviceId}`, waitlistErr);
        }
      }

      waitlistSummaries.value = summaries;
    } catch (err: any) {
      waitlistError.value = err?.message || "Failed to load waitlists";
    } finally {
      waitlistLoading.value = false;
    }
  }

  async function refreshWaitlists() {
    await loadWaitlistSummaries(true);
  }
}

async function approve(loan: Loan) {
  try {
    const res = await authorizeLoan(loan.id);
    const newStatus = (res?.status || "Approved").toString();
    loan.status = (newStatus.charAt(0).toUpperCase() +
      newStatus.slice(1).toLowerCase()) as Loan["status"];
  } catch (e: any) {
    alert(e?.message || "Failed to approve loan");
  }
}

async function markCollected(loan: Loan) {
  try {
    await markLoanCollected(loan.id);
    await loadLoans();
  } catch (e: any) {
    alert(e?.message || "Failed to mark loan as collected");
  }
}

async function revertCollected(loan: Loan) {
  if (
    !confirm(
      `Move loan ${loan.id} back to Approved? This should only be used if 'Confirm Collected' was clicked by mistake.`
    )
  ) {
    return;
  }

  try {
    await revertLoanCollection(loan.id);
    await loadLoans();
  } catch (e: any) {
    alert(e?.message || "Failed to revert loan status");
  }
}

async function cancel(loan: Loan) {
  if (!confirm(`Cancel loan ${loan.id}?`)) return;
  try {
    await cancelLoan(loan.id);
    await loadLoans();
  } catch (e: any) {
    alert(e?.message || "Failed to cancel loan");
  }
}

async function deny(loan: Loan) {
  if (
    !confirm(
      `Reject loan ${loan.id}? This will notify the user and free device.`
    )
  )
    return;
  try {
    await rejectLoan(loan.id, "Rejected by admin");
    await loadLoans();
  } catch (e: any) {
    alert(e?.message || "Failed to reject loan");
  }
}

async function markReturned(loan: Loan) {
  try {
    await returnLoan(loan.id);
    await loadLoans();
  } catch (e: any) {
    alert(e?.message || "Failed to mark as returned");
  }
}

onMounted(loadLoans);

watch(activeTab, async (tab) => {
  if (
    tab === "waitlist" &&
    waitlistSummaries.value.length === 0 &&
    !waitlistLoading.value
  ) {
    await loadWaitlistSummaries();
  }
});
</script>

<style scoped>
.admin-dashboard {
  padding: 1rem 2rem;
}

.tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background: linear-gradient(135deg, #f9fafb, #eef2ff);
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  box-shadow: 0 18px 30px -22px rgba(15, 23, 42, 0.8);
}

.tab-pill {
  position: relative;
  padding: 0.65rem 1.5rem;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.tab-pill::after {
  content: "";
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 8px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6c7c69, #a3b18a);
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tab-pill:hover {
  color: #374151;
}

.tab-pill:focus-visible {
  outline: 3px solid rgba(108, 124, 105, 0.35);
  outline-offset: 2px;
}

.tab-pill.active {
  background: #fff;
  color: #111827;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.8);
}

.tab-pill.active::after {
  opacity: 1;
  transform: translateY(0);
}

.tab-label {
  letter-spacing: 0.02em;
}
.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.section {
  margin-top: 1rem;
}
.error {
  color: #b00020;
}
.empty {
  opacity: 0.7;
}
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.section-subtitle {
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 0.2rem;
}
.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.reservation-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
  box-shadow: 0 10px 15px -12px rgba(15, 23, 42, 0.35);
}
.reservation-card-contents {
  display: flex;
  gap: 1rem;
}
.reservation-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
}
.reservation-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.reservation-title {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.reservation-image {
  width: 96px;
  height: 96px;
  border-radius: 10px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
}
.reservation-subtitle {
  font-size: 0.8rem;
  color: #6b7280;
}
.reservation-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-start;
}
.reservation-dates {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  color: #4b5563;
}
.reservation-dates label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #9ca3af;
}
.reservation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-left: auto;
}
.primary-btn,
.cancel-btn,
.secondary-btn {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.primary-btn {
  background: #6c7c69;
  color: #fff;
}
.primary-btn:hover:not([disabled]) {
  opacity: 0.9;
}
.cancel-btn {
  background: #a6383e;
  color: #fff;
}
.cancel-btn:hover:not([disabled]) {
  opacity: 0.9;
}
.secondary-btn {
  border: 1px solid #6c7c69;
  color: #6c7c69;
  background: #fff;
}
.secondary-btn:hover:not([disabled]) {
  background: #f3f4f6;
}
.primary-btn:disabled,
.cancel-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh {
  background-color: #867537;
  color: white;
  border-radius: 6px;
  border: none;
  outline: none;
  padding: 6px;
}

.chip {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid transparent;
  text-transform: capitalize;
}
.chip.requested {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}
.chip.approved {
  background: #ede9fe;
  border-color: #8b5cf6;
  color: #5b21b6;
}
.chip.collected {
  background: #e1f5ea;
  border-color: #6c7c69;
  color: #2f3b2f;
}
.chip.rejected {
  background: #fee2e2;
  border-color: #f87171;
  color: #b91c1c;
}
.chip.returned {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

@media (max-width: 768px) {
  .reservation-card-contents {
    flex-direction: column;
    align-items: center;
  }
  .reservation-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
