import "server-only";

import mongoose, { Mongoose } from "mongoose";
import { requireEnv } from "@/lib/utils/require-env";

const MONGODB_URL = process.env.MONGODB_URL?.trim();
const MONGODB_URL_FALLBACK = process.env.MONGODB_URL_FALLBACK?.trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim();

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached: MongooseConnection = (
  global as typeof globalThis & { mongoose: MongooseConnection }
).mongoose;

if (!cached) {
  cached = (
    global as typeof globalThis & { mongoose: MongooseConnection }
  ).mongoose = {
    conn: null,
    promise: null,
  };
}

let didLogSrvFallback = false;

function isSrvDnsLookupError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("querysrv") || message.includes("econnrefused");
}

async function connectWithUrl(url: string): Promise<Mongoose> {
  return mongoose.connect(url, {
    dbName: MONGODB_DB_NAME,
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
}

async function connectWithFallbackIfNeeded(): Promise<Mongoose> {
  const primaryMongoUrl = MONGODB_URL ?? requireEnv("MONGODB_URL").trim();

  if (!MONGODB_DB_NAME) {
    throw new Error("MONGODB_DB_NAME is not defined");
  }

  try {
    return await connectWithUrl(primaryMongoUrl);
  } catch (primaryError) {
    const canUseFallback =
      Boolean(MONGODB_URL_FALLBACK) &&
      primaryMongoUrl.startsWith("mongodb+srv://") &&
      isSrvDnsLookupError(primaryError);

    if (!canUseFallback || !MONGODB_URL_FALLBACK) {
      throw primaryError;
    }

    if (!didLogSrvFallback) {
      process.stderr.write(
        "[mongoose] MongoDB SRV DNS lookup failed; retrying with MONGODB_URL_FALLBACK.\n",
      );
      didLogSrvFallback = true;
    }

    return connectWithUrl(MONGODB_URL_FALLBACK);
  }
}

export const connectToDatabase = async (): Promise<Mongoose> => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = connectWithFallbackIfNeeded();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // Allow future calls to retry after transient DNS/network failures.
    cached.promise = null;
    throw error;
  }
};
