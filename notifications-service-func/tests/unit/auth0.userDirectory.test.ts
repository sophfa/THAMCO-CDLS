import { InvocationContext } from "@azure/functions";

const ctx = { log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;

describe("auth0 userDirectory", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.AUTH0_DOMAIN = "example.auth0.com";
    process.env.AUTH0_M2M_CLIENT_ID = "client";
    process.env.AUTH0_M2M_CLIENT_SECRET = "secret";
    process.env.AUTH0_MGMT_AUDIENCE = "https://example.auth0.com/api/v2/";
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...env };
    jest.clearAllMocks();
  });

  it("returns null when userId is missing", async () => {
    const { getUserProfileById } = require("../../src/auth0/userDirectory");
    const profile = await getUserProfileById("", ctx);
    expect(profile).toBeNull();
  });

  it("returns null when user is not found", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "",
    });
    // @ts-ignore
    global.fetch = fetchMock;

    jest.doMock("../../src/auth0/tokenProvider", () => ({
      getManagementApiToken: jest.fn().mockResolvedValue("token"),
    }));

    const { getUserProfileById } = require("../../src/auth0/userDirectory");
    const profile = await getUserProfileById("auth0|user-1", ctx);
    expect(profile).toBeNull();
  });

  it("returns profile and caches it", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_id: "auth0|user-1",
        email: "user@example.com",
        name: "User",
      }),
    });
    // @ts-ignore
    global.fetch = fetchMock;

    jest.doMock("../../src/auth0/tokenProvider", () => ({
      getManagementApiToken: jest.fn().mockResolvedValue("token"),
    }));

    const { getUserProfileById, getUserEmailById } = require(
      "../../src/auth0/userDirectory"
    );
    const profile = await getUserProfileById("auth0|user-1", ctx);
    expect(profile?.email).toBe("user@example.com");

    const email = await getUserEmailById("auth0|user-1", ctx);
    expect(email).toBe("user@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
