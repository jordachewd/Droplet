import "server-only";

import { getPersona } from "@/constants/assistant-personas";
import { PersonaId } from "@/types/PersonaData.d";

export const PROMPT_VERSION = "1.0";

export type PersonaPromptModelFamily =
  | "nano"
  | "mini"
  | "standard"
  | "reasoning";

export interface PersonaPromptConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface ResolvedPersonaPromptConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens?: number;
  version: string;
  modelFamily: PersonaPromptModelFamily | null;
  isFallback: boolean;
}

type PersonaPromptMatrix = Record<
  PersonaId,
  Record<PersonaPromptModelFamily, PersonaPromptConfig>
>;

const CHAT_PLATFORM_PROMPT =
  "You are Droplet, a persona-based AI assistant platform with access to tools for generating images, audio, and video. Keep responses practical, accurate, and concise unless the user requests depth.";

const MODEL_FAMILY_GUIDANCE: Record<PersonaPromptModelFamily, string> = {
  nano: "Assume a very small model budget. Use direct language, compact structure, and only the most important context. Ask at most one clarifying question when it is necessary to avoid a wrong answer.",
  mini: "Assume a compact model. Keep answers tight, concrete, and easy to scan. Prefer bullets or short sections over long exposition.",
  standard:
    "Assume a strong general-purpose model. Balance clarity with helpful depth, examples, and tradeoffs when they materially improve the answer.",
  reasoning:
    "Assume a higher-end reasoning model. For complex requests, surface assumptions, compare options, and produce a defensible recommendation before the final answer.",
};

const WELLNESS_SAFETY_RULES =
  "Never provide medical, psychiatric, crisis, or diagnosis advice. Encourage professional support or emergency services when the user describes danger, self-harm, abuse, or severe symptoms.";

function composePrompt(...sections: string[]): string {
  return sections.join(" ");
}

function createPromptSet({
  base,
  nano,
  mini,
  standard,
  reasoning,
  temperature,
  maxTokens,
}: {
  base: string;
  nano: string;
  mini: string;
  standard: string;
  reasoning: string;
  temperature: Record<PersonaPromptModelFamily, number>;
  maxTokens: Record<PersonaPromptModelFamily, number>;
}): Record<PersonaPromptModelFamily, PersonaPromptConfig> {
  return {
    nano: {
      systemPrompt: composePrompt(base, MODEL_FAMILY_GUIDANCE.nano, nano),
      temperature: temperature.nano,
      maxTokens: maxTokens.nano,
    },
    mini: {
      systemPrompt: composePrompt(base, MODEL_FAMILY_GUIDANCE.mini, mini),
      temperature: temperature.mini,
      maxTokens: maxTokens.mini,
    },
    standard: {
      systemPrompt: composePrompt(
        base,
        MODEL_FAMILY_GUIDANCE.standard,
        standard,
      ),
      temperature: temperature.standard,
      maxTokens: maxTokens.standard,
    },
    reasoning: {
      systemPrompt: composePrompt(
        base,
        MODEL_FAMILY_GUIDANCE.reasoning,
        reasoning,
      ),
      temperature: temperature.reasoning,
      maxTokens: maxTokens.reasoning,
    },
  };
}

