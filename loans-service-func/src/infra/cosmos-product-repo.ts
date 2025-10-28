// Cosmos DB Loan Repository Implementation - Infrastructure Layer

import { CosmosClient, Container, ItemResponse } from '@azure/cosmos';
import { Loan } from '../domain/loan';
import {
  LoanRepo,
  RepositoryResult,
  RepositoryError,
} from '../domain/loan-repo';

/**
 * Configuration options for Cosmos DB connection
 */
export interface CosmosLoanRepoOptions {
  readonly endpoint: string;
  readonly databaseId: string;
  readonly containerId: string;
  readonly key?: string; // Optional access key for key-based auth
}

/**
 * Internal DTO type representing the document structure in Cosmos DB
 * Separate from the domain model to allow for storage-specific concerns
 */
interface LoanDocument {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: string;
  readonly model: string;
  readonly processor: string;
  readonly ram: string;
  readonly storage: string;
  readonly gpu: string;
  readonly display: string;
  readonly os: string;
  readonly batteryLife: string;
  readonly weight: string;
  readonly ports: string[];
  readonly connectivity: string[];
  readonly description?: string;
  readonly imageUrl?: string;
  readonly price: number;
  readonly inStock: boolean;
  readonly createdAt: Date;
}

/**
 * Azure Cosmos DB implementation of LoanRepo
 *
 * This infrastructure implementation handles the persistence of Loan domain objects
 * in Azure Cosmos DB, including data transformation and error handling.
 */
export class CosmosLoanRepo implements LoanRepo {
  private readonly container: Container;

  constructor(options: CosmosLoanRepoOptions) {
    // Initialize Cosmos client with appropriate authentication
    const cosmosClient = options.key
      ? new CosmosClient({
          endpoint: options.endpoint,
          key: options.key,
        })
      : new CosmosClient({
          endpoint: options.endpoint,
        }); // Uses default credential chain when no key provided

    this.container = cosmosClient
      .database(options.databaseId)
      .container(options.containerId);
  }

  async list(): Promise<RepositoryResult<Loan[]>> {
    try {
      const query = 'SELECT * FROM c';
      const { resources } = await this.container.items
        .query<LoanDocument>(query)
        .fetchAll();

      const loans = resources.map((doc) => this.toDomain(doc));
      return { success: true, data: loans };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  /**
   * Converts domain Loan to Cosmos DB document format
   */
  private toDocument(loan: Loan): LoanDocument {
    return {
      id: loan.id,
      name: loan.name,
      brand: loan.brand,
      category: loan.category,
      model: loan.model,
      processor: loan.processor,
      ram: loan.ram,
      storage: loan.storage,
      gpu: loan.gpu,
      display: loan.display,
      os: loan.os,
      batteryLife: loan.batteryLife,
      weight: loan.weight,
      ports: loan.ports,
      connectivity: loan.connectivity,
      description: loan.description,
      imageUrl: loan.imageUrl,
      price: loan.price,
      inStock: loan.inStock,
      createdAt: loan.createdAt,
    };
  }

  /**
   * Converts Cosmos DB document to domain Loan
   */
  private toDomain(document: LoanDocument): Loan {
    return {
      id: document.id,
      name: document.name,
      brand: document.brand,
      category: document.category,
      model: document.model,
      processor: document.processor,
      ram: document.ram,
      storage: document.storage,
      gpu: document.gpu,
      display: document.display,
      os: document.os,
      batteryLife: document.batteryLife,
      weight: document.weight,
      ports: document.ports,
      connectivity: document.connectivity,
      description: document.description,
      imageUrl: document.imageUrl,
      price: document.price,
      inStock: document.inStock,
      createdAt: new Date(document.createdAt),
    };
  }

  /**
   * Maps Cosmos DB errors to domain repository errors
   */
  private mapCosmosError(error: any): RepositoryError {
    if (error.code === 409) {
      return {
        code: 'ALREADY_EXISTS',
        message: 'A loan with this ID already exists',
      };
    }

    if (error.code === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Loan not found',
      };
    }

    if (error.code >= 400 && error.code < 500) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid request',
      };
    }

    return {
      code: 'PERSISTENCE_ERROR',
      message:
        error.message || 'An error occurred while accessing the database',
    };
  }

  /**
   * Creates a new loan in Cosmos DB
   */
  async create(loan: Loan): Promise<RepositoryResult<Loan>> {
    try {
      const document = this.toDocument(loan);

      const response: ItemResponse<LoanDocument> =
        await this.container.items.create(document, {
          disableAutomaticIdGeneration: true,
        });

      if (response.resource) {
        const createdLoan = this.toDomain(response.resource);
        return { success: true, data: createdLoan };
      }

      return {
        success: false,
        error: {
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to create loan - no resource returned',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.mapCosmosError(error),
      };
    }
  }

  /**
   * Retrieves a loan by ID from Cosmos DB
   */
  async get(id: string): Promise<RepositoryResult<Loan>> {
    try {
      const response: ItemResponse<LoanDocument> = await this.container
        .item(id, id)
        .read();

      if (response.resource) {
        const loan = this.toDomain(response.resource);
        return { success: true, data: loan };
      }

      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Loan with ID '${id}' not found`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.mapCosmosError(error),
      };
    }
  }
}
