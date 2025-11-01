// Cosmos DB Favourite Repository Implementation - Infrastructure Layer

import { CosmosClient, Container, ItemResponse } from "@azure/cosmos";
import { Favourite } from "../domain/favourite";
import {
  FavouriteRepo,
  RepositoryResult,
  RepositoryError,
} from "../domain/favourites-repo";

/**
 * Configuration options for Cosmos DB connection
 */
export interface CosmosFavouriteRepoOptions {
  readonly endpoint: string;
  readonly databaseId: string;
  readonly containerId: string;
  readonly key?: string; // Optional access key for key-based auth
}

/**
 * Internal DTO type representing the document structure in Cosmos DB
 * Separate from the domain model to allow for storage-specific concerns
 */
interface FavouriteDocument {
  readonly id: string;
  readonly deviceId: string;
  readonly userId: string;
  readonly addedAt: Date;
}

/**
 * Azure Cosmos DB implementation of FavouriteRepo
 *
 * This infrastructure implementation handles the persistence of Favourite domain objects
 * in Azure Cosmos DB, including data transformation and error handling.
 */
export class CosmosFavouriteRepo implements FavouriteRepo {
  private readonly container: Container;

  constructor(options: CosmosFavouriteRepoOptions) {
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

  async list(): Promise<RepositoryResult<Favourite[]>> {
    try {
      const query = "SELECT * FROM c";
      const { resources } = await this.container.items
        .query<FavouriteDocument>(query)
        .fetchAll();

      const favourites = resources.map((doc) => this.toDomain(doc));
      return { success: true, data: favourites };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  /**
   * Converts domain Favourite to Cosmos DB document format
   */
  private toDocument(favourite: Favourite): FavouriteDocument {
    return {
      id: favourite.id,
      deviceId: favourite.deviceId,
      userId: favourite.userId,
      addedAt: favourite.addedAt,
    };
  }

  /**
   * Converts Cosmos DB document to domain Favourite
   */
  private toDomain(document: FavouriteDocument): Favourite {
    return {
      id: document.id,
      deviceId: document.deviceId,
      userId: document.userId,
      addedAt: new Date(document.addedAt),
    };
  }

  /**
   * Maps Cosmos DB errors to domain repository errors
   */
  private mapCosmosError(error: any): RepositoryError {
    if (error.code === 409) {
      return {
        code: "ALREADY_EXISTS",
        message: "A favourite with this ID already exists",
      };
    }

    if (error.code === 404) {
      return {
        code: "NOT_FOUND",
        message: "Favourite not found",
      };
    }

    if (error.code >= 400 && error.code < 500) {
      return {
        code: "VALIDATION_ERROR",
        message: error.message || "Invalid request",
      };
    }

    return {
      code: "PERSISTENCE_ERROR",
      message:
        error.message || "An error occurred while accessing the database",
    };
  }

  /**
   * Creates a new favourite in Cosmos DB
   */
  async create(favourite: Favourite): Promise<RepositoryResult<Favourite>> {
    try {
      const document = this.toDocument(favourite);

      const response: ItemResponse<FavouriteDocument> =
        await this.container.items.create(document, {
          disableAutomaticIdGeneration: true,
        });

      if (response.resource) {
        const createdFavourite = this.toDomain(response.resource);
        return { success: true, data: createdFavourite };
      }

      return {
        success: false,
        error: {
          code: "PERSISTENCE_ERROR",
          message: "Failed to create favourite - no resource returned",
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
   * Retrieves a favourite by ID from Cosmos DB
   */
  async get(id: string): Promise<RepositoryResult<Favourite>> {
    try {
      const response: ItemResponse<FavouriteDocument> = await this.container
        .item(id, id)
        .read();

      if (response.resource) {
        const favourite = this.toDomain(response.resource);
        return { success: true, data: favourite };
      }

      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Favourite with ID '${id}' not found`,
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
   * Deletes a favourite by ID from Cosmos DB
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    try {
      await this.container.item(id, id).delete();
      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: this.mapCosmosError(error),
      };
    }
  }
}
