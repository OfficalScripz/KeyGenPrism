import express from "express";
import { registerRoutes } from "../server/routes";

const app = express();

let isInitialized = false;

export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    await registerRoutes(app, { skipBot: true });
    isInitialized = true;
  }
  
  return app(req, res);
}