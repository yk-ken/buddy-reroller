// src/pro/interface.ts — Pro 模块公共接口（开源可见）
export interface ProModule {
  /** 当前构建是否包含 Pro 功能 */
  hasProBuild(): boolean;
}
