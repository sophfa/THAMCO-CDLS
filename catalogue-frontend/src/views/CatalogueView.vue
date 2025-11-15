<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from "vue";
import { useRouter, useRoute } from "vue-router";
import { fetchCatalogue, type Product } from "../services/CatalogueService";
import {
  createLoan,
  joinWaitlistForDevice,
  getUserWaitlistEntries,
} from "../services/api/loansService";
import { useFavorites } from "../services/favouritesService";
import { useAuth } from "../composables/useAuth";
import SearchBar from "../components/SearchBar.vue";
import { getCloudinaryUrl } from "../assets/cloudinary";
import { getUserId, getUserEmail, getUserRole } from "../services/authService";
import { createNotification } from "../services/api/notificationsService";
const { user, loggedIn, logout } = useAuth();

const products = ref<Product[]>([]);
const searchTerm = ref("");
const selectedCategory = ref<string>("");
const onlyInStock = ref<boolean>(false);
const showFilters = ref<boolean>(false);
const userWaitlistDeviceIds = ref<Set<string>>(new Set());

// Faceted filter state
const selectedBrands = ref<string[]>([]);
const selectedRam = ref<string[]>([]);
const selectedPorts = ref<string[]>([]);
const selectedConnectivity = ref<string[]>([]);
const priceMin = ref<string>("");
const priceMax = ref<string>("");
const loading = ref(true);
const error = ref("");
const router = useRouter();
const route = useRoute();

// Confirmation / result dialog state
const dialog = reactive({
  open: false as boolean,
  kind: "reserve" as "reserve" | "waitlist",
  state: "confirm" as "confirm" | "success" | "error",
  loading: false as boolean,
  error: "" as string,
  product: null as null | Product,
  startDate: "" as string,
  endDate: "" as string,
});

const userRole = ref<string | null>(null);

// Keep track of the user's role when auth state changes (and on first render)
watch(
  loggedIn,
  async (isLoggedIn) => {
    if (isLoggedIn) {
      try {
        // Prefer service call; falls back to composable user if needed
        const role = (await getUserRole()) ?? user.value?.role ?? null;
        userRole.value = role;
        console.log("User role:", role);
      } catch (e) {
        console.warn("Failed to get user role", e);
        userRole.value = user.value?.role ?? null;
      }
    } else {
      userRole.value = null;
    }
  },
  { immediate: true }
);

// Function to refresh product catalogue
async function refreshProductCatalogue() {
  try {
    const data = await fetchCatalogue();
    products.value = data;
    console.log("[Catalogue] Refreshed products:", data);
  } catch (e: any) {
    console.error("[Catalogue] Failed to refresh products:", e);
  }
}

// Function to load user's waitlist entries
async function loadUserWaitlist() {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const waitlistEntries = await getUserWaitlistEntries(userId);
    userWaitlistDeviceIds.value = new Set(
      waitlistEntries.map((entry) => entry.deviceId)
    );
    console.log(
      "[Catalogue] User is on waitlist for:",
      Array.from(userWaitlistDeviceIds.value)
    );
  } catch (e) {
    console.warn("[Catalogue] Failed to load user waitlist:", e);
  }
}

// Check if user is on waitlist for a device
function isOnWaitlist(deviceId: string): boolean {
  return userWaitlistDeviceIds.value.has(deviceId);
}

