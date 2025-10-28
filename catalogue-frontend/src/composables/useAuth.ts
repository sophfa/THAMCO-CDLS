import { ref, computed, onMounted } from "vue";
import { getUser, logout as auth0Logout } from "../services/authService";

const user = ref<any>(null);

export function useAuth() {
  const loggedIn = computed(() => !!user.value);

  async function init() {
    // Load user profile from localStorage or Auth0
    const authUser = await getUser();
    user.value = authUser || null;
  }

  async function logout() {
    user.value = null;
    await auth0Logout();
  }

  // Initialize once when composable is used
  onMounted(init);

  return { user, loggedIn, logout };
}
