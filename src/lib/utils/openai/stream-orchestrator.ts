import "server-only";
import { STREAM_PROACTIVE_TIMEOUT_MESSAGE } from "@/constants/chat-stream";
import type { ChatApiResponse, ChatStreamEvent } from "@/types/chat-api";
import { PersonaId } from "@/types/PersonaData.d";

const STREAM_GENERAL_HEARTBEAT_INTERVAL_MS = 30_000;
const STREAM_MEDIA_HEARTBEAT_INTERVAL_MS = 12_000;
const STREAM_TIMEOUT_SAFETY_BUFFER_SECONDS = 5;
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
} as const;

const streamEncoder = new TextEncoder();

export interface StreamPipelineHandlers {
  onContentChunk: (delta: string, snapshot: string) => void;
  onMediaGenerationStart: () => void;
  onMediaGenerationEnd: () => void;
}

export interface CreateOpenAiChatStreamResponseParams {
  functionStartTime: number;
  maxDurationSeconds: number;
  taskId: string;
  personaId: PersonaId;
  unknownErrorMessage: string;
  runStreamPipeline: (
    handlers: StreamPipelineHandlers,
  ) => Promise<ChatApiResponse>;
  isErrorPayload?: (payload: ChatApiResponse) => boolean;
}

interface StreamLifecycleConfig {
  controller: ReadableStreamDefaultController<Uint8Array>;
  startTime: number;
  timeoutSafetyMs: number;
  unknownErrorMessage: string;
}

function defaultIsErrorPayload(payload: ChatApiResponse): boolean {
  return Boolean(payload.error && !payload.taskData);
}

export function shouldStreamResponse(req: Request): boolean {
  return (
    req.headers.get("x-droplet-stream") === "1" ||
    req.headers.get("accept")?.includes("text/event-stream") === true
  );
}

function writeStreamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: ChatStreamEvent,
): void {
  controller.enqueue(
    streamEncoder.encode(`data: ${JSON.stringify(event)}\n\n`),
  );
}

