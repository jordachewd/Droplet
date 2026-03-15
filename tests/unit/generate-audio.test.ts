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

describe("generateAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateString).mockReturnValue("fixedtoken");
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "/api/download?key=user_123%2Faudio%2Ftask_audio_audio_fixedtoken.wav" as never,
    );
  });

  it("uses the speech endpoint for TTS mode and uploads generated audio to S3", async () => {
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

    expect(openAiClient.audio.speech.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: "Create audio.",
      response_format: "wav",
    });
    expect(openAiClient.chat.completions.create).not.toHaveBeenCalled();
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      Buffer.from("audio-bytes"),
      "task_audio_audio_fixedtoken.wav",
      "audio/wav",
      "user_123/audio",
    );

    const payload = JSON.parse(result as string);

    expect(payload.taskUsage).toBe(0);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.taskData).toEqual({
      whois: "assistant",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Create audio.",
        },
        {
          type: "audio_url",
          audio_url:
            "/api/download?key=user_123%2Faudio%2Ftask_audio_audio_fixedtoken.wav",
        },
      ],
    });
  });

  it("uses chat audio generation for audio_in_out mode", async () => {
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
      },
    } as never);

    await generateAudio({
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

    expect(openAiClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-audio-mini",
        modalities: ["text", "audio"],
      }),
    );
    expect(openAiClient.audio.speech.create).not.toHaveBeenCalled();
  });
});
