import {
  buildRoleAwareSystemPrompt,
  getAssistantRole,
} from "@/constants/assistant-roles";
import { getChatTools, openAiClient } from "@/constants/openai";
import { ContentItem, Message, MessageRole } from "@/types";
import { generateImage } from "./generateImage";
import { generateAudio } from "./generateAudio";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import { handleError } from "../handleError";
import { Entitlements } from "@/lib/utils/resolve-entitlements";

interface GenerateResponseParams {
  messages: Message[];
  taskId: string;
  assistantRoleId?: string | null;
  entitlements: Entitlements;
}

export async function generateResponse({
  messages,
  taskId,
  assistantRoleId,
  entitlements,
}: GenerateResponseParams) {
  try {
    const selectedRole = getAssistantRole(assistantRoleId);
    const tools = getChatTools({
      supportsImageGeneration:
        entitlements.supportsImageGeneration && selectedRole.supportsImage,
      supportsAudioGeneration:
        entitlements.supportsAudioGeneration && selectedRole.supportsAudio,
    });

    const chatData = await openAiClient.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      messages: [
        ...buildRoleAwareSystemPrompt(selectedRole.id),
        ...messages,
      ] as ChatCompletionMessageParam[],
      tools: tools.length > 0 ? (tools as ChatCompletionTool[]) : undefined,
    });

    if (!chatData?.choices?.length) {
      throw new Error("No valid response from Chat Completion API.");
    }

    const { message } = chatData.choices[0];
    const toolCall = message.tool_calls?.[0];

    if (toolCall && toolCall.type === "function" && toolCall.function) {
      const functionName = toolCall.function.name;
      const argsStr = toolCall.function.arguments ?? "{}";
      const parsedArgs = (() => {
        try {
          return JSON.parse(argsStr);
        } catch {
          return {};
        }
      })();

      if (functionName === "getGeneratedImage") {
        if (
          !entitlements.supportsImageGeneration ||
          !selectedRole.supportsImage
        ) {
          return JSON.stringify({
            taskData: {
              whois: "assistant",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "Image generation is not enabled for the current plan or role.",
                },
              ] as ContentItem[],
            },
            taskUsage: chatData.usage?.total_tokens ?? 0,
          });
        }

        return await generateImage({
          prompt: parsedArgs.prompt,
          role: message.role as MessageRole,
          taskId,
        });
      }

      if (functionName === "getGeneratedAudio") {
        if (
          !entitlements.supportsAudioGeneration ||
          !selectedRole.supportsAudio
        ) {
          return JSON.stringify({
            taskData: {
              whois: "assistant",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "Audio generation is not enabled for the current plan or role.",
                },
              ] as ContentItem[],
            },
            taskUsage: chatData.usage?.total_tokens ?? 0,
          });
        }

        return await generateAudio({
          messages: Array.isArray(parsedArgs) ? parsedArgs : [parsedArgs],
          role: message.role as MessageRole,
          taskId,
        });
      }
    }

    return JSON.stringify({
      taskData: {
        whois: message.role,
        role: message.role,
        content: [
          {
            type: "text",
            text: typeof message.content === "string" ? message.content : "",
          },
        ] as ContentItem[],
      },
      taskUsage: chatData.usage?.total_tokens ?? 0,
    });
  } catch (error) {
    handleError({ error, source: "generateResponse" });
  }
}