class StreamLifecycleOrchestrator {
  private didSendFinal = false;
  private controllerClosed = false;
  private generalHeartbeatInterval: ReturnType<typeof setInterval> | null =
    null;
  private mediaHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private proactiveTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly config: StreamLifecycleConfig) {}

  public writeMetaEvent = ({
    taskId,
    personaId,
  }: {
    taskId: string;
    personaId: PersonaId;
  }): void => {
    writeStreamEvent(this.config.controller, {
      type: "meta",
      taskId,
      personaId,
    });
  };

  public writeChunk = (delta: string, snapshot: string): void => {
    if (this.controllerClosed) {
      return;
    }

    writeStreamEvent(this.config.controller, {
      type: "chunk",
      delta,
      snapshot,
    });
  };

  public writeErrorEvent = (errorMessage: string, context: string): boolean => {
    try {
      writeStreamEvent(this.config.controller, {
        type: "error",
        error: errorMessage,
      });
      this.didSendFinal = true;
      return true;
    } catch (error) {
      this.logError(context, error);
      return false;
    }
  };

  public writeFinalEvent = (
    payload: ChatApiResponse,
    context: string,
  ): boolean => {
    try {
      writeStreamEvent(this.config.controller, {
        type: "final",
        payload,
      });
      this.didSendFinal = true;
      return true;
    } catch (error) {
      this.logError(context, error);
      return false;
    }
  };

  public startGeneralHeartbeat = (): void => {
    if (this.generalHeartbeatInterval !== null) {
      return;
    }

    this.generalHeartbeatInterval = setInterval(() => {
      if (!this.emitHeartbeat()) {
        this.stopGeneralHeartbeat();
      }
    }, STREAM_GENERAL_HEARTBEAT_INTERVAL_MS);
  };

  public stopGeneralHeartbeat = (): void => {
    if (this.generalHeartbeatInterval === null) {
      return;
    }

    clearInterval(this.generalHeartbeatInterval);
    this.generalHeartbeatInterval = null;
  };

  public startMediaHeartbeat = (): void => {
    if (this.mediaHeartbeatInterval !== null) {
      return;
    }

    if (!this.emitHeartbeat()) {
      return;
    }

    this.mediaHeartbeatInterval = setInterval(() => {
      if (!this.emitHeartbeat()) {
        this.stopMediaHeartbeat();
      }
    }, STREAM_MEDIA_HEARTBEAT_INTERVAL_MS);
  };

  public stopMediaHeartbeat = (): void => {
    if (this.mediaHeartbeatInterval === null) {
      return;
    }

    clearInterval(this.mediaHeartbeatInterval);
    this.mediaHeartbeatInterval = null;
  };

  public startProactiveTimeout = (): void => {
    if (this.proactiveTimeoutId !== null) {
      return;
    }

    this.proactiveTimeoutId = setTimeout(() => {
      const elapsedMs = Date.now() - this.config.startTime;

      process.stderr.write(
        `[openai/route] proactive timeout safety net fired after ${elapsedMs}ms\n`,
      );
      this.writeErrorEvent(
        STREAM_PROACTIVE_TIMEOUT_MESSAGE,
        "proactive timeout safety net",
      );
      this.stopGeneralHeartbeat();
      this.stopMediaHeartbeat();
      this.closeController("proactive timeout close failed");
    }, this.config.timeoutSafetyMs);
  };

  public clearProactiveTimeout = (): void => {
    if (this.proactiveTimeoutId === null) {
      return;
    }

    clearTimeout(this.proactiveTimeoutId);
    this.proactiveTimeoutId = null;
  };

  public finalize = (): void => {
    this.stopGeneralHeartbeat();
    this.stopMediaHeartbeat();
    this.clearProactiveTimeout();

    if (!this.didSendFinal) {
      this.writeErrorEvent(
        this.config.unknownErrorMessage,
        "failed to write synthetic final error event to stream",
      );
    }

    this.closeController("failed to close stream controller");
  };

  private emitHeartbeat = (): boolean => {
    if (this.controllerClosed) {
      return false;
    }

    try {
      writeStreamEvent(this.config.controller, {
        type: "heartbeat",
      });
      return true;
    } catch (error) {
      this.logError("heartbeat write failed", error);
      return false;
    }
  };

  private closeController(context: string): void {
    try {
      this.controllerClosed = true;
      this.config.controller.close();
    } catch (error) {
      this.logError(context, error);
    }
  }

  private logError(context: string, error: unknown): void {
    process.stderr.write(
      `[openai/route] ${context}: ${error instanceof Error ? error.message : "unknown"}\n`,
    );
  }
}

export function createOpenAiChatStreamResponse({
  functionStartTime,
  maxDurationSeconds,
  taskId,
  personaId,
  unknownErrorMessage,
  runStreamPipeline,
  isErrorPayload = defaultIsErrorPayload,
}: CreateOpenAiChatStreamResponseParams): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startTime = Date.now();
      const elapsedSetupMs = startTime - functionStartTime;
      const timeoutSafetyMs = Math.max(
        0,
        (maxDurationSeconds - STREAM_TIMEOUT_SAFETY_BUFFER_SECONDS) * 1000 -
          elapsedSetupMs,
      );
      const orchestrator = new StreamLifecycleOrchestrator({
        controller,
        startTime,
        timeoutSafetyMs,
        unknownErrorMessage,
      });

      try {
        orchestrator.writeMetaEvent({
          taskId,
          personaId,
        });
        orchestrator.startGeneralHeartbeat();
        orchestrator.startProactiveTimeout();

        const payload = await runStreamPipeline({
          onContentChunk: orchestrator.writeChunk,
          onMediaGenerationStart: orchestrator.startMediaHeartbeat,
          onMediaGenerationEnd: orchestrator.stopMediaHeartbeat,
        });

        if (isErrorPayload(payload)) {
          orchestrator.writeErrorEvent(
            payload.error ?? unknownErrorMessage,
            "failed to write error event to stream",
          );
        } else {
          orchestrator.writeFinalEvent(
            payload,
            "failed to write final event to stream",
          );
        }
      } catch (error) {
        process.stderr.write(
          `[openai/route] streaming pipeline failed: ${error instanceof Error ? error.message : "unknown"}\n`,
        );
        orchestrator.writeErrorEvent(
          unknownErrorMessage,
          "failed to write fallback error event to stream",
        );
      } finally {
        orchestrator.finalize();
      }
    },
  });

  return new Response(stream, {
    headers: STREAM_HEADERS,
  });
}
