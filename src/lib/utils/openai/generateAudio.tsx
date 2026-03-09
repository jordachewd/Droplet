import { openAiClient } from "@/constants/openai";
import { Message, MessageRole } from "@/types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";

interface GenerateAudioParams {
  messages: Message[];
  role: MessageRole;
  taskId?: string | null;
}

export async function generateAudio({
  messages,
  role,
  taskId,
}: GenerateAudioParams) {
  try {
    const response = await openAiClient.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "wav" },
      messages: [...messages] as ChatCompletionMessageParam[],
    });

    if (!response || !response.choices?.length) {
      throw new Error("No response or empty choices from Audio Generator API.");
    }

    const respData = response.choices[0]?.message?.audio;

    if (!respData) {
      throw new Error("Audio Generator API returned no audio data.");
    }

    console.log("\x1b[36m%s\x1b[0m", "generateAudio taskId: ", taskId);

    const taskUsage = response.usage?.total_tokens;
    const taskData: Message = {
      whois: role,
      role,
      content: [
        {
          type: "text",
          text: "transcript" in respData ? respData.transcript : null,
        },
        {
          type: "audio_url",
          audio_url: respData.data,
        },
      ],
    };

    return JSON.stringify({ taskData, taskUsage });
  } catch (error) {
    handleError({ error, source: "generateAudio" });
  }
}
