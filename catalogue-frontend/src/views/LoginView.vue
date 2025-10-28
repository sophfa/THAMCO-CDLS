<template>
  <div class="auth-page">
    <h1>Login</h1>
    <form @submit.prevent="handleLogin">
      <input v-model="username" placeholder="Username" required />
      <button type="submit">Login</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";

const username = ref("");
const { login } = useAuth();
const router = useRouter();

function handleLogin() {
  login(username.value);
  router.push("/catalogue");
}
</script>

<style scoped>
.auth-page {
  text-align: center;
  margin-top: 4rem;
}
input {
  padding: 0.5rem;
  margin-right: 0.5rem;
}
button {
  padding: 0.5rem 1rem;
}
</style>
