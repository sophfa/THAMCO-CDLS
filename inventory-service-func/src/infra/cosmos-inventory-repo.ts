// Cosmos DB Inventory Repository Implementation - Infrastructure Layer

import { CosmosClient, Container, ItemResponse } from '@azure/cosmos';
import { Inventory } from '../domain/inventory';
import {
  InventoryRepo,
  RepositoryResult,
  RepositoryError,
} from '../domain/inventory-repo';

/**
 * Configuration options for Cosmos DB connection
 */
export interface CosmosInventoryRepoOptions {
  readonly endpoint: string;
  readonly databaseId: string;
  readonly containerId: string;
  readonly key?: string; // Optional access key for key-based auth
}

/**
 * Internal DTO type representing the document structure in Cosmos DB
 * Separate from the domain model to allow for storage-specific concerns
 */
interface InventoryDocument {
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
 * Azure Cosmos DB implementation of InventoryRepo
 *
 * This infrastructure implementation handles the persistence of Inventory domain objects
 * in Azure Cosmos DB, including data transformation and error handling.
 */
export class CosmosInventoryRepo implements InventoryRepo {
  private readonly container: Container;

  constructor(options: CosmosInventoryRepoOptions) {
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

  async list(): Promise<RepositoryResult<Inventory[]>> {
    try {
      const query = 'SELECT * FROM c';
      const { resources } = await this.container.items
        .query<InventoryDocument>(query)
        .fetchAll();

      const inventorys = resources.map((doc) => this.toDomain(doc));
      return { success: true, data: inventorys };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  /**
   * Converts domain Inventory to Cosmos DB document format
   */
  private toDocument(inventory: Inventory): InventoryDocument {
    return {
      id: inventory.id,
      name: inventory.name,
      brand: inventory.brand,
      category: inventory.category,
      model: inventory.model,
      processor: inventory.processor,
      ram: inventory.ram,
      storage: inventory.storage,
      gpu: inventory.gpu,
      display: inventory.display,
      os: inventory.os,
      batteryLife: inventory.batteryLife,
      weight: inventory.weight,
      ports: inventory.ports,
      connectivity: inventory.connectivity,
      description: inventory.description,
      imageUrl: inventory.imageUrl,
      price: inventory.price,
      inStock: inventory.inStock,
      createdAt: inventory.createdAt,
    };
  }

  /**
   * Converts Cosmos DB document to domain Inventory
   */
  private toDomain(document: InventoryDocument): Inventory {
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
        message: 'A inventory with this ID already exists',
      };
    }

    if (error.code === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Inventory not found',
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
   * Creates a new inventory in Cosmos DB
   */
  async create(inventory: Inventory): Promise<RepositoryResult<Inventory>> {
    try {
      const document = this.toDocument(inventory);

      const response: ItemResponse<InventoryDocument> =
        await this.container.items.create(document, {
          disableAutomaticIdGeneration: true,
        });

      if (response.resource) {
        const createdInventory = this.toDomain(response.resource);
        return { success: true, data: createdInventory };
      }

      return {
        success: false,
        error: {
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to create inventory - no resource returned',
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
   * Retrieves a inventory by ID from Cosmos DB
   */
  async get(id: string): Promise<RepositoryResult<Inventory>> {
    try {
      const response: ItemResponse<InventoryDocument> = await this.container
        .item(id, id)
        .read();

      if (response.resource) {
        const inventory = this.toDomain(response.resource);
        return { success: true, data: inventory };
      }

      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Inventory with ID '${id}' not found`,
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
