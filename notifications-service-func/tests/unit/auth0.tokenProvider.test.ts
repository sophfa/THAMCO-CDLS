import { InvocationContext } from "@azure/functions";

const ctx = { error: jest.fn() } as unknown as InvocationContext;

describe("auth0 tokenProvider", () => {
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

  it("requests and caches a management token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "token-1", expires_in: 120 }),
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { getManagementApiToken } = require(
      "../../src/auth0/tokenProvider"
    );

    const token = await getManagementApiToken(ctx);
    expect(token).toBe("token-1");

    const cached = await getManagementApiToken(ctx);
    expect(cached).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when token request fails", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "bad",
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { getManagementApiToken } = require(
      "../../src/auth0/tokenProvider"
    );

    await expect(getManagementApiToken(ctx)).rejects.toThrow(
      /Failed to obtain/
    );
    expect(ctx.error).toHaveBeenCalled();
  });
});
