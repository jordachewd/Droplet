import { PlanName } from "@/types/PlanData.d";

interface TokenPricing {
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  flatUsd?: number;
}

interface ModelCapability {
  isTtsOnly?: boolean;
}

export type PlanTier = "lite" | "pro" | "premium";

export type FeatureType =
  | "title_generation"
  | "chat"
  | "image_generation"
  | "audio_generation"
  | "video_generation";

export type TaskClass =
  | "utility"
  | "simple"
  | "standard"
  | "complex"
  | "preview"
  | "final";

export type AudioMode = "tts" | "audio_in_out";
export type BudgetState =
  | "normal"
  | "soft_limit_reached"
  | "hard_limit_reached";

export interface ResolveModelInput {
  plan: PlanTier;
  feature: FeatureType;
  taskClass?: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  audioMode?: AudioMode;
  modelOverrides?: ModelPolicyModelOverrides;
}

export interface ModelPolicyModelOverrides {
  chat?: Partial<Record<PlanTier, string>>;
  imageGenerationModel?: string;
  audioGenerationModel?: string;
  videoGenerationModel?: string;
}

export interface ModelPolicyRule {
  model: string;
  fallbackModel?: string;
  hardBlocked?: boolean;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  notes?: string;
}

export interface FeaturePolicyConfig {
  defaultTaskClass: TaskClass;
  taskClasses: Partial<Record<TaskClass, ModelPolicyRule>>;
}

export type PlanPolicyMatrix = Record<
  PlanTier,
  Record<FeatureType, FeaturePolicyConfig>
>;

export interface ResolvedModelPolicy {
  model: string;
  fallbackModel?: string;
  isTtsOnly: boolean;
  feature: FeatureType;
  plan: PlanTier;
  taskClass: TaskClass;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  wasDowngraded: boolean;
  downgradeReasons: string[];
  hardBlocked: boolean;
  notes?: string;
}

const PLAN_NAME_TO_TIER: Record<PlanName, PlanTier> = {
  Lite: "lite",
  Pro: "pro",
  Premium: "premium",
};

function createChatRule({
  model,
  fallbackModel,
  maxInputTokens,
  maxOutputTokens,
  notes,
}: {
  model: string;
  fallbackModel: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  notes?: string;
}): ModelPolicyRule {
  return {
    model,
    fallbackModel,
    maxInputTokens,
    maxOutputTokens,
    notes,
  };
}

const TITLE_POLICY_RULE: ModelPolicyRule = {
  model: "gpt-4.1-nano",
  fallbackModel: "gpt-4o-mini",
  maxInputTokens: 1_200,
  maxOutputTokens: 20,
  notes: "Always use the cheapest model for title generation.",
};
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const LITE_IMAGE_MODEL = "gpt-image-1-mini";
const PRO_PREMIUM_IMAGE_MODEL = "gpt-image-1.5";

