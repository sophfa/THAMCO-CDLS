import { describe, expect, it } from "vitest";
import { getHealthUrl } from "./api";

describe("inventory health endpoint", () => {
  it("returns 200 with the expected health payload", async () => {
    const response = await fetch(getHealthUrl("inventory"), {
      headers: { Accept: "application/json" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      status: "ok",
      service: "inventory-service-func",
    });
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.correlationId).toBe("string");
  });
});
