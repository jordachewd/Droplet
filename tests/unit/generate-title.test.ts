import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateTitle } from "@/lib/utils/openai/generateTitle";
import { openAiClient } from "@/constants/openai";

vi.mock("@/constants/openai", () => ({
  openAiClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  titleSystemMsg: [
    {
      role: "system",
      content: "Generate a title.",
    },
  ],
}));

describe("generateTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generated title and usage", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: "Weekly Product Plan" } }],
      usage: { total_tokens: 19 },
    } as never);

    const response = await generateTitle([
      {
        role: "user",
        whois: "user",
        content: [{ type: "text", text: "Plan my week" }],
      },
    ]);

    expect(response).toBeTruthy();
    const payload = JSON.parse(response as string);
    expect(payload.title).toBe("Weekly Product Plan");
    expect(payload.usage).toBe(19);
  });

  it("throws when OpenAI returns no choices", async () => {
    vi.mocked(openAiClient.chat.completions.create).mockResolvedValue({
      choices: [],
    } as never);

    await expect(
      generateTitle([
        {
          role: "user",
          whois: "user",
          content: [{ type: "text", text: "Plan my week" }],
        },
      ]),
    ).rejects.toThrow(
      "No data returned from Title Generator API. | generateTitle",
    );
  });
});
