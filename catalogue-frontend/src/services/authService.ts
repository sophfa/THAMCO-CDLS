import { createAuth0Client, Auth0Client } from "@auth0/auth0-spa-js";
import { computed } from "vue";

let auth0: Auth0Client | null = null;

// Secure storage keys
const STORAGE_KEYS = {
  USER: "thamco_user_data",
  TOKEN_TIMESTAMP: "thamco_token_ts",
  SESSION_ID: "thamco_session_id",
};

// Session timeout (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Simple encryption/obfuscation for localStorage (basic security)
function encodeData(data: any): string {
  try {
    return btoa(JSON.stringify(data));
  } catch (e) {
    console.error("Failed to encode data:", e);
    return "";
  }
}

function decodeData(encoded: string): any {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    console.error("Failed to decode data:", e);
    return null;
  }
}

// Session management
function isSessionValid(): boolean {
  const timestamp = localStorage.getItem(STORAGE_KEYS.TOKEN_TIMESTAMP);
  if (!timestamp) return false;

  const lastActivity = parseInt(timestamp, 10);
  const now = Date.now();
  return now - lastActivity < SESSION_TIMEOUT;
}

function updateSessionTimestamp() {
  localStorage.setItem(STORAGE_KEYS.TOKEN_TIMESTAMP, Date.now().toString());
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_TIMESTAMP);
  localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
}

// Secure user data storage
function saveUserToStorage(user: any) {
  if (!user) return;

  // Only store non-sensitive user data
  const userToStore = {
    sub: user.sub,
    name: user.name,
    email: user.email,
    nickname: user.nickname,
    picture: user.picture,
    roles: user["https://thamco-clds.app/roles"],
  };

  localStorage.setItem(STORAGE_KEYS.USER, encodeData(userToStore));
  updateSessionTimestamp();

  // Generate a simple session ID for this login session
  if (!localStorage.getItem(STORAGE_KEYS.SESSION_ID)) {
    const sessionId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }
}

function getUserFromStorage(): any | null {
  if (!isSessionValid()) {
    clearSession();
    return null;
  }

  const encoded = localStorage.getItem(STORAGE_KEYS.USER);
  if (!encoded) return null;

  updateSessionTimestamp(); // Extend session on activity
  return decodeData(encoded);
}

// Initialize Auth0 and handle redirect callback if present
export async function initAuth() {
  auth0 = await createAuth0Client({
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE, // your API identifier
      scope: "openid profile email",
    },
    useRefreshTokens: true,
    cacheLocation: "localstorage", // Use localStorage for token caching
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
  return auth0;
}

export const isAdmin = computed(async () => {
  const role = await getUserRole();
  return (role || "").toLowerCase() === "admin";
});

export async function getUser() {
  // First, try to get from Auth0
  const auth0User = await auth0?.getUser();

  if (auth0User) {
    console.log("user from auth0: ", auth0User);
    saveUserToStorage(auth0User);
    return auth0User;
  }

  // Fallback to localStorage if Auth0 session expired but local session valid
  const cachedUser = getUserFromStorage();
  if (cachedUser) {
    console.log("user from cache (session still valid)");
    return cachedUser;
  }

  return null;
}

// Get user ID (Auth0 "sub" claim)
export async function getUserId(): Promise<string | null> {
  const user = await getUser();
  return user?.sub ?? null;
}

export async function getUserEmail(): Promise<string | null> {
  const user = await getUser();
  return user?.email ?? null;
}

export async function getUserRole(): Promise<string | null> {
  const user = await getUser();
  const namespace = "https://thamco-clds.app/";
  const roles = user?.[`${namespace}roles`];
  console.log("roles from auth0: ", roles);
  return Array.isArray(roles) ? roles[0] : null;
}

// Login via Auth0 redirect
export async function login() {
  await auth0?.loginWithRedirect({
    appState: { returnTo: window.location.pathname },
  });
}

// Logout and clear local user cache
export async function logout() {
  clearSession();
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
    updateSessionTimestamp(); // Extend session on API activity
    return token ?? null;
  } catch (err) {
    console.error("Token retrieval failed:", err);
    // If token refresh fails, session might be expired
    if (!isSessionValid()) {
      clearSession();
    }
    return null;
  }
}

// Check if user is authenticated (including cached session)
export async function isAuthenticated(): Promise<boolean> {
  const auth0Authenticated = await auth0?.isAuthenticated();
  if (auth0Authenticated) {
    updateSessionTimestamp();
    return true;
  }

  // Check if we have a valid cached session
  return isSessionValid() && !!getUserFromStorage();
}
