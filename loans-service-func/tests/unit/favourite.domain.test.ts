import { createFavourite } from "../../src/domain/favourite";

describe("Favourite Domain", () => {
  it("creates a favourite when all fields are valid", () => {
    const result = createFavourite({
      id: "fav-123",
      deviceId: "DEVICE-1",
      userId: "user_1",
      addedAt: new Date("2025-01-01T00:00:00Z"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.favourite.id).toBe("fav-123");
      expect(result.favourite.deviceId).toBe("DEVICE-1");
      expect(result.favourite.userId).toBe("user_1");
    }
  });

  it("returns validation errors for invalid payload", () => {
    const result = createFavourite({
      id: "!!!",
      deviceId: "",
      userId: "",
      addedAt: new Date("invalid"),
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("id");
      expect(fields).toContain("deviceId");
      expect(fields).toContain("addedAt");
      return;
    }
    throw new Error("Expected validation to fail");
  });
});
