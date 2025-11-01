<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { fetchCatalogue, type Product } from "../services/CatalogueService";
import { useFavorites } from "../services/favouritesService";
import { useRouter } from "vue-router";
import { getCloudinaryUrl } from "../assets/cloudinary";

const products = ref<Product[]>([]);
const loading = ref(true);
const error = ref("");
const router = useRouter();

const {
  getFavoriteProducts,
  toggleFavorite,
  isFavorite,
  hasFavorites,
  favoritesCount,
  clearAllFavorites,
  initializeFavorites,
  isLoading: favoritesLoading,
  lastError: favoritesError,
} = useFavorites();

const favoriteProducts = computed(() => getFavoriteProducts(products.value));

onMounted(async () => {
  try {
    // Initialize favorites from API first
    await initializeFavorites();

    const data = await fetchCatalogue();
    products.value = data;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

const viewDetails = (product: Product) => {
  router.push(`/product/${product.id}`);
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
</script>

<template>
  <section class="favourites">
    <div class="header">
      <h1>My Favourites</h1>
      <p v-if="!loading && hasFavorites">
        You have {{ favoritesCount }} favorite{{
          favoritesCount !== 1 ? "s" : ""
        }}
      </p>
      <button v-if="hasFavorites" @click="clearAllFavorites" class="clear-btn">
        Clear All Favourites
      </button>
    </div>

    <p v-if="loading || favoritesLoading">Loading your favourites...</p>
    <p v-if="error || favoritesError" class="error">
      {{ error || favoritesError }}
    </p>

    <div v-if="!loading && !hasFavorites" class="empty-state">
      <div class="empty-icon">☆</div>
      <h2>No favourites yet</h2>
      <p>Devices you add to your favourites will appear here.</p>
      <router-link to="/catalogue" class="browse-btn">
        Browse Catalogue
      </router-link>
    </div>

    <div class="grid" v-if="!loading && hasFavorites">
      <div v-for="product in favoriteProducts" :key="product.id" class="card">
        <div class="card-content">
          <img
            class="image-class"
            :src="getCloudinaryUrl(product.imageUrl)"
            :alt="product.name"
            style="max-width: 100%; height: auto"
          />
          <h2>{{ product.name }}</h2>
          <p><strong>Category:</strong> {{ product.category }}</p>
          <p><strong>Price:</strong> £{{ product.price }}</p>
          <p>
            <strong>Status:</strong>
            {{ product.inStock ? "Available" : "Loaned Out" }}
          </p>
          <p v-if="product.description">{{ product.description }}</p>
        </div>

        <div class="button-group">
          <button @click="viewDetails(product)" class="details-btn">
            See Details
          </button>

          <div class="action-buttons">
            <button
              @click="handleReserveOrWaitlist(product)"
              :class="[
                'action-btn',
                product.inStock ? 'reserve-btn' : 'waitlist-btn',
              ]"
            >
              {{ product.inStock ? "Reserve" : "Join Waitlist" }}
            </button>

            <div class="favorite">
              <button
                @click="toggleFavorite(product.id)"
                :class="{ 'is-favorite': isFavorite(product.id) }"
                class="favorite-btn"
                title="Remove from favourites"
              >
                <span>★</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.favourites {
  padding: 2rem;
  text-align: center;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  margin-bottom: 0.5rem;
}

.header p {
  color: #666;
  margin-bottom: 1rem;
}

.clear-btn {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.clear-btn:hover {
  background-color: #dc2626;
}

.empty-state {
  padding: 4rem 2rem;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h2 {
  margin-bottom: 1rem;
  color: #333;
}

.browse-btn {
  display: inline-block;
  background-color: #007bff;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  margin-top: 1rem;
}

.browse-btn:hover {
  background-color: #0056b3;
}

.error {
  color: #ef4444;
  padding: 1rem;
  background-color: #fef2f2;
  border-radius: 4px;
  margin: 1rem 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3.5rem;
  grid-auto-rows: 1fr;
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
  color: gold;
}

.favorite-btn:hover {
  background-color: #f5f5f5;
}
</style>
