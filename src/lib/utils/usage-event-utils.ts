import { estimateModelCostCents } from "@/lib/utils/ai-model-policy";
import UsageEvent from "@/lib/database/models/usage-event.model";
import { PersonaId } from "@/types/PersonaData.d";
import { UsageEventRequestType } from "@/types/UsageEventData.d";

export interface AIRequestMetric {
  requestType: UsageEventRequestType;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  blocked?: boolean;
  blockedReason?: string;
}

export function emitUsageEvents({
  userId,
  taskId,
  personaId,
  metrics,
}: {
  userId: string;
  taskId: string;
  personaId: PersonaId;
  metrics: AIRequestMetric[];
}): void {
  if (metrics.length === 0) {
    return;
  }

  const usageDocuments = metrics.map((metric) => ({
    userId,
    taskId,
    personaId,
    model: metric.model,
    provider: "openai",
    requestType: metric.requestType,
    tokensIn: metric.tokensIn,
    tokensOut: metric.tokensOut,
    estimatedCost: estimateModelCostCents({
      model: metric.model,
      tokensIn: metric.tokensIn,
      tokensOut: metric.tokensOut,
    }),
    latencyMs: metric.latencyMs,
    blocked: metric.blocked ?? false,
    blockedReason: metric.blockedReason,
    createdAt: new Date(),
  }));

  void UsageEvent.create(usageDocuments).catch((err) => {
    process.stderr.write(
      `[UsageEvent] Failed to emit usage event: ${err instanceof Error ? err.message : "unknown"}\n`,
    );
  });
}
