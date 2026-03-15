import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAudio } from "@/lib/utils/openai/generateAudio";
import { openAiClient } from "@/constants/openai";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    audio: {
      speech: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils/generateString", () => ({
  generateString: vi.fn(),
}));

describe("generateAudio phase16", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateString).mockReturnValue("fixedtoken");
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "/api/download?key=user_123%2Faudio%2Ftask_audio_audio_fixedtoken.wav" as never,
    );
  });

  it("uses speech API metadata for TTS requests", async () => {
    vi.mocked(openAiClient.audio.speech.create).mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("audio-bytes")),
    } as never);

    const result = await generateAudio({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Create audio." }],
        },
      ],
      role: "assistant",
      taskId: "task_audio",
      userId: "user_123",
      planName: "Pro",
    });
    const payload = JSON.parse(result as string);

    expect(uploadFileToAWS).toHaveBeenCalledWith(
      Buffer.from("audio-bytes"),
      "task_audio_audio_fixedtoken.wav",
      "audio/wav",
      "user_123/audio",
    );
    expect(payload.model).toBe("gpt-4o-mini-tts");
    expect(payload.taskUsage).toBe(0);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "audio",
        model: "gpt-4o-mini-tts",
      }),
    );
  });

  it("preserves chat-completions metadata for audio_in_out requests", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            audio: {
              data: Buffer.from("audio-bytes").toString("base64"),
              transcript: "Read this aloud.",
            },
          },
        },
      ],
      usage: {
        total_tokens: 14,
        prompt_tokens: 10,
        completion_tokens: 4,
      },
    } as never);

    const result = await generateAudio({
      messages: [
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Create audio." }],
        },
      ],
      role: "assistant",
      taskId: "task_audio",
      userId: "user_123",
      planName: "Pro",
      audioMode: "audio_in_out",
    });
    const payload = JSON.parse(result as string);

    expect(payload.model).toBe("gpt-audio-mini");
    expect(payload.taskUsage).toBe(14);
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "audio",
        model: "gpt-audio-mini",
        tokensIn: 10,
        tokensOut: 4,
      }),
    );
  });
});
