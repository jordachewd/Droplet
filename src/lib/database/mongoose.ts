import "server-only";

import dns from "node:dns";
import mongoose, { Mongoose } from "mongoose";
import { requireEnv } from "@/lib/utils/require-env";

const MONGODB_URL = process.env.MONGODB_URL?.trim();
const MONGODB_URL_FALLBACK = process.env.MONGODB_URL_FALLBACK?.trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim();
const DEFAULT_DNS_FALLBACK_SERVERS = ["1.1.1.1", "8.8.8.8"] as const;

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

let didLogSrvDnsDiagnostic = false;
let didConfigureSrvDnsFallback = false;

function isSrvDnsLookupError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("querysrv") || message.includes("econnrefused");
}

function getDnsFallbackServers(): string[] {
  const configuredServers = process.env.DNS_FALLBACK_SERVERS?.trim();

  if (!configuredServers) {
    return [...DEFAULT_DNS_FALLBACK_SERVERS];
  }

  return configuredServers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
}

function normalizeDnsServer(server: string): string {
  const bracketedIpv6 = server.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6) {
    return bracketedIpv6[1].toLowerCase();
  }

  const ipv4WithOptionalPort = server.match(/^(\d+\.\d+\.\d+\.\d+)(?::\d+)?$/);
  if (ipv4WithOptionalPort) {
    return ipv4WithOptionalPort[1];
  }

  return server.toLowerCase();
}

function isLoopbackDnsServer(server: string): boolean {
  const normalizedServer = normalizeDnsServer(server);
  return (
    normalizedServer === "::1" ||
    normalizedServer === "0:0:0:0:0:0:0:1" ||
    normalizedServer.startsWith("127.")
  );
}

function configureSrvDnsFallbackIfNeeded(primaryMongoUrl: string): void {
  if (
    didConfigureSrvDnsFallback ||
    !primaryMongoUrl.startsWith("mongodb+srv://")
  ) {
    return;
  }

  didConfigureSrvDnsFallback = true;

  const currentServers = dns.getServers();
  if (
    currentServers.length === 0 ||
    !currentServers.every(isLoopbackDnsServer)
  ) {
    return;
  }

  const fallbackServers = getDnsFallbackServers();
  if (fallbackServers.length === 0) {
    return;
  }

  try {
    dns.setServers(fallbackServers);
    process.stderr.write(
      `[mongoose] Node DNS servers are loopback-only; configured DNS fallback for MongoDB SRV lookup: ${fallbackServers.join(",")}.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `[mongoose] DNS fallback configuration failed: ${error instanceof Error ? error.message : "unknown"}\n`,
    );
  }
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

  configureSrvDnsFallbackIfNeeded(primaryMongoUrl);

  try {
    return await connectWithUrl(primaryMongoUrl);
  } catch (primaryError) {
    const isSrvDnsError =
      primaryMongoUrl.startsWith("mongodb+srv://") &&
      isSrvDnsLookupError(primaryError);

    if (!isSrvDnsError) {
      throw primaryError;
    }

    if (!didLogSrvDnsDiagnostic) {
      process.stderr.write(
        `[mongoose] MongoDB SRV DNS lookup failed; MONGODB_URL_FALLBACK configured: ${MONGODB_URL_FALLBACK ? "yes" : "no"}.${MONGODB_URL_FALLBACK ? " Retrying with fallback URI." : ""}\n`,
      );
      didLogSrvDnsDiagnostic = true;
    }

    if (!MONGODB_URL_FALLBACK) {
      throw primaryError;
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
