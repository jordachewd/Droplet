import "server-only";

import { APIError } from "openai";

const MAX_OPENAI_RETRIES = 3;
const OPENAI_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;

export type OpenAIErrorType =
  | "rate_limit"
  | "timeout"
  | "service_error"
  | "policy_blocked"
  | "unknown";

function getOpenAIErrorStatus(error: unknown): number | null {
  if (!(error instanceof APIError)) {
    return null;
  }

  return error.status ?? null;
}

export function classifyOpenAIError(error: unknown): OpenAIErrorType {
  const status = getOpenAIErrorStatus(error);

  if (status === 429) {
    return "rate_limit";
  }

  if (status === 408 || status === 504) {
    return "timeout";
  }

  if ([500, 502, 503].includes(status ?? 0)) {
    return "service_error";
  }

  return "unknown";
}

function isRetryableOpenAIError(error: unknown): boolean {
  const status = getOpenAIErrorStatus(error);

  if (status === null || [400, 401, 403].includes(status)) {
    return false;
  }

  return [429, 500, 502, 503].includes(status);
}

async function waitForRetry(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function logOpenAIRetry({
  error,
  operation,
  retryNumber,
  delayMs,
  nextModel,
}: {
  error: unknown;
  operation: "chat" | "stream";
  retryNumber: number;
  delayMs: number;
  nextModel: string;
}): void {
  const status = getOpenAIErrorStatus(error);
  const normalizedStatus = status === null ? "unknown" : String(status);

  process.stderr.write(
    `[openai-retry] ${operation} retry ${retryNumber}/${MAX_OPENAI_RETRIES} in ${delayMs}ms after status ${normalizedStatus}; next model=${nextModel}\n`,
  );
}

export async function withOpenAIRetry<T>({
  baseRetryAttempt = 0,
  operation,
  resolveNextModel,
  shouldRetry,
  execute,
}: {
  baseRetryAttempt?: number;
  operation: "chat" | "stream";
  resolveNextModel: (nextRetryAttempt: number) => string;
  shouldRetry?: (error: unknown) => boolean;
  execute: (retryAttempt: number) => Promise<T>;
}): Promise<T> {
  let lastError: unknown;

  for (let retryIndex = 0; retryIndex <= MAX_OPENAI_RETRIES; retryIndex += 1) {
    const currentRetryAttempt = baseRetryAttempt + retryIndex;

    try {
      return await execute(currentRetryAttempt);
    } catch (error) {
      lastError = error;

      const canRetry =
        retryIndex < MAX_OPENAI_RETRIES &&
        isRetryableOpenAIError(error) &&
        (shouldRetry?.(error) ?? true);

      if (!canRetry) {
        throw error;
      }

      const delayMs = OPENAI_RETRY_DELAYS_MS[retryIndex];
      const nextRetryAttempt = currentRetryAttempt + 1;

      logOpenAIRetry({
        error,
        operation,
        retryNumber: retryIndex + 1,
        delayMs,
        nextModel: resolveNextModel(nextRetryAttempt),
      });

      await waitForRetry(delayMs);
    }
  }

  throw lastError ?? new Error("OpenAI request failed.");
}

export function serializeToolCalls(
  toolCalls:
    | {
        type: string;
        function?: {
          name: string;
          arguments: string;
        };
      }[]
    | undefined,
) {
  return toolCalls?.map((toolCall) => {
    if (toolCall.type === "function" && toolCall.function) {
      return {
        type: toolCall.type,
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        },
      };
    }

    return {
      type: toolCall.type,
    };
  });
}
