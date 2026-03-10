import { NextResponse } from "next/server";
import { Messages } from "@/types";
import { generateResponse } from "@/lib/utils/openai/generateResponse";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { UpdateTaskParams } from "@/types/TaskData.d";
import { createTask, updateTask } from "@/lib/actions/task.actions";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.actions";
import { UserData } from "@/types/UserData.d";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import {
  resolvePersonaForPlan,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";
import User from "@/lib/database/models/user.model";
import { checkUsageLimit } from "@/lib/utils/check-usage-limit";
import type { OpenAIErrorType } from "@/lib/utils/openai/generateResponse";

const OPENAI_RATE_LIMIT_MAX_REQUESTS = 20;
const OPENAI_RATE_LIMIT_WINDOW_MS = 60_000;
const LIMIT_BLOCKED_REASONS = new Set(["image_limit", "audio_limit"]);

const OPENAI_ERROR_STATUS_MAP: Record<OpenAIErrorType, number> = {
  rate_limit: 429,
  timeout: 504,
  service_error: 502,
  unknown: 500,
};

const OPENAI_ERROR_MESSAGES: Record<OpenAIErrorType, string> = {
  rate_limit: "The AI service is receiving too many requests. Please retry.",
  timeout: "The AI service timed out. Please try again.",
  service_error:
    "The AI service is temporarily unavailable. Please try again shortly.",
  unknown: "An error occurred while processing your request.",
};

interface OpenAIResponsePayload {
  taskData?: Messages["messages"][number];
  taskUsage?: number;
  generatedImage?: boolean;
  generatedAudio?: boolean;
  blockedReason?: string;
  errorType?: OpenAIErrorType;
}

function getBlockedMessage(taskData?: OpenAIResponsePayload["taskData"]) {
  if (!taskData || !Array.isArray(taskData.content)) {
    return "Generation limit reached for your current plan.";
  }

  const message = taskData.content.find(
    (contentItem) =>
      contentItem.type === "text" && typeof contentItem.text === "string",
  )?.text;

  return message ?? "Generation limit reached for your current plan.";
}

async function persistTaskAssistantMessage({
  taskId,
  messages,
  taskData,
  taskUsage,
  personaId,
}: {
  taskId: string;
  messages: Messages["messages"];
  taskData: OpenAIResponsePayload["taskData"];
  taskUsage?: number;
  personaId: string;
}): Promise<void> {
  if (!taskData) {
    return;
  }

  await updateTask(taskId, {
    messages: [...messages, taskData],
    usage: taskUsage ?? 0,
    personaId,
  } as UpdateTaskParams);
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const {
      messages,
      taskId: providedTaskId,
      personaId,
    } = (await req.json()) as Messages;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const rateLimit = enforceSlidingWindowRateLimit({
      key: `openai:${userId}`,
      limit: OPENAI_RATE_LIMIT_MAX_REQUESTS,
      windowMs: OPENAI_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          },
        },
      );
    }

    // Verify user plan is active before calling OpenAI
    const userData = (await getUserById(userId)) as UserData | null;
    const planName = userData?.plan?.name;
    const combinedMediaUsageCount =
      (userData?.plan?.imageGenerations ?? 0) +
      (userData?.plan?.audioGenerations ?? 0);

    if (planName !== "Lite" && userData?.plan?.expiresOn) {
      const expiresOn = new Date(userData.plan.expiresOn);
      if (expiresOn < new Date()) {
        return NextResponse.json(
          { error: "Your plan has expired. Please upgrade to continue." },
          { status: 403 },
        );
      }
    }

    const entitlements = resolveEntitlements(planName);
    const imageUsage = checkUsageLimit({
      planName,
      currentCount: userData?.plan?.imageGenerations,
      combinedCount: combinedMediaUsageCount,
      limitType: "images",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });
    const audioUsage = checkUsageLimit({
      planName,
      currentCount: userData?.plan?.audioGenerations,
      combinedCount: combinedMediaUsageCount,
      limitType: "audio",
      usagePeriodStart: userData?.plan?.usagePeriodStart,
    });

    if (imageUsage.didReset || audioUsage.didReset) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        {
          $set: {
            "plan.imageGenerations": 0,
            "plan.audioGenerations": 0,
            "plan.usagePeriodStart": new Date(),
          },
        },
        {
          strict: true,
          upsert: false,
        },
      );
    }

    const imageLimitReached =
      entitlements.supportsImageGeneration && !imageUsage.allowed;
    const audioLimitReached =
      entitlements.supportsAudioGeneration && !audioUsage.allowed;

    const resolvedEntitlements = {
      ...entitlements,
      supportsImageGeneration:
        entitlements.supportsImageGeneration && !imageLimitReached,
      supportsAudioGeneration:
        entitlements.supportsAudioGeneration && !audioLimitReached,
      imageLimitReached,
      audioLimitReached,
    };

    const selectedPersona = resolvePersonaForPlan({
      personaId,
      planName,
    });

    let taskId = providedTaskId;

    if (!taskId) {
      const generatedTitle = await generateTitle(messages, selectedPersona.id);
      const { title, usage } = JSON.parse(generatedTitle as string);

      const newTask = await createTask({
        title,
        messages,
        usage,
        personaId: selectedPersona.id,
      });

      if (!newTask) {
        throw new Error("Task creation failed.");
      }

      taskId = newTask._id;
    }

    if (!taskId) {
      throw new Error("Task ID is undefined.");
    }

    const aiResponse = await generateResponse({
      messages,
      taskId,
      userId,
      personaId: selectedPersona.id,
      entitlements: resolvedEntitlements,
    });
    const aiPayload = JSON.parse(aiResponse as string) as OpenAIResponsePayload;

    if (aiPayload.errorType) {
      return NextResponse.json(
        { error: OPENAI_ERROR_MESSAGES[aiPayload.errorType] },
        { status: OPENAI_ERROR_STATUS_MAP[aiPayload.errorType] },
      );
    }

    const { taskData, taskUsage, generatedImage, generatedAudio } = aiPayload;

    if (
      aiPayload.blockedReason &&
      LIMIT_BLOCKED_REASONS.has(aiPayload.blockedReason)
    ) {
      await persistTaskAssistantMessage({
        taskId,
        messages,
        taskData,
        taskUsage,
        personaId: selectedPersona.id,
      });

      return NextResponse.json(
        {
          error: getBlockedMessage(taskData),
          taskData,
          taskId,
          personaId: selectedPersona.id,
        },
        { status: 403 },
      );
    }

    if (!taskData) {
      throw new Error("AI response payload is missing task data.");
    }

    await persistTaskAssistantMessage({
      taskId,
      messages,
      taskData,
      taskUsage,
      personaId: selectedPersona.id,
    });

    const usageIncrementFields: Record<string, number> = {};
    if (generatedImage) {
      usageIncrementFields["plan.imageGenerations"] = 1;
    }
    if (generatedAudio) {
      usageIncrementFields["plan.audioGenerations"] = 1;
    }

    if (Object.keys(usageIncrementFields).length > 0) {
      const counterUpdate: {
        $inc: Record<string, number>;
        $set?: Record<string, Date>;
      } = {
        $inc: usageIncrementFields,
      };

      if (!userData?.plan?.usagePeriodStart) {
        counterUpdate.$set = {
          "plan.usagePeriodStart": new Date(),
        };
      }

      await User.findOneAndUpdate({ clerkId: userId }, counterUpdate, {
        strict: true,
        upsert: false,
      });
    }

    return NextResponse.json({
      taskData,
      taskId,
      personaId: selectedPersona.id,
    });
  } catch (error) {
    console.error("OpenAI route error:", error);

    return NextResponse.json(
      { error: OPENAI_ERROR_MESSAGES.unknown },
      { status: OPENAI_ERROR_STATUS_MAP.unknown },
    );
  }
}
