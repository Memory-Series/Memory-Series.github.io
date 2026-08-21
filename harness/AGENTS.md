# AGENTS.md

这个仓库面向长时运行的 coding agent 工作流。目标不是尽可能快地产出代码，而是让每一轮会话结束后，下一个会话仍然能无猜测地继续工作。

## 项目速览

- 项目名：memory-series-site（Memory Series · Trace / Inhabit 展示站）
- 技术栈：React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + framer-motion + wouter
- 包管理器：npm（lockfile 为 `package-lock.json`）
- 唯一页面：`src/pages/Product.tsx`（`/product/trace`，其余路由重定向到它）
- 双语文案：`src/locales/en.json` / `src/locales/zh.json`
- 产品文案与结构：`src/lib/products.ts`
- 历史文档（从仓库根目录迁移）：`harness/docs/`（见下方“文档索引”）

## 文档索引

零散文档已整理到 `harness/docs/`，索引见 `harness/docs/README.md`：

- `harness/docs/DESIGN.md` — 设计系统规范（Cinematic Tech-Noir Minimalism，深色模式）
- `harness/docs/product-page-copy.md` — Trace / Inhabit 产品页完整中文文案（原 `core/`）
- `harness/docs/README.md` — 原仓库主页 README 与当前 docs 索引

规则：以上文档是引用材料；运行时代码与 locale 文件才是最终事实来源。文档与代码不一致时以代码为准，并在 `claude-progress.md` 记录差异。修改产品文案时需同步 `src/lib/products.ts`、`src/locales/zh.json`、`src/locales/en.json` 三处。

## 项目命令（Windows / cmd 环境）

```bash
npm run dev       # 启动 Vite dev server（localhost:5173）
npm run build     # 标准验证：tsc -b && vite build（类型检查 + 生产构建）
npm run lint      # ESLint 检查（存在 9 个既有的 shadcn/ui 规则错误，非 blocker）
npm run preview   # 预览生产构建
```

注意：`init.sh` 是 bash 脚本，在 Windows cmd 下请用 Git Bash 运行，或直接按本项目命令手动执行。

## 开工流程

写代码前先做这些事：

1. 用 `pwd` 确认当前目录。
2. 读取 `claude-progress.md`，了解最新已验证状态和下一步。
3. 读取 `feature_list.json`，选择优先级最高的未完成功能。
4. 用 `git log --oneline -5` 看最近提交。
5. 运行 `./init.sh`。
6. 在开始新功能前，先跑必需的 smoke test 或端到端验证。

如果基础验证一开始就失败，先修基础状态，不要在坏的起点上继续叠新功能。

## 工作规则

- 一次只做一个功能。
- 不要因为“代码已经写了”就把功能标记为完成。
- 除非为了消除当前 blocker 的窄范围修复，否则不要扩大到其他功能。
- 实现过程中不要悄悄改弱验证规则。
- 优先依赖仓库里的持久化文件，而不是聊天记录。

## 必需文件

- `feature_list.json`：功能状态的唯一事实来源
- `claude-progress.md`：会话进度和当前已验证状态
- `init.sh`：统一的启动与验证入口
- `session-handoff.md`：较长会话可选的交接摘要

## 完成定义

一个功能只有在以下条件都满足时才算完成：

- 目标行为已经实现
- 要求的验证真的跑过
- 证据记录在 `feature_list.json` 或 `claude-progress.md`
- 仓库仍然能按标准启动路径重新开始工作

## 收尾

结束会话前：

1. 更新 `claude-progress.md`
2. 更新 `feature_list.json`
3. 记录仍未解决的风险或 blocker
4. 在工作处于安全状态后，用清晰的提交信息提交
5. 保证下一轮会话可以直接运行 `./init.sh`
