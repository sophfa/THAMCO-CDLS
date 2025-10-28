<template>
  <div class="search">
    <input
      v-model="term"
      @input="$emit('search', term)"
      placeholder="Search catalogue..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const term = ref("");
</script>

<style scoped>
.search {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}
input {
  width: 60%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #ccc;
}
</style>
