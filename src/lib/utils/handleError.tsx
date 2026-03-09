// ERROR HANDLER

interface HdlErrorProps {
  error: Error | unknown;
  source?: string | undefined;
}

export const handleError = ({ error, source }: HdlErrorProps) => {
  if (error instanceof Error) {
    throw new Error(error.message + " | " + source);
  } else if (typeof error === "string") {
    throw new Error(error + " | " + source);
  } else {
    throw new Error(JSON.stringify(error + " | " + source));
  }
};
