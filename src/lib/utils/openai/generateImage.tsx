import { openAiClient } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { ContentItem, Message, MessageRole } from "@/types";
import { handleError } from "../handleError";
import sharp from "sharp";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import { resolveModelForPlan } from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";

interface GenerateImageParams {
  prompt: string;
  role: MessageRole;
  taskId: string;
  userId: string;
  planName: PlanName;
}

async function convertToPng(imageUrl: string): Promise<Buffer | undefined> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    return sharp(imageBuffer).png().toBuffer();
  } catch (error) {
    handleError({ error, source: "convertToPng" });
  }
}

export async function generateImage({
  prompt,
  role,
  taskId,
  userId,
  planName,
}: GenerateImageParams) {
  try {
    const model = resolveModelForPlan(planName, "image");

    if (!model) {
      throw new Error("No image model configured for the current plan.");
    }

    const startTime = Date.now();
    const response = await openAiClient.images.generate({
      model,
      prompt,
    });
    const requestMetric: AIRequestMetric = {
      requestType: "image",
      model,
      latencyMs: Date.now() - startTime,
    };

    if (!response || !response.data?.length) {
      throw new Error("The Image Generator API did not return any images.");
    }

    const respData = response.data[0];
    const imageUrl = respData.url;

    if (!imageUrl) {
      throw new Error("Image URL is undefined");
    }

    const imgBuffer = await convertToPng(imageUrl);

    if (!imgBuffer) {
      throw new Error("Failed to convert image to PNG");
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
      model,
      requestMetric,
    });
  } catch (error) {
    handleError({ error, source: "generateImage" });
  }
}
