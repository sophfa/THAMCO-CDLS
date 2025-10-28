<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchCatalogue, type Product } from "../services/CatalogueService";

const products = ref<Product[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    products.value = await fetchCatalogue();
    console.log("Fetched products:", products.value);
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <h1>Device Catalogue</h1>
    <p v-if="loading">Loading...</p>
    <p v-if="error">{{ error }}</p>

    <div v-if="!loading && !error" class="grid">
      <div v-for="p in products" :key="p.id" class="card">
        <img
          class="image-class"
          :src="p.imageUrl"
          :alt="p.name"
          style="max-width: 100%; height: auto"
        />
        <h2>{{ p.name }}</h2>
        <p><strong>Category:</strong> {{ p.category }}</p>
        <p><strong>Price:</strong> £{{ p.price }}</p>
        <p>
          <strong>Status:</strong> {{ p.inStock ? "Available" : "Loaned Out" }}
        </p>
        <p v-if="p.description">{{ p.description }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.card {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fafafa;
}
</style>
