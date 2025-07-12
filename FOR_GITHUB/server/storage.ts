import {
  users,
  keys,
  userCooldowns,
  botLogs,
  type User,
  type UpsertUser,
  type Key,
  type InsertKey,
  type UserCooldown,
  type InsertCooldown,
  type BotLog,
  type InsertLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations for Discord auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Key management
  createKey(key: InsertKey): Promise<Key>;
  getKey(keyCode: string): Promise<Key | undefined>;
  getActiveKeys(): Promise<Key[]>;
  getRecentKeys(limit?: number): Promise<Key[]>;
  expireKey(keyCode: string): Promise<void>;
  getAllKeys(): Promise<Key[]>;
  
  // User cooldown management
  getUserCooldown(discordUserId: string): Promise<UserCooldown | undefined>;
  createOrUpdateCooldown(cooldown: InsertCooldown): Promise<UserCooldown>;
  getActiveCooldowns(): Promise<UserCooldown[]>;
  removeCooldown(discordUserId: string): Promise<void>;
  
  // Bot logs
  addLog(log: InsertLog): Promise<BotLog>;
  getRecentLogs(limit?: number): Promise<BotLog[]>;
  
  // Statistics
  getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    usersToday: number;
    successRate: number;
  }>;
}

// VIP user IDs who can access the dashboard
export const VIP_USER_IDS = [
  '1314723072695341059', // Your actual Discord user ID
  '757055297683456090',   // Friend 1 (corrected)
  '1375689730812809299',  // Friend 2 (corrected)
  '780128426706862110'    // Friend 3 (corrected)
];

export class DatabaseStorage implements IStorage {
  // User operations for Discord auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Key management using database
  async createKey(insertKey: InsertKey): Promise<Key> {
    const [key] = await db.insert(keys).values(insertKey).returning();
    return key;
  }

  async getKey(keyCode: string): Promise<Key | undefined> {
    const [key] = await db.select().from(keys).where(eq(keys.keyCode, keyCode));
    return key || undefined;
  }

  async getActiveKeys(): Promise<Key[]> {
    const now = new Date();
    return await db.select().from(keys).where(eq(keys.isActive, true));
  }

  async getRecentKeys(limit: number = 10): Promise<Key[]> {
    return await db.select().from(keys).orderBy(desc(keys.createdAt)).limit(limit);
  }

  async expireKey(keyCode: string): Promise<void> {
    await db.update(keys).set({ isActive: false }).where(eq(keys.keyCode, keyCode));
  }

  async getAllKeys(): Promise<Key[]> {
    return await db.select().from(keys);
  }

  // User cooldown management
  async getUserCooldown(discordUserId: string): Promise<UserCooldown | undefined> {
    const [cooldown] = await db.select().from(userCooldowns).where(eq(userCooldowns.discordUserId, discordUserId));
    return cooldown || undefined;
  }

  async createOrUpdateCooldown(insertCooldown: InsertCooldown): Promise<UserCooldown> {
    const [cooldown] = await db
      .insert(userCooldowns)
      .values(insertCooldown)
      .onConflictDoUpdate({
        target: userCooldowns.discordUserId,
        set: insertCooldown,
      })
      .returning();
    return cooldown;
  }

  async getActiveCooldowns(): Promise<UserCooldown[]> {
    return await db.select().from(userCooldowns);
  }

  async removeCooldown(discordUserId: string): Promise<void> {
    await db.delete(userCooldowns).where(eq(userCooldowns.discordUserId, discordUserId));
  }

  // Bot logs
  async addLog(insertLog: InsertLog): Promise<BotLog> {
    const [log] = await db.insert(botLogs).values(insertLog).returning();
    return log;
  }

  async getRecentLogs(limit: number = 50): Promise<BotLog[]> {
    return await db.select().from(botLogs).orderBy(desc(botLogs.timestamp)).limit(limit);
  }

  // Statistics
  async getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    usersToday: number;
    successRate: number;
  }> {
    const allKeys = await this.getAllKeys();
    const activeKeys = await this.getActiveKeys();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const keysToday = allKeys.filter(key => key.createdAt >= today);
    const uniqueUsersToday = new Set(keysToday.map(key => key.discordUserId)).size;
    
    return {
      totalKeys: allKeys.length,
      activeKeys: activeKeys.length,
      usersToday: uniqueUsersToday,
      successRate: allKeys.length > 0 ? (activeKeys.length / allKeys.length) * 100 : 100,
    };
  }
}

export const storage = new DatabaseStorage();