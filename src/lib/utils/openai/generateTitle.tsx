import "server-only";
import { getPersona } from "@/constants/assistant-personas";
import { openAiClient, titleSystemMsg } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { Message } from "@/types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "@/lib/utils/handleError";
import { filterAssistantMsg } from "./filterAssistantMsg";
import {
  ModelPolicyModelOverrides,
  normalizePlanTier,
  resolveModelPolicy,
} from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";
import { compactMessagesToTokenLimit } from "./message-policy";

export async function generateTitle(
  messages: Message[],
  planName: PlanName,
  personaId?: string | null,
  modelOverrides?: ModelPolicyModelOverrides,
) {
  try {
    const persona = getPersona(personaId);
    const policy = resolveModelPolicy({
      plan: normalizePlanTier(planName),
      feature: "title_generation",
      taskClass: "utility",
      modelOverrides,
    });

    if (policy.hardBlocked) {
      throw new Error(
        policy.notes ?? "Title generation is blocked for the current request.",
      );
    }

    const filteredMsgs = compactMessagesToTokenLimit(
      filterAssistantMsg([
        ...titleSystemMsg,
        {
          role: "developer",
          content: `Conversation persona context: ${persona.label}. Generate a short title aligned with this persona.`,
        },
        ...messages,
      ] as Message[]),
      policy.maxInputTokens,
    );
    const startTime = Date.now();
    const response = await openAiClient.chat.completions.create({
      model: policy.model,
      messages: filteredMsgs as ChatCompletionMessageParam[],
      max_completion_tokens: policy.maxOutputTokens,
    });
    const requestMetric: AIRequestMetric = {
      requestType: "title",
      model: policy.model,
      tokensIn: response.usage?.prompt_tokens,
      tokensOut: response.usage?.completion_tokens,
      latencyMs: Date.now() - startTime,
    };

    if (!response || !response.choices?.length) {
      throw new Error("No data returned from Title Generator API.");
    }

    const title = response.choices[0].message.content;
    const usage: number = response.usage?.total_tokens ?? 0;

    return JSON.stringify({
      title,
      usage,
      model: policy.model,
      requestMetric,
    });
  } catch (error) {
    handleError({ error, source: "generateTitle" });
  }
}
