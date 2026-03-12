import { openAiClient } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { Message, MessageRole } from "@/types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import {
  AudioMode,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";
import { buildTextToSpeechInput } from "./message-policy";

const GENERATED_AUDIO_FORMAT = "wav";
const GENERATED_AUDIO_CONTENT_TYPE = "audio/wav";

interface GenerateAudioParams {
  messages: Message[];
  role: MessageRole;
  taskId: string;
  userId: string;
  planName: PlanName;
  audioMode?: AudioMode;
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
  planName,
  audioMode = "tts",
}: GenerateAudioParams) {
  try {
    const policy = resolveModelPolicy({
      plan: normalizePlanTier(planName),
      feature: "audio_generation",
      taskClass: "final",
      audioMode,
    });

    if (policy.hardBlocked) {
      throw new Error(
        policy.notes ?? "Audio generation is blocked for the current request.",
      );
    }

    const startTime = Date.now();
    let audioBuffer: Buffer | undefined;
    let transcript: string | null = null;
    let taskUsage: number | undefined;
    let requestMetric: AIRequestMetric;

    if (policy.isTtsOnly) {
      const speechInput = buildTextToSpeechInput(messages);

      if (!speechInput) {
        throw new Error("No text input available for TTS audio generation.");
      }

      const speechResponse = await openAiClient.audio.speech.create({
        model: policy.model,
        voice: "alloy",
        input: speechInput,
        response_format: GENERATED_AUDIO_FORMAT,
      });

      audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
      transcript = speechInput;
      taskUsage = 0;
      requestMetric = {
        requestType: "audio",
        model: policy.model,
        latencyMs: Date.now() - startTime,
      };
    } else {
      const response = await openAiClient.chat.completions.create({
        model: policy.model,
        modalities: ["text", "audio"],
        audio: { voice: "alloy", format: GENERATED_AUDIO_FORMAT },
        messages: [...messages] as ChatCompletionMessageParam[],
      });

      requestMetric = {
        requestType: "audio",
        model: policy.model,
        tokensIn: response.usage?.prompt_tokens,
        tokensOut: response.usage?.completion_tokens,
        latencyMs: Date.now() - startTime,
      };

      if (!response || !response.choices?.length) {
        throw new Error(
          "No response or empty choices from Audio Generator API.",
        );
      }

      const respData = response.choices[0]?.message?.audio;

      if (!respData) {
        throw new Error("Audio Generator API returned no audio data.");
      }

      audioBuffer = decodeGeneratedAudio(respData.data);
      transcript = "transcript" in respData ? respData.transcript : null;
      taskUsage = response.usage?.total_tokens;
    }

    const fileName = `${taskId}_audio_${generateString()}.${GENERATED_AUDIO_FORMAT}`;
    const audioS3Url = await uploadFileToAWS(
      audioBuffer,
      fileName,
      GENERATED_AUDIO_CONTENT_TYPE,
      `${userId}/audio`,
    );
    const taskData: Message = {
      whois: role,
      role,
      content: [
        {
          type: "text",
          text: transcript,
        },
        {
          type: "audio_url",
          audio_url: audioS3Url,
        },
      ],
    };

    return JSON.stringify({
      taskData,
      taskUsage,
      generatedAudio: true,
      model: policy.model,
      requestMetric,
    });
  } catch (error) {
    handleError({ error, source: "generateAudio" });
  }
}
