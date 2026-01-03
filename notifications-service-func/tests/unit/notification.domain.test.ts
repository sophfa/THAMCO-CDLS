import {
  createNotification,
  createAcceptedNotification,
  createCancelledNotification,
  createCollectedNotification,
  createRejectedNotification,
  createReturnedNotification,
  createReservationNotification,
  createWaitlistNotification,
  filterNotificationsByType,
  formatNotificationDisplay,
  groupNotificationsByUser,
  isNotificationOld,
  Notification,
  sortNotificationsByDate,
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

  it("creates and normalizes reservation-based notifications", () => {
    const basePayload = {
      deviceName: "  Surface Pro ",
      from: "2025-01-01T10:00:00Z",
      till: "2025-01-03T10:00:00Z",
      location: "  Library  ",
      notes: "  Handle with care ",
    };

    const accepted = createAcceptedNotification({
      userId: "auth0|user-2",
      payload: { ...basePayload, approvedBy: "  Staff  ", approvedAt: "2025-01-01T12:00:00Z" },
    });
    expect(accepted.success).toBe(true);
    if (accepted.success) {
      expect(accepted.notification.message).toContain("accepted");
      expect(accepted.notification.payload.approvedBy).toBe("Staff");
      expect(accepted.notification.payload.approvedAt).toContain("2025-01-01T12:00:00.000Z");
      expect(accepted.notification.payload.location).toBe("Library");
      expect(accepted.notification.payload.notes).toBe("Handle with care");
    }

    const rejected = createRejectedNotification({
      userId: "auth0|user-2",
      payload: { ...basePayload, reason: "  Not available  " },
    });
    expect(rejected.success).toBe(true);
    if (rejected.success) {
      expect(rejected.notification.message).toContain("rejected: Not available");
      expect(rejected.notification.payload.reason).toBe("Not available");
    }

    const cancelled = createCancelledNotification({
      userId: "auth0|user-2",
      payload: { ...basePayload, cancelledBy: "  Admin  ", reason: "  Changed mind " },
    });
    expect(cancelled.success).toBe(true);
    if (cancelled.success) {
      expect(cancelled.notification.message).toContain("cancelled: Changed mind");
      expect(cancelled.notification.payload.cancelledBy).toBe("Admin");
    }

    const collected = createCollectedNotification({
      userId: "auth0|user-2",
      payload: { ...basePayload, collectedAt: "2025-01-02T09:00:00Z" },
    });
    expect(collected.success).toBe(true);
    if (collected.success) {
      expect(collected.notification.message).toContain("collected");
      expect(collected.notification.payload.collectedAt).toContain("2025-01-02T09:00:00.000Z");
    }

    const returned = createReturnedNotification({
      userId: "auth0|user-2",
      payload: { ...basePayload, returnedAt: "2025-01-03T09:00:00Z", condition: "  Good " },
    });
    expect(returned.success).toBe(true);
    if (returned.success) {
      expect(returned.notification.message).toContain("returned");
      expect(returned.notification.payload.condition).toBe("Good");
      expect(returned.notification.payload.returnedAt).toContain("2025-01-03T09:00:00.000Z");
    }
  });

  it("creates waitlist and custom notifications with normalized payloads", () => {
    const waitlist = createWaitlistNotification({
      userId: "auth0|user-3",
      payload: {
        deviceName: "  iPad  ",
        requestedFrom: "2025-02-01T09:00:00Z",
        requestedTill: "2025-02-03T09:00:00Z",
        position: 2,
      },
    });
    expect(waitlist.success).toBe(true);
    if (waitlist.success) {
      expect(waitlist.notification.message).toContain("waitlist");
      expect(waitlist.notification.payload.deviceName).toBe("iPad");
      expect(waitlist.notification.payload.requestedFrom).toContain("2025-02-01T09:00:00.000Z");
    }

    const custom = createNotification({
      userId: "auth0|user-3",
      type: "Custom",
      payload: { message: "  Hello world  ", subject: "  Greeting  ", metadata: { source: "unit" } },
    });
    expect(custom.success).toBe(true);
    if (custom.success) {
      expect(custom.notification.message).toBe("Hello world");
      expect(custom.notification.payload.subject).toBe("Greeting");
    }
  });

  it("returns validation errors for invalid inputs", () => {
    const result = createNotification({
      id: "!!",
      userId: "auth0|user-4",
      type: "Waitlist",
      createdAt: "bad-date",
      message: 123 as unknown as string,
      payload: {
        deviceName: "x",
        requestedFrom: "bad-date",
        requestedTill: 123 as unknown as string,
        position: 0,
      },
    } as any);

    expect(result.success).toBe(false);
    if (!result.success && "errors" in result) {
      const fields = result.errors.map((error) => error.field);
      expect(fields).toEqual(expect.arrayContaining([
        "id",
        "createdAt",
        "message",
        "payload.deviceName",
        "payload.requestedFrom",
        "payload.requestedTill",
        "payload.position",
      ]));
    }
  });

  it("rejects invalid custom payload metadata", () => {
    const result = createNotification({
      userId: "auth0|user-5",
      type: "Custom",
      payload: { message: "Hello", metadata: "bad" as unknown as Record<string, unknown> },
    });

    expect(result.success).toBe(false);
    if (!result.success && "errors" in result) {
      expect(result.errors.some((error) => error.field === "payload.metadata")).toBe(true);
    }
  });

  it("formats and orders notifications for display", () => {
    const now = new Date("2025-03-01T12:00:00Z");
    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(now.getTime());

    const makeNotification = (overrides: Partial<Notification>): Notification =>
      ({
        id: "N-1",
        userId: "auth0|user-1",
        type: "Custom",
        message: "Hello",
        payload: { message: "Hello" },
        createdAt: new Date(now).toISOString(),
        ...overrides,
      } as Notification);

    const notifications: Notification[] = [
      makeNotification({ id: "N-1", createdAt: new Date(now.getTime() - 30 * 1000).toISOString() }),
      makeNotification({ id: "N-2", createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString() }),
      makeNotification({ id: "N-3", createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() }),
      makeNotification({ id: "N-4", createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), userId: "auth0|user-2" }),
    ];

    expect(formatNotificationDisplay(notifications[0])).toContain("just now");
    expect(formatNotificationDisplay(notifications[1])).toContain("30m ago");
    expect(formatNotificationDisplay(notifications[2])).toContain("5h ago");
    expect(formatNotificationDisplay(notifications[3])).toContain("2d ago");

    const sorted = sortNotificationsByDate(notifications);
    expect(sorted[0].id).toBe("N-1");
    expect(sorted[sorted.length - 1].id).toBe("N-4");

    const grouped = groupNotificationsByUser(notifications);
    expect(grouped["auth0|user-1"]).toHaveLength(3);
    expect(grouped["auth0|user-2"]).toHaveLength(1);

    expect(isNotificationOld(notifications[3], 24)).toBe(true);
    expect(isNotificationOld(notifications[0], 24)).toBe(false);

    dateSpy.mockRestore();
  });
});
