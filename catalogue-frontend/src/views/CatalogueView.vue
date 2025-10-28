<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { fetchCatalogue, type Product } from "../services/CatalogueService";
import { useFavorites } from "../services/favouritesService";
import { useAuth } from "../composables/useAuth";
import SearchBar from "../components/SearchBar.vue";

const products = ref<Product[]>([]);
const searchTerm = ref("");
const loading = ref(true);
const error = ref("");
const router = useRouter();

// Use auth composable for login status
const { loggedIn } = useAuth();

// Use the API-based favorites service
const {
  isFavorite,
  toggleFavorite,
  initializeFavorites,
  isLoading: favoritesLoading,
  lastError: favoritesError,
} = useFavorites();

onMounted(async () => {
  try {
    // Initialize favorites from API
    await initializeFavorites();

    const data = await fetchCatalogue();
    products.value = data;
    console.log("Fetched products:", data);
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
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="favoritesError" class="favorites-error">
      Favorites: {{ favoritesError }}
    </p>

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

          <div v-if="loggedIn" class="action-buttons">
            <button
              @click="handleReserveOrWaitlist(p)"
              :class="[
                'action-btn',
                p.inStock ? 'reserve-btn' : 'waitlist-btn',
              ]"
            >
              {{ p.inStock ? "Reserve" : "Join Waitlist" }}
            </button>

            <div class="favorite">
              <button
                @click="toggleFavorite(p.id)"
                :class="{ 'is-favorite': isFavorite(p.id) }"
                class="favorite-btn"
              >
                <span v-if="isFavorite(p.id)">★</span>
                <span v-else>☆</span>
              </button>
            </div>
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
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  padding: 0.5rem;
  border-radius: 4px;
}
.favorite-btn.is-favorite {
  color: gold;
}
.favorite-btn:hover {
  background-color: #f5f5f5;
}

.error {
  color: #ef4444;
  padding: 1rem;
  background-color: #fef2f2;
  border-radius: 4px;
  margin: 1rem 0;
}

.favorites-error {
  color: #f59e0b;
  padding: 0.5rem;
  background-color: #fffbeb;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}
</style>
