import { client } from "../config/cosmosClient";
import { getOutboxCosmosConfig } from "../config/outboxCosmosConfig";
import { CosmosOutboxRepo } from "./cosmos-outbox-repo";
import { OutboxRepo } from "../domain/outbox-repo";
import { OutboxEvent } from "../domain/outbox-event";
import { RepositoryResult } from "../domain/loan-repo";

class NoopOutboxRepo implements OutboxRepo {
  private data: Record<string, OutboxEvent> = {};

  enqueue(event: OutboxEvent): Promise<RepositoryResult<OutboxEvent>> {
    this.data[event.id] = event;
    return Promise.resolve({ success: true, data: event });
  }

  markSent(_id: string): Promise<RepositoryResult<void>> {
    return Promise.resolve({ success: true, data: undefined });
  }

  markFailed(
    _id: string,
    _options: { error: string; attempts: number; nextAttemptAt: string }
  ): Promise<RepositoryResult<void>> {
    return Promise.resolve({ success: true, data: undefined });
  }

  fetchPending(): Promise<RepositoryResult<OutboxEvent[]>> {
    return Promise.resolve({ success: true, data: [] });
  }
}

let cachedRepo: OutboxRepo | undefined;
const noopRepo = new NoopOutboxRepo();
let warnedAboutMissingConfig = false;

export function getOutboxRepo(): OutboxRepo {
  if (!cachedRepo) {
    if (!process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER_OUTBOX) {
      if (!warnedAboutMissingConfig) {
        console.warn(
          "Outbox configuration missing (COSMOS_DATABASE / COSMOS_CONTAINER_OUTBOX); using noop outbox implementation."
        );
        warnedAboutMissingConfig = true;
      }
      cachedRepo = noopRepo;
      return cachedRepo;
    }

    const { databaseId, containerId } = getOutboxCosmosConfig();
    const container = client.database(databaseId).container(containerId);
    cachedRepo = new CosmosOutboxRepo(container);
  }

  return cachedRepo;
}
