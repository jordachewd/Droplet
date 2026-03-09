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
  resolveAssistantRoleForPlan,
  resolveEntitlements,
} from "@/lib/utils/resolve-entitlements";

const OPENAI_RATE_LIMIT_MAX_REQUESTS = 20;
const OPENAI_RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const {
      messages,
      taskId: providedTaskId,
      assistantRoleId,
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
    if (userData?.plan?.expiresOn) {
      const expiresOn = new Date(userData.plan.expiresOn);
      if (expiresOn < new Date()) {
        return NextResponse.json(
          { error: "Your plan has expired. Please upgrade to continue." },
          { status: 403 },
        );
      }
    }

    const entitlements = resolveEntitlements(userData?.plan?.name);
    const selectedRole = resolveAssistantRoleForPlan({
      assistantRoleId,
      planName: userData?.plan?.name,
    });

    let taskId = providedTaskId;

    if (!taskId) {
      const generatedTitle = await generateTitle(messages, selectedRole.id);
      const { title, usage } = JSON.parse(generatedTitle as string);

      const newTask = await createTask({
        title,
        messages,
        usage,
        assistantRoleId: selectedRole.id,
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
      assistantRoleId: selectedRole.id,
      entitlements,
    });
    const { taskData, taskUsage } = JSON.parse(aiResponse as string);

    console.log("Generated Task Data:", taskData.content);

    await updateTask(taskId, {
      messages: [...messages, taskData],
      usage: taskUsage || 0,
      assistantRoleId: selectedRole.id,
    } as UpdateTaskParams);

    return NextResponse.json({
      taskData,
      taskId,
      assistantRoleId: selectedRole.id,
    });
  } catch (error) {
    console.error("OpenAI route error:", error);

    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 },
    );
  }
}
