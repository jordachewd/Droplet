import { getPersona } from "@/constants/assistant-personas";
import { openAiClient, titleSystemMsg } from "@/constants/openai";
import { PlanName } from "@/types/PlanData.d";
import { Message } from "@/types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";
import { filterAssistantMsg } from "./filterAssistantMsg";
import { resolveModelForPlan } from "@/lib/utils/ai-model-policy";
import { AIRequestMetric } from "@/lib/utils/usage-event-utils";

export async function generateTitle(
  messages: Message[],
  planName: PlanName,
  personaId?: string | null,
) {
  try {
    const persona = getPersona(personaId);
    const model = resolveModelForPlan(planName, "title");

    if (!model) {
      throw new Error("No title model configured for the current plan.");
    }

    const filteredMsgs = filterAssistantMsg([
      ...titleSystemMsg,
      {
        role: "developer",
        content: `Conversation persona context: ${persona.label}. Generate a short title aligned with this persona.`,
      },
      ...messages,
    ] as Message[]);
    const startTime = Date.now();
    const response = await openAiClient.chat.completions.create({
      model,
      messages: filteredMsgs as ChatCompletionMessageParam[],
    });
    const requestMetric: AIRequestMetric = {
      requestType: "title",
      model,
      tokensIn: response.usage?.prompt_tokens,
      tokensOut: response.usage?.completion_tokens,
      latencyMs: Date.now() - startTime,
    };

    if (!response || !response.choices?.length) {
      throw new Error("No data returned from Title Generator API.");
    }

    const title = response.choices[0].message.content;
    const usage: number = response.usage?.total_tokens ?? 0;

    return JSON.stringify({ title, usage, model, requestMetric });
  } catch (error) {
    handleError({ error, source: "generateTitle" });
  }
}
