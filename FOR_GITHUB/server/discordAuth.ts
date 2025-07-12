import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage, VIP_USER_IDS } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Check if Discord Client Secret is available
  if (!process.env.DISCORD_CLIENT_SECRET) {
    console.log("⚠️  DISCORD_CLIENT_SECRET not found. Discord OAuth disabled.");
    
    // Temporary route to show setup message
    app.get("/api/login", (req, res) => {
      res.status(500).json({ 
        error: "Discord OAuth not configured", 
        message: "Please provide DISCORD_CLIENT_SECRET to enable Discord authentication." 
      });
    });
    
    return;
  }

  const callbackURL = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/callback`;
  console.log("Discord OAuth callback URL:", callbackURL);
  console.log("Discord Client ID:", process.env.DISCORD_CLIENT_ID);

  // Discord OAuth Strategy
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    callbackURL: callbackURL,
    scope: ["identify"]
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      console.log("Discord authentication attempt:", {
        userId: profile.id,
        username: profile.username,
        vipUsers: VIP_USER_IDS,
        isVip: VIP_USER_IDS.includes(profile.id)
      });

      // Check if user is VIP
      if (!VIP_USER_IDS.includes(profile.id)) {
        console.log("Access denied for user:", profile.id, "Expected one of:", VIP_USER_IDS);
        return done(null, false, { message: "Access denied. You are not authorized to access this dashboard." });
      }

      // Create/update user in database
      await storage.upsertUser({
        id: profile.id,
        email: profile.email,
        firstName: profile.global_name || profile.username,
        lastName: null,
        profileImageUrl: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
      });

      console.log("VIP user authenticated successfully:", profile.id);
      return done(null, {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar,
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error("Discord auth error:", error);
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user);
    done(null, user);
  });

  passport.deserializeUser(async (obj: any, done) => {
    try {
      console.log("Deserializing user:", obj);
      if (!obj || !obj.id) {
        return done(null, false);
      }
      
      const user = await storage.getUser(obj.id);
      if (user) {
        const sessionUser = { ...obj, ...user };
        console.log("Deserialized user successfully:", sessionUser.id);
        done(null, sessionUser);
      } else {
        console.log("User not found in database:", obj.id);
        done(null, false);
      }
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error);
    }
  });

  // Auth routes
  app.get("/api/login", (req, res, next) => {
    console.log("Login attempt initiated");
    passport.authenticate("discord")(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("Callback received:", req.query);
    passport.authenticate("discord", { 
      failureRedirect: "/unauthorized",
      successRedirect: "/"
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const isVipUser: RequestHandler = (req, res, next) => {
  const user = req.user as any;
  
  if (!user?.id || !VIP_USER_IDS.includes(user.id)) {
    return res.status(403).json({ message: "Access denied. VIP users only." });
  }
  
  next();
};