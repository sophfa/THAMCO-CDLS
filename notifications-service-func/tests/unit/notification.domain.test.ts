import {
  createNotification,
  createReservationNotification,
  filterNotificationsByType,
  Notification,
} from "../../src/domain/notification";

describe("notification domain", () => {
  it("creates a reservation notification with normalized payload", () => {
    const result = createReservationNotification({
      userId: "auth0|user-1",
      payload: {
        deviceName: "  Surface Pro ",
        from: "2025-01-01T10:00:00Z",
        till: "2025-01-03T10:00:00Z",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.notification.message).toContain("Surface Pro");
      expect(result.notification.payload.deviceName).toBe("Surface Pro");
    }
  });

  it("rejects invalid user id", () => {
    const result = createNotification({
      userId: "bad id",
      type: "Custom",
      payload: {
        message: "Hello",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success && "errors" in result) {
      expect(result.errors[0].field).toBe("userId");
    }
  });

  it("filters notifications by type", () => {
    const notifications: Notification[] = [
      {
        id: "N-1",
        userId: "auth0|user-1",
        type: "Custom",
        message: "One",
        payload: { message: "One" },
        createdAt: new Date().toISOString(),
      },
      {
        id: "N-2",
        userId: "auth0|user-1",
        type: "Waitlist",
        message: "Two",
        payload: {
          deviceName: "X",
          requestedFrom: "2025-01-01T00:00:00Z",
          requestedTill: "2025-01-02T00:00:00Z",
          position: 1,
        },
        createdAt: new Date().toISOString(),
      },
    ];

    const filtered = filterNotificationsByType(notifications, "Waitlist");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("N-2");
  });
});
