import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

// perf-002: 构建产物可观测性
// - sourcemap: "hidden" 生产保留 .map 用于排查，不在 JS 末尾注入 sourceMappingURL
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
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: "hidden",
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
