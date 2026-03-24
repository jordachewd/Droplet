import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAudio } from "@/lib/utils/openai/generateAudio";

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

    speechCreateMock.mockResolvedValue({
      arrayBuffer: async () => audioBuffer,
    });

    const serialized = await generateAudio({
      ttsText: "Speak exactly this line",
      role: "assistant",
      taskId: "task_audio_1",
      userId: "user_audio_1",
      planName: "Lite",
      audioMode: "tts",
    });

    const payload = JSON.parse(String(serialized)) as {
      taskData: {
        content: Array<{ type: string; text?: string; audio_url?: string }>;
      };
      taskUsage: number;
      generatedAudio: boolean;
      model: string;
      requestMetric: { requestType: string; model: string };
    };

    expect(speechCreateMock).toHaveBeenCalledWith({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: "Speak exactly this line",
      response_format: "wav",
    });
    expect(uploadFileToAWSMock).toHaveBeenCalledWith(
      audioBuffer,
      "task_audio_1_audio_snd123.wav",
      "audio/wav",
      "user_audio_1/audio",
    );
    expect(payload.taskUsage).toBe(0);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.model).toBe("gpt-4o-mini-tts");
    expect(payload.taskData.content[0]).toEqual({
      type: "text",
      text: "Speak exactly this line",
    });
    expect(payload.taskData.content[1]).toEqual({
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

    speechCreateMock.mockResolvedValue({
      arrayBuffer: async () => audioBuffer,
    });

    await generateAudio({
      messages: [{ role: "user", whois: "user", content: "Hello there" }],
      role: "assistant",
      taskId: "task_audio_2",
      userId: "user_audio_2",
      planName: "Lite",
      audioMode: "tts",
    });

    expect(buildTextToSpeechInputMock).toHaveBeenCalledWith([
      { role: "user", whois: "user", content: "Hello there" },
    ]);
    expect(speechCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "Built speech input",
      }),
    );
  });

  it("delegates to handleError when TTS has no available text input", async () => {
    buildTextToSpeechInputMock.mockReturnValue("");

    await expect(
      generateAudio({
        messages: [],
        role: "assistant",
        taskId: "task_audio_3",
        userId: "user_audio_3",
        planName: "Lite",
        audioMode: "tts",
      }),
    ).rejects.toThrow("handled:generateAudio");

    expect(speechCreateMock).not.toHaveBeenCalled();
  });

  it("generates audio_in_out from chat completions and decodes audio payload", async () => {
    const decodedAudio = Buffer.from("decoded-audio");
    const encodedAudio = decodedAudio.toString("base64");

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

    const serialized = await generateAudio({
      messages: [{ role: "user", whois: "user", content: "Talk to me" }],
      role: "assistant",
      taskId: "task_audio_4",
      userId: "user_audio_4",
      planName: "Pro",
      audioMode: "audio_in_out",
    });

    const payload = JSON.parse(String(serialized)) as {
      taskUsage: number;
      generatedAudio: boolean;
      model: string;
      taskData: { content: Array<{ type: string; text?: string }> };
      requestMetric: {
        requestType: string;
        model: string;
        tokensIn: number;
        tokensOut: number;
      };
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
    expect(payload.taskData.content[0]).toEqual({
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
    chatCompletionsCreateMock.mockResolvedValue({
      usage: {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12,
      },
      choices: [],
    });

    await expect(
      generateAudio({
        messages: [{ role: "user", whois: "user", content: "Missing choices" }],
        role: "assistant",
        taskId: "task_audio_5",
        userId: "user_audio_5",
        planName: "Pro",
        audioMode: "audio_in_out",
      }),
    ).rejects.toThrow("handled:generateAudio");
  });

  it("delegates to handleError when decoded audio payload is invalid", async () => {
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

    await expect(
      generateAudio({
        messages: [{ role: "user", whois: "user", content: "Invalid audio" }],
        role: "assistant",
        taskId: "task_audio_6",
        userId: "user_audio_6",
        planName: "Pro",
        audioMode: "audio_in_out",
      }),
    ).rejects.toThrow("handled:generateAudio");
  });

  it("delegates to handleError when policy hard-blocks audio generation", async () => {
    resolveModelPolicyMock.mockReturnValue(
      createPolicy({
        hardBlocked: true,
        notes: "Audio generation blocked.",
      }),
    );

    await expect(
      generateAudio({
        ttsText: "blocked",
        role: "assistant",
        taskId: "task_audio_7",
        userId: "user_audio_7",
        planName: "Lite",
        audioMode: "tts",
      }),
    ).rejects.toThrow("handled:generateAudio");

    expect(speechCreateMock).not.toHaveBeenCalled();
    expect(chatCompletionsCreateMock).not.toHaveBeenCalled();
  });
});
