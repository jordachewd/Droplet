import OpenAI from "openai";

export const openAiClient = new OpenAI({
  organization: process.env.OPENAI_ORG!,
  project: process.env.OPENAI_PRJ!,
  apiKey: process.env.OPENAI_KEY!,
});

/** Tools available for chat interactions */
const imageGenerationTool = {
  type: "function",
  function: {
    name: "getGeneratedImage",
    description:
      "Generates an image when requested by the user. Use this function if the user asks for an image," +
      "e.g., when prompted with 'generate image ...', 'create image ...' or anything related." +
      "USE PREVIOUS PROMPTS for generating images as well. Trim prompts to maximum 4000 characters.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description of the image to generate",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
};

const audioGenerationTool = {
  type: "function",
  function: {
    name: "getGeneratedAudio",
    description:
      "Generates an audio file when requested by the user. Use this function if the user asks for an audio file," +
      "e.g., when prompted with 'generate audio ...', 'create audio ...' or anything related. MAX 1 minute long." +
      "USE PREVIOUS PROMPTS for generating audio files as well. Trim prompts to maximum 4000 characters.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "The role of the user requesting the audio file",
        },
        content: {
          type: "string",
          description:
            "The exact text content to be spoken aloud as audio. Provide the full text, not a description.",
        },
      },
      required: ["role", "content"],
      additionalProperties: false,
    },
  },
};

const videoGenerationTool = {
  type: "function",
  function: {
    name: "getGeneratedVideo",
    description:
      "Generates a video when requested by the user. Use this function if the user asks for a video," +
      " e.g., when prompted with 'generate video ...', 'create video ...' or anything related." +
      " USE PREVIOUS PROMPTS for generating videos as well. Trim prompts to maximum 4000 characters.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description of the video to generate",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
};

export const chatTools = [
  imageGenerationTool,
  audioGenerationTool,
  videoGenerationTool,
];

export function getChatTools({
  supportsImageGeneration,
  supportsAudioGeneration,
  supportsVideoGeneration,
}: {
  supportsImageGeneration: boolean;
  supportsAudioGeneration: boolean;
  supportsVideoGeneration: boolean;
}) {
  const tools: typeof chatTools = [];

  if (supportsImageGeneration) {
    tools.push(imageGenerationTool);
  }

  if (supportsAudioGeneration) {
    tools.push(audioGenerationTool);
  }

  if (supportsVideoGeneration) {
    tools.push(videoGenerationTool);
  }

  return tools;
}

export const titleSystemMsg = [
  {
    role: "system",
    content:
      "Generate a concise, maximum of five words engaging title that captures the essence of the conversation and piques interest.",
  },
];
