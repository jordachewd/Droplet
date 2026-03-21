import "server-only";
import { openAiClient } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { ContentItem, Message, MessageRole } from "@/types";
import { handleError } from "@/lib/utils/handleError";
import sharp from "sharp";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import {
  ModelPolicyModelOverrides,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";

interface GenerateImageParams {
  prompt: string;
  role: MessageRole;
  taskId: string;
  userId: string;
  planName: PlanName;
  modelOverrides?: ModelPolicyModelOverrides;
}

async function convertToPng(imageBuffer: Buffer): Promise<Buffer | undefined> {
  try {
    return sharp(imageBuffer).png().toBuffer();
  } catch (error) {
    handleError({ error, source: "convertToPng" });
  }
}

async function getGeneratedImageBuffer(imageData: {
  b64_json?: string;
  url?: string;
}): Promise<Buffer | undefined> {
  if (typeof imageData.b64_json === "string" && imageData.b64_json.length > 0) {
    return Buffer.from(imageData.b64_json, "base64");
  }

  if (typeof imageData.url === "string" && imageData.url.length > 0) {
    const response = await fetch(imageData.url);

    if (!response.ok) {
      throw new Error("Failed to fetch generated image.");
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return undefined;
}

export async function generateImage({
  prompt,
  role,
  taskId,
  userId,
  planName,
  modelOverrides,
}: GenerateImageParams) {
  const policy = resolveModelPolicy({
    plan: normalizePlanTier(planName),
    feature: "image_generation",
    taskClass: "final",
    modelOverrides,
  });

  try {
    if (policy.hardBlocked) {
      throw new Error(
        policy.notes ?? "Image generation is blocked for the current request.",
      );
    }

    const startTime = Date.now();
    const response = await openAiClient.images.generate({
      model: policy.model,
      prompt,
    });
    const requestMetric: AIRequestMetric = {
      requestType: "image",
      model: policy.model,
      latencyMs: Date.now() - startTime,
    };

    if (!response || !response.data?.length) {
      throw new Error("The Image Generator API did not return any images.");
    }

    const respData = response.data[0];
    const rawImageBuffer = await getGeneratedImageBuffer(respData);

    if (!rawImageBuffer) {
      throw new Error(
        "The image generation API returned no usable image data.",
      );
    }

    const imgBuffer = await convertToPng(rawImageBuffer);

    if (!imgBuffer) {
      throw new Error("Failed to convert the generated image to PNG.");
    }

    const fileName = `${taskId}_image_${generateString()}.png`;
    const imageS3Url = await uploadFileToAWS(
      imgBuffer,
      fileName,
      "image/png",
      `${userId}/images`,
    );

    const taskData: Message = {
      whois: role,
      role,
      content: [
        {
          type: "text",
          text: "revised_prompt" in respData ? respData.revised_prompt : prompt,
        },
        {
          type: "image_url",
          image_url: { url: imageS3Url },
        },
      ] as ContentItem[],
    };

    return JSON.stringify({
      taskData,
      generatedImage: true,
      model: policy.model,
      requestMetric,
    });
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    process.stderr.write(
      `[generateImage] model=${policy.model} status=${status ?? "unknown"} error=${error instanceof Error ? error.message : "unknown"}\n`,
    );
    handleError({ error, source: "generateImage" });
  }
}
