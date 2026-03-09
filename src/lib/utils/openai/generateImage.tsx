import { openAiClient } from "@/constants/openai";
import { ContentItem, Message, MessageRole } from "@/types";
import { handleError } from "../handleError";
import sharp from "sharp";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";

interface GenerateImageParams {
  prompt: string;
  role: MessageRole;
  taskId: string;
  userId: string;
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
}: GenerateImageParams) {
  try {
    const response = await openAiClient.images.generate({
      model: "dall-e-3",
      prompt,
    });

    if (!response || !response.data?.length) {
      throw new Error("The Image Generator API did not return any images.");
    }

    const respData = response.data[0];
    const imageUrl = respData.url;

    // Convert image to PNG
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

    return JSON.stringify({ taskData, generatedImage: true });
  } catch (error) {
    handleError({ error, source: "generateImage" });
  }
}
