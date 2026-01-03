import { HttpRequest, InvocationContext } from "@azure/functions";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("jwks-rsa", () =>
  jest.fn(() => ({
    getSigningKey: (_kid: string, cb: (err: Error | null, key?: any) => void) => {
      cb(null, { getPublicKey: () => "public-key" });
    },
  }))
);

const createRequest = (authorization?: string): HttpRequest =>
  ({
    headers: new Map(authorization ? [["authorization", authorization]] : []),
  } as unknown as HttpRequest);

const ctx: InvocationContext = { log: jest.fn() } as any;

describe("auth utils jwt verification", () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...env,
      AUTH0_DOMAIN: "example.auth0.com",
      AUTH0_AUDIENCE: "https://example/api",
    };
  });

  afterEach(() => {
    process.env = { ...env };
    jest.clearAllMocks();
  });

  it("validates token via jwt.verify and jwks", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const jwt = require("jsonwebtoken");
    jwt.verify.mockImplementation(
      (
        _token: string,
        getKey: (header: { kid: string }, cb: (err: Error | null, key?: string) => void) => void,
        _options: unknown,
        callback: (err: Error | null, payload?: any) => void
      ) => {
        getKey({ kid: "kid" }, (_err, _key) => {
          callback(null, { sub: "auth0|user-1" });
        });
      }
    );

    const result = await validateToken(createRequest("Bearer a.b.c"), ctx);
    expect(result.isValid).toBe(true);
    expect(result.userId).toBe("auth0|user-1");
  });

  it("returns validation failed when jwt.verify errors", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const jwt = require("jsonwebtoken");
    jwt.verify.mockImplementation(
      (
        _token: string,
        _getKey: unknown,
        _options: unknown,
        callback: (err: Error | null, payload?: any) => void
      ) => {
        callback(new Error("bad"), undefined);
      }
    );

    const result = await validateToken(createRequest("Bearer a.b.c"), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token validation failed");
  });

  it("returns error when bearer token is missing", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Bearer "), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No token provided");
  });
});
