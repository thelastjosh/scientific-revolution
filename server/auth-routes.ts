import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "./auth";
import { createUserEdge, listEdgesForUser } from "./graph-service";
import { storage } from "./storage";
import { applyInviteContextToUser } from "./invite-application-service";
import { normalizeInviteToken } from "./onboarding-invite-service";

const nameField = z
  .string()
  .trim()
  .min(1, "Required")
  .max(50, "Too long")
  .refine((s) => !/^\d+$/.test(s), "Invalid name");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: nameField,
  lastName: nameField,
  inviteToken: z.string().max(128).nullable().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  inviteToken: z.string().max(128).nullable().optional(),
});

const edgeSchema = z.object({
  targetUserId: z.string().min(1),
  kind: z.string().max(32).optional().default("peer"),
  label: z.string().max(256).optional().nullable(),
});

function publicUser(u: Awaited<ReturnType<typeof storage.getUser>>) {
  if (!u) return null;
  const { passwordHash: _, ...pub } = u;
  return pub;
}

export function registerAuthRoutes(app: Express): void {
  app.post(
    "/api/auth/register",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.flatten() });
        }
        const { email, password, firstName, lastName } = parsed.data;
        const emailNorm = email.trim().toLowerCase();
        const existingEmail = await storage.getUserByEmail(emailNorm);
        if (existingEmail) {
          return res.status(409).json({
        message:
          "That email is already registered. Sign in instead, or use a different email.",
      });
        }
        const passwordHash = await hashPassword(password);
        const user = await storage.createUser({
          email: emailNorm,
          passwordHash,
          firstName,
          lastName,
        });
        const token = await signSessionToken(user.id);
        setSessionCookie(res, token);
        const inviteToken = normalizeInviteToken(parsed.data.inviteToken ?? null);
        if (inviteToken) {
          await applyInviteContextToUser({
            inviteToken,
            userId: user.id,
            userEmail: user.email,
            onboardingStep: "authenticated_register",
          });
        }
        res.status(201).json({ user: publicUser(user) });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/auth/login",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.flatten() });
        }
        const { email, password } = parsed.data;
        const emailNorm = email.trim().toLowerCase();
        const user = await storage.getUserByEmail(emailNorm);
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = await signSessionToken(user.id);
        setSessionCookie(res, token);
        const inviteToken = normalizeInviteToken(parsed.data.inviteToken ?? null);
        if (inviteToken) {
          await applyInviteContextToUser({
            inviteToken,
            userId: user.id,
            userEmail: user.email,
            onboardingStep: "authenticated_login",
          });
        }
        res.json({ user: publicUser(user) });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not signed in" });
    }
    res.json({ user: req.user });
  });

  app.get("/api/users", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sign in required" });
    }
    try {
      const usersList = await storage.listUsersPublic();
      res.json({ users: usersList });
    } catch (e) {
      console.error("[api/users]", e);
      res.status(500).json({ message: "Failed to list users" });
    }
  });

  app.post("/api/graph/edges", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sign in required" });
    }
    const parsed = edgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const { targetUserId, kind, label } = parsed.data;
    try {
      const target = await storage.getUser(targetUserId);
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }
      const { id } = await createUserEdge(
        req.userId,
        targetUserId,
        kind,
        label ?? null,
      );
      res.status(201).json({ id });
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      const status = err.status ?? 500;
      res
        .status(status)
        .json({ message: err.message ?? "Failed to create edge" });
    }
  });

  app.get("/api/graph/edges", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sign in required" });
    }
    try {
      const edges = await listEdgesForUser(req.userId);
      res.json({ edges });
    } catch (e) {
      console.error("[api/graph/edges]", e);
      res.status(500).json({ message: "Failed to list edges" });
    }
  });
}
