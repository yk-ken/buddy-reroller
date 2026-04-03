// src/server.ts — Bun HTTP Server 入口
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { handleDetect } from "./api/detect";
import { handleCurrent } from "./api/current";
import { handlePreview } from "./api/preview";
import { handleApply } from "./api/apply";
import { handleShareCard } from "./api/share-card";
import { handleCollection } from "./api/collection";
import { handleSearchWS } from "./api/search";
import type { ServerWebSocket } from "bun";

const PORT = 17840;
const FRONTEND_DIR = join(import.meta.dir, "..", "frontend");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(pathname: string): Response | null {
  let filePath = join(FRONTEND_DIR, pathname === "/" ? "index.html" : pathname);
  if (!existsSync(filePath)) return null;
  const ext = extname(filePath);
  const body = readFileSync(filePath);
  return new Response(body, { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" } });
}

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
    if (pathname === "/api/share-card" && req.method === "POST") return handleShareCard(req);

    // 收藏集路由
    if (pathname.startsWith("/api/collection")) return handleCollection(req);

    // WebSocket 搜索
    if (pathname === "/ws/search") {
      const success = server.upgrade(req as any, { data: { criteria: {}, running: false } } as any);
      if (success) return new Response(null, { status: 101 }); // won't actually send
    }

    // 静态文件
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

console.log(`\n  🐥 Buddy Reroller running at http://localhost:${PORT}\n`);
