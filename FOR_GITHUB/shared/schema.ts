import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage for Discord authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Discord user ID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const keys = pgTable("keys", {
  id: serial("id").primaryKey(),
  keyCode: text("key_code").notNull().unique(),
  discordUserId: text("discord_user_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const userCooldowns = pgTable("user_cooldowns", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  lastKeyGenerated: timestamp("last_key_generated").notNull(),
  cooldownEnds: timestamp("cooldown_ends").notNull(),
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  level: text("level").notNull(), // INFO, WARN, ERROR
  message: text("message").notNull(),
  discordUserId: text("discord_user_id"),
});

export const insertKeySchema = createInsertSchema(keys).omit({
  id: true,
});

export const insertCooldownSchema = createInsertSchema(userCooldowns).omit({
  id: true,
});

export const insertLogSchema = createInsertSchema(botLogs).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Key = typeof keys.$inferSelect;
export type InsertKey = z.infer<typeof insertKeySchema>;

export type UserCooldown = typeof userCooldowns.$inferSelect;
export type InsertCooldown = z.infer<typeof insertCooldownSchema>;

export type BotLog = typeof botLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
