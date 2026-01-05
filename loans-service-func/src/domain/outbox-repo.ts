import { RepositoryResult } from "./loan-repo";
import { OutboxEvent } from "./outbox-event";

export interface OutboxRepo {
  enqueue(event: OutboxEvent): Promise<RepositoryResult<OutboxEvent>>;
  markSent(id: string): Promise<RepositoryResult<void>>;
  markFailed(
    id: string,
    options: {
      error: string;
      attempts: number;
      nextAttemptAt: string;
    }
  ): Promise<RepositoryResult<void>>;
  fetchPending(maxItems?: number): Promise<RepositoryResult<OutboxEvent[]>>;
}
