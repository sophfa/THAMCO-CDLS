// In-Memory Loan Repository - Fake for Testing
// This eliminates Cosmos DB dependency and allows fast, isolated tests

import { Loan } from "../../src/domain/loan";
import {
  LoanRepo,
  RepositoryResult,
  RepositoryError,
} from "../../src/domain/loan-repo";

/**
 * In-memory fake implementation of LoanRepo for testing
 * Simulates persistence without external dependencies
 */
export class InMemoryLoanRepo implements LoanRepo {
  private loans: Map<string, Loan> = new Map();

  // For testing concurrency/race conditions
  public simulateDelay: number = 0;

  constructor(initialLoans: Loan[] = []) {
    initialLoans.forEach((loan) => this.loans.set(loan.id, loan));
  }

  async list(): Promise<RepositoryResult<Loan[]>> {
    await this.delay();
    return {
      success: true,
      data: Array.from(this.loans.values()),
    };
  }

  async create(loan: Loan): Promise<RepositoryResult<Loan>> {
    await this.delay();

    // Simulate unique constraint
    if (this.loans.has(loan.id)) {
      return {
        success: false,
        error: {
          code: "ALREADY_EXISTS",
          message: `Loan with id ${loan.id} already exists`,
        },
      };
    }

    // Validate required fields
    if (!loan.deviceId || !loan.userId) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "deviceId and userId are required",
          field: !loan.deviceId ? "deviceId" : "userId",
        },
      };
    }

    this.loans.set(loan.id, { ...loan });
    return { success: true, data: { ...loan } };
  }

  async get(id: string): Promise<RepositoryResult<Loan>> {
    await this.delay();

    const loan = this.loans.get(id);
    if (!loan) {
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Loan with id ${id} not found`,
        },
      };
    }

    return { success: true, data: { ...loan } };
  }

  // Test helper methods
  async update(loan: Loan): Promise<RepositoryResult<Loan>> {
    await this.delay();

    if (!this.loans.has(loan.id)) {
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Loan with id ${loan.id} not found`,
        },
      };
    }

    this.loans.set(loan.id, { ...loan });
    return { success: true, data: { ...loan } };
  }

  clear(): void {
    this.loans.clear();
  }

  count(): number {
    return this.loans.size;
  }

  private async delay(): Promise<void> {
    if (this.simulateDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulateDelay));
    }
  }
}
