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

    expect(payload.model).toBe("gpt-4o-mini-tts");
    expect(payload.taskUsage).toBe(0);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.requestMetric).toEqual(
      expect.objectContaining({
        requestType: "audio",
        model: "gpt-4o-mini-tts",
      }),
    );
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

    expect(openAiClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-audio-mini",
        modalities: ["text", "audio"],
      }),
    );
    expect(openAiClient.audio.speech.create).not.toHaveBeenCalled();

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

  it("throws when TTS mode has no usable text input", async () => {
    await expect(
      generateAudio({
        messages: [],
        role: "assistant",
        taskId: "task_audio",
        userId: "user_123",
        planName: "Pro",
      }),
    ).rejects.toThrow(
      "No text input available for TTS audio generation. | generateAudio",
    );

    expect(openAiClient.audio.speech.create).not.toHaveBeenCalled();
    expect(uploadFileToAWS).not.toHaveBeenCalled();
  });

  it("throws when the TTS provider request fails", async () => {
    vi.mocked(openAiClient.audio.speech.create).mockRejectedValue(
      new Error("Audio provider failed"),
    );

    await expect(
      generateAudio({
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
      }),
    ).rejects.toThrow("Audio provider failed | generateAudio");
  });

  it("throws when audio_in_out mode returns malformed audio data", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            audio: {
              data: "   ",
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

    await expect(
      generateAudio({
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
      }),
    ).rejects.toThrow(
      "Audio Generator API returned empty audio data. | generateAudio",
    );
  });

  it("throws when uploading generated audio fails", async () => {
    vi.mocked(openAiClient.audio.speech.create).mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("audio-bytes")),
    } as never);
    vi.mocked(uploadFileToAWS).mockRejectedValueOnce(
      new Error("S3 upload failed for generated audio"),
    );

    await expect(
      generateAudio({
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
      }),
    ).rejects.toThrow("S3 upload failed for generated audio | generateAudio");
  });
});
