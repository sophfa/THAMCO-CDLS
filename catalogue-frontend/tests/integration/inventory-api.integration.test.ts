import { describe, expect, it } from "vitest";
import { getInventoryUrl, hasServiceBaseUrl } from "./api";

const runInventoryContract = hasServiceBaseUrl("inventory") ? describe : describe.skip;

runInventoryContract("inventory HTTP contract", () => {
  it("returns inventory details for an existing product", async () => {
    const response = await fetch(getInventoryUrl("PROD-001"), {
      headers: { Accept: "application/json" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveProperty("id", "PROD-001");
    expect(typeof body.data.stock).toBe("number");
    expect(Array.isArray(body.data.deviceIds)).toBe(true);
  });

  it("returns a failure payload for unknown product IDs", async () => {
    const response = await fetch(getInventoryUrl("PROD-99999"), {
      headers: { Accept: "application/json" },
    });

    expect(response.status).toBe(404);
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
    expect(typeof body.message).toBe("string");
  });
});
