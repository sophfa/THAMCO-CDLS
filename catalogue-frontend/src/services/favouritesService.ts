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
  console.log(`[FavoritesService] Starting to load favorites from API`);

  try {
    loading.value = true;
    error.value = null;

    const userId = await getUserId();
    if (!userId) {
      console.warn(
        "[FavoritesService] No user ID available, clearing favorites"
      );
      favorites.value.clear();
      return;
    }

    console.log(`[FavoritesService] Loading favorites for user: ${userId}`);
    const favoriteIds = await getUserFavorites(userId);
    favorites.value = new Set(favoriteIds);
    console.log(
      `[FavoritesService] Successfully loaded ${favoriteIds.length} favorites from API:`,
      favoriteIds
    );
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load favorites";
    console.error("[FavoritesService] Failed to load favorites from API:", err);

    // Fallback to localStorage if API fails
    try {
      console.log("[FavoritesService] Attempting localStorage fallback");
      const stored = localStorage.getItem("thamco-favorites");
      if (stored) {
        const favArray = JSON.parse(stored) as string[];
        favorites.value = new Set(favArray);
        console.log(
          "[FavoritesService] Successfully loaded favorites from localStorage as fallback:",
          favArray
        );
      } else {
        console.log("[FavoritesService] No localStorage data found");
      }
    } catch (localErr) {
      console.error(
        "[FavoritesService] Failed to load favorites from localStorage:",
        localErr
      );
    }
  } finally {
    loading.value = false;
    console.log(
      `[FavoritesService] Finished loading favorites. Current count: ${favorites.value.size}`
    );
  }
};

// Save individual favorite to API
export const saveFavoriteToAPI = async (
  deviceId: string,
  isFavorite: boolean
): Promise<void> => {
  console.log(
    `[FavoritesService] Saving favorite ${
      isFavorite ? "add" : "remove"
    } for device: ${deviceId}`
  );

  try {
    const userId = await getUserId();
    if (!userId) {
      console.error(
        "[FavoritesService] User not authenticated - cannot save favorite"
      );
      throw new Error("User not authenticated");
    }

    console.log(
      `[FavoritesService] ${
        isFavorite ? "Adding" : "Removing"
      } device ${deviceId} for user: ${userId}`
    );

    if (isFavorite) {
      await apiAddFavourite(userId, deviceId);
    } else {
      await apiRemoveFromFavorites(userId, deviceId);
    }

    // Also save to localStorage as backup
    const favArray = Array.from(favorites.value);
    localStorage.setItem("thamco-favorites", JSON.stringify(favArray));

    console.log(
      `[FavoritesService] Successfully ${
        isFavorite ? "added" : "removed"
      } favorite ${deviceId} via API`
    );
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to save favorite";
    console.error("[FavoritesService] Failed to save favorite to API:", {
      deviceId,
      isFavorite,
      error: err,
    });

    // Still update local state and localStorage as fallback
    const favArray = Array.from(favorites.value);
    localStorage.setItem("thamco-favorites", JSON.stringify(favArray));
    console.log("[FavoritesService] Updated localStorage as fallback");
    throw err; // Re-throw to let caller handle
  }
};

