import "server-only";
import { openAiClient } from "@/constants/openai";
import { getPersona } from "@/constants/assistant-personas";
import { PERSONA_AUDIO_STYLE_HINTS } from "@/constants/persona-prompts";
import { PlanName } from "@/types/PlanData.d";
import { Message, MessageRole } from "@/types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "@/lib/utils/handleError";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import {
  AudioMode,
  ModelPolicyModelOverrides,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";
import { buildTextToSpeechInput } from "./message-policy";

const GENERATED_AUDIO_FORMAT = "wav";
const GENERATED_AUDIO_CONTENT_TYPE = "audio/wav";

interface GenerateAudioParams {
  messages?: Message[];
  ttsText?: string;
  personaId?: string | null;
  role: MessageRole;
  taskId: string;
  userId: string;
  planName: PlanName;
  audioMode?: AudioMode;
  modelOverrides?: ModelPolicyModelOverrides;
}

export interface GeneratedAudioPayload {
  taskData: Message;
  taskUsage?: number;
  generatedAudio: true;
  model: string;
  requestMetric: AIRequestMetric;
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

function resolvePersonaAudioStyleHint(personaId?: string | null): string {
  const resolvedPersona = getPersona(personaId);
  return PERSONA_AUDIO_STYLE_HINTS[resolvedPersona.id] ?? "";
}

function buildPersonaAwareTtsInput({
  input,
  personaId,
}: {
  input: string;
  personaId?: string | null;
}): string {
  const styleHint = resolvePersonaAudioStyleHint(personaId);

  if (!styleHint) {
    return input;
  }

  return `${styleHint}\n\nText to read aloud: ${input}`;
}

function buildPersonaAwareAudioMessages({
  messages,
  personaId,
}: {
  messages: Message[];
  personaId?: string | null;
}): ChatCompletionMessageParam[] {
  const styleHint = resolvePersonaAudioStyleHint(personaId);
  const baseMessages = [...messages] as ChatCompletionMessageParam[];

  if (!styleHint) {
    return baseMessages;
  }

  return [
    {
      role: "system",
      content: styleHint,
    },
    ...baseMessages,
  ];
}

export async function generateAudio({
  messages,
  ttsText,
  personaId,
  role,
  taskId,
  userId,
  planName,
  audioMode = "tts",
  modelOverrides,
}: GenerateAudioParams): Promise<GeneratedAudioPayload> {
  const policy = resolveModelPolicy({
    plan: normalizePlanTier(planName),
    feature: "audio_generation",
    taskClass: "final",
    audioMode,
    modelOverrides,
  });

  try {
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

    if (audioMode === "tts") {
      const baseSpeechInput = ttsText ?? buildTextToSpeechInput(messages ?? []);

      if (!baseSpeechInput) {
        throw new Error("No text input available for TTS audio generation.");
      }
      const speechInput = buildPersonaAwareTtsInput({
        input: baseSpeechInput,
        personaId,
      });

      const speechResponse = await openAiClient.audio.speech.create({
        model: policy.model,
        voice: "alloy",
        input: speechInput,
        response_format: GENERATED_AUDIO_FORMAT,
      });

      audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
      transcript = baseSpeechInput;
      taskUsage = 0;
      requestMetric = {
        requestType: "audio",
        model: policy.model,
        latencyMs: Date.now() - startTime,
      };
    } else {
      const audioMessages = buildPersonaAwareAudioMessages({
        messages: messages ?? [],
        personaId,
      });
      const response = await openAiClient.chat.completions.create({
        model: policy.model,
        modalities: ["text", "audio"],
        audio: { voice: "alloy", format: GENERATED_AUDIO_FORMAT },
        messages: audioMessages,
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

    return {
      taskData,
      taskUsage,
      generatedAudio: true,
      model: policy.model,
      requestMetric,
    };
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    process.stderr.write(
      `[generateAudio] model=${policy.model} audioMode=${audioMode} status=${status ?? "unknown"} error=${error instanceof Error ? error.message : "unknown"}\n`,
    );
    return handleError({ error, source: "generateAudio" });
  }
}
