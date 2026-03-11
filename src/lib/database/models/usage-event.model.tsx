import type { UsageEventData } from "@/types/UsageEventData.d";
import { Schema, model, models } from "mongoose";

const UsageEventSchema = new Schema<UsageEventData>(
  {
    userId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, index: true },
    personaId: { type: String, required: true, index: true },
    model: { type: String, required: true, index: true },
    provider: { type: String, required: true },
    requestType: {
      type: String,
      required: true,
      enum: ["chat", "image", "audio", "video", "title"],
      index: true,
    },
    tokensIn: { type: Number },
    tokensOut: { type: Number },
    estimatedCost: { type: Number },
    latencyMs: { type: Number },
    blocked: { type: Boolean, required: true, default: false },
    blockedReason: { type: String },
    createdAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { strict: true },
);

const UsageEvent =
  models.UsageEvent || model<UsageEventData>("UsageEvent", UsageEventSchema);

export default UsageEvent;
