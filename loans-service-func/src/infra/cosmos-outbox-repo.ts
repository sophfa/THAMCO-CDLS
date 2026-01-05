import { Container, ItemResponse } from "@azure/cosmos";
import { OutboxEvent } from "../domain/outbox-event";
import { OutboxRepo } from "../domain/outbox-repo";
import { RepositoryError, RepositoryResult } from "../domain/loan-repo";

const MAX_FETCH_BATCH = 20;

interface OutboxDocument extends OutboxEvent {
  readonly updatedAt?: string;
}

export class CosmosOutboxRepo implements OutboxRepo {
  constructor(private readonly container: Container) {}

  async enqueue(event: OutboxEvent): Promise<RepositoryResult<OutboxEvent>> {
    try {
      await this.container.items.create(event, {
        disableAutomaticIdGeneration: true,
      });
      return { success: true, data: event };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  async markSent(id: string): Promise<RepositoryResult<void>> {
    return this.updateStatus(id, "SENT");
  }

  async markFailed(
    id: string,
    options: { error: string; attempts: number; nextAttemptAt: string }
  ): Promise<RepositoryResult<void>> {
    return this.updateStatus(id, "FAILED", {
      lastError: options.error,
      retryCount: options.attempts,
      nextAttemptAt: options.nextAttemptAt,
    });
  }

  async fetchPending(
    maxItems: number = MAX_FETCH_BATCH
  ): Promise<RepositoryResult<OutboxEvent[]>> {
    try {
      const now = new Date().toISOString();
      const querySpec = {
        query:
          "SELECT * FROM c WHERE c.status = 'PENDING' OR (c.status = 'FAILED' AND c.nextAttemptAt <= @now) ORDER BY c.createdAt ASC",
        parameters: [{ name: "@now", value: now }],
      };

      const { resources } = await this.container.items
        .query<OutboxDocument>(querySpec, {
          maxItemCount: maxItems,
          enableCrossPartitionQuery: true,
        })
        .fetchAll();

      return { success: true, data: resources };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  private async updateStatus(
    id: string,
    status: "SENT" | "FAILED",
    updates?: Partial<Pick<OutboxEvent, "lastError" | "retryCount" | "nextAttemptAt">>
  ): Promise<RepositoryResult<void>> {
    try {
      const readResult: ItemResponse<OutboxDocument> = await this.container
        .item(id, id)
        .read();

      if (!readResult.resource) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Outbox event '${id}' not found`,
          },
        };
      }

      const updated: OutboxDocument = {
        ...readResult.resource,
        status,
        updatedAt: new Date().toISOString(),
        lastError: updates?.lastError,
        retryCount: updates?.retryCount ?? readResult.resource.retryCount,
        nextAttemptAt: updates?.nextAttemptAt,
      };

      await this.container.item(id, id).replace(updated);
      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: this.mapCosmosError(error) };
    }
  }

  private mapCosmosError(error: any): RepositoryError {
    if (error?.code === 404) {
      return {
        code: "NOT_FOUND",
        message: error.message || "Outbox event not found",
      };
    }

    if (error?.code >= 400 && error?.code < 500) {
      return {
        code: "VALIDATION_ERROR",
        message: error.message || "Invalid outbox request",
      };
    }

    return {
      code: "PERSISTENCE_ERROR",
      message: error.message || "Failed to access outbox store",
    };
  }
}
