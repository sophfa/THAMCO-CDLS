import { ref, computed } from "vue";
import { getUserId } from "./authService";
import type { Product } from "./CatalogueService";
import {
  getUserFavorites,
  addToFavorites as apiAddToFavorites,
  addFavourite as apiAddFavourite,
  removeFromFavorites as apiRemoveFromFavorites,
  syncAllFavorites,
  clearAllFavorites as apiClearAllFavorites,
} from "./api/loansService";

// Global favorites state
const favorites = ref<Set<string>>(new Set());
const loading = ref(false);
const error = ref<string | null>(null);

// Load favorites from API
export const loadFavoritesFromAPI = async (): Promise<void> => {

  try {
    loading.value = true;
    error.value = null;

    const userId = await getUserId();
    if (!userId) {
      favorites.value.clear();
      return;
    }

    const favoriteIds = await getUserFavorites(userId);
    favorites.value = new Set(favoriteIds);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load favorites";
    console.warn("[Favorites] API load failed; skipping cached fallback", err);
  } finally {
    loading.value = false;
  }
};

// Save individual favorite to API
export const saveFavoriteToAPI = async (
  deviceId: string,
  isFavorite: boolean
): Promise<void> => {

  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }


    if (isFavorite) {
      await apiAddFavourite(userId, deviceId);
    } else {
      await apiRemoveFromFavorites(userId, deviceId);
    }

  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to save favorite";
    throw err; // Re-throw to let caller handle
  }
};

// Bulk sync all favorites to API
export const syncFavoritesToAPI = async (): Promise<void> => {

  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const favoriteIds = Array.from(favorites.value);

    await syncAllFavorites(userId, favoriteIds);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to sync favorites";
    throw err;
  }
};

export const useFavorites = () => {
  // Computed properties
  const favoritesList = computed(() => Array.from(favorites.value));
  const favoritesCount = computed(() => favorites.value.size);
  const hasFavorites = computed(() => favorites.value.size > 0);
  const isLoading = computed(() => loading.value);
  const lastError = computed(() => error.value);

  // Methods
  const isFavorite = (productId: string): boolean => {
    return favorites.value.has(productId);
  };

  const addToFavorites = async (productId: string): Promise<void> => {

    try {
      favorites.value.add(productId);

      await saveFavoriteToAPI(productId, true);
    } catch (err) {
      // If API call fails, keep local state but show error
    }
  };

  const removeFromFavorites = async (productId: string): Promise<void> => {

    try {
      favorites.value.delete(productId);

      await saveFavoriteToAPI(productId, false);
    } catch (err) {
      // If API call fails, keep local state but show error
    }
  };

  const toggleFavorite = async (productId: string): Promise<void> => {
    const currentState = isFavorite(productId);

    if (currentState) {
      await removeFromFavorites(productId);
    } else {
      await addToFavorites(productId);
    }
  };

  const clearAllFavorites = async (): Promise<void> => {

    try {
      const userId = await getUserId();
      if (userId) {
        await apiClearAllFavorites(userId);
      } else {
      }

      favorites.value.clear();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to clear favorites";

      // Still clear local state
      favorites.value.clear();
    }
  };

  const getFavoriteProducts = (allProducts: Product[]): Product[] => {
    return allProducts.filter((product) => isFavorite(product.id));
  };

  // Initialize favorites on first use
  const initializeFavorites = async (): Promise<void> => {
    await loadFavoritesFromAPI();
  };

  // Bulk operations
  const addMultipleToFavorites = async (
    productIds: string[]
  ): Promise<void> => {

    try {
      productIds.forEach((id) => favorites.value.add(id));

      await syncFavoritesToAPI();
    } catch (err) {
    }
  };

  const removeMultipleFromFavorites = async (
    productIds: string[]
  ): Promise<void> => {

    try {
      productIds.forEach((id) => favorites.value.delete(id));

      await syncFavoritesToAPI();
    } catch (err) {
    }
  };

  // Export/Import for syncing
  const exportFavorites = (): string[] => {
    return Array.from(favorites.value);
  };

  const importFavorites = async (favoritesArray: string[]): Promise<void> => {

    try {
      favorites.value = new Set(favoritesArray);

      await syncFavoritesToAPI();
    } catch (err) {
      console.warn("[Favorites] Failed to import favorites", err);
    }
  };

  // Clear any existing errors
  const clearError = (): void => {
    error.value = null;
  };

  return {
    // State
    favorites: favorites.value,
    favoritesList,
    favoritesCount,
    hasFavorites,
    isLoading,
    lastError,

    // Methods
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    clearAllFavorites,
    getFavoriteProducts,
    addMultipleToFavorites,
    removeMultipleFromFavorites,
    exportFavorites,
    importFavorites,
    initializeFavorites,
    clearError,

    // API methods
    loadFavoritesFromAPI,
    syncFavoritesToAPI,
  };
};
