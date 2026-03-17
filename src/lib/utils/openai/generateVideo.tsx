import { openAiClient } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { Message, MessageRole } from "@/types";
import { handleError } from "@/lib/utils/handleError";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import {
  ModelPolicyModelOverrides,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";

const VIDEO_POLL_INTERVAL_MS = 1_000;
const VIDEO_POLL_TIMEOUT_MS = 180_000;
const GENERATED_VIDEO_CONTENT_TYPE = "video/mp4";

interface GenerateVideoParams {
  prompt: string;
  role: MessageRole;
  taskId: string;
  userId: string;
  planName: PlanName;
  modelOverrides?: ModelPolicyModelOverrides;
}

type RetrievedVideo = {
  id?: string;
  status?: string;
  failure_reason?: string;
  error?: {
    message?: string;
  };
};

async function sleep(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isPendingVideoStatus(status: string | undefined): boolean {
  return status === "queued" || status === "in_progress";
}

function toRetrievedVideo(video: unknown): RetrievedVideo {
  if (!video || typeof video !== "object") {
    return {};
  }

  return video as RetrievedVideo;
}

async function waitForCompletedVideo(videoId: string): Promise<RetrievedVideo> {
  const startTime = Date.now();

  while (Date.now() - startTime < VIDEO_POLL_TIMEOUT_MS) {
    const retrievedVideo = toRetrievedVideo(
      await openAiClient.videos.retrieve(videoId),
    );

    if (retrievedVideo.status === "completed") {
      return retrievedVideo;
    }

    if (!isPendingVideoStatus(retrievedVideo.status)) {
      const failureReason =
        retrievedVideo.failure_reason ??
        retrievedVideo.error?.message ??
        "Video generation failed.";
      throw new Error(failureReason);
    }

    await sleep(VIDEO_POLL_INTERVAL_MS);
  }

  throw new Error("Video generation timed out. Please try again.");
}

async function getGeneratedVideoBuffer(videoId: string): Promise<Buffer> {
  const contentResponse = await openAiClient.videos.downloadContent(videoId);
  const contentBuffer = Buffer.from(await contentResponse.arrayBuffer());

  if (contentBuffer.byteLength === 0) {
    throw new Error("Video Generator API returned empty content.");
  }

  return contentBuffer;
}

export async function generateVideo({
  prompt,
  role,
  taskId,
  userId,
  planName,
  modelOverrides,
}: GenerateVideoParams) {
  const policy = resolveModelPolicy({
    plan: normalizePlanTier(planName),
    feature: "video_generation",
    taskClass: "final",
    modelOverrides,
  });

  try {
    if (policy.hardBlocked) {
      throw new Error(
        policy.notes ?? "Video generation is blocked for the current request.",
      );
    }

    const startTime = Date.now();
    const createdVideo = toRetrievedVideo(
      await openAiClient.videos.create({
        model: policy.model,
        prompt,
        seconds: "4",
        size: "1280x720",
      }),
    );

    if (!createdVideo.id) {
      throw new Error("Video Generator API did not return a video id.");
    }

    const completedVideo = await waitForCompletedVideo(createdVideo.id);

    if (!completedVideo.id) {
      throw new Error("Completed video payload is missing an id.");
    }

    const videoBuffer = await getGeneratedVideoBuffer(completedVideo.id);
    const fileName = `${taskId}_video_${generateString()}.mp4`;
    const videoS3Url = await uploadFileToAWS(
      videoBuffer,
      fileName,
      GENERATED_VIDEO_CONTENT_TYPE,
      `${userId}/videos`,
    );
    const taskData: Message = {
      whois: role,
      role,
      content: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "video_url",
          video_url: videoS3Url,
        },
      ],
    };
    const requestMetric: AIRequestMetric = {
      requestType: "video",
      model: policy.model,
      latencyMs: Date.now() - startTime,
    };

    return JSON.stringify({
      taskData,
      generatedVideo: true,
      model: policy.model,
      requestMetric,
    });
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    process.stderr.write(
      `[generateVideo] model=${policy.model} status=${status ?? "unknown"} error=${error instanceof Error ? error.message : "unknown"}\n`,
    );
    handleError({ error, source: "generateVideo" });
  }
}
