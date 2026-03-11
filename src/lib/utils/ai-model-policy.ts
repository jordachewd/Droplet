import { PlanName } from "@/types/PlanData.d";
import { UsageEventRequestType } from "@/types/UsageEventData.d";

export type AIRequestType = UsageEventRequestType;
export type AIModelId = string | null;

type ModelPolicy = Record<PlanName, Record<AIRequestType, AIModelId>>;

interface TokenPricing {
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  flatUsd?: number;
}

const PREMIUM_VIDEO_PLACEHOLDER_MODEL = "premium-video-placeholder";

export const MODEL_POLICY: ModelPolicy = {
  Lite: {
    chat: "gpt-4o-mini",
    title: "gpt-4o-mini",
    image: "dall-e-3",
    audio: "gpt-4o-audio-preview",
    video: null,
  },
  Pro: {
    chat: "gpt-5.2-pro",
    title: "gpt-4o-mini",
    image: "dall-e-3",
    audio: "gpt-4o-audio-preview",
    video: null,
  },
  Premium: {
    chat: "gpt-5.4-pro",
    title: "gpt-4o-mini",
    image: "dall-e-3",
    audio: "gpt-4o-audio-preview",
    video: PREMIUM_VIDEO_PLACEHOLDER_MODEL,
  },
};

const MODEL_PRICING: Record<string, TokenPricing> = {
  "gpt-4o-mini": {
    inputUsdPerMillion: 0.15,
    outputUsdPerMillion: 0.6,
  },
  "gpt-5.2-pro": {
    inputUsdPerMillion: 21,
    outputUsdPerMillion: 168,
  },
  "gpt-5.4-pro": {
    inputUsdPerMillion: 30,
    outputUsdPerMillion: 180,
  },
  "gpt-4o-audio-preview": {
    inputUsdPerMillion: 40,
    outputUsdPerMillion: 80,
  },
  "dall-e-3": {
    flatUsd: 0.04,
  },
  [PREMIUM_VIDEO_PLACEHOLDER_MODEL]: {},
};

function normalizePlanName(planName?: PlanName | null): PlanName {
  return planName ?? "Lite";
}

export function resolveModelForPlan(
  planName: PlanName,
  requestType: AIRequestType,
): AIModelId {
  return MODEL_POLICY[normalizePlanName(planName)][requestType];
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
