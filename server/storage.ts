import { eq } from "drizzle-orm";
import { getDatabaseUrl } from "@shared/database-url";
import { type User, type InsertUser, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { getDb } from "./db";

export type PublicUser = Omit<User, "passwordHash">;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  listUsersPublic(): Promise<PublicUser[]>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const n = email.trim().toLowerCase();
    return Array.from(this.users.values()).find(
      (user) => user.email?.toLowerCase() === n,
    );
  }

  async listUsersPublic(): Promise<PublicUser[]> {
    return Array.from(this.users.values()).map(({ passwordHash: _, ...rest }) => rest);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL or POSTGRES_URL is not configured");
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL or POSTGRES_URL is not configured");
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL or POSTGRES_URL is not configured");
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0];
  }

  async listUsersPublic(): Promise<PublicUser[]> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL or POSTGRES_URL is not configured");
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(users.username);
    return rows;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL or POSTGRES_URL is not configured");
    const rows = await db.insert(users).values(insertUser).returning();
    return rows[0]!;
  }
}

function createStorage(): IStorage {
  if (getDatabaseUrl()) {
    return new DbStorage();
  }
  return new MemStorage();
}

export const storage = createStorage();