async function confirmDialog() {
  if (!dialog.product) return;
  dialog.loading = true;
  dialog.error = "";
  try {
    if (dialog.kind === "reserve") {
      // Fallback to today/tomorrow if missing
      const start = dialog.startDate || new Date().toISOString().slice(0, 10);
      const end =
        dialog.endDate ||
        new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await createLoan(dialog.product.id, start, end, "Requested");
    } else {
      const _wl = await joinWaitlistForDevice(dialog.product.id);
      (dialog as any)._waitlistResult = _wl;

      // After successfully joining waitlist, refresh the catalogue and waitlist
      await Promise.all([refreshProductCatalogue(), loadUserWaitlist()]);
    }
    // Fire-and-forget notification
    try {
      const uid = await getUserId();
      const email = await getUserEmail();
      if (uid) {
        const message =
          dialog.kind === "reserve"
            ? `Your reservation for ${dialog.product.name} is confirmed (${dialog.startDate} → ${dialog.endDate}). A receipt has been emailed to you.`
            : `You joined the waitlist for ${dialog.product.name}. We'll notify you when it's available.`;
        if (dialog.kind === "reserve") {
          const start =
            dialog.startDate || new Date().toISOString().slice(0, 10);
          await createNotification(uid, "Reservation", dialog.product.id, {
            collectionDate: start,
            userEmail: email || undefined,
          });
        } else {
          const wl = ((dialog as any)._waitlistResult as any)?.waitlist as
            | string[]
            | undefined;
          let position: number | undefined;
          if (Array.isArray(wl)) {
            const idx = wl.indexOf(uid);
            position = idx >= 0 ? idx + 1 : wl.length;
          }
          await createNotification(uid, "Waitlist", dialog.product.id, {
            numInQueue: position,
            userEmail: email || undefined,
          });
        }
      }
    } catch (e) {
      console.warn("Notification failed:", e);
    }
    dialog.state = "success";
  } catch (e: any) {
    dialog.state = "error";
    dialog.error = e?.message || "Operation failed";
  } finally {
    dialog.loading = false;
  }
}

function closeDialog() {
  dialog.open = false;
  dialog.loading = false;
  dialog.error = "";
  dialog.product = null;
  dialog.state = "confirm";
  dialog.startDate = "";
  dialog.endDate = "";
}

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
    console.log("[Catalogue] Fetched products:", data);

    // Load user's waitlist entries if logged in
    if (loggedIn.value) {
      await loadUserWaitlist();
    }

    // Prefill from route query if present
    console.log("[Catalogue] Initial route query:", route.query);
    const qCategory = (route.query.category as string) || "";
    if (qCategory) {
      // Map query to a known category ignoring case
      const cat = categories.value.find(
        (c) => c.toLowerCase() === qCategory.toLowerCase()
      );
      selectedCategory.value = cat || qCategory;
      console.log(
        "[Catalogue] Applied category from query:",
        selectedCategory.value
      );
    }
    const qSearch = (route.query.search as string) || "";
    if (qSearch) searchTerm.value = qSearch;
    const qInStock = route.query.inStock as string | undefined;
    if (qInStock) onlyInStock.value = qInStock === "true";

    // Multi-select facets (CSV in query)
    const parseCsv = (v: unknown) =>
      typeof v === "string" && v.length > 0
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    selectedBrands.value = parseCsv(route.query.brand);
    selectedRam.value = parseCsv(route.query.ram);
    selectedPorts.value = parseCsv(route.query.ports);
    selectedConnectivity.value = parseCsv(route.query.connectivity);
    priceMin.value = (route.query.min as string) || "";
    priceMax.value = (route.query.max as string) || "";
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

// Keep component state in sync if route query changes externally
watch(
  () => route.query,
  (q) => {
    console.log("[Catalogue] Route query changed:", q);
    const qCategory = (q.category as string) || "";
    const qSearch = (q.search as string) || "";
    const qInStock = (q.inStock as string) || "";
    if (qCategory) {
      const cat = categories.value.find(
        (c) => c.toLowerCase() === qCategory.toLowerCase()
      );
      if ((cat || qCategory) !== selectedCategory.value) {
        selectedCategory.value = cat || qCategory;
      }
    } else if (selectedCategory.value) {
      selectedCategory.value = "";
    }
    if (qSearch !== searchTerm.value) searchTerm.value = qSearch;
    if (qInStock) {
      const next = qInStock === "true";
      if (next !== onlyInStock.value) onlyInStock.value = next;
    }

    const parseCsv = (v: unknown) =>
      typeof v === "string" && v.length > 0
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    selectedBrands.value = parseCsv(q.brand);
    selectedRam.value = parseCsv(q.ram);
    selectedPorts.value = parseCsv(q.ports);
    selectedConnectivity.value = parseCsv(q.connectivity);
    priceMin.value = (q.min as string) || "";
    priceMax.value = (q.max as string) || "";
  }
);

