// Loan Repository Interface - Pure Domain Contract

import { Loan } from './loan';

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
export interface LoanRepo {
  list(): Promise<RepositoryResult<Loan[]>>;
  /**
   * Persists a loan to the repository
   *
   * @param loan - The loan to save
   * @returns Promise resolving to either the saved loan or a repository error
   */
  create(loan: Loan): Promise<RepositoryResult<Loan>>;

  /**
   * Retrieves a loan by its unique identifier
   *
   * @param id - The unique loan identifier
   * @returns Promise resolving to either the found loan or a repository error
   */
  get(id: string): Promise<RepositoryResult<Loan>>;
}
