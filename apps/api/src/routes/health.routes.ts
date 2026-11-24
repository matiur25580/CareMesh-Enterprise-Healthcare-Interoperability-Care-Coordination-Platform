import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "caremesh-api",
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/ready", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ready" : "not_ready",
    dependencies: { mongodb: databaseReady ? "connected" : "disconnected" }
  });
});
