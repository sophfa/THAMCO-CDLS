import { HttpRequest, InvocationContext } from "@azure/functions";
import jwt, {
  Algorithm,
  JwtHeader,
  JwtPayload,
  SigningKeyCallback,
  VerifyOptions,
} from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface Principal {
  readonly userId: string;
  readonly roles: string[];
  readonly claims: JwtPayload;
}

export type AuthResult =
  | { success: true; principal: Principal }
  | { success: false; status: number; message: string };

const domain = process.env.AUTH0_DOMAIN;
const audienceSetting = process.env.AUTH0_AUDIENCE;
const audiences = (audienceSetting ?? "")
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);
const rolesClaim = process.env.AUTH0_ROLES_CLAIM;
const adminRole = process.env.USER_DIRECTORY_ADMIN_ROLE;
const fallbackRoleClaims = [
  rolesClaim,
  "https://thamco-clds.app/roles", // frontend namespace
  "https://thamco.com/roles",
  "roles",
];

if (!domain) {
  throw new Error("AUTH0_DOMAIN must be configured for token validation");
}

const client = jwksClient({
  jwksUri: `https://${domain}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
  rateLimit: true,
});

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
  client.getSigningKey(header.kid as string, (err, key) => {
    if (err) {
      callback(err);
      return;
    }

    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function authenticateRequest(
  req: HttpRequest,
  context: InvocationContext
): Promise<AuthResult> {
  // Host-triggered invocations sometimes omit the headers bag; guard before reading.
  const authHeader = req.headers?.get?.("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      status: 401,
      message: "Authorization header missing or invalid",
    };
  }

  const token = authHeader.slice(7);
  context.log?.("[auth] Received bearer token", {
    present: token.length > 0,
    length: token.length,
    preview: token.slice(0, 16),
  });
  try {
    const decoded = await new Promise<JwtPayload>((resolve, reject) => {
      const normalizedAudiences =
        audiences.length > 0
          ? ([audiences[0]!, ...audiences.slice(1)] as [string, ...string[]])
          : undefined;
      const options: VerifyOptions = {
        audience: normalizedAudiences ?? audienceSetting,
        issuer: `https://${domain}/`,
        algorithms: ["RS256"] as Algorithm[],
        complete: false,
      };

      jwt.verify(token, getKey, options, (err, payload) => {
        if (err) {
          reject(err);
          return;
        }
        if (!payload || typeof payload === "string") {
          reject(new Error("Token payload missing claims"));
          return;
        }
        resolve(payload);
      });
    });

    const userId = decoded.sub;
    if (!userId) {
      return {
        success: false,
        status: 401,
        message: "Token missing subject claim",
      };
    }

    const roles =
      fallbackRoleClaims
        .map((claim) => decoded[claim])
        .find((value) => Array.isArray(value)) ??
      (Array.isArray(decoded.roles) ? decoded.roles : []);

    return {
      success: true,
      principal: { userId, roles, claims: decoded },
    };
  } catch (error) {
    context.log?.("JWT validation failed", error);
    return {
      success: false,
      status: 401,
      message: "Invalid or expired token",
    };
  }
}

export function isAdmin(principal: Principal): boolean {
  return principal.roles.includes(adminRole);
}
