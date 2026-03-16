import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateImage } from "@/lib/utils/openai/generateImage";
import { openAiClient } from "@/constants/openai";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    images: {
      generate: vi.fn(),
    },
  },
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils/generateString", () => ({
  generateString: vi.fn(),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    png: vi.fn(() => ({
      toBuffer: vi.fn().mockResolvedValue(Buffer.from("png-bytes")),
    })),
  })),
}));

describe("generateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateString).mockReturnValue("fixedtoken");
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "/api/download?key=user_123%2Fimages%2Ftask_1_image_fixedtoken.png" as never,
    );
  });

  it("calls images.generate without response_format and uploads b64_json output", async () => {
    vi.mocked(openAiClient.images.generate).mockResolvedValue({
      created: 1773647602,
      data: [
        {
          b64_json: Buffer.from("raw-image-bytes").toString("base64"),
          revised_prompt: "Adjusted droplet prompt",
        },
      ],
    } as never);

    const result = await generateImage({
      prompt: "Draw a blue droplet",
      role: "assistant",
      taskId: "task_1",
      userId: "user_123",
      planName: "Pro",
    });

    expect(openAiClient.images.generate).toHaveBeenCalledWith({
      model: "gpt-image-1.5",
      prompt: "Draw a blue droplet",
    });
    expect(
      vi.mocked(openAiClient.images.generate).mock.calls[0]?.[0],
    ).not.toHaveProperty("response_format");
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      Buffer.from("png-bytes"),
      "task_1_image_fixedtoken.png",
      "image/png",
      "user_123/images",
    );

    const payload = JSON.parse(result as string);

    expect(payload.generatedImage).toBe(true);
    expect(payload.model).toBe("gpt-image-1.5");
    expect(payload.taskData).toEqual({
      whois: "assistant",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Adjusted droplet prompt",
        },
        {
          type: "image_url",
          image_url: {
            url: "/api/download?key=user_123%2Fimages%2Ftask_1_image_fixedtoken.png",
          },
        },
      ],
    });
  });
});
