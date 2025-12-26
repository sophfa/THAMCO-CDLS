<template>
  <div
    class="product-page flex flex-col bg-gradient-to-br from-gray-50 to-white min-h-screen h-auto"
  >
    <div class="flex-grow flex flex-col justify-between h-auto min-h-screen">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"
          ></div>
          <p class="text-xl font-medium text-gray-600">
            Loading product details...
          </p>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="text-[#a6383e] text-4xl mb-4">⚠️</div>
          <p class="text-xl text-[#a6383e] font-medium">{{ error }}</p>
          <button
            @click="$router.go(-1)"
            class="mt-4 px-6 py-2 bg-[#a6383e] text-white rounded-lg hover:bg-[#8a2f34] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>

      <!-- Product content -->
      <div
        v-if="!loading && !error && product"
        class="container mx-auto px-4 py-8 max-w-7xl h-auto min-h-screen"
      >
        <!-- Breadcrumb -->
        <nav class="nav-row">
          <router-link
            to="/catalogue"
            class="hover:text-blue-600 transition-colors"
            >Catalogue</router-link
          >
          <span> › </span>
          <span class="text-gray-900 font-medium">{{ product.name }}</span>
        </nav>

        <div class="content flex gap-8 items-start h-auto min-h-screen">
          <!-- Sticky Product Images & Buttons Column -->
          <div class="product-column sticky-column">
            <div class="product-images-wrapper">
              <!-- Product Images Section -->
              <div class="product-images space-y-4 flex-shrink-0">
                <div
                  class="main-image group relative overflow-hidden bg-gray-100 rounded-2xl shadow-lg"
                >
                  <!-- Loan Status Corner Banner -->
                  <div
                    v-if="product.availabilityStatus !== 'unavailable'"
                    class="absolute top-0 right-0 z-20"
                    :class="
                      product.inStock
                        ? 'status-banner-available'
                        : 'status-banner-loaned'
                    "
                  >
                    <div class="status-banner-text">
                      {{ product.inStock ? "AVAILABLE" : "LOANED" }}
                    </div>
                  </div>

                  <!-- Favourite Button (Catalogue Style) -->
                  <div
                    class="favorite absolute top-4 left-4 z-10"
                    v-if="!isAdmin && user"
                  >
                    <button
                      @click="toggleFavorite"
                      :class="{ 'is-favorite': isFavorited }"
                      class="favorite-btn"
                    >
                      <span v-if="isFavorited">★</span>
                      <span v-else>☆</span>
                    </button>
                  </div>

                  <img
                    :src="product.mainImage"
                    :alt="product.name"
                    class="product-image w-[400px] h-[500px] object-contain p-8 group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <!-- Thumbnail Gallery -->
                <div
                  class="thumbnail-gallery grid grid-cols-4 gap-3"
                  v-if="product.images && product.images.length > 1"
                >
                  <div
                    v-for="(image, index) in product.images"
                    :key="index"
                    class="relative group cursor-pointer"
                    @click="selectImage(image)"
                  >
                    <img
                      :src="image"
                      :alt="`${product.name} view ${index + 1}`"
                      class="w-full h-20 object-contain bg-gray-50 rounded-lg border-2 border-transparent group-hover:border-blue-500 transition-all duration-200 p-2"
                      :class="{
                        'border-blue-500 bg-blue-50':
                          product.mainImage === image,
                      }"
                    />
                  </div>
                </div>
              </div>

              <!-- Action Buttons Below Images -->
              <div class="button-container" v-if="user">
                <button
                  v-if="!isAdmin"
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
                  <span v-else-if="product.inStock">Reserve Device</span>
                  <span v-else-if="isOnWaitlist(product.id)">On Waitlist</span>
                  <span v-else>Join Waitlist</span>
                </button>
                <button
                  v-else
                  @click="viewWaitlist"
                  class="action-btn reserve-btn"
                >
                  View Waitlist
                </button>
              </div>
            </div>
          </div>

          <!-- Product Details Section -->
          <div class="product-details flex-grow h-auto min-h-screen">
            <!-- Header -->
            <div class="space-y-4 pb-6">
              <div class="flex items-center gap-3 text-sm">
                <span
                  class="px-4 py-1.5 bg-gradient-to-r from-[#6c7c69] to-[#5a6857] text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-shadow"
                >
                  {{ product.category }}
                </span>
                <span class="text-gray-300"> • </span>
                <span
                  class="px-4 py-1.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-shadow"
                >
                  {{ product.brand }}
                </span>
              </div>

              <h2
                class="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight"
              >
                {{ product.name }}
              </h2>
              <div class="stock-row">
                <span class="stock-chip">
                  Stock:
                  <span
                    class="stock-value"
                    :class="{ 'stock-out': product.stock === 0 }"
                  >
                    {{ product.stock ?? "N/A" }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Description -->
            <div
              v-if="product.description"
              class="description-section py-6 border-t border-gray-200"
            >
              <h3
                class="text-xl font-bold text-gray-900 mb-4 flex items-center"
              >
                Description
              </h3>
              <div
                class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100"
              >
                <p class="text-gray-700 leading-relaxed text-base">
                  {{ product.description }}
                </p>
              </div>
            </div>

            <div class="specifications-section py-6 border-t border-gray-200">
              <h3
                class="text-xl font-bold text-gray-900 mb-4 flex items-center"
              >
                Specifications
              </h3>
              <div class="spec">
                <div v-if="product.processor" class="spec-card">
                  <div class="spec-label">Processor</div>
                  <div class="spec-value">{{ product.processor }}</div>
                </div>
                <div v-if="product.ram" class="spec-card">
                  <div class="spec-label">Memory</div>
                  <div class="spec-value">{{ product.ram }}</div>
                </div>
                <div v-if="product.storage" class="spec-card">
                  <div class="spec-label">Storage</div>
                  <div class="spec-value">{{ product.storage }}</div>
                </div>
                <div v-if="product.gpu" class="spec-card">
                  <div class="spec-label">Graphics</div>
                  <div class="spec-value">{{ product.gpu }}</div>
                </div>
                <div v-if="product.display" class="spec-card">
                  <div class="spec-label">Display</div>
                  <div class="spec-value">{{ product.display }}</div>
                </div>
                <div v-if="product.os" class="spec-card">
                  <div class="spec-label">Operating System</div>
                  <div class="spec-value">{{ product.os }}</div>
                </div>
                <div v-if="product.batteryLife" class="spec-card">
                  <div class="spec-label">Battery Life</div>
                  <div class="spec-value">{{ product.batteryLife }}</div>
                </div>
                <div v-if="product.weight" class="spec-card">
                  <div class="spec-label">Weight</div>
                  <div class="spec-value">{{ product.weight }}</div>
                </div>

                <!-- Tablet-specific specs -->
                <template v-if="product.category === 'Tablet'">
                  <div
                    v-if="
                      product.cameras &&
                      (product.cameras.rear || product.cameras.front)
                    "
                    class="spec-card-wide"
                  >
                    <div class="spec-label">Cameras</div>
                    <div class="spec-value">
                      <div v-if="product.cameras.rear">
                        <strong>Rear:</strong> {{ product.cameras.rear }}
                      </div>
                      <div v-if="product.cameras.front">
                        <strong>Front:</strong> {{ product.cameras.front }}
                      </div>
                      <div v-if="product.cameras.video">
                        <strong>Video:</strong> {{ product.cameras.video }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="
                      Array.isArray(product.sensors) && product.sensors.length
                    "
                    class="spec-card-wide"
                  >
                    <div class="spec-label">Sensors</div>
                    <div class="spec-value">
                      {{ product.sensors.join(", ") }}
                    </div>
                  </div>
                  <div
                    v-if="
                      Array.isArray(product.materials) &&
                      product.materials.length
                    "
                    class="spec-card-wide"
                  >
                    <div class="spec-label">Materials</div>
                    <div class="spec-value">
                      {{ product.materials.join(", ") }}
                    </div>
                  </div>
                  <div
                    v-if="
                      Array.isArray(product.accessories) &&
                      product.accessories.length
                    "
                    class="spec-card-wide"
                  >
                    <div class="spec-label">Accessories</div>
                    <div class="spec-value">
                      {{ product.accessories.join(", ") }}
                    </div>
                  </div>
                </template>

                <!-- Camera-specific specs -->
                <template v-if="product.category === 'Camera'">
                  <div v-if="product.sensor" class="spec-card">
                    <div class="spec-label">Sensor</div>
                    <div class="spec-value">{{ product.sensor }}</div>
                  </div>
                  <div
                    v-if="product.imageProcessor || product.processor"
                    class="spec-card"
                  >
                    <div class="spec-label">Image Processor</div>
                    <div class="spec-value">
                      {{ product.imageProcessor || product.processor }}
                    </div>
                  </div>
                  <div v-if="product.isoRange" class="spec-card">
                    <div class="spec-label">ISO Range</div>
                    <div class="spec-value">{{ product.isoRange }}</div>
                  </div>
                  <div v-if="product.lensMount" class="spec-card">
                    <div class="spec-label">Lens Mount</div>
                    <div class="spec-value">{{ product.lensMount }}</div>
                  </div>
                  <div v-if="product.lens" class="spec-card">
                    <div class="spec-label">Lens</div>
                    <div class="spec-value">{{ product.lens }}</div>
                  </div>
                  <div v-if="product.stabilization" class="spec-card">
                    <div class="spec-label">Stabilization</div>
                    <div class="spec-value">{{ product.stabilization }}</div>
                  </div>
                  <div v-if="product.video" class="spec-card-wide">
                    <div class="spec-label">Video</div>
                    <div class="spec-value">{{ product.video }}</div>
                  </div>
                  <div v-if="product.photo" class="spec-card-wide">
                    <div class="spec-label">Photo</div>
                    <div class="spec-value">{{ product.photo }}</div>
                  </div>
                  <div v-if="product.waterproof" class="spec-card">
                    <div class="spec-label">Waterproof</div>
                    <div class="spec-value">{{ product.waterproof }}</div>
                  </div>
                </template>

                <!-- Additional specs -->

                <div
                  v-if="product.ports && product.ports.length"
                  class="spec-card-wide"
                >
                  <div class="spec-label">Ports</div>
                  <div class="spec-value">{{ product.ports.join(", ") }}</div>
                </div>
                <div
                  v-if="product.connectivity && product.connectivity.length"
                  class="spec-card-wide"
                >
                  <div class="spec-label">Connectivity</div>
                  <div class="spec-value">
                    {{ product.connectivity.join(", ") }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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

<script lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Product } from "../types/models";
import { fetchProductById } from "../services/CatalogueService";
import { useFavorites } from "../services/favouritesService";
import { useAuth } from "../composables/useAuth";
import { getStockForProduct } from "../services/api/inventoryService";
import { useReservationFlow } from "../composables/useReservationFlow";

export default {
  name: "ProductPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const product = ref<Product | null>(null);
    const loading = ref(true);
    const error = ref("");

    const { user } = useAuth();
    const isAdmin = computed(
      () => (user.value?.role || "").toLowerCase() === "admin"
    );

    const {
      isFavorite,
      toggleFavorite: serviceToggleFavorite,
      initializeFavorites,
    } = useFavorites();

    const isFavorited = computed(() =>
      product.value ? isFavorite(product.value.id) : false
    );

    const {
      dialog,
      handleReserveOrWaitlist,
      confirmDialog,
      closeDialog,
      hasActiveLoanForProduct,
      isOnWaitlist,
    } = useReservationFlow();

    const selectImage = (image: string) => {
      if (product.value) product.value.mainImage = image;
    };

    const toggleFavorite = async () => {
      if (product.value) {
        await serviceToggleFavorite(product.value.id);
      }
    };

    const viewWaitlist = () => {
      if (!product.value) return;
      router.push({
        path: "/admin/dashboard",
        query: { deviceId: product.value.id },
      });
    };

    onMounted(async () => {
      try {
        await initializeFavorites();

        const productId = route.params.id as string | undefined;
        if (productId) {
          const fetched = await fetchProductById(productId);
          let stock: number | null = null;
          try {
            stock = await getStockForProduct(productId);
          } catch (err) {
            console.warn("[ProductPage] Failed to load stock", err);
          }
          const hasStockFromFetch = typeof fetched.stock === "number";
          const hasInStockFromFetch = typeof fetched.inStock === "boolean";
          const resolvedStock =
            typeof stock === "number"
              ? stock
              : hasStockFromFetch
              ? fetched.stock
              : hasInStockFromFetch
              ? fetched.inStock
                ? 1
                : 0
              : null;
          const hasKnownAvailability =
            typeof stock === "number" || hasStockFromFetch || hasInStockFromFetch;
          const isInStock =
            typeof resolvedStock === "number" ? resolvedStock > 0 : false;
          const availabilityStatus = hasKnownAvailability
            ? isInStock
              ? "available"
              : "loaned"
            : "unavailable";
          const imageUrl = fetched.imageUrl;
          product.value = {
            ...fetched,
            stock: hasKnownAvailability ? resolvedStock : null,
            inStock: availabilityStatus === "available",
            availabilityStatus,
            mainImage: imageUrl,
            images: imageUrl ? [imageUrl] : [],
          };
        }
      } catch (e: any) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    });

    return {
      product,
      loading,
      error,
      isFavorited,
      selectImage,
      toggleFavorite,
      isAdmin,
      viewWaitlist,
      user,
      dialog,
      handleReserveOrWaitlist,
      confirmDialog,
      closeDialog,
      hasActiveLoanForProduct,
      isOnWaitlist,
    };
  },
};
</script>

<style scoped>
.container,
.product-page,
.content,
.product-images,
.product-details {
  height: auto;
}

.product-details {
  padding: 1rem;
}

.product-images {
  display: flex;
  flex-direction: column;
}

.stock-row {
  margin-top: 0.5rem;
}

.stock-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 600;
}

