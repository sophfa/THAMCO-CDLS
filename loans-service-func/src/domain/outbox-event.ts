export type OutboxEventStatus = "PENDING" | "SENT" | "FAILED";

export interface EventGridOutboxPayload {
  readonly id: string;
  readonly eventType: string;
  readonly subject: string;
  readonly eventTime: string;
  readonly dataVersion: string;
  readonly data: Record<string, unknown>;
}

export interface OutboxEvent {
  readonly id: string;
  readonly payload: EventGridOutboxPayload;
  readonly status: OutboxEventStatus;
  readonly retryCount: number;
  readonly correlationId?: string;
  readonly createdAt: string;
  readonly nextAttemptAt?: string;
  readonly lastError?: string;
}
