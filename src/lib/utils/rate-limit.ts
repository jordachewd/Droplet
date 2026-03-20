import "server-only";

import { connectToDatabase } from "@/lib/database/mongoose";
import RateLimitEntry from "@/lib/database/models/rate-limit-entry.model";

type SlidingWindowRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type SlidingWindowRateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
};

interface StoredRateLimitRequest {
  requestId?: string | null;
  timestamp?: Date | string | null;
}

interface StoredRateLimitEntry {
  requests?: StoredRateLimitRequest[] | null;
}

function normalizeStoredRequestTimestamps(
  requests?: StoredRateLimitRequest[] | null,
): { requestId: string; timestampMs: number }[] {
  if (!Array.isArray(requests)) {
    return [];
  }

  return requests
    .map((request) => {
      const requestId = request.requestId ?? "";
      const timestamp =
        request.timestamp instanceof Date
          ? request.timestamp.getTime()
          : typeof request.timestamp === "string"
            ? new Date(request.timestamp).getTime()
            : Number.NaN;

      return {
        requestId,
        timestampMs: timestamp,
      };
    })
    .filter(
      (request): request is { requestId: string; timestampMs: number } =>
        request.requestId.length > 0 && Number.isFinite(request.timestampMs),
    )
    .sort((left, right) => left.timestampMs - right.timestampMs);
}

export async function enforceSlidingWindowRateLimit({
  key,
  limit,
  windowMs,
}: SlidingWindowRateLimitOptions): Promise<SlidingWindowRateLimitResult> {
  await connectToDatabase();

  const now = Date.now();
  const nowDate = new Date(now);
  const windowStartDate = new Date(now - windowMs);
  const requestId = crypto.randomUUID();
  const entry = (await RateLimitEntry.collection.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          createdAt: { $ifNull: ["$createdAt", nowDate] },
          updatedAt: nowDate,
          recentRequests: {
            $filter: {
              input: { $ifNull: ["$requests", []] },
              as: "request",
              cond: { $gt: ["$$request.timestamp", windowStartDate] },
            },
          },
        },
      },
      {
        $set: {
          requests: {
            $cond: [
              { $lt: [{ $size: "$recentRequests" }, limit] },
              {
                $concatArrays: [
                  "$recentRequests",
                  [{ requestId, timestamp: nowDate }],
                ],
              },
              "$recentRequests",
            ],
          },
          expireAt: new Date(now + windowMs),
        },
      },
      {
        $unset: "recentRequests",
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
    },
  )) as StoredRateLimitEntry | null;
  const recentRequests = normalizeStoredRequestTimestamps(entry?.requests);
  const oldestRequestTimestamp = recentRequests[0]?.timestampMs ?? now;
  const resetAt = oldestRequestTimestamp + windowMs;
  const wasAccepted = recentRequests.some(
    (request) => request.requestId === requestId,
  );

  return {
    success: wasAccepted,
    limit,
    remaining: wasAccepted ? Math.max(limit - recentRequests.length, 0) : 0,
    resetAt,
    retryAfterMs: wasAccepted ? 0 : Math.max(resetAt - now, 0),
  };
}
