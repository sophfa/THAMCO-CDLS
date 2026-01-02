type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (response: Response | null, error: unknown) => boolean;
  logAttempts?: boolean;
  retryId?: string;
};

const DEFAULT_RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

function shouldRetryResponse(response: Response | null): boolean {
  if (!response) return true;
  return DEFAULT_RETRY_STATUSES.has(response.status);
}

function generateRetryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `retry-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

type RetryLogInfo = {
  attempt: number;
  retryId: string;
  url: string;
  status?: number;
  error?: string;
};

function logRetryAttempt(info: RetryLogInfo) {
  const { attempt, retryId, url, status, error } = info;
  console.warn("[Retry] Attempting request again", {
    attempt,
    retryId,
    url,
    status,
    error,
  });
}

function buildRequestInit(
  input: RequestInfo | URL,
  init: RequestInit,
  attempt: number,
  retryId: string
): RequestInit {
  return {
    ...init,
  };
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return fetch(input, init);
  }

  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const retryOn = options.retryOn ?? shouldRetryResponse;
  const logAttempts = options.logAttempts ?? true;
  const retryId = options.retryId ?? generateRetryId();
  const url = resolveUrl(input);

  let attempt = 0;
  while (true) {
    const requestInit = buildRequestInit(input, init, attempt + 1, retryId);
    try {
      const response = await fetch(input, requestInit);
      if (!retryOn(response, null) || attempt >= retries) {
        return response;
      }
      void response.arrayBuffer().catch(() => undefined);
      if (logAttempts) {
        logRetryAttempt({
          attempt: attempt + 2,
          retryId,
          url,
          status: response.status,
        });
      }
    } catch (error) {
      if (isAbortError(error) || init.signal?.aborted) {
        throw error;
      }
      if (!retryOn(null, error) || attempt >= retries) {
        throw error;
      }
      if (logAttempts) {
        logRetryAttempt({
          attempt: attempt + 2,
          retryId,
          url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const jitter = Math.floor(Math.random() * (backoff / 2));
    await sleep(backoff + jitter);
    attempt += 1;
  }
}
