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
        <div class="text-center bg-red-50 p-8 rounded-xl border border-red-200">
          <div class="text-red-500 text-4xl mb-4">⚠️</div>
          <p class="text-xl text-red-600 font-medium">{{ error }}</p>
          <button
            @click="$router.go(-1)"
            class="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
        <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <router-link
            to="/catalogue"
            class="hover:text-blue-600 transition-colors"
            >Catalogue</router-link
          >
          <span>›</span>
          <span class="text-gray-900 font-medium">{{ product.name }}</span>
        </nav>

        <div class="content flex gap-8 items-start h-auto min-h-screen">
          <!-- Product Images Section -->
          <div class="product-images space-y-4 flex-shrink-0 h-auto">
            <div
              class="main-image sticky group relative overflow-hidden bg-gray-100 rounded-2xl shadow-lg"
            >
              <!-- Simplified Favourite Heart Button -->
              <button
                @click="toggleFavorite"
                class="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all duration-200"
              >
                <svg
                  v-if="!isFavorited"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-6 h-6 text-gray-500 hover:text-red-500 transition-colors duration-200"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 
           7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 000-7.78z"
                  />
                </svg>

                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="w-6 h-6 text-red-500 transition-all duration-200"
                >
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
           2 6 4 4 6.5 4c1.74 0 3.41 1 4.13 2.44h.75C13.09 5 
           14.76 4 16.5 4 19 4 21 6 21 8.5c0 3.78-3.4 6.86-8.55 
           11.54L12 21.35z"
                  />
                </svg>
              </button>

              <img
                :src="product.mainImage"
                :alt="product.name"
                class="product-image w-[400px] h-[500px] object-contain p-8 group-hover:scale-105 transition-transform duration-500"
              />

              <div v-if="!product.inStock" class="absolute top-4 left-4">
                <span
                  class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                >
                  Currently Loaned
                </span>
              </div>
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
                    'border-blue-500 bg-blue-50': product.mainImage === image,
                  }"
                />
              </div>
            </div>
          </div>

          <!-- Product Details Section -->
          <div class="product-details flex-grow h-auto min-h-screen">
            <!-- Header -->
            <div class="space-y-4 pb-6 border-b border-gray-200">
              <div class="flex items-center space-x-2 text-sm column">
                <span
                  class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium"
                >
                  {{ product.category }}
                </span>
                <span
                  class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium"
                >
                  {{ product.brand }}
                </span>
              </div>

              <h1
                class="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight"
              >
                {{ product.name }}
              </h1>

              <p class="text-lg text-gray-600">{{ product.model }}</p>

              <div class="flex items-center justify-between">
                <span class="text-4xl font-bold text-blue-600"
                  >£{{ product.price }}</span
                >
                <div class="flex items-center space-x-2">
                  <div
                    class="w-3 h-3 rounded-full animate-pulse"
                    :class="product.inStock ? 'bg-green-500' : 'bg-red-500'"
                  ></div>
                  <span
                    class="text-sm font-semibold px-3 py-1 rounded-full"
                    :class="
                      product.inStock
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    "
                  >
                    {{ product.inStock ? "Available Now" : "Currently Loaned" }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="actions py-6 space-y-3">
              <button
                @click="addToCart"
                :disabled="!product.inStock"
                class="reserve-btn w-full py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:hover:scale-100"
                :class="
                  product.inStock
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
                "
              >
                <span
                  v-if="product.inStock"
                  class="flex items-center justify-center space-x-2"
                >
                  <span>🔒</span>
                  <span>Reserve Device</span>
                </span>
                <span v-else class="flex items-center justify-center space-x-2">
                  <span>📋</span>
                  <span>Join Waitlist</span>
                </span>
              </button>

              <div class="flex space-x-3">
                <button
                  @click="$router.go(-1)"
                  class="secondary-btn flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <span class="flex items-center justify-center space-x-2">
                    <span>←</span>
                    <span>Back</span>
                  </span>
                </button>
                <button
                  class="secondary-btn flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <span class="flex items-center justify-center space-x-2">
                    <span>🔗</span>
                    <span>Share</span>
                  </span>
                </button>
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
                <span class="mr-2">📖</span>
                About this Device
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
                <span class="mr-2">⚙️</span>
                Technical Specifications
              </h3>
              <div class="spec">
                <div class="spec-card">
                  <div class="spec-label">Processor</div>
                  <div class="spec-value">{{ product.processor }}</div>
                </div>
                <div class="spec-card">
                  <div class="spec-label">Memory</div>
                  <div class="spec-value">{{ product.ram }}</div>
                </div>
                <div class="spec-card">
                  <div class="spec-label">Storage</div>
                  <div class="spec-value">{{ product.storage }}</div>
                </div>
                <div class="spec-card">
                  <div class="spec-label">Graphics</div>
                  <div class="spec-value">{{ product.gpu }}</div>
                </div>
                <div class="spec-card">
                  <div class="spec-label">Display</div>
                  <div class="spec-value">{{ product.display }}</div>
                </div>
                <div class="spec-card">
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
              </div>

              <!-- Additional specs -->
              <div
                v-if="
                  (product.ports && product.ports.length) ||
                  (product.connectivity && product.connectivity.length)
                "
                class="mt-4 space-y-3"
              >
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
</template>

<script>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { fetchProductById } from "../services/CatalogueService";
import { getCloudinaryUrl } from "../assets/cloudinary";

export default {
  name: "ProductPage",
  setup() {
    const route = useRoute();
    const product = ref(null);
    const loading = ref(true);
    const error = ref("");
    const isFavorited = ref(false);

    const selectImage = (image) => {
      if (product.value) product.value.mainImage = image;
    };

    const addToCart = () => {
      if (product.value) console.log("Added to cart:", product.value.name);
    };

    const toggleFavorite = () => {
      isFavorited.value = !isFavorited.value;
      if (product.value)
        console.log(
          isFavorited.value ? "Added to favorites:" : "Removed from favorites:",
          product.value.name
        );
    };

    onMounted(async () => {
      try {
        const productId = route.params.id;
        if (productId) {
          const fetched = await fetchProductById(productId);
          const cloudinaryUrl = getCloudinaryUrl(fetched.imageUrl);
          product.value = {
            ...fetched,
            mainImage: cloudinaryUrl,
            images: [cloudinaryUrl],
          };
        }
      } catch (e) {
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
      addToCart,
      toggleFavorite,
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
  min-height: 100vh;
}

.product-images {
  display: flex;
  justify-self: flex-start;
  height: -webkit-fill-available;
  min-height: 100%;
}

.main-image {
  position: sticky;
  top: 6rem;
  padding: 2rem;
  background: white;
  margin: 2rem;
  z-index: 0;
}

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-page {
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
  height: 100%;
}
.product-details {
}

.main-image {
  position: sticky;
  top: 6rem;
  padding: 2rem;
  background: white;
  margin: 2rem;
  z-index: 0;
  height: 400px;
}

.content {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  height: auto; /* allow to expand with content */
  min-height: 100vh; /* still fills screen on short pages */

  .product-image {
    width: 500px;
  }
}
.spec {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

button[aria-pressed="true"] svg {
  fill: currentColor;
}

/* === Enhanced Button Styling === */

/* Shared base styles for all buttons */
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

/* Primary Action – Reserve / Waitlist */
.reserve-btn {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border: none;
}
.reserve-btn:hover {
  background: linear-gradient(135deg, #1e40af, #1d4ed8);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.25);
}
.reserve-btn:disabled {
  background: linear-gradient(135deg, #f97316, #ea580c);
  cursor: not-allowed;
  opacity: 0.9;
}
.reserve-btn:disabled:hover {
  transform: none;
  box-shadow: none;
}

/* Wishlist Button */
.wishlist-btn {
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  border: 2px solid #e5e7eb;
  color: #374151;
}
.wishlist-btn:hover {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: #b91c1c;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.15);
  transform: translateY(-2px);
}

/* Secondary Buttons – Back / Share */
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

/* Ripple highlight effect on click */
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

/* Accessibility focus */
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
}

/* Specification Cards */
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

/* Enhanced Button Styling */
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

/* Section Styling */
.description-section {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
}

.specifications-section {
  border-left: 4px solid #10b981;
  padding-left: 1rem;
}

/* Enhanced specification cards */
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
  background: linear-gradient(90deg, #3b82f6, #10b981, #f59e0b);
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
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
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

/* Loading animation improvements */
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

/* Custom scrollbar for specs section */
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

/* Responsive improvements */
@media (max-width: 768px) {
  .product-details {
    padding-top: 0;
  }

  .main-image {
    height: 350px;
  }

  .thumbnail-gallery {
    grid-template-columns: repeat(3, 1fr);
  }

  .spec-card {
    padding: 12px;
  }
}

/* Focus states for accessibility */
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.thumbnail-gallery img:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* Enhanced button animations */
.actions button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.actions button:active {
  transform: scale(0.98);
}

/* Gradient text effect for price */
.text-3xl.font-bold.text-blue-600 {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Improved card shadows */
.spec-card,
.spec-card-wide {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.spec-card:hover,
.spec-card-wide:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Status indicator animation */
.w-3.h-3.rounded-full {
  animation: pulse-slow 3s ease-in-out infinite;
}
</style>
