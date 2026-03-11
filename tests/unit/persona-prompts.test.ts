import { describe, expect, it } from "vitest";
import { getPersona } from "@/constants/assistant-personas";
import {
  buildPersonaAwareSystemPrompt,
  PERSONA_PROMPTS,
  PROMPT_VERSION,
  resolvePersonaPromptConfig,
  resolvePromptModelFamily,
} from "@/constants/persona-prompts";

describe("persona-prompts", () => {
  it("defines versioned prompt variants for all nine personas", () => {
    expect(Object.keys(PERSONA_PROMPTS)).toHaveLength(9);
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

  it("builds companion prompts with the approved safety constraints", () => {
    const promptMessages = buildPersonaAwareSystemPrompt("boyfriend", {
      model: "gpt-5.4",
    });

    expect(promptMessages).toHaveLength(2);
    expect(promptMessages[1].content).toContain(
      "Do not generate romantic or sexual content.",
    );
    expect(promptMessages[1].content).toContain(
      "Do not provide medical, legal, or financial advice.",
    );
  });
});
