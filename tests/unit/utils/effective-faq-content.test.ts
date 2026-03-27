import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFaqs } from "@/constants/faqs";
import { getEffectiveFaqContent } from "@/lib/utils/effective-faq-content";

const { connectToDatabaseMock, findOneMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findOneMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    findOne: findOneMock,
  },
}));

type AppSettingValue = {
  value?: unknown;
} | null;

function mockFindOne(value: AppSettingValue): void {
  findOneMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(value),
    }),
  });
}

describe("effective-faq-content", () => {
  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findOneMock.mockReset();
  });

  it("returns fallback FAQs when no setting exists", async () => {
    mockFindOne(null);

    const config = {
      supportEmail: "support+test@example.com",
    };
    const result = await getEffectiveFaqContent(config);

    expect(result).toEqual(buildFaqs(config));
  });

  it("merges configured FAQ entries by id and keeps defaults for invalid entries", async () => {
    mockFindOne({
      value: [
        {
          id: 1,
          question: "  Updated support question? ",
          answer: " Updated support answer. ",
        },
        {
          id: 999,
          question: "Ignored",
          answer: "Ignored",
        },
        {
          id: "bad-id",
          question: "Ignored",
          answer: "Ignored",
        },
      ],
    });

    const result = await getEffectiveFaqContent();

    const defaultFaqs = buildFaqs();
    expect(result).toHaveLength(defaultFaqs.length);
    expect(result[1]).toEqual({
      id: 1,
      question: "Updated support question?",
      answer: "Updated support answer.",
    });
    expect(result[0]).toEqual(defaultFaqs[0]);
  });

  it("returns fallback FAQs when data access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));

    const result = await getEffectiveFaqContent();

    expect(result).toEqual(buildFaqs());
  });
});
