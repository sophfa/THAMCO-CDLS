import { describe, expect, it } from "vitest";
import {
  getCatalogueProductUrl,
  getCatalogueProductsUrl,
  getInventoryUrl,
  hasServiceBaseUrl,
} from "./api";

const runCatalogueSuite = hasServiceBaseUrl("catalogue") ? describe : describe.skip;

runCatalogueSuite("catalogue product APIs", () => {
  it("lists products with metadata", async () => {
    const response = await fetch(getCatalogueProductsUrl(), {
      headers: { Accept: "application/json" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty("success", true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.metadata).toBeDefined();
    expect(body.metadata.count).toBe(body.data.length);
    expect(typeof body.metadata.timestamp).toBe("string");

    for (const product of body.data) {
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
    }
  });

  it("returns product detail for a known id", async () => {
    const listResponse = await fetch(getCatalogueProductsUrl(), {
      headers: { Accept: "application/json" },
    });
    const listBody = await listResponse.json();
    const firstProduct = listBody?.data?.[0];
    expect(firstProduct).toBeDefined();

    const detailResponse = await fetch(getCatalogueProductUrl(firstProduct.id), {
      headers: { Accept: "application/json" },
    });

    expect(detailResponse.status).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toHaveProperty("success", true);
    expect(detailBody.data).toHaveProperty("id", firstProduct.id);
    expect(detailBody.data).toHaveProperty("description");
  });

  const crossServiceTest = hasServiceBaseUrl("inventory") ? it : it.skip;
  crossServiceTest("matches inventory record for a product", async () => {
    const listResponse = await fetch(getCatalogueProductsUrl(), {
      headers: { Accept: "application/json" },
    });
    const listBody = await listResponse.json();
    const firstProduct = listBody?.data?.[0];
    expect(firstProduct).toBeDefined();

    const inventoryResponse = await fetch(getInventoryUrl(firstProduct.id), {
      headers: { Accept: "application/json" },
    });

    expect(inventoryResponse.status).toBe(200);
    const inventoryBody = await inventoryResponse.json();
    expect(inventoryBody).toHaveProperty("success", true);
    expect(inventoryBody.data).toHaveProperty("id", firstProduct.id);
    expect(Array.isArray(inventoryBody.data.deviceIds)).toBe(true);
  });
});
