import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAudio } from "@/lib/utils/openai/generateAudio";
import { PERSONA_AUDIO_STYLE_HINTS } from "@/constants/persona-prompts";
import type { Message, MessageRole } from "@/types";
import { createTestTask, createTestUser } from "../test-support";

const {
  speechCreateMock,
  chatCompletionsCreateMock,
  handleErrorMock,
  uploadFileToAWSMock,
  generateStringMock,
  normalizePlanTierMock,
  resolveModelPolicyMock,
  buildTextToSpeechInputMock,
} = vi.hoisted(() => ({
  speechCreateMock: vi.fn(),
  chatCompletionsCreateMock: vi.fn(),
  handleErrorMock: vi.fn(),
  uploadFileToAWSMock: vi.fn(),
  generateStringMock: vi.fn(),
  normalizePlanTierMock: vi.fn(),
  resolveModelPolicyMock: vi.fn(),
  buildTextToSpeechInputMock: vi.fn(),
}));

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    audio: {
      speech: {
        create: speechCreateMock,
      },
    },
    chat: {
      completions: {
        create: chatCompletionsCreateMock,
      },
    },
  },
}));

vi.mock("@/lib/utils/handleError", () => ({
  handleError: handleErrorMock,
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: uploadFileToAWSMock,
}));

vi.mock("@/lib/utils/generateString", () => ({
  generateString: generateStringMock,
}));

vi.mock("@/lib/utils/ai-model-policy", () => ({
  normalizePlanTier: normalizePlanTierMock,
  resolveModelPolicy: resolveModelPolicyMock,
}));

vi.mock("@/lib/utils/openai/message-policy", () => ({
  buildTextToSpeechInput: buildTextToSpeechInputMock,
}));

type TestPolicy = {
  model: string;
  hardBlocked: boolean;
  notes?: string;
};

function createPolicy(overrides: Partial<TestPolicy> = {}): TestPolicy {
  return {
    model: "gpt-4o-mini-tts",
    hardBlocked: false,
    ...overrides,
  };
}

function createAudioRequest(
  overrides: Partial<{
    messages: Message[];
    ttsText: string;
    role: MessageRole;
    taskId: string;
    userId: string;
    planName: "Lite" | "Pro" | "Premium";
    audioMode: "tts" | "audio_in_out";
    personaId: string | null;
  }> = {},
) {
  const task = createTestTask();
  const user = createTestUser();
  const defaultMessages: Message[] = [
    { role: "user", whois: "user", content: "Hello there" },
  ];

  return {
    messages: defaultMessages,
    role: "assistant" as const,
    taskId: task._id,
    userId: user.clerkId,
    planName: "Lite" as const,
    audioMode: "tts" as const,
    personaId: null,
    ...overrides,
  };
}

