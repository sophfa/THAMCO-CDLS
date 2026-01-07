import { InvocationContext } from "@azure/functions";
import { publishLoanStatusChangedEvent } from "../../src/events/eventGridPublisher";

describe("eventGridPublisher", () => {
  const ctx: InvocationContext = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const payload = {
    loanId: "L-1",
    deviceId: "D-1",
    userId: "U-1",
    from: "2025-01-01",
    till: "2025-02-01",
    previousStatus: "Requested",
    newStatus: "Approved",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.EVENT_GRID_TOPIC_ENDPOINT = "https://example.topic";
    process.env.EVENT_GRID_TOPIC_KEY = "key";
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it("skips when config is missing", async () => {
    delete process.env.EVENT_GRID_TOPIC_ENDPOINT;
    delete process.env.EVENT_GRID_TOPIC_KEY;

    await publishLoanStatusChangedEvent(payload, ctx);

    expect(fetch).not.toHaveBeenCalled();
    expect(ctx.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Event Grid configuration missing"
        ),
      })
    );
  });

  it("publishes a valid event", async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true });

    await publishLoanStatusChangedEvent(payload, ctx);

    expect(fetch).toHaveBeenCalledWith(
      "https://example.topic",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "aeg-sas-key": "key",
        }),
      })
    );
    expect(ctx.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Event Grid publish succeeded"),
      })
    );
  });

  it("retries and logs on failure", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "err",
        text: async () => "fail",
      })
      .mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "err",
        text: async () => "fail",
      });

    await publishLoanStatusChangedEvent(payload, ctx);

    expect(fetch).toHaveBeenCalled();
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Event Grid publish failed"),
      })
    );
  });
});
