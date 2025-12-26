<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { fetchCatalogue, type Product } from "../services/CatalogueService";
import { useFavorites } from "../services/favouritesService";
import { useRouter } from "vue-router";
import { useReservationFlow } from "../composables/useReservationFlow";

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

const {
  dialog,
  handleReserveOrWaitlist,
  confirmDialog,
  closeDialog,
  hasActiveLoanForProduct,
  isOnWaitlist,
} = useReservationFlow();

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
            :src="product.imageUrl"
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
              :disabled="!product.inStock && isOnWaitlist(product.id)"
              :class="[
                'action-btn',
                hasActiveLoanForProduct(product.id)
                  ? 'cancel-btn'
                  : product.inStock
                  ? 'reserve-btn'
                  : 'waitlist-btn',
              ]"
            >
              <span v-if="hasActiveLoanForProduct(product.id)">
                Cancel Reservation
              </span>
              <span v-else-if="product.inStock">Reserve</span>
              <span v-else-if="isOnWaitlist(product.id)">On Waitlist</span>
              <span v-else>Join Waitlist</span>
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

  <div v-if="dialog.open" class="modal-backdrop">
    <div class="modal">
      <h3 class="modal-title">
        <span v-if="dialog.state === 'confirm'">
          {{
            dialog.kind === "reserve"
              ? "Confirm Reservation"
              : dialog.kind === "waitlist"
              ? "Join Waitlist"
              : "Cancel Reservation"
          }}
        </span>
        <span v-else-if="dialog.state === 'success'">
          {{
            dialog.kind === "reserve"
              ? "Reservation Confirmed"
              : dialog.kind === "waitlist"
              ? "Waitlist Joined"
              : "Reservation Cancelled"
          }}
        </span>
        <span v-else> Action Failed </span>
      </h3>

      <div class="modal-body">
        <template v-if="dialog.state === 'confirm' && dialog.product">
          <p>
            {{
              dialog.kind === "reserve"
                ? `Reserve ${dialog.product.name}?`
                : dialog.kind === "waitlist"
                ? `Join the waitlist for ${dialog.product.name}?`
                : `Cancel the reservation for ${dialog.product.name}?`
            }}
          </p>
          <div v-if="dialog.kind === 'reserve'" class="date-range">
            <div class="date-field">
              <label>From</label>
              <input type="date" v-model="dialog.startDate" />
            </div>
            <div class="date-field">
              <label>Until</label>
              <input
                type="date"
                v-model="dialog.endDate"
                disabled
              />
            </div>
          </div>
        </template>

        <template v-else-if="dialog.state === 'success' && dialog.product">
          <p v-if="dialog.kind === 'reserve'">
            Device reserved. A receipt has been emailed to you.
          </p>
          <p v-else-if="dialog.kind === 'waitlist'">
            You have joined the waitlist. We'll notify you when it's available.
          </p>
          <p v-else>
            Your reservation has been cancelled.
          </p>
        </template>

        <template v-else>
          <p>{{ dialog.error || "Something went wrong. Please try again." }}</p>
        </template>
      </div>

      <div class="modal-actions">
        <template v-if="dialog.state === 'confirm'">
          <button class="btn-secondary" @click="closeDialog">Cancel</button>
          <button
            class="btn-primary"
            :disabled="dialog.loading"
            @click="confirmDialog"
          >
            {{
              dialog.loading
                ? "Working…"
                : dialog.kind === "reserve"
                ? "Confirm"
                : dialog.kind === "waitlist"
                ? "Join"
                : "Cancel Reservation"
            }}
          </button>
        </template>

        <template v-else>
          <button class="btn-primary" @click="closeDialog">Close</button>
        </template>
      </div>
    </div>
  </div>
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
  background-color: #a6383e;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.clear-btn:hover {
  background-color: #8a2f34;
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
  color: #a6383e;
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
  height: 200px;
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
  border: 1px solid #867537;
  border-radius: 4px;
  background: white;
  color: #867537;
  cursor: pointer;
  font-weight: bold;
}

.details-btn:hover {
  background-color: #867537;
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
  background-color: #6c7c69;
  color: white;
}

.reserve-btn:hover {
  background-color: #5a6857;
}

.waitlist-btn {
  background-color: #6b7280;
  color: white;
}

.waitlist-btn:hover {
  background-color: #4b5563;
}

.favorite-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  padding: 0.5rem;
  border-radius: 4px;
  color: #b49d4b;
}

.favorite-btn:hover {
  background-color: #f5f5f5;
}

.cancel-btn {
  background-color: #c0392b;
  color: white;
}
.cancel-btn:hover {
  background-color: #a6211f;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border-radius: 12px;
  width: 95%;
  max-width: 480px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.modal-title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
}
.modal-body {
  color: #374151;
  margin-bottom: 1rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.date-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.date-field label {
  display: block;
  font-size: 0.85rem;
  color: #374151;
  margin-bottom: 0.25rem;
}
.date-field input[type="date"] {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
}
.btn-primary {
  background: #6c7c69;
  color: #fff;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
}
.btn-secondary {
  background: #e5e7eb;
  color: #111827;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
}
</style>
