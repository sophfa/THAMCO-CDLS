import {
  createInventory,
  CreateInventoryParams,
} from "../../src/domain/inventory";

const baseParams: CreateInventoryParams = {
  id: "PROD-001",
  deviceIds: ["DEV-001", "DEV-002"],
  stock: 2,
};

describe("inventory domain", () => {
  it("creates a valid inventory record", () => {
    const result = createInventory(baseParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.inventory.id).toBe("PROD-001");
      expect(result.inventory.deviceIds).toHaveLength(2);
      expect(result.inventory.stock).toBe(2);
    }
  });

  it("rejects empty device ids", () => {
    const result = createInventory({ ...baseParams, deviceIds: [] });
    expect(result.success).toBe(false);
    if (!result.success && "errors" in result) {
      expect(result.errors[0].field).toBe("deviceIds");
    }
  });

  it("rejects negative stock", () => {
    const result = createInventory({ ...baseParams, stock: -1 });
    expect(result.success).toBe(false);
    if (!result.success && "errors" in result) {
      expect(result.errors[0].field).toBe("stock");
    }
  });
});
