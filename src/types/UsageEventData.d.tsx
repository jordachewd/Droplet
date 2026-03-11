import { PersonaId } from "./PersonaData.d";

export type UsageEventRequestType =
  | "chat"
  | "image"
  | "audio"
  | "video"
  | "title";

export interface UsageEventData {
  userId: string;
  taskId: string;
  personaId: PersonaId;
  model: string;
  provider: string;
  requestType: UsageEventRequestType;
  tokensIn?: number;
  tokensOut?: number;
  estimatedCost?: number;
  latencyMs?: number;
  blocked: boolean;
  blockedReason?: string;
  createdAt: Date;
}

export interface CreateUsageEventParams extends Omit<
  UsageEventData,
  "createdAt"
> {
  createdAt?: Date;
}
