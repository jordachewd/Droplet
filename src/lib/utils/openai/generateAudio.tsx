import { openAiClient } from "@/constants/openai";
import { Message, MessageRole } from "@/types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";

const GENERATED_AUDIO_FORMAT = "wav";
const GENERATED_AUDIO_CONTENT_TYPE = "audio/wav";

interface GenerateAudioParams {
  messages: Message[];
  role: MessageRole;
  taskId: string;
  userId: string;
}

function decodeGeneratedAudio(rawAudioData: string): Buffer {
  const normalizedAudioData = rawAudioData.replace(/\s+/g, "");

  if (!normalizedAudioData) {
    throw new Error("Audio Generator API returned empty audio data.");
  }

  const audioBuffer = Buffer.from(normalizedAudioData, "base64");

  if (audioBuffer.byteLength === 0) {
    throw new Error("Audio Generator API returned invalid audio data.");
  }

  return audioBuffer;
}

export async function generateAudio({
  messages,
  role,
  taskId,
  userId,
}: GenerateAudioParams) {
  try {
    const response = await openAiClient.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: GENERATED_AUDIO_FORMAT },
      messages: [...messages] as ChatCompletionMessageParam[],
    });

    if (!response || !response.choices?.length) {
      throw new Error("No response or empty choices from Audio Generator API.");
    }

    const respData = response.choices[0]?.message?.audio;

    if (!respData) {
      throw new Error("Audio Generator API returned no audio data.");
    }

    const audioBuffer = decodeGeneratedAudio(respData.data);
    const fileName = `${taskId}_audio_${generateString()}.${GENERATED_AUDIO_FORMAT}`;
    const audioS3Url = await uploadFileToAWS(
      audioBuffer,
      fileName,
      GENERATED_AUDIO_CONTENT_TYPE,
      `${userId}/audio`,
    );
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
          audio_url: audioS3Url,
        },
      ],
    };

    return JSON.stringify({ taskData, taskUsage, generatedAudio: true });
  } catch (error) {
    handleError({ error, source: "generateAudio" });
  }
}
