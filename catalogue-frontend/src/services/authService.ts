import { createAuth0Client, Auth0Client } from "@auth0/auth0-spa-js";

let auth0: Auth0Client | null = null;

// Initialize Auth0 and handle redirect callback if present
export async function initAuth() {
  auth0 = await createAuth0Client({
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL,
    },
    cacheLocation: "localstorage",
    useRefreshTokens: true,
  });

  if (
    window.location.search.includes("code=") &&
    window.location.search.includes("state=")
  ) {
    try {
      await auth0.handleRedirectCallback();
    } catch (e) {
      console.error("Redirect handling failed:", e);
    }
    window.history.replaceState({}, document.title, "/");
  }

  const user = await auth0.getUser();
  if (user) localStorage.setItem("user", JSON.stringify(user));

  return auth0;
}

// Retrieve user profile (cached first, then from Auth0)
export async function getUser() {
  const cached = localStorage.getItem("user");
  if (cached) return JSON.parse(cached);

  const user = await auth0?.getUser();
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  }
  return null;
}

// Get user ID (Auth0 "sub" claim)
export async function getUserId(): Promise<string | null> {
  const user = await getUser();
  return user?.sub ?? null;
}

// Login via Auth0 redirect
export async function login() {
  await auth0?.loginWithRedirect({
    appState: { returnTo: window.location.pathname },
  });
}

// Logout and clear local user cache
export async function logout() {
  localStorage.removeItem("user");
  await auth0?.logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
}

// Get a valid access token silently (for API calls)
export async function getToken(): Promise<string | null> {
  try {
    const token = await auth0?.getTokenSilently();
    return token ?? null;
  } catch (err) {
    console.error("Token retrieval failed:", err);
    return null;
  }
}
