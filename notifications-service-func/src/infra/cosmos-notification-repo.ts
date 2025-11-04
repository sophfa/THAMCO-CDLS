// Cosmos DB Notification Repository Implementation - Infrastructure Layer

import { CosmosClient, Container, ItemResponse } from '@azure/cosmos';
import { Notification } from '../domain/notification';
import {
  NotificationRepo,
  RepositoryResult,
  RepositoryError,
} from '../domain/notification-repo';

/**
 * Configuration options for Cosmos DB connection
 */
export interface CosmosNotificationRepoOptions {
  readonly endpoint: string;
  readonly databaseId: string;
  readonly containerId: string;
  readonly key?: string; // Optional access key for key-based auth
}

/**
 * Internal DTO type representing the document structure in Cosmos DB
 * Separate from the domain model to allow for storage-specific concerns
 */
interface NotificationDocument {
  readonly id: string;
  readonly userId: string;
  readonly type:
    | 'Waitlist'
    | 'Reservation'
    | 'Accepted'
    | 'Rejected'
    | 'Cancelled'
    | 'Collected'
    | 'Returned'
    | 'Custom';
  readonly message: string;
  readonly payload: any;
  readonly createdAt: string;
}

/**
 * Azure Cosmos DB implementation of NotificationRepo
 *
 * This infrastructure implementation handles the persistence of Notification domain objects
 * in Azure Cosmos DB, including data transformation and error handling.
 */
export class CosmosNotificationRepo implements NotificationRepo {
  private readonly container: Container;

  constructor(options: CosmosNotificationRepoOptions) {
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

  async list(): Promise<RepositoryResult<Notification[]>> {
    try {
      const query = 'SELECT * FROM c';
      const { resources } = await this.container.items
        .query<NotificationDocument>(query)
        .fetchAll();

      const notifications = resources.map((doc) => this.toDomain(doc));
      return { success: true, data: notifications };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  /**
   * Converts domain Notification to Cosmos DB document format
   */
  private toDocument(notification: Notification): NotificationDocument {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      payload: notification.payload,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Converts Cosmos DB document to domain Notification
   */
  private toDomain(document: NotificationDocument): Notification {
    return {
      id: document.id,
      userId: document.userId,
      type: document.type,
      message: document.message,
      payload: document.payload,
      createdAt: document.createdAt,
    };
  }

  /**
   * Maps Cosmos DB errors to domain repository errors
   */
  private mapCosmosError(error: any): RepositoryError {
    if (error.code === 409) {
      return {
        code: 'ALREADY_EXISTS',
        message: 'A notification with this ID already exists',
      };
    }

    if (error.code === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Notification not found',
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
   * Creates a new notification in Cosmos DB
   */
  async create(
    notification: Notification
  ): Promise<RepositoryResult<Notification>> {
    try {
      const document = this.toDocument(notification);
console.log('creating db entry');

      const response: ItemResponse<NotificationDocument> =
        await this.container.items.create(document, {
          disableAutomaticIdGeneration: true,
        });

      if (response.resource) {
        const createdNotification = this.toDomain(response.resource);
        return { success: true, data: createdNotification };
      }

      return {
        success: false,
        error: {
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to create notification - no resource returned',
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
   * Retrieves a notification by ID from Cosmos DB
   */
  async get(id: string): Promise<RepositoryResult<Notification>> {
    try {
      const response: ItemResponse<NotificationDocument> = await this.container
        .item(id, id)
        .read();

      if (response.resource) {
        const notification = this.toDomain(response.resource);
        return { success: true, data: notification };
      }

      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Notification with ID '${id}' not found`,
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
   * Retrieves all notifications for a specific user from Cosmos DB
   */
  async getByUserId(userId: string): Promise<RepositoryResult<Notification[]>> {
    try {
      const query = 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC';
      const { resources } = await this.container.items
        .query<NotificationDocument>({
          query,
          parameters: [{ name: '@userId', value: userId }]
        })
        .fetchAll();

      const notifications = resources.map((doc) => this.toDomain(doc));
      return { success: true, data: notifications };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }
}
