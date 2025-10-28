<template>
  <div class="auth-page">
    <h1>Create Account</h1>
    <form @submit.prevent="handleSignup">
      <input v-model="username" placeholder="Choose a username" required />
      <button type="submit">Sign Up</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";

const username = ref("");
const { signup } = useAuth();
const router = useRouter();

function handleSignup() {
  signup(username.value);
  router.push("/catalogue");
}
</script>