export const MODEL_POLICY_MATRIX = {
  lite: {
    title_generation: {
      defaultTaskClass: "utility",
      taskClasses: {
        utility: TITLE_POLICY_RULE,
      },
    },
    chat: {
      defaultTaskClass: "standard",
      taskClasses: {
        simple: createChatRule({
          model: "gpt-4o-mini",
          fallbackModel: "gpt-4.1-nano",
          maxInputTokens: 8_000,
          maxOutputTokens: 600,
          notes:
            "Strict context compaction; downgrade only when a cheaper fallback is available.",
        }),
        standard: createChatRule({
          model: "gpt-4o-mini",
          fallbackModel: "gpt-4.1-nano",
          maxInputTokens: 12_000,
          maxOutputTokens: 900,
          notes:
            "Strict context compaction; downgrade only when a cheaper fallback is available.",
        }),
        complex: createChatRule({
          model: "gpt-4o-mini",
          fallbackModel: "gpt-4.1-nano",
          maxInputTokens: 14_000,
          maxOutputTokens: 1_200,
          notes:
            "Strict context compaction; downgrade only when a cheaper fallback is available.",
        }),
      },
    },
    image_generation: {
      defaultTaskClass: "final",
      taskClasses: {
        final: {
          model: LITE_IMAGE_MODEL,
          notes:
            "Lite image generation uses the cost-optimized GPT Image tier.",
        },
      },
    },
    audio_generation: {
      defaultTaskClass: "final",
      taskClasses: {
        final: {
          model: DEFAULT_TTS_MODEL,
          fallbackModel: DEFAULT_TTS_MODEL,
          notes:
            "Lite audio generation is TTS-only; audio_in_out requests are blocked.",
        },
      },
    },
    video_generation: {
      defaultTaskClass: "preview",
      taskClasses: {
        preview: {
          model: "sora-2",
          fallbackModel: "sora-2",
          notes: "Lite video previews use sora-2.",
        },
        final: {
          model: "sora-2",
          fallbackModel: "sora-2",
          notes: "Lite final video renders use sora-2.",
        },
      },
    },
  },
  pro: {
    title_generation: {
      defaultTaskClass: "utility",
      taskClasses: {
        utility: TITLE_POLICY_RULE,
      },
    },
    chat: {
      defaultTaskClass: "standard",
      taskClasses: {
        simple: createChatRule({
          model: "gpt-4.1",
          fallbackModel: "gpt-4o-mini",
          maxInputTokens: 12_000,
          maxOutputTokens: 700,
          notes: "Simple Pro chat should favor the cheaper fallback tier.",
        }),
        standard: createChatRule({
          model: "gpt-4.1",
          fallbackModel: "gpt-4o-mini",
          maxInputTokens: 24_000,
          maxOutputTokens: 1_400,
          notes: "Downgrade on soft budget pressure, retries, or high latency.",
        }),
        complex: createChatRule({
          model: "gpt-4.1",
          fallbackModel: "gpt-4o-mini",
          maxInputTokens: 32_000,
          maxOutputTokens: 2_000,
          notes: "Downgrade on soft budget pressure, retries, or high latency.",
        }),
      },
    },
    image_generation: {
      defaultTaskClass: "final",
      taskClasses: {
        final: {
          model: PRO_PREMIUM_IMAGE_MODEL,
          fallbackModel: LITE_IMAGE_MODEL,
          notes:
            "Downgrade for retries or budget pressure to the cheaper GPT Image tier.",
        },
      },
    },
    audio_generation: {
      defaultTaskClass: "final",
      taskClasses: {
        final: {
          model: "gpt-audio-mini",
          fallbackModel: DEFAULT_TTS_MODEL,
          notes:
            "TTS-only fallback is allowed only for plain text-to-speech requests.",
        },
      },
    },
    video_generation: {
      defaultTaskClass: "preview",
      taskClasses: {
        preview: {
          model: "sora-2",
          fallbackModel: "sora-2",
          notes: "Pro video previews use sora-2.",
        },
        final: {
          model: "sora-2",
          fallbackModel: "sora-2",
          notes: "Pro final video renders use sora-2.",
        },
      },
    },
  },
  premium: {
    title_generation: {
      defaultTaskClass: "utility",
      taskClasses: {
        utility: TITLE_POLICY_RULE,
      },
    },
    chat: {
      defaultTaskClass: "standard",
      taskClasses: {
        simple: createChatRule({
          model: "gpt-4.1",
          fallbackModel: "gpt-4o-mini",
          maxInputTokens: 16_000,
          maxOutputTokens: 900,
          notes:
            "Premium simple chat defaults to gpt-4.1 and downgrades to gpt-4o-mini on retry/latency/budget pressure.",
        }),
        standard: createChatRule({
          model: "gpt-4.1",
          fallbackModel: "gpt-4o-mini",
          maxInputTokens: 32_000,
          maxOutputTokens: 1_800,
          notes:
            "Premium standard chat defaults to gpt-4.1 and downgrades to gpt-4o-mini on retry/latency/budget pressure.",
        }),
        complex: createChatRule({
          model: "gpt-4.1",
          fallbackModel: "gpt-4.1-mini",
          maxInputTokens: 48_000,
          maxOutputTokens: 2_800,
          notes:
            "Premium complex chat defaults to gpt-4.1, downgrades to gpt-4.1-mini, and only upgrades to gpt-5.4 when explicitly requested.",
        }),
      },
    },
    image_generation: {
      defaultTaskClass: "final",
      taskClasses: {
        final: {
          model: PRO_PREMIUM_IMAGE_MODEL,
          fallbackModel: LITE_IMAGE_MODEL,
          notes:
            "Premium keeps the same GPT Image ladder as Pro with quota-free access.",
        },
      },
    },
    audio_generation: {
      defaultTaskClass: "final",
      taskClasses: {
        final: {
          model: "gpt-audio-mini",
          fallbackModel: "gpt-audio-mini",
          notes:
            "Premium uses the same verified full-audio model tier while keeping audio_in_out support.",
        },
      },
    },
    video_generation: {
      defaultTaskClass: "preview",
      taskClasses: {
        preview: {
          model: "sora-2",
          fallbackModel: "sora-2",
          notes: "Preview and draft video renders use sora-2.",
        },
        final: {
          model: "sora-2",
          fallbackModel: "sora-2",
          notes: "sora-2-pro requires explicitPremium — see resolver override.",
        },
      },
    },
  },
} as const satisfies PlanPolicyMatrix;

