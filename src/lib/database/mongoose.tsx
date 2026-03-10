import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL as string;
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

export const connectToDatabase = async (): Promise<Mongoose> => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URL) throw new Error("MONGODB_URL is not defined");
  if (!MONGODB_DB_NAME) throw new Error("MONGODB_DB_NAME is not defined");

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: MONGODB_DB_NAME,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

  cached.conn = await cached.promise;

  return cached.conn;
};
