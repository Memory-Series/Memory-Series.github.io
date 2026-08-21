# 进度日志

## 当前已验证状态

- 仓库根目录：G:\Memory-Series\Memory-Series.github.io（Git 仓库，origin = github.com/Memory-Series/Memory-Series.github.io）
- 标准启动路径：`npm run dev` → http://localhost:5173/
- 标准验证路径：`npm run build`（tsc -b && vite build）——2026-08-21 通过
- 当前最高优先级未完成功能：`usage-001`（使用方式区块填充，现为占位符）
- 当前 blocker：无。lint 存在 9 个既有的 shadcn/ui 组件 react-refresh 规则错误，不影响构建，属非核心代码。

## 会话记录

### Session 002

- 日期：2026-08-21
- 本轮目标：整理项目中零散的历史文档，合入 harness
- 已完成：将仓库根目录的 README.md、DESIGN.md 与 core/Trace-Inhabit-Product-Page.md 迁移至 harness/docs/；新增 harness/docs/README.md 索引；更新 AGENTS.md 文档索引；删除已空的 core/ 目录
- 运行过的验证：无构建改动，未重新跑 build
- 已记录证据：docs 索引文件与 AGENTS.md 引用已就位
- 提交记录：尚未提交
- 更新过的文件或工件：harness/docs/（4 个文件）、harness/AGENTS.md；删除 core/
- 已知风险或未解决问题：未跟踪文件 package-lock.json；src/locales/en.json 与 zh.json 有未提交修改（仅行尾符 CRLF/LF 差异，无实质内容）；lint 9 个既有错误未清理；文件移动尚未 git add/commit
- 下一步最佳动作：填充 usage-001 使用方式文案（中英两份）

### Session 001

- 日期：2026-08-21
- 本轮目标：为 memory-series-site 项目定制 harness 模板（AGENTS.md / init.sh / feature_list.json / claude-progress.md / session-handoff.md）
- 已完成：完成五个 harness 文件的项目化定制
- 运行过的验证：`npm run build`（通过）、`npm run lint`（9 个既有 shadcn/ui 错误）、`git fetch origin`（与远程同步）
- 已记录证据：feature_list.json 中 passing 项均有构建证据
- 提交记录：尚未提交
- 更新过的文件或工件：harness/ 下五个文件
- 已知风险或未解决问题：未跟踪文件 package-lock.json；src/locales/en.json 与 zh.json 有未提交修改（仅行尾符 CRLF/LF 差异，无实质内容）；lint 9 个既有错误未清理
- 下一步最佳动作：填充 usage-001 使用方式文案（中英两份）

### Session 002

- 日期：
- 本轮目标：
- 已完成：
- 运行过的验证：
- 已记录证据：
- 提交记录：
- 更新过的文件或工件：
- 已知风险或未解决问题：
- 下一步最佳动作：
