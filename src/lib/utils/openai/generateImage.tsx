import { openAiClient } from "@/constants/openai";
import { ContentItem, Message, MessageRole } from "@/types";
import { handleError } from "../handleError";
// import axios, { AxiosError } from "axios";

import sharp from "sharp";

interface GenerateImageParams {
  prompt: string;
  role: MessageRole;
  taskId: string;
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

    console.log("\x1b[33m%s\x1b[0m", "generateImage imageUrl: ", imageUrl);

    const imgBuffer = await convertToPng(imageUrl);

    if (!imgBuffer) {
      throw new Error("Failed to convert image to PNG");
    }

    console.log("taskID: ", taskId);
    /*  
    try {
      const awsResp = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/aws`,
        {
          taskId,
          imgBuffer: imgBuffer.toString("base64"),
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    
      console.log("\x1b[33m%s\x1b[0m", "generateImage awsData: ", awsResp.data);
    
      if (!awsResp.status || awsResp.status !== 200) {
        throw new Error("Failed to upload image to AWS");
      }
    
      const awsData = awsResp.data;
    } catch (error: unknown) { 
      console.error("Axios Error:", error);
    
      if (error instanceof AxiosError) { 
        const axiosError = error as AxiosError;
        console.error(
          "Axios Error Response:",
          axiosError.response ? JSON.stringify(axiosError.response.data, null, 2) : "No response data"
        );
        console.error("Axios Request Error:", axiosError.request ? "Request failed" : "No request issue");
      } else {
        console.error("Unexpected Error:", (error as Error).message);
      }
    
      throw new Error("AWS request failed");
    }


 */

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
          image_url: { url: "url" in respData ? respData.url : null },
        },
      ] as ContentItem[],
    };

    return JSON.stringify({ taskData });
  } catch (error) {
    handleError({ error, source: "generateImage" });
  }
}
