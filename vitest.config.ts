import path from "path";
import { defineConfig } from "vitest/config";

/**
 * backend-001 —— 单元测试配置。
 *
 * 为什么不复用 `vite.config.ts`：那份配置挂着 react / tailwind / jsx-source-location
 * 三个插件与产物分包规则，都是"给浏览器构建用的"。测试跑在 node 里、只 import 纯函数，
 * 一样都用不上。分成两份之后，"改了构建配置会不会动到测试"这个问题直接消失。
 *
 * 别名必须在这里再声明一次 —— `vite.config.ts` 里那份对测试进程无效，
 * 而测试文件用 `@/lib/...` 引用源码，缺了它会在模块解析阶段就失败。
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    // 只测纯逻辑：不碰 DOM，也就不需要 jsdom（本项目未安装）。
    // 哪天要测组件了，再换 environment 并补依赖 —— 现在不为它预置负担。
    environment: "node",
    // `.ts` 覆盖前端纯函数（`src/lib/*`），`.mjs` 覆盖服务端 pure 逻辑（`server/lib/*`）。
    // 服务端刻意用 `.mjs` 而不是 `.ts` —— 它零依赖、由 node 直接运行，
    // 不进浏览器构建，也不该为了测试多一套编译步骤。
    include: ["tests/**/*.test.{ts,mjs}"],
    // 不开 globals：测试显式 `import { it } from "vitest"`。
    // 少一处隐式约定，`tsconfig.test.json` 也不必再声明 vitest 的全局类型。
    globals: false,
  },
});
