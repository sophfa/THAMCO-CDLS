# JWT Authentication Setup Guide

## Current Status

✅ Token authentication is implemented with basic JWT decoding  
⚠️ **JWT signature verification is NOT enabled** (development mode only)

## Production Setup Instructions

### 1. Install Required Dependencies

```bash
cd loans-service-func
npm install jsonwebtoken jwks-rsa
npm install --save-dev @types/jsonwebtoken
```

### 2. Configure Environment Variables

Add these to your `local.settings.json` (local development) and Azure Function App Configuration (production):

```json
{
  "Values": {
    "AUTH0_DOMAIN": "your-tenant.us.auth0.com",
    "AUTH0_AUDIENCE": "https://your-api-identifier"
  }
}
```

**Finding your Auth0 values:**

- **AUTH0_DOMAIN**: Found in Auth0 Dashboard → Applications → Your App → Settings → Domain
- **AUTH0_AUDIENCE**: Found in Auth0 Dashboard → APIs → Your API → Settings → Identifier

### 3. Enable JWT Verification

In `src/utils/auth.ts`, uncomment the production JWT verification code (lines marked with "PRODUCTION JWT VERIFICATION").

The code will change from basic token decoding to proper signature verification using Auth0's public keys.

### 4. Test Authentication

1. Start your Azure Function:

   ```bash
   npm start
   ```

2. Test with a valid token:

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:7071/api/loans/user/USER_ID
   ```

3. Expected responses:
   - ✅ 200: Valid token, authorized user
   - ❌ 401: Invalid/expired token
   - ❌ 403: Valid token, but accessing other user's data

## Security Features Implemented

### Frontend (`catalogue-frontend`)

- ✅ All API calls use `authenticatedFetch()` with Bearer tokens
- ✅ Token retrieved from Auth0 SDK (`getToken()`)
- ✅ Automatic token refresh with Auth0
- ✅ Session management with 30-minute timeout

### Backend (`loans-service-func`)

- ✅ Token validation on protected endpoints
- ✅ User identity verification
- ✅ Token expiration checking
- ⚠️ **Signature verification** (needs to be enabled for production)

## Protected Endpoints

### User Endpoints (Require matching userId)

- `POST /loans` - Create loan
- `GET /loans/user/{userId}` - Get user loans
- `GET /loans/waitlist/{userId}` - Get user waitlist
- `POST /loans/device/{deviceId}/waitlist` - Join waitlist
- `POST /favourites` - Add favourite

### Admin Endpoints (Coming soon)

- `GET /loans` - List all loans
- `PUT /loans/{loanId}/authorize` - Approve loan

## Development vs Production

| Feature                | Development | Production      |
| ---------------------- | ----------- | --------------- |
| Token Format Check     | ✅ Yes      | ✅ Yes          |
| Token Expiration Check | ✅ Yes      | ✅ Yes          |
| Signature Verification | ❌ **NO**   | ✅ **Required** |
| JWKS Cache             | N/A         | ✅ Yes          |
| Rate Limiting          | N/A         | ✅ Yes          |

## Troubleshooting

### "No authorization header provided"

- Frontend: Check that `getToken()` returns a valid token
- Network: Inspect request headers in browser DevTools

### "Invalid or expired token"

- Token has expired (check `exp` claim)
- Token signature is invalid
- Auth0 configuration mismatch (domain/audience)

### "Access denied: Cannot access other user data"

- Token's `sub` claim doesn't match requested `userId`
- This is expected behavior for security

## Next Steps

1. ✅ Install `jsonwebtoken` and `jwks-rsa`
2. ✅ Configure Auth0 environment variables
3. ✅ Uncomment production JWT code in `auth.ts`
4. ✅ Test with valid/invalid tokens
5. ⬜ Deploy to Azure with environment variables
6. ⬜ Add admin role checking for admin endpoints

## Additional Resources

- [Auth0 Node.js API Quickstart](https://auth0.com/docs/quickstart/backend/nodejs)
- [JWT.io](https://jwt.io) - JWT debugger
- [JWKS Specification](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-key-sets)
