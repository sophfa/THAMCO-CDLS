import { HttpRequest, InvocationContext } from "@azure/functions";
import jwt, { JwtHeader } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface AuthResult {
  isValid: boolean;
  userId?: string;
  token?: any;
  error?: string;
}

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

const client = domain
  ? jwksClient({
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    })
  : null;

function getSigningKey(header: JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!client) {
      reject(new Error("JWKS client not configured"));
      return;
    }
    client.getSigningKey(header.kid || "", (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        reject(new Error("No signing key available"));
        return;
      }
      resolve(signingKey);
    });
  });
}

export async function validateToken(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get("authorization") || "";

    if (!authHeader) {
      return { isValid: false, error: "No authorization header provided" };
    }

    if (!authHeader.startsWith("Bearer ")) {
      return { isValid: false, error: "Invalid authorization header format" };
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    if (!token) {
      return { isValid: false, error: "No token provided" };
    }

    // Fallback: no Auth0 config -> perform basic structural validation (dev mode)
    if (!domain || !audience || !client) {
      try {
        const parts = token.split(".");
        if (parts.length !== 3) {
          return { isValid: false, error: "Invalid token structure" };
        }
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        const userId = payload.sub;
        if (!userId) {
          return { isValid: false, error: "Token missing user ID (sub claim)" };
        }
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return { isValid: false, error: "Token has expired" };
        }
        ctx.log(
          `Token validated for user: ${userId} (DEV MODE - NO SIGNATURE VERIFICATION)`
        );
        return { isValid: true, userId };
      } catch (err) {
        ctx.log("Token decode error (dev mode):", err);
        return { isValid: false, error: "Failed to decode token" };
      }
    }

    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        async (header, callback) => {
          try {
            const signingKey = await getSigningKey(header as JwtHeader);
            callback(null, signingKey);
          } catch (err) {
            callback(err as Error, undefined);
          }
        },
        {
          audience,
          issuer: `https://${domain}/`,
          algorithms: ["RS256"],
        },
        (err, payload) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(payload);
        }
      );
    });

    const userId = decoded?.sub;
    if (!userId) {
      return { isValid: false, error: "Token missing user ID (sub claim)" };
    }

    ctx.log(`Token validated for user: ${userId}`);
    return { isValid: true, userId, token: decoded };
  } catch (error: any) {
    ctx.log("Token validation error:", error);
    return { isValid: false, error: "Token validation failed" };
  }
}

/**
 * Verifies that the authenticated user matches the requested userId
 */
export function verifyUserAccess(
  authUserId: string,
  requestedUserId: string
): boolean {
  return authUserId === requestedUserId;
}

/**
 * Checks if the user has admin role
 * Assumes roles are passed in the token as a custom claim
 */
export function isAdmin(token: any): boolean {
  const roles =
    token?.["https://thamco.com/roles"] ||
    token?.["https://thamco-clds.app/roles"] ||
    token?.roles ||
    [];
  if (!Array.isArray(roles)) return false;
  return roles
    .filter((role) => typeof role === "string")
    .some((role) => role.toLowerCase() === "admin");
}