.stock-value {
  font-weight: 700;
}

.stock-out {
  color: #a6383e;
}

.product-column {
  flex-shrink: 0;
}

.sticky-column {
  position: sticky;
  top: 6rem;
  align-self: flex-start;
  height: fit-content;
}

.product-images-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product-image {
  width: 40vw;
}

.main-image {
  padding: 2rem;
  background: white;
  z-index: 0;
  border-radius: 6px;
}

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-page {
  height: 100%;
}
.nav-row {
  padding-top: 6px;
  padding-left: 17px;
}

.content {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  align-items: flex-start;
  height: auto;
  min-height: 100vh;
}

.button-container {
  width: 100%;
  padding: 0;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 6px;
}

.spec {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

button[aria-pressed="true"] svg {
  fill: currentColor;
}

.actions button {
  position: relative;
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
  font-weight: 600;
  border-radius: 1rem;
  padding: 1rem 2rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.reserve-btn {
  background: #867537;
  color: #fff;
  border: none;
}
.reserve-btn:hover {
  background: #756630;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 10px 25px rgba(134, 117, 55, 0.25);
}
.reserve-btn:disabled {
  background: #867537;
  cursor: not-allowed;
  opacity: 0.9;
}
.reserve-btn:disabled:hover {
  transform: none;
  box-shadow: none;
}

.waitlist-btn {
  background: #6c7c69;
  color: #fff;
  padding: 6px;
  border-radius: 6px;
  border: none;
}
.waitlist-btn:hover {
  background: #5a6857;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 10px 25px rgba(108, 124, 105, 0.25);
}

.share-btn {
  color: white;
  width: 30px;
  background-color: #867537;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-btn:hover {
  background: linear-gradient(135deg, #756630 0%, #a89970 100%);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 20px rgba(134, 117, 55, 0.3);
}

.wishlist-btn {
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  border: 2px solid #e5e7eb;
  color: #374151;
}
.wishlist-btn:hover {
  border-color: #a6383e;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: #b91c1c;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.15);
  transform: translateY(-2px);
}

.secondary-btn {
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border: 1px solid #e5e7eb;
  color: #374151;
}
.secondary-btn:hover {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.actions button::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: width 0.3s ease, height 0.3s ease, opacity 0.3s ease;
}

.actions button:active::after {
  width: 220%;
  height: 220%;
  opacity: 0;
}

button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
}

.spec-card {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s ease;
}

.spec-card-wide {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s ease;
}

.spec-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.spec-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.reserve-btn {
  position: relative;
  overflow: hidden;
}

.reserve-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.reserve-btn:hover::before {
  left: 100%;
}

.wishlist-btn {
  position: relative;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

.wishlist-btn:hover {
  background: linear-gradient(135deg, #fef2f2 0%, #fde8e8 100%);
  border-color: #f87171;
  box-shadow: 0 8px 25px rgba(248, 113, 113, 0.15);
}

.secondary-btn {
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.secondary-btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.description-section {
  border-left: 4px solid #867537;
  padding-left: 1rem;
}

.specifications-section {
  border-left: 4px solid #867537;
  padding-left: 1rem;
}

.spec-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.spec-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #867537;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.spec-card:hover::before {
  transform: scaleX(1);
}

.spec-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.spec-card-wide {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.spec-card-wide::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #867537;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.spec-card-wide:hover::before {
  transform: scaleX(1);
}

.spec-card-wide:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.specifications::-webkit-scrollbar {
  width: 4px;
}

.specifications::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.specifications::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.specifications::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

@media (max-width: 768px) {
  .product-details {
    padding-top: 0;
  }

  .thumbnail-gallery {
    grid-template-columns: repeat(3, 1fr);
  }

  .spec-card {
    padding: 12px;
  }
}

button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.thumbnail-gallery img:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.actions button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.actions button:active {
  transform: scale(0.98);
}

.text-3xl.font-bold.text-blue-600 {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.spec-card,
.spec-card-wide {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.spec-card:hover,
.spec-card-wide:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.w-3.h-3.rounded-full {
  animation: pulse-slow 3s ease-in-out infinite;
}

.status-banner-available,
.status-banner-loaned {
  position: absolute;
  width: 137px;
  height: 120px;
  top: 0;
  right: 0;
  border-radius: 6px;
  overflow: hidden;
  pointer-events: none;
}

.status-banner-available::before,
.status-banner-loaned::before {
  content: "";
  position: absolute;
  top: -60px;
  right: -60px;
  width: 125px;
  height: 120px;
  transform: rotate(45deg);
  transform-origin: center;
}

.status-banner-available::before {
  background: linear-gradient(135deg, #6c7c69 0%, #5a6857 100%);
}

.status-banner-loaned::before {
  background: linear-gradient(135deg, #a6383e 0%, #8a2f34 100%);
}

.status-banner-text {
  position: absolute;
  top: 23px;
  right: -22px;
  transform: rotate(45deg);
  color: white;
  font-weight: bold;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 1;
  width: 100px;
  text-align: center;
}

.favorite {
  display: flex;
  position: absolute;
  top: 0px;
  left: 11px;
}
.favorite-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 32px;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.favorite-btn.is-favorite {
  color: #b49d4b;
}

.favorite-btn:hover {
  transform: scale(1.1);
}

.action-btn {
  flex: 1;
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}
.reserve-btn {
  background-color: #6c7c69;
  color: white;
}
.reserve-btn:hover {
  background-color: #5a6857;
  transform: translateY(-1px);
}
.waitlist-btn {
  background-color: #6b7280;
  color: white;
}
.waitlist-btn:hover:not(:disabled) {
  background-color: #4b5563;
}
.waitlist-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
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
