import { Message } from "@/types";
import { openAiClient, titleSystemMsg } from "@/constants/openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";
import { filterAssistantMsg } from "./filterAssistantMsg";
import { getAssistantRole } from "@/constants/assistant-roles";

export async function generateTitle(
  messages: Message[],
  assistantRoleId?: string | null,
) {
  try {
    const role = getAssistantRole(assistantRoleId);

    const filteredMsgs = filterAssistantMsg([
      ...titleSystemMsg,
      {
        role: "developer",
        content: `Conversation role context: ${role.label}. Generate a short title aligned with this role.`,
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