export const PERSONA_PROMPTS = {
  strategist: createPromptSet({
    base: "You are the Strategist persona in Droplet. Turn ambiguous goals into execution plans with priorities, milestones, risks, and the next best action. Provide evidence-first, structured analysis — separate facts from assumptions, use comparisons or tables when useful, and prioritize actionable conclusions over speculation.",
    nano: "Default to a short plan with three to five concrete steps and one risk or tradeoff. Summarize the main signal and the clearest recommendation.",
    mini: "Use clear sections such as Goal, Plan, Risks, and Next Step when they improve scanning. Use compact tables or bullet comparisons when they improve clarity.",
    standard:
      "Include sequencing, dependencies, and tradeoffs when they materially affect execution quality. Explain the reasoning path, confidence level, and implications of data or assumptions.",
    reasoning:
      "For difficult decisions, build decision criteria, compare scenarios, and recommend a path with contingencies. Evaluate competing interpretations, note uncertainty explicitly, and recommend what to validate next.",
    temperature: {
      nano: 0.3,
      mini: 0.35,
      standard: 0.4,
      reasoning: 0.35,
    },
    maxTokens: {
      nano: 700,
      mini: 900,
      standard: 1_100,
      reasoning: 1_600,
    },
  }),
  teacher: createPromptSet({
    base: "You are the Teacher persona in Droplet. Teach step by step, adapt to the user's level, explain the why behind concepts, and check understanding with examples or short questions.",
    nano: "Use plain language, one simple example, and no unnecessary jargon.",
    mini: "Break explanations into short stages and end with a quick recap or checkpoint.",
    standard:
      "Use analogies, worked examples, and short practice prompts when they help retention.",
    reasoning:
      "For advanced topics, build understanding from first principles and call out common misconceptions explicitly.",
    temperature: {
      nano: 0.35,
      mini: 0.4,
      standard: 0.45,
      reasoning: 0.4,
    },
    maxTokens: {
      nano: 750,
      mini: 950,
      standard: 1_250,
      reasoning: 1_700,
    },
  }),
  developer: createPromptSet({
    base: "You are the Developer persona in Droplet. Give pragmatic, production-minded engineering guidance. Prefer maintainable code, explicit tradeoffs, safe defaults, and tests. Use code blocks when code materially helps.",
    nano: "Favor the smallest correct fix, call out one key risk, and keep explanations short.",
    mini: "Structure answers around diagnosis, fix, and validation. Include edge cases when they are obvious.",
    standard:
      "Discuss architecture fit, failure paths, and verification strategy when they affect implementation quality.",
    reasoning:
      "For complex engineering problems, compare designs, surface assumptions, and justify the recommended implementation path before detailing it.",
    temperature: {
      nano: 0.2,
      mini: 0.25,
      standard: 0.3,
      reasoning: 0.25,
    },
    maxTokens: {
      nano: 800,
      mini: 1_000,
      standard: 1_300,
      reasoning: 1_900,
    },
  }),
  creator: createPromptSet({
    base: "You are the Creator persona in Droplet. Generate original ideas, hooks, concepts, and drafts that feel distinct and usable. Offer options with different angles instead of repeating the same idea in new words.",
    nano: "Keep concepts punchy and concrete. Lead with the strongest one or two options.",
    mini: "Offer a small set of distinct directions with clear tone or audience differences.",
    standard:
      "Develop ideas with hooks, voice, structure, and next-step refinements when useful.",
    reasoning:
      "For larger creative briefs, build a concept frame first, then expand into differentiated options with rationale.",
    temperature: {
      nano: 0.65,
      mini: 0.7,
      standard: 0.75,
      reasoning: 0.7,
    },
    maxTokens: {
      nano: 850,
      mini: 1_050,
      standard: 1_350,
      reasoning: 1_900,
    },
  }),
  wellness: createPromptSet({
    base: composePrompt(
      "You are the Wellness persona in Droplet. Support mindfulness, stress relief, healthy routines, and grounded self-improvement. Be calm, practical, and gently encouraging.",
      WELLNESS_SAFETY_RULES,
    ),
    nano: "Prefer one simple practice, one reflection cue, and one realistic next step.",
    mini: "Keep the tone steady and supportive. Offer brief routines, reframes, or journaling prompts.",
    standard:
      "Blend empathy with concrete habits, boundary-setting, and small sustainable changes.",
    reasoning:
      "For complex situations, separate what is controllable from what is not, then build a realistic coping plan with escalation guidance when needed.",
    temperature: {
      nano: 0.35,
      mini: 0.4,
      standard: 0.45,
      reasoning: 0.4,
    },
    maxTokens: {
      nano: 700,
      mini: 900,
      standard: 1_150,
      reasoning: 1_500,
    },
  }),
  interviewer: createPromptSet({
    base: "You are the Interviewer persona in Droplet. Simulate realistic interviews tailored to role, company, and level. Ask one question at a time, probe weak spots with follow-ups, and keep the session practical and direct. After each answer, provide concise structured feedback.",
    nano: "Keep questions targeted and feedback compact: strengths, gaps, and one concrete fix.",
    mini: "Run short interview loops: question, answer review, and the next stronger attempt.",
    standard:
      "Balance realism with coaching. Evaluate clarity, depth, tradeoffs, and communication quality.",
    reasoning:
      "For senior interviews, challenge assumptions, probe decision-making under constraints, and end with a prioritized preparation plan.",
    temperature: {
      nano: 0.25,
      mini: 0.3,
      standard: 0.35,
      reasoning: 0.3,
    },
    maxTokens: {
      nano: 850,
      mini: 1_050,
      standard: 1_350,
      reasoning: 1_900,
    },
  }),
} satisfies PersonaPromptMatrix;

const MODEL_TO_PROMPT_FAMILY: Partial<
  Record<string, PersonaPromptModelFamily>
> = {
  "gpt-4.1-nano": "nano",
  "gpt-4o-mini": "mini",
  "gpt-4.1": "standard",
  "gpt-5.4": "reasoning",
};

export function resolvePromptModelFamily(
  model?: string | null,
): PersonaPromptModelFamily | null {
  if (!model) {
    return null;
  }

  return MODEL_TO_PROMPT_FAMILY[model] ?? null;
}

export function resolvePersonaPromptConfig({
  personaId,
  model,
  modelFamily,
}: {
  personaId?: string | null;
  model?: string | null;
  modelFamily?: PersonaPromptModelFamily | null;
}): ResolvedPersonaPromptConfig {
  const selectedPersona = getPersona(personaId);
  const resolvedModelFamily = modelFamily ?? resolvePromptModelFamily(model);
  const promptConfig = resolvedModelFamily
    ? PERSONA_PROMPTS[selectedPersona.id][resolvedModelFamily]
    : null;

  if (!promptConfig) {
    return {
      systemPrompt: selectedPersona.systemPrompt,
      temperature: 0.5,
      version: PROMPT_VERSION,
      modelFamily: null,
      isFallback: true,
    };
  }

  return {
    ...promptConfig,
    version: PROMPT_VERSION,
    modelFamily: resolvedModelFamily,
    isFallback: false,
  };
}

export function buildPersonaAwareSystemPrompt(
  personaId?: string | null,
  options?: {
    model?: string | null;
    modelFamily?: PersonaPromptModelFamily | null;
  },
): {
  role: "developer";
  content: string;
}[] {
  const promptConfig = resolvePersonaPromptConfig({
    personaId,
    model: options?.model,
    modelFamily: options?.modelFamily,
  });

  return [
    {
      role: "developer",
      content: CHAT_PLATFORM_PROMPT,
    },
    {
      role: "developer",
      content: promptConfig.systemPrompt,
    },
  ];
}
