import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.hoisted(() => vi.fn());

vi.mock("mongoose", () => ({
  default: { connect: connectMock },
  connect: connectMock,
}));

const ORIGINAL_ENV = { ...process.env };

function clearMongooseCache() {
  delete (globalThis as typeof globalThis & { mongoose?: unknown }).mongoose;
}

function setDatabaseEnv(overrides?: {
  mongodbUrl?: string;
  mongodbUrlFallback?: string;
  mongodbDbName?: string;
}) {
  process.env.MONGODB_URL = overrides?.mongodbUrl ?? "mongodb://primary";
  process.env.MONGODB_URL_FALLBACK = overrides?.mongodbUrlFallback;
  process.env.MONGODB_DB_NAME = overrides?.mongodbDbName ?? "droplet_test";
}

async function loadConnectToDatabase() {
  const mongooseModule = await import("@/lib/database/mongoose");
  return mongooseModule.connectToDatabase;
}

describe("mongoose connection utility", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    clearMongooseCache();
    connectMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    clearMongooseCache();
  });

  it("throws when MONGODB_URL is missing", async () => {
    setDatabaseEnv({ mongodbUrl: undefined });
    delete process.env.MONGODB_URL;

    const connectToDatabase = await loadConnectToDatabase();
    await expect(connectToDatabase()).rejects.toThrow(
      "Missing required environment variable: MONGODB_URL",
    );
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("throws when MONGODB_DB_NAME is missing", async () => {
    setDatabaseEnv({ mongodbDbName: undefined });
    delete process.env.MONGODB_DB_NAME;

    const connectToDatabase = await loadConnectToDatabase();
    await expect(connectToDatabase()).rejects.toThrow(
      "MONGODB_DB_NAME is not defined",
    );
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("connects with primary URL and caches the open connection", async () => {
    const connection = { name: "primary_connection" };
    setDatabaseEnv();
    connectMock.mockResolvedValue(connection);

    const connectToDatabase = await loadConnectToDatabase();

    await expect(connectToDatabase()).resolves.toBe(connection);
    await expect(connectToDatabase()).resolves.toBe(connection);

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith(
      "mongodb://primary",
      expect.objectContaining({
        dbName: "droplet_test",
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      }),
    );
  });

  it("falls back to MONGODB_URL_FALLBACK for SRV DNS failures", async () => {
    const fallbackConnection = { name: "fallback_connection" };
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    setDatabaseEnv({
      mongodbUrl: "mongodb+srv://primary-cluster",
      mongodbUrlFallback: "mongodb://fallback-cluster",
    });
    connectMock
      .mockRejectedValueOnce(new Error("querySrv ECONNREFUSED"))
      .mockResolvedValueOnce(fallbackConnection);

    const connectToDatabase = await loadConnectToDatabase();

    await expect(connectToDatabase()).resolves.toBe(fallbackConnection);
    await expect(connectToDatabase()).resolves.toBe(fallbackConnection);

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(connectMock.mock.calls[0]?.[0]).toBe(
      "mongodb+srv://primary-cluster",
    );
    expect(connectMock.mock.calls[1]?.[0]).toBe("mongodb://fallback-cluster");
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain(
      "MONGODB_URL_FALLBACK configured: yes",
    );
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain(
      "Retrying with fallback URI",
    );
  });

  it("logs missing fallback configuration for SRV DNS failures before rethrowing", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    setDatabaseEnv({
      mongodbUrl: "mongodb+srv://primary-cluster",
      mongodbUrlFallback: undefined,
    });
    connectMock.mockRejectedValueOnce(new Error("querySrv ECONNREFUSED"));

    const connectToDatabase = await loadConnectToDatabase();

    await expect(connectToDatabase()).rejects.toThrow("querySrv ECONNREFUSED");
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain(
      "MONGODB_URL_FALLBACK configured: no",
    );
  });

  it("does not use fallback for non-SRV primary failures", async () => {
    setDatabaseEnv({
      mongodbUrl: "mongodb+srv://primary-cluster",
      mongodbUrlFallback: "mongodb://fallback-cluster",
    });
    connectMock.mockRejectedValueOnce(new Error("authentication failed"));

    const connectToDatabase = await loadConnectToDatabase();

    await expect(connectToDatabase()).rejects.toThrow("authentication failed");
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("resets cached promise after failure so a later call can retry", async () => {
    const recoveredConnection = { name: "recovered" };
    setDatabaseEnv({
      mongodbUrl: "mongodb://primary",
      mongodbUrlFallback: undefined,
    });
    connectMock
      .mockRejectedValueOnce(new Error("temporary network issue"))
      .mockResolvedValueOnce(recoveredConnection);

    const connectToDatabase = await loadConnectToDatabase();

    await expect(connectToDatabase()).rejects.toThrow(
      "temporary network issue",
    );
    await expect(connectToDatabase()).resolves.toBe(recoveredConnection);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });
});
