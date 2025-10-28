// Notification Repository Interface - Pure Domain Contract

import { Notification } from './notification';

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
 * Pure domain repository interface for Notification persistence
 *
 * This interface defines the contract for notification persistence operations
 * without any implementation details, keeping it pure domain-focused.
 */
export interface NotificationRepo {
  list(): Promise<RepositoryResult<Notification[]>>;
  /**
   * Persists a notification to the repository
   *
   * @param notification - The notification to save
   * @returns Promise resolving to either the saved notification or a repository error
   */
  create(notification: Notification): Promise<RepositoryResult<Notification>>;

  /**
   * Retrieves a notification by its unique identifier
   *
   * @param id - The unique notification identifier
   * @returns Promise resolving to either the found notification or a repository error
   */
  get(id: string): Promise<RepositoryResult<Notification>>;
}
