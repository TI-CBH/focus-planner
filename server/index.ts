import express from "express";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const httpServer = createServer(app);

function log(message: string, source = "dev") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const pbBinary = path.resolve("backend_dev", "pocketbase");
const pbDataDir = path.resolve("backend_dev", "pb_data");
const pbMigrationsDir = path.resolve("backend", "pb_migrations");

log("Starting PocketBase...", "pocketbase");
const pb = spawn(pbBinary, [
  "serve",
  `--http=0.0.0.0:8090`,
  `--dir=${pbDataDir}`,
  `--migrationsDir=${pbMigrationsDir}`,
], { stdio: "pipe" });

pb.stdout.on("data", (data: Buffer) => {
  const msg = data.toString().trim();
  if (msg) log(msg, "pocketbase");
});

pb.stderr.on("data", (data: Buffer) => {
  const msg = data.toString().trim();
  if (msg) log(msg, "pocketbase");
});

pb.on("close", (code: number | null) => {
  log(`PocketBase exited with code ${code}`, "pocketbase");
});

process.on("SIGTERM", () => {
  pb.kill("SIGTERM");
  process.exit(0);
});

(async () => {
  const pbProxy = createProxyMiddleware({
    target: "http://127.0.0.1:8090",
    changeOrigin: true,
    pathFilter: ["/api/**", "/_/**"],
  });
  app.use(pbProxy);

  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      log(`Frontend serving on port ${port}`);
      log(`PocketBase API proxied at /api -> :8090`);
    },
  );
})();
