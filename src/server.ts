// src/server.ts — Bun HTTP Server 入口

// Worker mode: spawned by compiled exe for parallel search
if (process.argv.includes("--search-worker")) {
  await import("./api/search-worker");
  // search-worker.ts handles everything and exits when done
  // Keep process alive until worker completes
  await new Promise(() => {});
}

import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { handleDetect } from "./api/detect";
import { handleCurrent } from "./api/current";
import { handlePreview } from "./api/preview";
import { handleApply } from "./api/apply";
import { handleCollection } from "./api/collection";
import { handleSearchWS } from "./api/search";
import { handleLicenseActivate, handleLicenseStatus, handleLicenseDelete } from "./api/license";
import { handleDatabaseLookup } from "./core/database";
import type { ServerWebSocket } from "bun";

const PORT = 17840;
const FRONTEND_DIR = join(import.meta.dir, "..", "frontend");

// Cross-platform sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cross-platform process killing for port cleanup
async function killProcessOnPort(port: number): Promise<boolean> {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      // Windows: netstat -ano | findstr :PORT
      const proc = Bun.spawn(["cmd", "/c", `netstat -ano | findstr :${port}`], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      const lines = output.trim().split("\n").filter(l => l.includes("LISTENING"));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(pid)) {
          Bun.spawnSync(["taskkill", "/PID", pid.toString(), "/F"], { stdout: "inherit", stderr: "inherit" });
          console.log(`  Killed process ${pid} on port ${port}`);
          return true;
        }
      }
    } else {
      // Unix: lsof -i :PORT or ss -tlnp
      const commands = [
        ["lsof", "-t", "-i", `:${port}`],
        ["ss", "-tlnp", `|`, "grep", `:${port}`],
      ];
      for (const cmd of commands) {
        try {
          const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
          const output = await new Response(proc.stdout).text();
          const pidMatch = output.match(/(\d+)/);
          if (pidMatch) {
            const pid = parseInt(pidMatch[1], 10);
            Bun.spawnSync(["kill", pid.toString()], { stdout: "inherit", stderr: "inherit" });
            console.log(`  Killed process ${pid} on port ${port}`);
            return true;
          }
        } catch {
          continue;
        }
      }
    }
  } catch (err) {
    // Silently ignore port detection failures
  }
  return false;
}

// Cross-platform browser open
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  let command: string[];
  if (platform === "win32") {
    command = ["cmd", "/c", "start", "", url];
  } else if (platform === "darwin") {
    command = ["open", url];
  } else {
    command = ["xdg-open", url];
  }
  try {
    Bun.spawn(command, { stdout: "inherit", stderr: "inherit" });
  } catch (err) {
    console.warn(`  Failed to open browser: ${err}`);
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Load frontend assets: embedded (production exe) or runtime build (development)
let bundleJS: Uint8Array | null = null;
let embeddedCSS: string | null = null;
let embeddedHTML: string | null = null;
const hasFrontendDir = existsSync(FRONTEND_DIR);

try {
  const embedded = require("./_embedded-frontend");
  bundleJS = embedded.EMBEDDED_JS;
  embeddedCSS = embedded.EMBEDDED_CSS;
  embeddedHTML = embedded.EMBEDDED_HTML;
  console.log("Using embedded frontend assets");
} catch {
  // Development mode: build frontend at runtime
  if (hasFrontendDir) {
    console.log("Bundling frontend...");
    const BUNDLE_OUTDIR = join(import.meta.dir, "..", ".bundle-cache");
    const bundle = await Bun.build({
      entrypoints: [join(FRONTEND_DIR, "entry.tsx")],
      outdir: BUNDLE_OUTDIR,
      target: "browser",
      minify: false,
      sourcemap: "inline",
    });
    if (!bundle.success) {
      console.error("Frontend bundle failed:", bundle.logs);
      process.exit(1);
    }
    for (const output of bundle.outputs) {
      const fileName = output.path.split(/[\\/]/).pop()!;
      if (fileName.endsWith(".js")) {
        bundleJS = readFileSync(output.path);
        console.log(`  Bundle: ${fileName} (${(bundleJS.length / 1024).toFixed(1)}KB)`);
      }
    }
  } else {
    console.error("No frontend assets found. Run 'bun run scripts/build.ts' to build.");
    process.exit(1);
  }
}

function serveStatic(pathname: string): Response | null {
  // Bundled JS
  if (pathname === "/entry.tsx" || pathname === "/entry.js") {
    if (bundleJS) {
      return new Response(new Uint8Array(bundleJS), {
        headers: { "Content-Type": "application/javascript" },
      });
    }
  }

  // CSS
  if (pathname === "/styles.css") {
    const css = embeddedCSS ?? (hasFrontendDir ? readFileSync(join(FRONTEND_DIR, "styles.css")) : null);
    if (css) return new Response(css, { headers: { "Content-Type": "text/css" } });
  }

  // HTML or root
  if (pathname === "/" || pathname === "/index.html") {
    const html = embeddedHTML ?? (hasFrontendDir ? readFileSync(join(FRONTEND_DIR, "index.html")) : null);
    if (html) return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  // Other static files (only in dev mode with frontend dir)
  if (hasFrontendDir && !embeddedHTML) {
    let filePath = join(FRONTEND_DIR, pathname);
    if (!existsSync(filePath)) return null;
    const ext = extname(filePath);
    const body = readFileSync(filePath);
    return new Response(body, { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" } });
  }

  return null;
}

// Kill any existing process on the port before starting
await killProcessOnPort(PORT);
await sleep(200); // Brief wait for port to be released

const server = Bun.serve({
  port: PORT,
  fetch(req: Request, server): Response | Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // API 路由
    if (pathname === "/api/detect" && req.method === "GET") return handleDetect(req);
    if (pathname === "/api/current" && req.method === "GET") return handleCurrent(req);
    if (pathname === "/api/preview" && req.method === "POST") return handlePreview(req);
    if (pathname === "/api/apply" && req.method === "POST") return handleApply(req);

    // 收藏集路由
    if (pathname.startsWith("/api/collection")) return handleCollection(req);

    // License 路由
    if (pathname === "/api/license/activate" && req.method === "POST") return handleLicenseActivate(req);
    if (pathname === "/api/license/status" && req.method === "GET") return handleLicenseStatus(req);
    if (pathname === "/api/license" && req.method === "DELETE") return handleLicenseDelete(req);

    // 数据库查询（搜索前置）
    if (pathname === "/api/search/lookup" && req.method === "POST") return handleDatabaseLookup(req);

    // WebSocket 搜索
    if (pathname === "/ws/search") {
      const success = server.upgrade(req as any, { data: { criteria: {}, running: false } } as any);
      if (success) return new Response(null, { status: 101 });
    }

    // 静态文件 + 打包后的 JS
    const staticResp = serveStatic(pathname);
    if (staticResp) return staticResp;

    // SPA fallback
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/ws/")) {
      const fallback = serveStatic("/index.html");
      if (fallback) return fallback;
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
  websocket: {
    open(ws: ServerWebSocket) { handleSearchWS.open(ws as any); },
    message(ws: ServerWebSocket, msg: string) { handleSearchWS.message(ws as any, msg); },
    close(ws: ServerWebSocket) { handleSearchWS.close(ws as any); },
  },
});

// Auto-open browser on startup
await openBrowser(`http://localhost:${PORT}`);

console.log(`\n  🐥 Buddy Reroller running at http://localhost:${PORT}\n`);
