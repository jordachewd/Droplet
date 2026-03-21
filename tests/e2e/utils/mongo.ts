import mongoose from "mongoose";
import { getEnvValue } from "./dotenv-local";

const mongoSetupError =
  "Set MONGODB_URL and MONGODB_DB_NAME in .env.local for E2E database setup.";

export async function withMongoConnection<T>(
  run: (connection: mongoose.Connection) => Promise<T>,
): Promise<T> {
  const mongoUrl = process.env.MONGODB_URL ?? getEnvValue("MONGODB_URL");
  const mongoDbName =
    process.env.MONGODB_DB_NAME ?? getEnvValue("MONGODB_DB_NAME");

  if (!mongoUrl || !mongoDbName) {
    throw new Error(mongoSetupError);
  }

  const connection = await mongoose
    .createConnection(mongoUrl, {
      dbName: mongoDbName,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();

  try {
    return await run(connection);
  } finally {
    await connection.close();
  }
}