const applyFilters = () => {
  const query: Record<string, string> = {};
  if (selectedCategory.value) query.category = selectedCategory.value;
  if (onlyInStock.value) query.inStock = "true";
  if (searchTerm.value) query.search = searchTerm.value;
  if (selectedBrands.value.length) query.brand = selectedBrands.value.join(",");
  if (selectedRam.value.length) query.ram = selectedRam.value.join(",");
  if (selectedPorts.value.length) query.ports = selectedPorts.value.join(",");
  if (selectedConnectivity.value.length)
    query.connectivity = selectedConnectivity.value.join(",");
  if (priceMin.value) query.min = priceMin.value;
  if (priceMax.value) query.max = priceMax.value;
  console.log("[Catalogue] Applying filters:", {
    selectedCategory: selectedCategory.value,
    onlyInStock: onlyInStock.value,
    searchTerm: searchTerm.value,
    brands: selectedBrands.value,
    ram: selectedRam.value,
    ports: selectedPorts.value,
    connectivity: selectedConnectivity.value,
    min: priceMin.value,
    max: priceMax.value,
  });
  router.push({ path: "/catalogue", query });
};

function viewWaitlist(p: Product) {
  // Navigate to admin dashboard with a device filter; dashboard can adopt this later
  router.push({ path: "/admin/dashboard", query: { deviceId: p.id } });
}

const categories = computed(() =>
  Array.from(new Set(products.value.map((p) => p.category))).sort()
);

const brandOptions = computed(() =>
  Array.from(
    new Set(
      products.value
        .filter(
          (p) =>
            !selectedCategory.value || p.category === selectedCategory.value
        )
        .map((p) => p.brand)
    )
  ).sort()
);

const ramOptions = computed(() =>
  Array.from(
    new Set(
      products.value
        .filter((p) =>
          selectedCategory.value ? p.category === selectedCategory.value : true
        )
        .map((p) => p.ram)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    )
  ).sort()
);

const connectivityOptions = computed(() =>
  Array.from(
    new Set(
      products.value
        .filter(
          (p) =>
            !selectedCategory.value || p.category === selectedCategory.value
        )
        .flatMap((p) => p.connectivity || [])
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    )
  ).sort()
);

const portOptions = computed(() =>
  Array.from(
    new Set(
      products.value
        .filter(
          (p) =>
            !selectedCategory.value || p.category === selectedCategory.value
        )
        .flatMap((p) => p.ports || [])
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    )
  ).sort()
);

const filteredProducts = computed(() => {
  const term = searchTerm.value.toLowerCase();
  return products.value.filter((p) => {
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      (p.description || "").toLowerCase().includes(term);
    const matchesCategory =
      !selectedCategory.value ||
      p.category.toLowerCase() === selectedCategory.value.toLowerCase();
    const matchesStock = !onlyInStock.value || p.inStock === true;
    // Facet matches
    const matchesBrand =
      selectedBrands.value.length === 0 ||
      selectedBrands.value.includes(p.brand);
    const matchesRam =
      selectedRam.value.length === 0 ||
      (p.ram && selectedRam.value.includes(p.ram));
    const matchesPorts =
      selectedPorts.value.length === 0 ||
      (Array.isArray(p.ports) &&
        selectedPorts.value.every((v) => p.ports.includes(v)));
    const matchesConnectivity =
      selectedConnectivity.value.length === 0 ||
      (Array.isArray(p.connectivity) &&
        selectedConnectivity.value.every((v) => p.connectivity.includes(v)));
    const price = typeof p.price === "number" ? p.price : NaN;
    const minOk =
      !priceMin.value || (!isNaN(price) && price >= Number(priceMin.value));
    const maxOk =
      !priceMax.value || (!isNaN(price) && price <= Number(priceMax.value));

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStock &&
      matchesBrand &&
      matchesRam &&
      matchesPorts &&
      matchesConnectivity &&
      minOk &&
      maxOk
    );
  });
});

// Log filter results when inputs change
watch(
  [selectedCategory, onlyInStock, searchTerm, products],
  () => {
    console.log("[Catalogue] Filters updated:", {
      selectedCategory: selectedCategory.value,
      onlyInStock: onlyInStock.value,
      searchTerm: searchTerm.value,
    });
    console.log("[Catalogue] Filtered count:", filteredProducts.value.length);
  },
  { deep: false }
);

