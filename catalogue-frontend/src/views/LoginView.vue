<template>
  <div class="auth-page">
    <h1>Login</h1>
    <p>Sign in using your Teesside University Microsoft account</p>
    <button @click="handleLogin" class="login-btn">
      <i class="fab fa-microsoft"></i> Sign in with Microsoft
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { login, getUser } from "../services/authService";

const router = useRouter();
const user = ref<any>(null);

onMounted(async () => {
  user.value = await getUser();
  if (user.value) {
    router.push("/catalogue");
  }
});

async function handleLogin() {
  await login();
}
</script>

<style scoped>
.auth-page {
  text-align: center;
  margin-top: 4rem;
}
.login-btn {
  background-color: #2f2f2f;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}
.login-btn:hover {
  background-color: #444;
}
</style>
