import {
  validateToken,
  verifyUserAccess,
  isAdmin,
} from "../../src/utils/auth";
import { HttpRequest, InvocationContext } from "@azure/functions";

const createRequest = (authorization?: string): HttpRequest =>
  ({
    headers: new Map(
      authorization ? [["authorization", authorization]] : []
    ),
  } as unknown as HttpRequest);

const ctx: InvocationContext = {
  log: jest.fn(),
} as any;

const createJwt = (payload: Record<string, unknown>) => {
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
};

describe("auth utils - validateToken", () => {
  it("rejects missing header", () => {
    const result = validateToken(createRequest(), ctx);
    expect(result).toEqual({
      isValid: false,
      error: "No authorization header provided",
    });
  });

  it("rejects invalid header format", () => {
    const result = validateToken(createRequest("Basic abc"), ctx);
    expect(result.isValid).toBe(false);
  });

  it("rejects malformed tokens", () => {
    const result = validateToken(createRequest("Bearer not-a.jwt"), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Invalid token structure/);
  });

  it("rejects token without user id", () => {
    const token = createJwt({});
    const result = validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/sub/);
  });

  it("rejects expired token", () => {
    const token = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 10 });
    const result = validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/expired/);
  });

  it("accepts valid token", () => {
    const token = createJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const result = validateToken(createRequest(`Bearer ${token}`), ctx);
    expect(result).toEqual({ isValid: true, userId: "user-1" });
  });
});

describe("auth utils helpers", () => {
  it("verifyUserAccess compares ids", () => {
    expect(verifyUserAccess("a", "a")).toBe(true);
    expect(verifyUserAccess("a", "b")).toBe(false);
  });

  it("isAdmin respects role claims", () => {
    expect(isAdmin({ roles: ["Admin"] })).toBe(true);
    expect(isAdmin({ "https://thamco.com/roles": ["Admin"] })).toBe(true);
    expect(isAdmin({ roles: ["User"] })).toBe(false);
  });
});
