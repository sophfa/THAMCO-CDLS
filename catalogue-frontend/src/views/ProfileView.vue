<template>
  <div class="profile-page">
    <h1>User Profile</h1>

    <!-- Not logged in -->
    <div v-if="!user">
      <p>You are not logged in.</p>
      <button class="auth-btn" @click="handleLogin">Log In</button>
    </div>

    <!-- Logged in -->
    <div v-else>
      <img
        v-if="user.picture"
        :src="user.picture"
        alt="Profile Picture"
        class="profile-pic"
      />
      <p><strong>Name:</strong> {{ user.nickname }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>

      <button class="auth-btn" @click="handleLogout">Log Out</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { login, logout, getUser } from "../services/authService";

const user = ref<any>(null);

onMounted(async () => {
  user.value = await getUser();
});

async function handleLogin() {
  await login();
}

async function handleLogout() {
  await logout();
  user.value = null;
}
</script>

<style scoped>
.profile-page {
  max-width: 500px;
  margin: 3rem auto;
  text-align: center;
  background: #f8fafc;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.profile-pic {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 1rem;
}

.auth-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #334155;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.auth-btn:hover {
  background: #1e293b;
}
</style>
