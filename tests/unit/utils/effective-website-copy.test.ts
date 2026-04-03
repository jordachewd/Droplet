import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultAboutContent } from "@/constants/about-data";
import { getDefaultHeroContent } from "@/constants/hero-content";
import { getDefaultLandingContent } from "@/constants/landing-data";
import {
  getDefaultHomepageCopy,
  getDefaultHomepageFeaturedPersonas,
} from "@/constants/homepage-copy";
import {
  getEffectiveAboutContent,
  getEffectiveLandingPageContent,
} from "@/lib/utils/effective-website-copy";

const { connectToDatabaseMock, findMock } = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/app-setting.model", () => ({
  default: {
    find: findMock,
  },
}));

type AppSettingRecord = {
  key: string;
  value: unknown;
};

function mockFindSettings(settings: AppSettingRecord[]): void {
  findMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(settings),
    }),
  });
}

describe("effective-website-copy", () => {
  beforeEach(() => {
    connectToDatabaseMock.mockResolvedValue(undefined);
    findMock.mockReset();
  });

  it("returns default hero and landing content when no settings exist", async () => {
    mockFindSettings([]);

    const result = await getEffectiveLandingPageContent();

    expect(result.heroContent).toEqual(getDefaultHeroContent());
    expect(result.landingContent).toEqual(getDefaultLandingContent());
    expect(result.homepageCopy).toEqual(getDefaultHomepageCopy());
    expect(result.homepageFeaturedPersonaIds).toEqual(
      getDefaultHomepageFeaturedPersonas(),
    );
  });

  it("normalizes configured hero and landing values", async () => {
    mockFindSettings([
      {
        key: "admin.heroContent",
        value: {
          heading: "  Updated heading  ",
          subheading: "Updated subheading",
          ctaLabel: "Start now",
          imageAlt: "Updated hero alt",
        },
      },
      {
        key: "admin.landingContent",
        value: {
          featureCards: [
            {
              icon: "bi bi-stars",
              title: "Updated feature",
              description: "Updated feature description.",
            },
          ],
          howItWorksSteps: [
            {
              step: "A1",
              title: "Updated step title",
              description: "Updated step description.",
            },
          ],
          workflow: {
            eyebrow: "Updated eyebrow",
            title: "Updated workflow title",
            description: "Updated workflow description",
            rhythmEyebrow: "Updated rhythm",
            rhythmCards: [
              {
                label: "Updated actor",
                detail: "Updated message",
              },
            ],
          },
        },
      },
      {
        key: "admin.homepageCopy",
        value: {
          ctaHeading: "  New CTA heading  ",
          ctaDescription: "New CTA description",
          ctaPrimaryLabel: "Join now",
          ctaSecondaryLabel: "Compare plans",
          spotlightLabel: "Team spotlight",
          spotlightHeading: "Pick a specialist voice.",
          spotlightDescription: "Focused assistants for focused tasks.",
        },
      },
      {
        key: "admin.homepageFeaturedPersonas",
        value: ["teacher", "creator", "teacher", "invalid-id"],
      },
    ]);

    const result = await getEffectiveLandingPageContent();
    const landingDefaults = getDefaultLandingContent();

    expect(result.heroContent).toEqual({
      heading: "Updated heading",
      subheading: "Updated subheading",
      ctaLabel: "Start now",
      imageAlt: "Updated hero alt",
    });
    expect(result.landingContent.featureCards[0]).toEqual({
      icon: "bi bi-stars",
      title: "Updated feature",
      description: "Updated feature description.",
    });
    expect(result.landingContent.featureCards[1]).toEqual(
      landingDefaults.featureCards[1],
    );
    expect(result.landingContent.workflow.rhythmCards[0]).toEqual({
      label: "Updated actor",
      detail: "Updated message",
    });
    expect(result.landingContent.workflow.rhythmCards[1]).toEqual(
      landingDefaults.workflow.rhythmCards[1],
    );
    expect(result.homepageCopy).toEqual({
      ctaHeading: "New CTA heading",
      ctaDescription: "New CTA description",
      ctaPrimaryLabel: "Join now",
      ctaSecondaryLabel: "Compare plans",
      spotlightLabel: "Team spotlight",
      spotlightHeading: "Pick a specialist voice.",
      spotlightDescription: "Focused assistants for focused tasks.",
    });
    expect(result.homepageFeaturedPersonaIds).toEqual(["teacher", "creator"]);
  });

  it("normalizes configured about content and preserves fallback sections", async () => {
    const aboutDefaults = getDefaultAboutContent();

    mockFindSettings([
      {
        key: "admin.aboutContent",
        value: {
          pageTitle: "Updated About",
          pageSubtitle: "Updated subtitle",
          sections: [
            {
              id: "identity",
              eyebrow: "Updated identity eyebrow",
              title: "Updated identity title",
              paragraphs: [
                "Updated identity paragraph one.",
                "Updated identity paragraph two.",
              ],
            },
          ],
          ctaTitle: "Updated CTA title",
          ctaDescription: "Updated CTA description",
          ctaPrimaryLabel: "See plans",
          ctaSecondaryLabel: "See personas",
        },
      },
    ]);

    const result = await getEffectiveAboutContent();

    expect(result.pageTitle).toBe("Updated About");
    expect(result.pageSubtitle).toBe("Updated subtitle");
    expect(result.sections[0]).toEqual({
      ...aboutDefaults.sections[0],
      eyebrow: "Updated identity eyebrow",
      title: "Updated identity title",
      paragraphs: [
        "Updated identity paragraph one.",
        "Updated identity paragraph two.",
      ],
    });
    expect(result.sections[1]).toEqual(aboutDefaults.sections[1]);
    expect(result.ctaPrimaryLabel).toBe("See plans");
    expect(result.ctaSecondaryLabel).toBe("See personas");
  });

  it("returns fallback values when database access fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));
    const landingResult = await getEffectiveLandingPageContent();

    expect(landingResult.heroContent).toEqual(getDefaultHeroContent());
    expect(landingResult.landingContent).toEqual(getDefaultLandingContent());
    expect(landingResult.homepageCopy).toEqual(getDefaultHomepageCopy());
    expect(landingResult.homepageFeaturedPersonaIds).toEqual(
      getDefaultHomepageFeaturedPersonas(),
    );

    connectToDatabaseMock.mockRejectedValueOnce(new Error("db unavailable"));
    const aboutResult = await getEffectiveAboutContent();
    expect(aboutResult).toEqual(getDefaultAboutContent());
  });
});
