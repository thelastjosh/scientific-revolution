import type { NextFunction, Request, Response } from "express";
import { readSessionCookie, verifySessionToken } from "./auth";
import { storage } from "./storage";

export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readSessionCookie(req);
    const userId = await verifySessionToken(token);
    req.userId = userId ?? undefined;
    if (userId) {
      const u = await storage.getUser(userId);
      if (u) {
        const { passwordHash: _, ...pub } = u;
        req.user = pub;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}