const MODEL_PRICING: Record<string, TokenPricing> = {
  "gpt-4o-mini": {
    inputUsdPerMillion: 0.15,
    outputUsdPerMillion: 0.6,
  },
  "gpt-4.1-nano": {
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.4,
  },
  "gpt-4.1": {
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 8,
  },
  "gpt-5.4": {
    inputUsdPerMillion: 2.5,
    outputUsdPerMillion: 15,
  },
  [LITE_IMAGE_MODEL]: {
    flatUsd: 0.011,
  },
  [PRO_PREMIUM_IMAGE_MODEL]: {
    flatUsd: 0.034,
  },
  "gpt-audio-mini": {
    inputUsdPerMillion: 10,
    outputUsdPerMillion: 20,
    // TODO: verify the exact token accounting for the current audio model tier.
  },
  [DEFAULT_TTS_MODEL]: {
    inputUsdPerMillion: 0.6,
    outputUsdPerMillion: 12,
    // TODO: verify text-vs-audio output accounting for the speech API path.
  },
  "sora-2": {
    flatUsd: 0.1,
    // TODO: replace with duration-aware pricing when video generation is implemented.
  },
  "sora-2-pro": {
    flatUsd: 0.3,
    // TODO: replace with duration-aware pricing when video generation is implemented.
  },
};

const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  [LITE_IMAGE_MODEL]: {},
  [PRO_PREMIUM_IMAGE_MODEL]: {},
  [DEFAULT_TTS_MODEL]: {
    isTtsOnly: true,
  },
};

function joinNotes(...notes: Array<string | undefined>): string | undefined {
  const filteredNotes = notes.filter(
    (note): note is string => typeof note === "string" && note.length > 0,
  );

  return filteredNotes.length > 0 ? filteredNotes.join(" ") : undefined;
}

function isTtsOnlyModel(model?: string): boolean {
  if (!model) {
    return false;
  }

  return MODEL_CAPABILITIES[model]?.isTtsOnly === true;
}

function getFeaturePolicyConfig(
  plan: PlanTier,
  feature: FeatureType,
): FeaturePolicyConfig {
  return MODEL_POLICY_MATRIX[plan][feature];
}

function getDefaultTaskClass(feature: FeatureType): TaskClass {
  if (feature === "title_generation") {
    return "utility";
  }

  if (feature === "video_generation") {
    return "preview";
  }

  return feature === "chat" ? "standard" : "final";
}

function getApplicableTaskClass({
  feature,
  requestedTaskClass,
  config,
}: {
  feature: FeatureType;
  requestedTaskClass?: TaskClass;
  config: FeaturePolicyConfig;
}): TaskClass {
  if (feature === "title_generation") {
    return "utility";
  }

  if (requestedTaskClass && config.taskClasses[requestedTaskClass]) {
    return requestedTaskClass;
  }

  if (config.taskClasses[config.defaultTaskClass]) {
    return config.defaultTaskClass;
  }

  return getDefaultTaskClass(feature);
}

