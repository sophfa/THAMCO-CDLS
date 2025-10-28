// Inventory Repository Interface - Pure Domain Contract

import { Inventory } from './inventory';

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
 * Pure domain repository interface for Inventory persistence
 *
 * This interface defines the contract for inventory persistence operations
 * without any implementation details, keeping it pure domain-focused.
 */
export interface InventoryRepo {
  list(): Promise<RepositoryResult<Inventory[]>>;
  /**
   * Persists a inventory to the repository
   *
   * @param inventory - The inventory to save
   * @returns Promise resolving to either the saved inventory or a repository error
   */
  create(inventory: Inventory): Promise<RepositoryResult<Inventory>>;

  /**
   * Retrieves a inventory by its unique identifier
   *
   * @param id - The unique inventory identifier
   * @returns Promise resolving to either the found inventory or a repository error
   */
  get(id: string): Promise<RepositoryResult<Inventory>>;
}
