import { HttpRequest, InvocationContext } from "@azure/functions";

const createRequest = (authorization?: string): HttpRequest =>
  ({
    headers: new Map(authorization ? [["authorization", authorization]] : []),
  } as unknown as HttpRequest);

const ctx: InvocationContext = { log: jest.fn() } as any;

const createJwt = (payload: Record<string, unknown>) => {
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
};

describe("inventory auth utils", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.AZURE_FUNCTIONS_ENVIRONMENT;
  });

  it("rejects missing header", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest(), ctx);
    expect(result.isValid).toBe(false);
  });

  it("rejects invalid header format", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Basic abc"), ctx);
    expect(result.isValid).toBe(false);
  });

  it("rejects malformed token structure", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Bearer bad.token"), ctx);
    expect(result.isValid).toBe(false);
  });

  it("rejects missing sub claim", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const token = createJwt({});
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
  });

  it("accepts valid dev token", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const token = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result).toEqual({ isValid: true, userId: "user-1" });
  });

  it("returns config error when dev bypass disabled", async () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "test";
    jest.resetModules();
    const { validateToken } = require("../../src/utils/auth");
    const token = createJwt({ sub: "user-1" });
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Auth0 config missing");
  });

  it("recognizes admin roles", () => {
    const { isAdmin } = require("../../src/utils/auth");
    expect(isAdmin({ roles: ["Admin"] })).toBe(true);
    expect(isAdmin({ roles: ["User"] })).toBe(false);
  });
});
