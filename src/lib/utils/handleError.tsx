import "server-only";

// ERROR HANDLER

interface HdlErrorProps {
  error: Error | unknown;
  source?: string | undefined;
}

const GENERIC_ERROR_MESSAGE = "An unexpected error occurred";

const SAFE_ERROR_PATTERNS: ReadonlyArray<RegExp> = [
  /^Unauthorized$/i,
  /^Forbidden$/i,
  /^Invalid [\w\s().,:/-]+!?$/i,
  /^Missing required field: [\w.-]+$/i,
  /^Invalid numeric field: [\w.-]+$/i,
  /^User (not found|does not exist!|update failed!|deletion failed!)$/i,
  /^Task (creation failed!|update failed!)$/i,
  /^Unable to start checkout\.$/i,
  /^Form data is required\.$/i,
  /^Unexpected error$/i,
];

function extractErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unexpected error";
}

function isWhitelistedMessage(message: string): boolean {
  return SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function buildSafeClientMessage(error: Error | unknown): string {
  const originalMessage = extractErrorMessage(error).trim();

  if (!originalMessage) {
    return GENERIC_ERROR_MESSAGE;
  }

  return isWhitelistedMessage(originalMessage)
    ? originalMessage
    : GENERIC_ERROR_MESSAGE;
}

function logErrorToStderr(error: Error | unknown, source?: string): void {
  const sourceLabel = source ?? "unknown";
  const message = extractErrorMessage(error);
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  const stackSection = stack ? `\n${stack}` : "";

  process.stderr.write(
    `[handleError] ${sourceLabel} | ${message}${stackSection}\n`,
  );
}

export const handleError = ({ error, source }: HdlErrorProps) => {
  logErrorToStderr(error, source);
  throw new Error(buildSafeClientMessage(error), { cause: error });
};