// Bulk sync all favorites to API
export const syncFavoritesToAPI = async (): Promise<void> => {
  console.log(
    `[FavoritesService] Starting bulk sync of ${favorites.value.size} favorites to API`
  );

  try {
    const userId = await getUserId();
    if (!userId) {
      console.error(
        "[FavoritesService] User not authenticated - cannot sync favorites"
      );
      throw new Error("User not authenticated");
    }

    const favoriteIds = Array.from(favorites.value);
    console.log(
      `[FavoritesService] Syncing favorites for user ${userId}:`,
      favoriteIds
    );

    await syncAllFavorites(userId, favoriteIds);
    console.log(
      `[FavoritesService] Successfully synced ${favoriteIds.length} favorites to API`
    );
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to sync favorites";
    console.error("[FavoritesService] Failed to sync favorites to API:", {
      favoritesCount: favorites.value.size,
      error: err,
    });
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
    console.log(`[FavoritesService] Adding product to favorites: ${productId}`);

    try {
      favorites.value.add(productId);
      console.log(
        `[FavoritesService] Updated local state - favorites count: ${favorites.value.size}`
      );

      await saveFavoriteToAPI(productId, true);
      console.log(
        `[FavoritesService] Successfully added ${productId} to favorites`
      );
    } catch (err) {
      // If API call fails, keep local state but show error
      console.error(
        "[FavoritesService] Failed to add to favorites via API, kept local change:",
        {
          productId,
          error: err,
        }
      );
    }
  };

  const removeFromFavorites = async (productId: string): Promise<void> => {
    console.log(
      `[FavoritesService] Removing product from favorites: ${productId}`
    );

    try {
      favorites.value.delete(productId);
      console.log(
        `[FavoritesService] Updated local state - favorites count: ${favorites.value.size}`
      );

      await saveFavoriteToAPI(productId, false);
      console.log(
        `[FavoritesService] Successfully removed ${productId} from favorites`
      );
    } catch (err) {
      // If API call fails, keep local state but show error
      console.error(
        "[FavoritesService] Failed to remove from favorites via API, kept local change:",
        {
          productId,
          error: err,
        }
      );
    }
  };

  const toggleFavorite = async (productId: string): Promise<void> => {
    const currentState = isFavorite(productId);
    console.log(
      `[FavoritesService] Toggling favorite for product ${productId} (currently ${
        currentState ? "favorited" : "not favorited"
      })`
    );

    if (currentState) {
      await removeFromFavorites(productId);
    } else {
      await addToFavorites(productId);
    }
  };

  const clearAllFavorites = async (): Promise<void> => {
    console.log(
      `[FavoritesService] Clearing all favorites (current count: ${favorites.value.size})`
    );

    try {
      const userId = await getUserId();
      if (userId) {
        console.log(
          `[FavoritesService] Clearing favorites via API for user: ${userId}`
        );
        await apiClearAllFavorites(userId);
      } else {
        console.warn(
          "[FavoritesService] No user ID available, only clearing local state"
        );
      }

      favorites.value.clear();
      localStorage.removeItem("thamco-favorites");
      console.log("[FavoritesService] Successfully cleared all favorites");
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to clear favorites";
      console.error(
        "[FavoritesService] Failed to clear favorites via API:",
        err
      );

      // Still clear local state
      favorites.value.clear();
      localStorage.removeItem("thamco-favorites");
      console.log("[FavoritesService] Cleared local state despite API error");
    }
  };

  const getFavoriteProducts = (allProducts: Product[]): Product[] => {
    return allProducts.filter((product) => isFavorite(product.id));
  };

  // Initialize favorites on first use
  const initializeFavorites = async (): Promise<void> => {
    console.log("[FavoritesService] Initializing favorites service");
    await loadFavoritesFromAPI();
  };

  // Bulk operations
  const addMultipleToFavorites = async (
    productIds: string[]
  ): Promise<void> => {
    console.log(
      `[FavoritesService] Adding multiple favorites: ${productIds.length} products`,
      productIds
    );

    try {
      productIds.forEach((id) => favorites.value.add(id));
      console.log(
        `[FavoritesService] Updated local state - favorites count: ${favorites.value.size}`
      );

      await syncFavoritesToAPI();
      console.log(
        `[FavoritesService] Successfully added ${productIds.length} products to favorites`
      );
    } catch (err) {
      console.error(
        "[FavoritesService] Failed to add multiple favorites via API:",
        {
          productIds,
          error: err,
        }
      );
    }
  };

  const removeMultipleFromFavorites = async (
    productIds: string[]
  ): Promise<void> => {
    console.log(
      `[FavoritesService] Removing multiple favorites: ${productIds.length} products`,
      productIds
    );

    try {
      productIds.forEach((id) => favorites.value.delete(id));
      console.log(
        `[FavoritesService] Updated local state - favorites count: ${favorites.value.size}`
      );

      await syncFavoritesToAPI();
      console.log(
        `[FavoritesService] Successfully removed ${productIds.length} products from favorites`
      );
    } catch (err) {
      console.error(
        "[FavoritesService] Failed to remove multiple favorites via API:",
        {
          productIds,
          error: err,
        }
      );
    }
  };

  // Export/Import for syncing
  const exportFavorites = (): string[] => {
    return Array.from(favorites.value);
  };

  const importFavorites = async (favoritesArray: string[]): Promise<void> => {
    console.log(
      `[FavoritesService] Importing ${favoritesArray.length} favorites:`,
      favoritesArray
    );

    try {
      favorites.value = new Set(favoritesArray);
      console.log(
        `[FavoritesService] Updated local state - favorites count: ${favorites.value.size}`
      );

      await syncFavoritesToAPI();
      console.log(
        `[FavoritesService] Successfully imported ${favoritesArray.length} favorites`
      );
    } catch (err) {
      console.error("[FavoritesService] Failed to import favorites to API:", {
        favoritesArray,
        error: err,
      });
      // Keep local state even if API fails
      localStorage.setItem("thamco-favorites", JSON.stringify(favoritesArray));
      console.log(
        "[FavoritesService] Saved imported favorites to localStorage as fallback"
      );
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
