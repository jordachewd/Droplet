import { describe, expect, it } from "vitest";
import { getPersona } from "@/constants/assistant-personas";
import {
  PERSONA_PROMPTS,
  PROMPT_VERSION,
  resolvePersonaPromptConfig,
  resolvePromptModelFamily,
} from "@/constants/persona-prompts";

describe("persona-prompts", () => {
  it("defines versioned prompt variants for all six personas", () => {
    expect(Object.keys(PERSONA_PROMPTS)).toHaveLength(6);
    expect(PROMPT_VERSION).toBe("1.0");
  });

  it("selects model-family prompt settings when the model is known", () => {
    const promptConfig = resolvePersonaPromptConfig({
      personaId: "developer",
      model: "gpt-4o-mini",
    });

    expect(resolvePromptModelFamily("gpt-4o-mini")).toBe("mini");
    expect(promptConfig).toMatchObject({
      modelFamily: "mini",
      isFallback: false,
      temperature: 0.25,
      maxTokens: 1_000,
      version: "1.0",
    });
    expect(promptConfig.systemPrompt).toContain(
      "diagnosis, fix, and validation",
    );
  });

  it("falls back to the persona default prompt when the model family is unknown", () => {
    const fallbackPrompt = resolvePersonaPromptConfig({
      personaId: "strategist",
      model: "unknown-model",
    });

    expect(fallbackPrompt).toMatchObject({
      modelFamily: null,
      isFallback: true,
      temperature: 0.5,
      version: "1.0",
    });
    expect(fallbackPrompt.systemPrompt).toBe(
      getPersona("strategist").systemPrompt,
    );
  });

  it("builds strategist prompts with analysis capabilities", () => {
    const promptConfig = resolvePersonaPromptConfig({
      personaId: "strategist",
      model: "gpt-4.1",
    });

    expect(promptConfig.modelFamily).toBe("standard");
    expect(promptConfig.systemPrompt).toContain("evidence-first");
    expect(promptConfig.systemPrompt).toContain("actionable conclusions");
  });

  it("builds interviewer prompts for realistic interview simulation", () => {
    const promptConfig = resolvePersonaPromptConfig({
      personaId: "interviewer",
      model: "gpt-4.1",
    });

    expect(promptConfig.modelFamily).toBe("standard");
    expect(promptConfig.systemPrompt).toContain("Ask one question at a time");
    expect(promptConfig.systemPrompt).toContain("structured feedback");
  });
});
