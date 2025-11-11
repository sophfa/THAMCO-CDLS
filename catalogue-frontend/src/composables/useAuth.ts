import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from "vue";
import {
  getUser,
  logout as auth0Logout,
  isAuthenticated,
} from "../services/authService";

const user = ref<any>(null);
let isInitialized = false;

// Activity tracking to keep session alive
let activityTimeout: number | null = null;
const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];

function resetActivityTimer() {
  if (activityTimeout) {
    clearTimeout(activityTimeout);
  }

  // Set a timer to check authentication after 25 minutes of inactivity
  activityTimeout = window.setTimeout(async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      user.value = null;
      console.log("Session expired due to inactivity");
    }
  }, 25 * 60 * 1000); // 25 minutes (less than the 30 min session timeout)
}

function setupActivityTracking() {
  activityEvents.forEach((event) => {
    window.addEventListener(event, resetActivityTimer);
  });
  resetActivityTimer();
}

function cleanupActivityTracking() {
  if (activityTimeout) {
    clearTimeout(activityTimeout);
    activityTimeout = null;
  }
  activityEvents.forEach((event) => {
    window.removeEventListener(event, resetActivityTimer);
  });
}

async function init() {
  if (isInitialized) return;

  // Load user profile from Auth0 or secure localStorage cache
  const authUser = await getUser();
  user.value = authUser || null;
  console.log("user before role assign: ", user.value);

  if (user.value) {
    // Assign default role if not Admin
    if (user.value.role !== "Admin") {
      user.value.role = "User";
    }

    // Start activity tracking
    setupActivityTracking();
  }

  isInitialized = true;
}

export function useAuth() {
  const loggedIn = computed(() => !!user.value);

  async function logout() {
    user.value = null;
    isInitialized = false;

    // Clear activity tracking
    cleanupActivityTracking();

    await auth0Logout();
  }

  // Only set up lifecycle hooks if we're in a component context
  const instance = getCurrentInstance();
  if (instance) {
    // Cleanup on unmount (only in component context)
    onUnmounted(() => {
      cleanupActivityTracking();
    });

    // Initialize once when composable is used in component
    onMounted(init);
  } else {
    // If called outside component (like router), initialize immediately
    if (!isInitialized) {
      init();
    }
  }

  return { user, loggedIn, logout, ensureInitialized: init };
}
