import { Message } from "@/types";
import { openAiClient, titleSystemMsg } from "@/constants/openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";
import { filterAssistantMsg } from "./filterAssistantMsg";
import { getPersona } from "@/constants/assistant-personas";

export async function generateTitle(
  messages: Message[],
  personaId?: string | null,
) {
  try {
    const persona = getPersona(personaId);

    const filteredMsgs = filterAssistantMsg([
      ...titleSystemMsg,
      {
        role: "developer",
        content: `Conversation persona context: ${persona.label}. Generate a short title aligned with this persona.`,
      },
      ...messages,
    ] as Message[]);

    const response = await openAiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: filteredMsgs as ChatCompletionMessageParam[],
    });

    if (!response || !response.choices?.length) {
      throw new Error("No data returned from Title Generator API.");
    }

    const title = response.choices[0].message.content;
    const usage: number = response.usage?.total_tokens ?? 0;

    return JSON.stringify({ title, usage });
  } catch (error) {
    handleError({ error, source: "generateTitle" });
  }
}