describe("generateAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    handleErrorMock.mockImplementation(({ source }: { source?: string }) => {
      throw new Error(`handled:${source ?? "unknown"}`);
    });
    generateStringMock.mockReturnValue("snd123");
    normalizePlanTierMock.mockImplementation(
      (planName?: string | null) => planName?.toLowerCase() ?? "lite",
    );
    resolveModelPolicyMock.mockImplementation(
      (params: { audioMode?: string }) =>
        createPolicy({
          model:
            params.audioMode === "audio_in_out"
              ? "gpt-audio-mini"
              : "gpt-4o-mini-tts",
        }),
    );
    uploadFileToAWSMock.mockResolvedValue("https://cdn.example.com/audio.wav");
    buildTextToSpeechInputMock.mockReturnValue("Built speech input");
  });

  it("generates TTS audio from explicit ttsText and uploads it", async () => {
    const audioBuffer = Buffer.from("audio-bytes");
    const request = createAudioRequest({
      ttsText: "Speak exactly this line",
    });

    speechCreateMock.mockResolvedValue({
      arrayBuffer: async () => audioBuffer,
    });

    const payload = await generateAudio(request);

    const taskData = payload.taskData as {
      content: Array<{ type: string; text?: string; audio_url?: string }>;
    };

    expect(speechCreateMock).toHaveBeenCalledWith({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: expect.stringContaining(request.ttsText ?? ""),
      response_format: "wav",
    });
    expect(uploadFileToAWSMock).toHaveBeenCalledWith(
      audioBuffer,
      `${request.taskId}_audio_snd123.wav`,
      "audio/wav",
      `${request.userId}/audio`,
    );
    expect(payload.taskUsage).toBe(0);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.model).toBe("gpt-4o-mini-tts");
    expect(taskData.content[0]).toEqual({
      type: "text",
      text: "Speak exactly this line",
    });
    expect(taskData.content[1]).toEqual({
      type: "audio_url",
      audio_url: "https://cdn.example.com/audio.wav",
    });
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "audio",
        model: "gpt-4o-mini-tts",
      }),
    );
  });

  it("builds TTS input from messages when ttsText is not provided", async () => {
    const audioBuffer = Buffer.from("audio-built");
    const request = createAudioRequest({
      messages: [{ role: "user", whois: "user", content: "Hello there" }],
    });

    speechCreateMock.mockResolvedValue({
      arrayBuffer: async () => audioBuffer,
    });

    await generateAudio(request);

    expect(buildTextToSpeechInputMock).toHaveBeenCalledWith([
      { role: "user", whois: "user", content: "Hello there" },
    ]);
    expect(speechCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining("Built speech input"),
      }),
    );
  });

  it("adds persona-specific TTS style hint to speech input", async () => {
    const audioBuffer = Buffer.from("audio-style");
    const request = createAudioRequest({
      ttsText: "Keep this practical and direct.",
      personaId: "strategist",
    });

    speechCreateMock.mockResolvedValue({
      arrayBuffer: async () => audioBuffer,
    });

    await generateAudio(request);

    expect(speechCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: `${PERSONA_AUDIO_STYLE_HINTS.strategist}\n\nText to read aloud: ${request.ttsText}`,
      }),
    );
  });

  it("delegates to handleError when TTS has no available text input", async () => {
    buildTextToSpeechInputMock.mockReturnValue("");
    const request = createAudioRequest({
      messages: [],
    });

    await expect(generateAudio(request)).rejects.toThrow(
      "handled:generateAudio",
    );

    expect(speechCreateMock).not.toHaveBeenCalled();
  });

  it("generates audio_in_out from chat completions and decodes audio payload", async () => {
    const decodedAudio = Buffer.from("decoded-audio");
    const encodedAudio = decodedAudio.toString("base64");
    const request = createAudioRequest({
      messages: [{ role: "user", whois: "user", content: "Talk to me" }],
      planName: "Pro",
      audioMode: "audio_in_out",
    });

    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 40,
        completion_tokens: 18,
        total_tokens: 58,
      },
      choices: [
        {
          message: {
            audio: {
              data: encodedAudio,
              transcript: "Decoded transcript",
            },
          },
        },
      ],
    });

    const payload = await generateAudio(request);

    const taskData = payload.taskData as {
      content: Array<{ type: string; text?: string }>;
    };

    expect(chatCompletionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-audio-mini",
        modalities: ["text", "audio"],
      }),
    );
    expect(payload.taskUsage).toBe(58);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.model).toBe("gpt-audio-mini");
    expect(taskData.content[0]).toEqual({
      type: "text",
      text: "Decoded transcript",
    });
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "audio",
        model: "gpt-audio-mini",
        tokensIn: 40,
        tokensOut: 18,
      }),
    );
  });

  it("delegates to handleError when audio_in_out returns no choices", async () => {
    const request = createAudioRequest({
      messages: [{ role: "user", whois: "user", content: "Missing choices" }],
      planName: "Pro",
      audioMode: "audio_in_out",
    });

    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12,
      },
      choices: [],
    });

    await expect(generateAudio(request)).rejects.toThrow(
      "handled:generateAudio",
    );
  });

  it("delegates to handleError when decoded audio payload is invalid", async () => {
    const request = createAudioRequest({
      messages: [{ role: "user", whois: "user", content: "Invalid audio" }],
      planName: "Pro",
      audioMode: "audio_in_out",
    });

    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 7,
        completion_tokens: 3,
        total_tokens: 10,
      },
      choices: [
        {
          message: {
            audio: {
              data: "   ",
              transcript: "invalid",
            },
          },
        },
      ],
    });

    await expect(generateAudio(request)).rejects.toThrow(
      "handled:generateAudio",
    );
  });

  it("delegates to handleError when policy hard-blocks audio generation", async () => {
    const request = createAudioRequest({
      ttsText: "blocked",
    });

    resolveModelPolicyMock.mockReturnValue(
      createPolicy({
        hardBlocked: true,
        notes: "Audio generation blocked.",
      }),
    );

    await expect(generateAudio(request)).rejects.toThrow(
      "handled:generateAudio",
    );

    expect(speechCreateMock).not.toHaveBeenCalled();
    expect(chatCompletionsCreateMock).not.toHaveBeenCalled();
  });

  it("delegates to handleError when audio_in_out returns no audio payload", async () => {
    const request = createAudioRequest({
      messages: [
        { role: "user", whois: "user", content: "Need audio payload" },
      ],
      planName: "Pro",
      audioMode: "audio_in_out",
    });

    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 12,
        completion_tokens: 4,
        total_tokens: 16,
      },
      choices: [
        {
          message: {},
        },
      ],
    });

    await expect(generateAudio(request)).rejects.toThrow(
      "handled:generateAudio",
    );
  });

  it("keeps transcript null when audio payload has no transcript field", async () => {
    const decodedAudio = Buffer.from("decoded-without-transcript");
    const request = createAudioRequest({
      messages: [{ role: "user", whois: "user", content: "No transcript" }],
      planName: "Pro",
      audioMode: "audio_in_out",
    });

    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 15,
        completion_tokens: 6,
        total_tokens: 21,
      },
      choices: [
        {
          message: {
            audio: {
              data: decodedAudio.toString("base64"),
            },
          },
        },
      ],
    });

    const payload = await generateAudio(request);
    const taskData = payload.taskData as {
      content: Array<{ type: string; text?: string | null }>;
    };

    expect(taskData.content[0]).toEqual({
      type: "text",
      text: null,
    });
  });

  it("prepends persona style as a system message for audio_in_out mode", async () => {
    const decodedAudio = Buffer.from("persona-audio-in-out");
    const request = createAudioRequest({
      messages: [{ role: "user", whois: "user", content: "Coach me quickly" }],
      planName: "Pro",
      audioMode: "audio_in_out",
      personaId: "interviewer",
    });

    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 18,
        completion_tokens: 7,
        total_tokens: 25,
      },
      choices: [
        {
          message: {
            audio: {
              data: decodedAudio.toString("base64"),
              transcript: "Short coaching reply",
            },
          },
        },
      ],
    });

    await generateAudio(request);

    expect(chatCompletionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "system",
            content: PERSONA_AUDIO_STYLE_HINTS.interviewer,
          },
          {
            role: "user",
            whois: "user",
            content: "Coach me quickly",
          },
        ],
      }),
    );
  });
});
