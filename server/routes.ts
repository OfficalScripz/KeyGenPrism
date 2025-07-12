import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { discordBot } from "./discord-bot";
import { setupAuth, isAuthenticated, isVipUser } from "./discordAuth";

export async function registerRoutes(app: Express, options: { skipBot?: boolean } = {}): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Start Discord bot (only if not skipped for Vercel)
  if (!options.skipBot) {
    discordBot.start();
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, isVipUser, async (req: any, res) => {
    try {
      console.log("Fetching user data for:", req.user);
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Protected dashboard endpoints (VIP only)
  app.get("/api/stats", isAuthenticated, isVipUser, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/keys/recent", isAuthenticated, isVipUser, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const keys = await storage.getRecentKeys(limit);
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent keys" });
    }
  });

  app.get("/api/cooldowns", isAuthenticated, isVipUser, async (req, res) => {
    try {
      const cooldowns = await storage.getActiveCooldowns();
      res.json(cooldowns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cooldowns" });
    }
  });

  app.get("/api/logs", isAuthenticated, isVipUser, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Get bot status (public endpoint for health checks)
  app.get("/api/bot/status", (req, res) => {
    try {
      res.json({
        online: discordBot.isOnline(),
        uptime: discordBot.getUptime()
      });
    } catch (error) {
      console.error('Bot status error:', error);
      res.json({
        online: false,
        uptime: "0s"
      });
    }
  });

  // Validate a key with user ownership check (GET method due to Vite proxy issues)
  app.get("/api/keys/validate/:keyCode/:discordUserId", async (req, res) => {
    try {
      const { keyCode, discordUserId } = req.params;
      
      if (!keyCode || !discordUserId) {
        return res.status(400).json({ 
          valid: false, 
          error: "Missing keyCode or discordUserId" 
        });
      }

      const key = await storage.getKey(keyCode);
      
      if (!key) {
        return res.json({ 
          valid: false, 
          error: "Key not found" 
        });
      }

      // Check if key belongs to the requesting user (except for transferable VIP keys)
      const isTransferableKey = key.keyCode.startsWith('PrismVIP') || 
                               key.keyCode.startsWith('PrismYEAR') || 
                               key.keyCode.startsWith('PrismLIFE');
      if (!isTransferableKey && key.discordUserId !== discordUserId) {
        return res.json({ 
          valid: false, 
          error: "Key does not belong to this user" 
        });
      }

      // Check if key is still active and not expired
      const now = new Date();
      if (!key.isActive || key.expiresAt <= now) {
        return res.json({ 
          valid: false, 
          error: "Key has expired or is inactive" 
        });
      }

      // Key is valid for this user
      res.json({ 
        valid: true, 
        expiresAt: key.expiresAt,
        discordUsername: key.discordUsername,
        message: "Key is valid for this user"
      });

    } catch (error) {
      console.error('Key validation error:', error);
      res.status(500).json({ 
        valid: false, 
        error: "Internal server error" 
      });
    }
  });

  // Legacy endpoint - validate key without user check (for backward compatibility)
  app.get("/api/keys/validate/:keyCode", async (req, res) => {
    try {
      const { keyCode } = req.params;
      const key = await storage.getKey(keyCode);
      
      if (!key) {
        return res.status(404).json({ valid: false, message: "Key not found" });
      }

      const now = new Date();
      const isValid = key.isActive && key.expiresAt > now;

      res.json({
        valid: isValid,
        key: isValid ? key : null,
        message: isValid ? "Key is valid" : "Key has expired or is inactive"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate key" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
