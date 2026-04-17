import type { PublicUser } from "./storage";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: PublicUser;
    }
  }
}

export {};
