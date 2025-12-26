<template>
  <div class="app-shell">
    <NavBar />
    <main class="app-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import NavBar from "./components/NavBar.vue";
</script>

<style>
body {
  font-family: system-ui, sans-serif;
  background: #f8f9fa;
  margin: 0;
}
html,
body,
#app {
  height: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  font-family: "Gentium Book Plus", serif !important;
  button {
    font-family: "Gentium Book Plus", serif !important;
  }
}
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.app-content > * {
  flex: 1;
  min-height: 0;
}
</style>
