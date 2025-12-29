import {
  calculateDiscountedPrice,
  createProduct,
  CreateProductParams,
  isProductAvailable,
  updateProductPrice,
} from "../../src/domain/product";

const baseParams: CreateProductParams = {
  id: "DEV-001",
  name: "ThinkPad X1",
  brand: "Lenovo",
  category: "Laptop",
  model: "X1 Carbon",
  processor: "Intel i7",
  ram: "16GB",
  storage: "512GB",
  gpu: "Integrated",
  display: "14-inch",
  os: "Windows",
  batteryLife: "10 hours",
  weight: "1.1kg",
  ports: ["USB-C", "HDMI"],
  connectivity: ["WiFi", "Bluetooth"],
  price: 1200,
  inStock: true,
  createdAt: new Date("2025-01-01T00:00:00Z"),
};

describe("product domain", () => {
  it("creates a valid product and trims key fields", () => {
    const result = createProduct({
      ...baseParams,
      id: " DEV-001 ",
      name: " ThinkPad X1 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.product.id).toBe("DEV-001");
      expect(result.product.name).toBe("ThinkPad X1");
    }
  });

  it("returns validation errors for bad id and name", () => {
    const result = createProduct({
      ...baseParams,
      id: "BAD ID!",
      name: "",
    });

    expect(result.success).toBe(false);
    if (!result.success && "errors" in result) {
      const fields = result.errors.map((error) => error.field);
      expect(fields).toContain("id");
      expect(fields).toContain("name");
    }
  });

  it("rejects invalid price updates", () => {
    const created = createProduct(baseParams);
    expect(created.success).toBe(true);
    if (created.success) {
      const updated = updateProductPrice(created.product, -10);
      expect(updated.success).toBe(false);
    }
  });

  it("calculates discounts and availability", () => {
    const created = createProduct(baseParams);
    expect(created.success).toBe(true);
    if (created.success) {
      expect(isProductAvailable(created.product)).toBe(true);
      expect(calculateDiscountedPrice(created.product, 10)).toBe(1080);
    }
  });
});
