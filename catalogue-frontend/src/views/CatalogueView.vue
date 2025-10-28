<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { fetchCatalogue, type Product } from "../services/CatalogueService";
import SearchBar from "../components/SearchBar.vue";

const products = ref<Product[]>([]);
const searchTerm = ref("");
const loading = ref(true);
const favorites = ref<Set<string>>(new Set());
const router = useRouter();
const isLoggedIn = ref(false); // Add this to track login status

onMounted(async () => {
  try {
    const data = await fetchCatalogue();
    products.value = data;
    console.log("Fetched products:", data);
    // TODO: Set isLoggedIn based on actual auth state
    // isLoggedIn.value = checkAuthStatus();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

const filteredProducts = computed(() =>
  products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
);

const toggleFavorite = (productId: string) => {
  if (favorites.value.has(productId)) {
    favorites.value.delete(productId);
  } else {
    favorites.value.add(productId);
  }
};

const handleReserveOrWaitlist = (product: Product) => {
  if (product.inStock) {
    console.log(`Reserving ${product.name}`);
    // Add reserve logic here
  } else {
    console.log(`Joining waitlist for ${product.name}`);
    // Add waitlist logic here
  }
};

const viewDetails = (product: Product) => {
  console.log(`Viewing details for ${product.name}`);

  // Navigate to product details page
  router.push(`/product/${product.id}`);
};
</script>

<template>
  <section class="catalogue">
    <h1>Device Catalogue</h1>
    <SearchBar @search="searchTerm = $event" />
    <p v-if="loading">Loading...</p>
    <p v-if="error">{{ error }}</p>

    <div class="grid" v-if="!loading && !error">
      <div v-for="p in filteredProducts" :key="p.id" class="card">
        <div class="card-content">
          <img
            class="image-class"
            :src="'src/assets/' + p.imageUrl"
            :alt="p.name"
            style="max-width: 100%; height: auto"
          />
          <h2>{{ p.name }}</h2>
          <p><strong>Category:</strong> {{ p.category }}</p>
          <p><strong>Price:</strong> £{{ p.price }}</p>
          <p>
            <strong>Status:</strong>
            {{ p.inStock ? "Available" : "Loaned Out" }}
          </p>
          <p v-if="p.description">{{ p.description }}</p>
        </div>

        <div class="button-group">
          <button @click="viewDetails(p)" class="details-btn">
            See Details
          </button>

          <div v-if="isLoggedIn" class="action-buttons">
            <button
              @click="handleReserveOrWaitlist(p)"
              :class="[
                'action-btn',
                p.inStock ? 'reserve-btn' : 'waitlist-btn',
              ]"
            >
              {{ p.inStock ? "Reserve" : "Join Waitlist" }}
            </button>

            <button
              @click="toggleFavorite(p.id)"
              :class="['favorite-btn', { favorited: favorites.has(p.id) }]"
            >
              {{ favorites.has(p.id) ? "♥" : "♡" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.catalogue {
  padding: 2rem;
  text-align: center;
}
.card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3.5rem;
  grid-auto-rows: 1fr; /* Add this to make all rows the same height */
}
.image-class {
  width: 100%;
  height: auto;
  object-fit: contain;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.card-content {
  flex: 1;
}
.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto;
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
}
.details-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #007bff;
  border-radius: 4px;
  background: white;
  color: #007bff;
  cursor: pointer;
  font-weight: bold;
}
.details-btn:hover {
  background-color: #007bff;
  color: white;
}
.action-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.reserve-btn {
  background-color: #4caf50;
  color: white;
}
.reserve-btn:hover {
  background-color: #45a049;
}
.waitlist-btn {
  background-color: #ff9800;
  color: white;
}
.waitlist-btn:hover {
  background-color: #e68900;
}
.favorite-btn {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 1.2rem;
}
.favorite-btn.favorited {
  color: #e74c3c;
}
.favorite-btn:hover {
  background-color: #f5f5f5;
}
</style>
