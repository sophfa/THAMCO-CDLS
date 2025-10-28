<template>
  <div>
    <h1>User Profile</h1>
    <p v-if="!loggedIn">You are not logged in.</p>
    <button v-if="!loggedIn" @click="login">Log In</button>
    <div v-else>
      <p>Welcome back, {{ username }}</p>
      <button @click="logout">Log Out</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const loggedIn = ref(false);
const username = ref("Sophie");

function login() {
  loggedIn.value = true;
}
function logout() {
  loggedIn.value = false;
}
</script>
