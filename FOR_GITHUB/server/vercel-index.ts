import express from "express";
import { registerRoutes } from "./routes";

const app = express();

// Register routes without starting the Discord bot
export default async function handler(req: any, res: any) {
  if (!app.locals.initialized) {
    // Initialize app once
    await registerRoutes(app, { skipBot: true });
    app.locals.initialized = true;
  }
  
  return app(req, res);
}