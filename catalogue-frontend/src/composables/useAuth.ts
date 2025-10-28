import { ref, computed } from "vue";

const user = ref<{ username: string } | null>(null);

export function useAuth() {
  const loggedIn = computed(() => !!user.value);

  function login(username: string) {
    user.value = { username };
  }

  function signup(username: string) {
    user.value = { username };
  }

  function logout() {
    user.value = null;
  }

  return { user, loggedIn, login, signup, logout };
}
