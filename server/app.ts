import cookieParser from "cookie-parser";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { sessionMiddleware } from "./auth-middleware";
import { registerRoutes } from "./routes";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Express app with API routes (and error handler). No static files or Vite —
 * used by the standalone server and by Vercel serverless.
 */
export async function createApp(): Promise<Express> {
  const app = express();

  // Vercel rewrites `/api/*` → `/api/index`; restore the browser URL for Express routing.
  app.use((req, _res, next) => {
    if (process.env.VERCEL !== "1") {
      next();
      return;
    }
    const forwarded = req.headers["x-vercel-forwarded-url"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      try {
        const u = new URL(forwarded);
        req.url = `${u.pathname}${u.search}`;
      } catch {
        /* ignore */
      }
      next();
      return;
    }
    const invokePath = req.headers["x-invoke-path"];
    if (typeof invokePath === "string" && invokePath.startsWith("/api/")) {
      req.url = invokePath + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
    }
    next();
  });

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use(cookieParser());
  app.use(sessionMiddleware);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson as Record<string, unknown>;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : err && typeof err === "object" && "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : 500;
    const message =
      err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : "Internal Server Error";

    console.error("[express]", err);
    res.status(status).json({ message });
  });

  return app;
}
