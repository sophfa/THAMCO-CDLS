import { HttpRequest, InvocationContext } from "@azure/functions";

export interface AuthResult {
  isValid: boolean;
  userId?: string;
  error?: string;
}

/**
 * Validates the Bearer token from the Authorization header
 *
 * PRODUCTION SETUP:
 * 1. Install dependencies: npm install jsonwebtoken jwks-rsa
 * 2. Set environment variables:
 *    - AUTH0_DOMAIN: Your Auth0 domain (e.g., dev-xxx.us.auth0.com)
 *    - AUTH0_AUDIENCE: Your API identifier
 * 3. Uncomment the JWT verification code below
 */
export function validateToken(
  req: HttpRequest,
  ctx: InvocationContext
): AuthResult {
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

    // ==== PRODUCTION JWT VERIFICATION ====
    // Uncomment this section and install required packages for production
    /*
    const jwt = require('jsonwebtoken');
    const jwksClient = require('jwks-rsa');
    
    const client = jwksClient({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
    
    function getKey(header: any, callback: any) {
      client.getSigningKey(header.kid, function (err: any, key: any) {
        if (err) {
          callback(err);
          return;
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
      });
    }
    
    return new Promise((resolve) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: process.env.AUTH0_AUDIENCE,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ['RS256'],
        },
        (err: any, decoded: any) => {
          if (err) {
            ctx.log('JWT verification failed:', err);
            resolve({ isValid: false, error: 'Invalid or expired token' });
            return;
          }
          
          const userId = decoded.sub;
          if (!userId) {
            resolve({ isValid: false, error: 'Token missing user ID (sub claim)' });
            return;
          }
          
          ctx.log(`Token validated for user: ${userId}`);
          resolve({ isValid: true, userId });
        }
      );
    });
    */
    // ==== END PRODUCTION CODE ====

    // DEVELOPMENT/TESTING: Basic token validation (NO SIGNATURE VERIFICATION)
    // This should be replaced with proper JWT verification above for production
    try {
      // Basic token structure validation
      const parts = token.split(".");
      if (parts.length !== 3) {
        return { isValid: false, error: "Invalid token structure" };
      }

      // Decode payload (WARNING: Not verifying signature!)
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

      // Extract user ID from 'sub' claim
      const userId = payload.sub;

      if (!userId) {
        return { isValid: false, error: "Token missing user ID (sub claim)" };
      }

      // Check token expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { isValid: false, error: "Token has expired" };
      }

      ctx.log(
        `Token validated for user: ${userId} (DEV MODE - NO SIGNATURE VERIFICATION)`
      );
      return { isValid: true, userId };
    } catch (decodeError) {
      ctx.log("Token decode error:", decodeError);
      return { isValid: false, error: "Failed to decode token" };
    }
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
  // Customize this based on how you store roles in your Auth0 token
  // Common patterns:
  // - token['https://yourapp.com/roles']
  // - token.roles
  // - token.permissions
  const roles = token["https://thamco.com/roles"] || token.roles || [];
  return Array.isArray(roles) && roles.includes("Admin");
}
