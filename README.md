# Memory Trace/Inhabit Landing

该仓库当前仅用于维护单页站点：`/#/product/trace`。

## 项目说明

- 页面定位：Trace / Inhabit（寻迹/入心）产品展示页
- 路由策略：站点根路径和旧路径会重定向到 `/#/product/trace`
- 部署方式：GitHub Pages（GitHub Actions 自动构建并发布）

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

## 目录（精简后）

- `src/pages/Product.tsx`：Trace/Inhabit 页面
- `src/lib/products.ts`：产品文案数据（当前仅保留 trace）
- `src/App.tsx`：trace-only 路由与重定向
- `core/Trace-Inhabit-Product-Page.md`：Trace/Inhabit 文档稿
- `.github/workflows/deploy-pages.yml`：Pages 自动部署

