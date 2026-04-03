// src/pro/index.ts — Pro 模块加载器（开源可见）
import type { ProModule } from "./interface";

let _module: ProModule | null = null;

export function getProModule(): ProModule {
  if (!_module) {
    try {
      // bun build --compile 静态解析此 require
      // pro-impl.ts 存在 → 打包进 exe
      // pro-impl.ts 不存在 → catch 回退 noop
      // pro-impl.ts may not exist in open-source builds
      _module = require("./pro-impl").proModule;
    } catch {
      _module = require("./noop").proModule;
    }
  }
  return _module!;
}
