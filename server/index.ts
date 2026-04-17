import "dotenv/config";
import { createServer } from "http";
import { assertProductionSessionSecret } from "./auth";
import { createApp, log } from "./app";
import { serveStatic } from "./static";

(async () => {
  assertProductionSessionSecret();
  const app = await createApp();
  const httpServer = createServer(app);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
