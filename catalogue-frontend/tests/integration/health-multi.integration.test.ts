import { describe, expect, it } from "vitest";
import { getHealthUrl, hasServiceBaseUrl } from "./api";

const services: Array<{ name: string; key: Parameters<typeof getHealthUrl>[0] }> = [
  { name: "Inventory service", key: "inventory" },
  { name: "Catalogue service", key: "catalogue" },
  { name: "Loans service", key: "loans" },
  { name: "Notifications service", key: "notifications" },
];

describe("service health endpoints", () => {
  for (const { name, key } of services) {
    const testFn = hasServiceBaseUrl(key) ? it : it.skip;
    testFn(`${name} returns ok`, async () => {
      const response = await fetch(getHealthUrl(key), {
        headers: { Accept: "application/json" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({ status: "ok" });
      expect(typeof body.service).toBe("string");
      expect(typeof body.timestamp).toBe("string");
    });
  }
});
