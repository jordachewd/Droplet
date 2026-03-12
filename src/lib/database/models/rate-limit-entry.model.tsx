import { Document, Schema, model, models } from "mongoose";

interface RateLimitRequestEntry {
  requestId: string;
  timestamp: Date;
}

interface IRateLimitEntry extends Document {
  key: string;
  requests: RateLimitRequestEntry[];
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitRequestEntrySchema = new Schema<RateLimitRequestEntry>(
  {
    requestId: { type: String, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false },
);

const RateLimitEntrySchema = new Schema<IRateLimitEntry>(
  {
    key: { type: String, required: true, index: true, unique: true },
    requests: {
      type: [RateLimitRequestEntrySchema],
      required: true,
      default: [],
    },
    expireAt: { type: Date, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { strict: true },
);

RateLimitEntrySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitEntry =
  models.RateLimitEntry ||
  model<IRateLimitEntry>("RateLimitEntry", RateLimitEntrySchema);

export default RateLimitEntry;
