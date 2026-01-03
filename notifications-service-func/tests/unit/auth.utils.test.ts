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

describe("notifications auth utils", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.AZURE_FUNCTIONS_ENVIRONMENT;
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_AUDIENCE;
    jest.dontMock("jsonwebtoken");
    jest.dontMock("jwks-rsa");
  });

  it("rejects missing header", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest(), ctx);
    expect(result.isValid).toBe(false);
  });

  it("rejects malformed token", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Bearer bad"), ctx);
    expect(result.isValid).toBe(false);
  });

  it("accepts valid dev token", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const token = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(true);
  });

  it("rejects invalid token structure in dev mode", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Bearer bad.token"), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Invalid token structure");
  });

  it("rejects token missing sub in dev mode", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const token = createJwt({ exp: Math.floor(Date.now() / 1000) + 60 });
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token missing user ID (sub claim)");
  });

  it("rejects expired token in dev mode", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const token = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token has expired");
  });

  it("returns decode error when token payload is malformed", async () => {
    const { validateToken } = require("../../src/utils/auth");
    const badPayload = Buffer.from("not json").toString("base64");
    const token = `aaa.${badPayload}.ccc`;
    const result = await validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Failed to decode token");
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

  it("validates token via JWKS when Auth0 config is present", async () => {
    process.env.AUTH0_DOMAIN = "example.com";
    process.env.AUTH0_AUDIENCE = "test-audience";

    jest.doMock("jwks-rsa", () => () => ({
      getSigningKey: (_kid: string, cb: (err: unknown, key?: unknown) => void) =>
        cb(null, { getPublicKey: () => "PUBLIC" }),
    }));

    const verifyMock = jest.fn(
      (
        _token: string,
        getKey: (header: unknown, cb: (err: unknown, key?: string) => void) => void,
        _options: unknown,
        callback: (err: Error | null, payload?: unknown) => void
      ) => {
        getKey({ kid: "kid-1" }, (err) => {
          if (err) {
            callback(err as Error, undefined);
            return;
          }
          callback(null, { sub: "auth0|user-1", roles: ["Admin"] });
        });
      }
    );

    jest.doMock("jsonwebtoken", () => ({ verify: verifyMock }));

    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Bearer token"), ctx);
    expect(result.isValid).toBe(true);
    expect(result.userId).toBe("auth0|user-1");
  });

  it("returns validation failed when JWT verification errors", async () => {
    process.env.AUTH0_DOMAIN = "example.com";
    process.env.AUTH0_AUDIENCE = "test-audience";

    jest.doMock("jwks-rsa", () => () => ({
      getSigningKey: (_kid: string, cb: (err: unknown, key?: unknown) => void) =>
        cb(null, { getPublicKey: () => "PUBLIC" }),
    }));

    jest.doMock("jsonwebtoken", () => ({
      verify: jest.fn((_token, _getKey, _options, callback) => {
        callback(new Error("bad token"));
      }),
    }));

    const { validateToken } = require("../../src/utils/auth");
    const result = await validateToken(createRequest("Bearer token"), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token validation failed");
  });

  it("checks admin and owner", () => {
    const { isAdmin, isAdminOrOwner } = require("../../src/utils/auth");
    expect(isAdmin({ roles: ["Admin"] })).toBe(true);
    expect(isAdmin({ roles: ["User"] })).toBe(false);
    expect(isAdminOrOwner({ isValid: true, userId: "u1", token: { roles: ["User"] } }, "u1")).toBe(true);
    expect(isAdminOrOwner({ isValid: true, userId: "u1", token: { roles: ["Admin"] } }, "u2")).toBe(true);
  });
});
