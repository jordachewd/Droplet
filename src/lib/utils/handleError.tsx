// ERROR HANDLER

interface HdlErrorProps {
  error: Error | unknown;
  source?: string | undefined;
}

function buildErrorMessage(error: Error | unknown, source?: string): string {
  const sourceSuffix = source ? ` | ${source}` : "";

  if (error instanceof Error) {
    return `${error.message}${sourceSuffix}`;
  }

  if (typeof error === "string") {
    return `${error}${sourceSuffix}`;
  }

  return `Unexpected error${sourceSuffix}`;
}

export const handleError = ({ error, source }: HdlErrorProps) => {
  throw new Error(buildErrorMessage(error, source), { cause: error });
};
