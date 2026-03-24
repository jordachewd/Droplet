import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.hoisted(() => vi.fn());

vi.mock("mongoose", () => ({
  default: {
    connect: connectMock,
  },
}));

type MockMongooseCache = {
  conn: unknown;
  promise: Promise<unknown> | null;
};

function resetMongooseGlobalCache() {
  const globalWithMongoose = globalThis as typeof globalThis & {
    mongoose?: MockMongooseCache;
  };
  delete globalWithMongoose.mongoose;
}

async function loadMongooseModule() {
  vi.resetModules();
  resetMongooseGlobalCache();
  return import("@/lib/database/mongoose");
}

describe("connectToDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    connectMock.mockReset();
    resetMongooseGlobalCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetMongooseGlobalCache();
  });

  it("throws when MONGODB_URL is missing", async () => {
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const { connectToDatabase } = await loadMongooseModule();

    await expect(connectToDatabase()).rejects.toThrow(
      "MONGODB_URL is not defined",
    );
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("throws when MONGODB_DB_NAME is missing", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb://localhost:27017/droplet");
    const { connectToDatabase } = await loadMongooseModule();

    await expect(connectToDatabase()).rejects.toThrow(
      "MONGODB_DB_NAME is not defined",
    );
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("connects with the primary URL and reuses the cached connection", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb://localhost:27017/droplet");
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const connection = { connection: { readyState: 1 } };
    connectMock.mockResolvedValueOnce(connection as never);

    const { connectToDatabase } = await loadMongooseModule();
    const first = await connectToDatabase();
    const second = await connectToDatabase();

    expect(first).toBe(connection);
    expect(second).toBe(connection);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith(
      "mongodb://localhost:27017/droplet",
      expect.objectContaining({
        dbName: "droplet",
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      }),
    );
  });

  it("falls back to MONGODB_URL_FALLBACK on SRV DNS lookup failures", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb+srv://cluster.example.mongodb.net");
    vi.stubEnv("MONGODB_URL_FALLBACK", "mongodb://localhost:27017/droplet");
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const fallbackConnection = { connection: { readyState: 1 } };

    connectMock
      .mockRejectedValueOnce(new Error("querySrv ECONNREFUSED"))
      .mockResolvedValueOnce(fallbackConnection as never);

    const { connectToDatabase } = await loadMongooseModule();
    const connection = await connectToDatabase();

    expect(connection).toBe(fallbackConnection);
    expect(connectMock).toHaveBeenNthCalledWith(
      1,
      "mongodb+srv://cluster.example.mongodb.net",
      expect.objectContaining({
        dbName: "droplet",
      }),
    );
    expect(connectMock).toHaveBeenNthCalledWith(
      2,
      "mongodb://localhost:27017/droplet",
      expect.objectContaining({
        dbName: "droplet",
      }),
    );
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });

  it("does not fallback when the primary URL is not an SRV connection string", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb://localhost:27017/droplet");
    vi.stubEnv("MONGODB_URL_FALLBACK", "mongodb://localhost:27018/droplet");
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const connectionError = new Error("querySrv ECONNREFUSED");
    connectMock.mockRejectedValueOnce(connectionError);

    const { connectToDatabase } = await loadMongooseModule();

    await expect(connectToDatabase()).rejects.toBe(connectionError);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("does not fallback on non-SRV primary errors", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb+srv://cluster.example.mongodb.net");
    vi.stubEnv("MONGODB_URL_FALLBACK", "mongodb://localhost:27017/droplet");
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const connectionError = new Error("Authentication failed");
    connectMock.mockRejectedValueOnce(connectionError);

    const { connectToDatabase } = await loadMongooseModule();

    await expect(connectToDatabase()).rejects.toBe(connectionError);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("resets the cached promise after failures so a later call can retry", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb://localhost:27017/droplet");
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const retryConnection = { connection: { readyState: 1 } };

    connectMock
      .mockRejectedValueOnce(new Error("temporary network timeout"))
      .mockResolvedValueOnce(retryConnection as never);

    const { connectToDatabase } = await loadMongooseModule();

    await expect(connectToDatabase()).rejects.toThrow(
      "temporary network timeout",
    );
    await expect(connectToDatabase()).resolves.toBe(retryConnection);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it("logs SRV fallback warning only once across repeated fallback attempts", async () => {
    vi.stubEnv("MONGODB_URL", "mongodb+srv://cluster.example.mongodb.net");
    vi.stubEnv("MONGODB_URL_FALLBACK", "mongodb://localhost:27017/droplet");
    vi.stubEnv("MONGODB_DB_NAME", "droplet");
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const fallbackConnection = { connection: { readyState: 1 } };

    connectMock
      .mockRejectedValueOnce(new Error("querySrv ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("fallback host unavailable"))
      .mockRejectedValueOnce(new Error("querySrv ECONNREFUSED"))
      .mockResolvedValueOnce(fallbackConnection as never);

    const { connectToDatabase } = await loadMongooseModule();

    await expect(connectToDatabase()).rejects.toThrow(
      "fallback host unavailable",
    );
    await expect(connectToDatabase()).resolves.toBe(fallbackConnection);

    expect(connectMock).toHaveBeenCalledTimes(4);
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });
});
