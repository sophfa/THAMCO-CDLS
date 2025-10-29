<template>
  <div style="height: 100%">
    <NavBar />
    <router-view />
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
</style>
