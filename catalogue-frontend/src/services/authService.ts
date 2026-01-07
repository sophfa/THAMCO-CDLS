import { createAuth0Client, Auth0Client } from "@auth0/auth0-spa-js";
import { computed } from "vue";

let auth0: Auth0Client | null = null;

const DEV_CALLBACK_URL = import.meta.env.VITE_AUTH0_DEV_CALLBACK_URL;
const TEST_CALLBACK_URL = import.meta.env.VITE_AUTH0_TEST_CALLBACK_URL;
const PROD_CALLBACK_URL = import.meta.env.VITE_AUTH0_PROD_CALLBACK_URL;
const DEPLOY_ENV = import.meta.env.VITE_DEPLOY_ENV;

function getRedirectUri(): string | undefined {
  if (!import.meta.env.PROD) {
    return DEV_CALLBACK_URL;
  }

  if (DEPLOY_ENV === "prod" && PROD_CALLBACK_URL) {
    return PROD_CALLBACK_URL;
  }

  if (DEPLOY_ENV === "test" && TEST_CALLBACK_URL) {
    return TEST_CALLBACK_URL;
  }

  return PROD_CALLBACK_URL || TEST_CALLBACK_URL || DEV_CALLBACK_URL;
}

// Secure storage keys
const STORAGE_KEYS = {
  USER: "thamco_user_data",
  TOKEN_TIMESTAMP: "thamco_token_ts",
  SESSION_ID: "thamco_session_id",
};

// Session timeout (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000;

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

function isSessionValid(): boolean {
  const timestamp = sessionStorage.getItem(STORAGE_KEYS.TOKEN_TIMESTAMP);
  if (!timestamp) return false;

  const lastActivity = parseInt(timestamp, 10);
  const now = Date.now();
  return now - lastActivity < SESSION_TIMEOUT;
}

function updateSessionTimestamp() {
  sessionStorage.setItem(STORAGE_KEYS.TOKEN_TIMESTAMP, Date.now().toString());
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.USER);
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN_TIMESTAMP);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
}

// Secure user data storage
function saveUserToStorage(user: any) {
  if (!user) return;

  const userToStore = {
    sub: user.sub,
    roles: user["https://thamco-clds.app/roles"],
  };
  sessionStorage.setItem(STORAGE_KEYS.USER, encodeData(userToStore));
  updateSessionTimestamp();

  if (!sessionStorage.getItem(STORAGE_KEYS.SESSION_ID)) {
    const sessionId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }
}

function getUserFromStorage(): any | null {
  if (!isSessionValid()) {
    clearSession();
    return null;
  }

  const encoded = sessionStorage.getItem(STORAGE_KEYS.USER);
  if (!encoded) return null;

  updateSessionTimestamp();
  return decodeData(encoded);
}

// Initialize Auth0 and handle redirect callback if present
export async function initAuth() {
  const redirect = getRedirectUri();
  auth0 = await createAuth0Client({
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: getRedirectUri(),
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      scope: "openid profile email",
    },
    useRefreshTokens: true,
    cacheLocation: "localstorage",
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
    saveUserToStorage(auth0User);
    return auth0User;
  }

// Fallback to sessionStorage if Auth0 session expired but local session valid
  const cachedUser = getUserFromStorage();
  if (cachedUser) {
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

export async function getToken(): Promise<string | null> {
  try {
    const token = await auth0?.getTokenSilently();
    updateSessionTimestamp();
    return token ?? null;
  } catch (err) {
    console.error("Token retrieval failed:", err);
    if (!isSessionValid()) {
      clearSession();
    }
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const auth0Authenticated = await auth0?.isAuthenticated();
  if (auth0Authenticated) {
    updateSessionTimestamp();
    return true;
  }

  return isSessionValid() && !!getUserFromStorage();
}
