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

  it("uploads generated audio bytes to S3 and stores the private asset URL", async () => {
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
      planName: "Lite",
    });

    expect(uploadFileToAWS).toHaveBeenCalledWith(
      Buffer.from("audio-bytes"),
      "task_audio_audio_fixedtoken.wav",
      "audio/wav",
      "user_123/audio",
    );

    const payload = JSON.parse(result as string);

    expect(payload.taskUsage).toBe(14);
    expect(payload.generatedAudio).toBe(true);
    expect(payload.taskData).toEqual({
      whois: "assistant",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Read this aloud.",
        },
        {
          type: "audio_url",
          audio_url:
            "/api/download?key=user_123%2Faudio%2Ftask_audio_audio_fixedtoken.wav",
        },
      ],
    });
  });
});
