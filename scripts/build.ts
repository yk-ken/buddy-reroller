// scripts/build.ts — 构建单文件可执行
import { $ } from "bun";

const OUT_NAME = "buddy-reroller";

console.log("Building frontend bundle...");
const frontendResult = await Bun.build({
  entrypoints: ["./frontend/entry.tsx"],
  outdir: "./dist/frontend",
  target: "browser",
  minify: true,
  sourcemap: "none",
});

if (!frontendResult.success) {
  console.error("Frontend build failed:");
  for (const log of frontendResult.logs) console.error(log);
  process.exit(1);
}
console.log(`  Frontend: ${frontendResult.outputs.length} files`);

// Copy static assets to dist
await Bun.write("./dist/frontend/index.html", Bun.file("./frontend/index.html"));
await Bun.write("./dist/frontend/styles.css", Bun.file("./frontend/styles.css"));

console.log("Compiling server...");
const result = await $`bun build --compile --minify --outfile ${OUT_NAME}${process.platform === "win32" ? ".exe" : ""} ./src/server.ts`.cwd(process.cwd());

if (result.exitCode !== 0) {
  console.error("Server compile failed");
  process.exit(1);
}

console.log(`\n  ✅ Built: ${OUT_NAME}${process.platform === "win32" ? ".exe" : ""}`);
console.log(`  Run: ./${OUT_NAME}${process.platform === "win32" ? ".exe" : ""}\n`);
