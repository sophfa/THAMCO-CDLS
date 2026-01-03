jest.mock("../../src/config/cosmosClient", () => ({
  loansContainer: {
    items: {
      query: jest.fn(),
    },
  },
}));

const { getWaitlistForDevice } = require("../../src/utils/waitlist");
const { loansContainer } = require("../../src/config/cosmosClient");

describe("waitlist utils", () => {
  beforeEach(() => {
    loansContainer.items.query.mockReset();
  });

  it("returns undefined when deviceId missing", async () => {
    const result = await getWaitlistForDevice("", undefined, {});
    expect(result).toBeUndefined();
  });

  it("deduplicates waitlist entries", async () => {
    loansContainer.items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [
          { waitlist: [" user-1 ", "user-2", "user-2"] },
          { waitlist: [{ userId: "user-3" }, { userId: " " }] },
        ],
      }),
    });
    const result = await getWaitlistForDevice("DEVICE-1");
    expect(result).toEqual(["user-1", "user-2", "user-3"]);
  });
});
