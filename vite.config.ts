import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

// perf-002: 构建产物可观测性
// - sourcemap: 关闭。曾用 "hidden"（保留 .map 用于排查），但 .map 会被原样拷进
//   dist/ 并发布到线上 —— 实测 https://www.traceinhabit.cn/assets/index-*.js.map
//   可直接下载，等于完整前端源码公开。安全优先，改为不产出 .map。
// - ANALYZE=true 时生成 dist/stats.html（gz/brotli 双口径），默认关闭，不影响日常 build
const analyzePlugins: PluginOption[] =
  process.env.ANALYZE === "true"
    ? [
        visualizer({
          filename: "dist/stats.html",
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: "treemap",
        }),
      ]
    : [];

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Inject data-source attribute for AI agent source location
          "./scripts/babel-plugin-jsx-source-location.cjs",
        ],
      },
    }),
    tailwindcss(),
    ...analyzePlugins,
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  base: "./",
  // dev-only. `@radix-ui/react-dialog` is reached only through the lazily
  // imported chat drawer, so the startup scan misses it; dev then discovers it
  // at runtime and re-runs the optimizer, which has to delete the previous
  // deps_temp dir — on this machine the safe-delete shim blocks that bulk
  // delete (184 files > threshold) and vite dies mid-session. Listing it here
  // makes the first optimization pass complete, so no re-optimization happens.
  optimizeDeps: { include: ["@radix-ui/react-dialog"] },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ["framer-motion"],
          i18n: ["i18next", "react-i18next"],
          ui: ["lucide-react", "sonner", "wouter"],
        },
      },
    },
  },
});
