import { eq } from "drizzle-orm";
import { type User, type InsertUser, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { getDb } from "./db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is not configured");
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is not configured");
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is not configured");
    const rows = await db.insert(users).values(insertUser).returning();
    return rows[0]!;
  }
}

function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    return new DbStorage();
  }
  return new MemStorage();
}

export const storage = createStorage();