const handleReserveOrWaitlist = async (product: Product) => {
  // Open confirmation dialog instead of immediately performing the action
  dialog.open = true;
  dialog.kind = product.inStock ? "reserve" : "waitlist";
  dialog.product = product;
  dialog.state = "confirm";
  if (product.inStock) {
    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);
    dialog.startDate = today.toISOString().slice(0, 10);
    dialog.endDate = tomorrow.toISOString().slice(0, 10);
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
    <div class="toolbar">
      <button
        v-if="!showFilters"
        class="filter-toggle"
        @click="showFilters = !showFilters"
      >
        Show Filters
      </button>
      <div class="summary">
        <span>{{ filteredProducts.length }} results</span>
        <span v-if="selectedCategory">• Category: {{ selectedCategory }}</span>
        <span v-if="onlyInStock">• In stock</span>
      </div>
    </div>
    <div class="layout">
      <!-- Side Filter Drawer -->
      <aside class="drawer" :class="{ hidden: !showFilters }">
        <div class="drawer-header">
          <h3>
            <i class="fas fa-sliders-h"></i>
            Filters
          </h3>
          <button class="drawer-close" @click="showFilters = !showFilters">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="drawer-content">
          <!-- Quick Actions -->
          <div class="quick-actions">
            <button
              class="quick-filter"
              :class="{ active: onlyInStock }"
              @click="
                onlyInStock = !onlyInStock;
                applyFilters();
              "
            >
              <i class="fas fa-check-circle"></i>
              In Stock Only
            </button>
          </div>

          <!-- General Filters -->
          <div class="filter-section">
            <div class="section-header">
              <h4>
                <i class="fas fa-tag"></i>
                General
              </h4>
            </div>

            <div class="filter-group">
              <label class="filter-label">Category</label>
              <div class="select-wrapper">
                <select v-model="selectedCategory" class="filter-select">
                  <option value="">All Categories</option>
                  <option v-for="c in categories" :key="c" :value="c">
                    {{ c }}
                  </option>
                </select>
                <i class="fas fa-chevron-down select-icon"></i>
              </div>
            </div>

            <div class="filter-group">
              <label class="filter-label">Brand</label>
              <div class="checkbox-group" v-if="brandOptions.length > 0">
                <label v-for="b in brandOptions" :key="b" class="checkbox-item">
                  <input
                    type="checkbox"
                    :value="b"
                    v-model="selectedBrands"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">{{ b }}</span>
                  <span class="checkbox-count"
                    >({{ products.filter((p) => p.brand === b).length }})</span
                  >
                </label>
              </div>
              <div v-else class="empty-state">
                <i class="fas fa-info-circle"></i>
                No brands available for selected category
              </div>
            </div>

            <div class="filter-group">
              <label class="filter-label">Price Range</label>
              <div class="price-inputs">
                <div class="price-input-wrapper">
                  <span class="currency">£</span>
                  <input
                    type="number"
                    placeholder="Min"
                    v-model="priceMin"
                    class="price-input"
                    min="0"
                  />
                </div>
                <span class="price-separator">to</span>
                <div class="price-input-wrapper">
                  <span class="currency">£</span>
                  <input
                    type="number"
                    placeholder="Max"
                    v-model="priceMax"
                    class="price-input"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Technical Specifications -->
          <div
            v-if="!selectedCategory || selectedCategory === 'Laptop'"
            class="filter-section"
          >
            <div class="section-header">
              <h4>
                <i class="fas fa-laptop"></i>
                Laptop Specifications
              </h4>
            </div>

            <div class="filter-group">
              <label class="filter-label">RAM</label>
              <div class="checkbox-group" v-if="ramOptions.length > 0">
                <label v-for="r in ramOptions" :key="r" class="checkbox-item">
                  <input
                    type="checkbox"
                    :value="r"
                    v-model="selectedRam"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">{{ r }}</span>
                </label>
              </div>
            </div>

            <div class="filter-group">
              <label class="filter-label">Ports</label>
              <div class="checkbox-group" v-if="portOptions.length > 0">
                <label v-for="p in portOptions" :key="p" class="checkbox-item">
                  <input
                    type="checkbox"
                    :value="p"
                    v-model="selectedPorts"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">{{ p }}</span>
                </label>
              </div>
            </div>

            <div class="filter-group">
              <label class="filter-label">Connectivity</label>
              <div class="checkbox-group" v-if="connectivityOptions.length > 0">
                <label
                  v-for="c in connectivityOptions"
                  :key="c"
                  class="checkbox-item"
                >
                  <input
                    type="checkbox"
                    :value="c"
                    v-model="selectedConnectivity"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">{{ c }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Future category sections -->
          <div
            v-if="!selectedCategory || selectedCategory === 'Tablet'"
            class="filter-section"
          >
            <div class="section-header">
              <h4>
                <i class="fas fa-tablet-alt"></i>
                Tablet Specifications
              </h4>
            </div>
            <div class="empty-state">
              <i class="fas fa-cog"></i>
              Tablet-specific filters coming soon
            </div>
          </div>

          <div
            v-if="!selectedCategory || selectedCategory === 'Camera'"
            class="filter-section"
          >
            <div class="section-header">
              <h4>
                <i class="fas fa-camera"></i>
                Camera Specifications
              </h4>
            </div>
            <div class="empty-state">
              <i class="fas fa-cog"></i>
              Camera-specific filters coming soon
            </div>
          </div>

          <!-- Filter Actions -->
          <div class="filter-actions">
            <button class="btn-apply" @click="applyFilters">
              <i class="fas fa-search"></i>
              Apply Filters
            </button>
            <button
              class="btn-clear"
              @click="
                (() => {
                  selectedCategory = '';
                  onlyInStock = false;
                  searchTerm = '';
                  selectedBrands = [];
                  selectedRam = [];
                  selectedPorts = [];
                  selectedConnectivity = [];
                  priceMin = '';
                  priceMax = '';
                  applyFilters();
                })()
              "
            >
              <i class="fas fa-undo"></i>
              Clear All
            </button>
          </div>
        </div>
      </aside>

      <!-- Products Grid -->
      <div class="content" v-if="!loading && !error">
        <div class="grid">
          <div v-for="p in filteredProducts" :key="p.id" class="card">
            <!-- Status Corner Banner -->
            <div
              class="absolute top-0 right-0 z-20"
              :class="
                p.inStock ? 'status-banner-available' : 'status-banner-loaned'
              "
            >
              <div class="status-banner-text">
                {{ p.inStock ? "AVAILABLE" : "LOANED" }}
              </div>
            </div>

            <div class="card-content">
              <div class="image-container">
                <img
                  class="image-class"
                  :src="getCloudinaryUrl(p.imageUrl)"
                  :alt="p.name"
                  style="max-width: 100%; height: auto"
                />
              </div>
              <h2>{{ p.name }}</h2>
              <p><strong>Category:</strong> {{ p.category }}</p>
              <p><strong>Price:</strong> £{{ p.price }}</p>
              <p v-if="p.description">{{ p.description }}</p>
            </div>

            <div
              class="button-group"
              v-if="(userRole || '').toLowerCase() !== 'admin'"
            >
              <button @click="viewDetails(p)" class="details-btn">
                See Details
              </button>

              <div
                v-if="loggedIn && (userRole || '').toLowerCase() !== 'admin'"
                class="action-buttons"
              >
                <button
                  @click="handleReserveOrWaitlist(p)"
                  :disabled="!p.inStock && isOnWaitlist(p.id)"
                  :class="[
                    'action-btn',
                    p.inStock ? 'reserve-btn' : 'waitlist-btn',
                  ]"
                >
                  <span v-if="p.inStock">Reserve</span>
                  <span v-else-if="isOnWaitlist(p.id)">On Waitlist</span>
                  <span v-else>Join Waitlist</span>
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
            <div class="button-group" v-else>
              <button @click="viewDetails(p)" class="details-btn">
                See Details
              </button>
              <button @click="viewWaitlist(p)" class="waitlist-btn">
                View Waitlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Confirmation / Result Dialog -->
  <div v-if="dialog.open" class="modal-backdrop">
    <div class="modal">
      <h3 class="modal-title">
        <span v-if="dialog.state === 'confirm'">
          {{
            dialog.kind === "reserve" ? "Confirm Reservation" : "Join Waitlist"
          }}
        </span>
        <span v-else-if="dialog.state === 'success'">
          {{
            dialog.kind === "reserve"
              ? "Reservation Confirmed"
              : "Waitlist Joined"
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
                : `Join the waitlist for ${dialog.product.name}?`
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
                :min="dialog.startDate"
              />
            </div>
          </div>
        </template>

        <template v-else-if="dialog.state === 'success' && dialog.product">
          <p v-if="dialog.kind === 'reserve'">
            Device reserved. A receipt has been emailed to you.
          </p>
          <p v-else>
            You have joined the waitlist. We'll notify you when it's available.
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
                : "Join"
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
.catalogue {
  padding: 2rem;
  text-align: center;
}
.toolbar {
  margin: 0.5rem 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.filter-toggle {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: linear-gradient(135deg, #867537 0%, #bcad86 100%);
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.filter-toggle::before {
  font-weight: 900;
}
.summary {
  color: #4b5563;
  font-size: 0.95rem;
}
.card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  overflow: hidden;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.layout {
  display: grid;
  gap: 2rem;
  align-items: start;
}

/* Enhanced Drawer Styles */
.drawer {
  position: sticky;
  top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
}

.drawer.hidden {
  display: none;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #867537 0%, #bcad86 100%);
  color: white;
  margin: 0;
}

.drawer-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.drawer-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.drawer-content {
  padding: 1.5rem;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
  background-color: #fff;
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 1.5rem;
}

.quick-filter {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.quick-filter:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
}

.quick-filter.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}

/* Filter Sections */
.filter-section {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 1.5rem;
}

.filter-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h4 {
  margin: 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Filter Groups */
.filter-group {
  margin-bottom: 1.25rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  width: fit-content;
}

/* Select Wrapper */
.select-wrapper {
  position: relative;
}

.filter-select {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
  appearance: none;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.select-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
  font-size: 0.75rem;
}

/* Checkbox Groups */
.checkbox-group {
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.5rem;
  background: #fafafa;
}

.checkbox-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 0.25rem;
}

.checkbox-item:last-child {
  margin-bottom: 0;
}

.checkbox-item:hover {
  background: #f3f4f6;
}

.checkbox-input {
  margin-right: 0.75rem;
  accent-color: #3b82f6;
}

.checkbox-label {
  flex: 1;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-count {
  font-size: 0.75rem;
  color: #6b7280;
  background: #e5e7eb;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
}

/* Price Inputs */
.price-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-direction: column;
  align-content: flex-start;
  flex-wrap: wrap;
}

.price-input-wrapper {
  position: relative;
  flex: 1;
}

.currency {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.price-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 1.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.price-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.price-separator {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

/* Filter Actions */
.filter-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f3f4f6;
}

.btn-apply,
.btn-clear {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-apply {
  background: #6c7c69;
  color: white;
  border: 1px solid #6c7c69;
}

.btn-apply:hover {
  background: #5a6857;
  border-color: #5a6857;
}

.btn-clear {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-clear:hover {
  background: #f9fafb;
  color: #374151;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3.5rem;
  grid-auto-rows: 1fr; /* Add this to make all rows the same height */
}
/* Mobile Backdrop */
.mobile-backdrop {
  display: none;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 50;
    margin: 0;
    border-radius: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    width: 85%;
    max-width: 400px;
  }

  .drawer:not(.hidden) {
    transform: translateX(0);
  }

  .drawer-content {
    max-height: calc(100vh - 5rem);
    padding: 1rem;
    background-color: #fff;
  }

  .drawer-header {
    padding: 1rem 1.5rem;
  }

  /* Backdrop for mobile */
  .drawer:not(.hidden)::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }
}

@media (max-width: 768px) {
  .catalogue {
    padding: 1rem;
  }

  .toolbar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  .summary {
    text-align: center;
  }

  .filter-actions {
    flex-direction: column;
  }

  .price-inputs {
    flex-direction: column;
    gap: 0.75rem;
  }

  .checkbox-group {
    max-height: 120px;
  }
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
  border-radius: 6px;
  border: none;
  outline: none;
  padding: 3px;
}
.waitlist-btn:hover:not(:disabled) {
  background-color: #4b5563;
}
.waitlist-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
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
  color: #b49d4b;
}
.favorite-btn:hover {
  background-color: #f5f5f5;
}

.error {
  color: #a6383e;
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

<style scoped>
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
  grid-template-columns: 1fr 1fr;
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

/* Image container */
.image-container {
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

/* Corner Banner Styles */
.status-banner-available,
.status-banner-loaned {
  position: absolute;
  width: 120px;
  height: 120px;
  overflow: hidden;
  pointer-events: none;
  z-index: 10;
}

.status-banner-available::before,
.status-banner-loaned::before {
  content: "";
  position: absolute;
  top: -100px;
  right: -75px;
  width: 139px;
  height: 150px;
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
  top: 21px;
  right: -20px;
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

.absolute {
  position: absolute;
}

.top-0 {
  top: 0;
}

.right-0 {
  right: 0;
}

.z-20 {
  z-index: 20;
}
</style>
