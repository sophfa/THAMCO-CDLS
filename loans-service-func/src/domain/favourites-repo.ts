// Favourites Repository Interface - Pure Domain Contract

import { Favourite } from "./favourite";

/**
 * Repository error type for domain-level error handling
 */
export interface RepositoryError {
  readonly code:
    | 'NOT_FOUND'
    | 'ALREADY_EXISTS'
    | 'PERSISTENCE_ERROR'
    | 'VALIDATION_ERROR';
  readonly message: string;
  readonly field?: string;
}

/**
 * Result type for repository operations - Either success or error
 */
export type RepositoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: RepositoryError };

/**
 * Pure domain repository interface for Loan persistence
 *
 * This interface defines the contract for loan persistence operations
 * without any implementation details, keeping it pure domain-focused.
 */
export interface FavouriteRepo {
  list(): Promise<RepositoryResult<Favourite[]>>;
  /**
   * Persists a favourite to the repository
   *
   * @param favourite - The favourite to save
   * @returns Promise resolving to either the saved favourite or a repository error
   */
  create(favourite: Favourite): Promise<RepositoryResult<Favourite>>;

  /**
   * Retrieves a favourite by its unique identifier
   *
   * @param id - The unique favourite identifier
   * @returns Promise resolving to either the found favourite or a repository error
   */
  get(id: string): Promise<RepositoryResult<Favourite>>;
}
