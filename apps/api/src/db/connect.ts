import mongoose from "mongoose";
import { logger } from "../config/logger.js";

export async function connectDatabase(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  logger.info("MongoDB connection established");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