function createResolvedPolicy({
  plan,
  feature,
  taskClass,
  rule,
  hardBlocked,
  model,
  fallbackModel,
  wasDowngraded,
  downgradeReasons,
  notes,
}: {
  plan: PlanTier;
  feature: FeatureType;
  taskClass: TaskClass;
  rule: ModelPolicyRule;
  hardBlocked: boolean;
  model: string;
  fallbackModel?: string;
  wasDowngraded: boolean;
  downgradeReasons: string[];
  notes?: string;
}): ResolvedModelPolicy {
  return {
    model,
    fallbackModel,
    isTtsOnly: isTtsOnlyModel(model),
    feature,
    plan,
    taskClass,
    maxInputTokens: rule.maxInputTokens,
    maxOutputTokens: rule.maxOutputTokens,
    wasDowngraded,
    downgradeReasons,
    hardBlocked,
    notes,
  };
}

export function normalizePlanTier(plan?: PlanTier | PlanName | null): PlanTier {
  if (!plan) {
    return "lite";
  }

  if (plan === "lite" || plan === "pro" || plan === "premium") {
    return plan;
  }

  return PLAN_NAME_TO_TIER[plan];
}

export function resolveModelPolicy(
  input: ResolveModelInput,
): ResolvedModelPolicy {
  const plan = normalizePlanTier(input.plan);
  const config = getFeaturePolicyConfig(plan, input.feature);
  const taskClass = getApplicableTaskClass({
    feature: input.feature,
    requestedTaskClass: input.taskClass,
    config,
  });
  const rule = config.taskClasses[taskClass];

  if (!rule) {
    throw new Error(
      `No model policy rule configured for ${plan}/${input.feature}/${taskClass}.`,
    );
  }

  const normalizedBudgetState = input.budgetState ?? "normal";
  const downgradeReasons: string[] = [];
  let model = rule.model;
  let fallbackModel = rule.fallbackModel;
  let notes = rule.notes;

  const chatOverride = input.modelOverrides?.chat?.[plan];
  if (
    input.feature === "chat" &&
    typeof chatOverride === "string" &&
    chatOverride.length > 0
  ) {
    model = chatOverride;
    notes = joinNotes(notes, "Admin override applied for chat model.");
  }

  if (
    input.feature === "image_generation" &&
    typeof input.modelOverrides?.imageGenerationModel === "string" &&
    input.modelOverrides.imageGenerationModel.length > 0
  ) {
    model = input.modelOverrides.imageGenerationModel;
    notes = joinNotes(
      notes,
      "Admin override applied for image generation model.",
    );
  }

  if (
    input.feature === "audio_generation" &&
    typeof input.modelOverrides?.audioGenerationModel === "string" &&
    input.modelOverrides.audioGenerationModel.length > 0
  ) {
    model = input.modelOverrides.audioGenerationModel;
    notes = joinNotes(
      notes,
      "Admin override applied for audio generation model.",
    );
  }

  if (normalizedBudgetState === "hard_limit_reached") {
    return createResolvedPolicy({
      plan,
      feature: input.feature,
      taskClass,
      rule,
      hardBlocked: true,
      model,
      fallbackModel,
      wasDowngraded: false,
      downgradeReasons: ["hard_limit_reached"],
      notes: joinNotes(
        notes,
        "Request blocked because the hard budget limit was reached.",
      ),
    });
  }

  if (rule.hardBlocked) {
    return createResolvedPolicy({
      plan,
      feature: input.feature,
      taskClass,
      rule,
      hardBlocked: true,
      model,
      fallbackModel,
      wasDowngraded: false,
      downgradeReasons,
      notes,
    });
  }

  if (
    input.feature === "audio_generation" &&
    plan === "lite" &&
    input.audioMode === "audio_in_out"
  ) {
    return createResolvedPolicy({
      plan,
      feature: input.feature,
      taskClass,
      rule,
      hardBlocked: true,
      model,
      fallbackModel,
      wasDowngraded: false,
      downgradeReasons: [],
      notes: joinNotes(
        notes,
        "Lite audio_in_out requests are blocked; Lite supports TTS only.",
      ),
    });
  }

  if (input.feature === "audio_generation" && input.audioMode === "tts") {
    model = DEFAULT_TTS_MODEL;
    fallbackModel = DEFAULT_TTS_MODEL;
    notes = joinNotes(
      notes,
      "TTS requests always use the speech synthesis model path.",
    );
  }

  if (
    input.feature === "chat" &&
    plan === "premium" &&
    taskClass === "complex" &&
    input.explicitPremium
  ) {
    model = "gpt-5.4";
    fallbackModel = "gpt-4.1";
    notes = joinNotes(
      notes,
      "Explicit premium complex chat request upgraded to gpt-5.4.",
    );
  }

  if (input.feature === "video_generation" && plan === "premium") {
    if (taskClass === "final" && input.explicitPremium) {
      model = "sora-2-pro";
      fallbackModel = "sora-2";
      notes = joinNotes(
        notes,
        "Explicit premium final video render enabled sora-2-pro.",
      );
    } else {
      model = "sora-2";
      fallbackModel = "sora-2";
    }
  }

  if (
    input.feature === "video_generation" &&
    typeof input.modelOverrides?.videoGenerationModel === "string" &&
    input.modelOverrides.videoGenerationModel.length > 0
  ) {
    model = input.modelOverrides.videoGenerationModel;
    notes = joinNotes(
      notes,
      "Admin override applied for video generation model.",
    );
  }

  const shouldDowngradeForSimpleTask =
    input.feature === "chat" && plan === "pro" && taskClass === "simple";
  const shouldDowngradeForSoftLimit =
    normalizedBudgetState === "soft_limit_reached";
  const shouldDowngradeForHighLatency = input.highLatency === true;
  const shouldDowngradeForRetry = (input.retryAttempt ?? 0) > 0;

  if (shouldDowngradeForSimpleTask) {
    downgradeReasons.push("simple_task");
  }

  if (shouldDowngradeForSoftLimit) {
    downgradeReasons.push("soft_limit_reached");
  }

  if (shouldDowngradeForHighLatency) {
    downgradeReasons.push("high_latency");
  }

  if (shouldDowngradeForRetry) {
    downgradeReasons.push("retry_attempt");
  }

  const canDowngrade =
    downgradeReasons.length > 0 &&
    typeof fallbackModel === "string" &&
    fallbackModel.length > 0 &&
    fallbackModel !== model;

  if (canDowngrade) {
    const ttsFallbackBlocked =
      input.feature === "audio_generation" &&
      input.audioMode === "audio_in_out" &&
      isTtsOnlyModel(fallbackModel);

    if (ttsFallbackBlocked) {
      notes = joinNotes(
        notes,
        "TTS fallback blocked because audio_in_out requests require a full audio model.",
      );
    } else {
      model = fallbackModel as string;
    }
  }

  return createResolvedPolicy({
    plan,
    feature: input.feature,
    taskClass,
    rule,
    hardBlocked: false,
    model,
    fallbackModel,
    wasDowngraded: canDowngrade && model === fallbackModel,
    downgradeReasons:
      canDowngrade && model === fallbackModel ? downgradeReasons : [],
    notes,
  });
}

export function estimateModelCostCents({
  model,
  tokensIn,
  tokensOut,
}: {
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}): number | undefined {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    return undefined;
  }

  if (typeof pricing.flatUsd === "number") {
    return Number((pricing.flatUsd * 100).toFixed(4));
  }

  const inputCostUsd =
    typeof pricing.inputUsdPerMillion === "number" &&
    typeof tokensIn === "number"
      ? (tokensIn / 1_000_000) * pricing.inputUsdPerMillion
      : 0;
  const outputCostUsd =
    typeof pricing.outputUsdPerMillion === "number" &&
    typeof tokensOut === "number"
      ? (tokensOut / 1_000_000) * pricing.outputUsdPerMillion
      : 0;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  if (totalCostUsd === 0) {
    return undefined;
  }

  return Number((totalCostUsd * 100).toFixed(4));
}
