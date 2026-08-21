# 会话交接

## 当前已验证

- 现在明确可用的部分：`npm run build` 通过（tsc + vite，2227 modules）；`npm run dev` 可启动；远程 origin/main 与本地同步。
- 这轮实际跑过的验证：`npm run build`（成功）、`npm run lint`（9 个既有 shadcn/ui 错误）、`git fetch origin`（已同步）。

## 本轮改动

- 新增了哪些代码或行为：无业务代码改动；仅新增 harness/ 目录并完成项目化定制（AGENTS.md、init.sh、feature_list.json、claude-progress.md、session-handoff.md）。
- 基础设施或 harness 发生了哪些变化：harness 模板已针对本项目的命令（npm run build 验证、npm run dev 启动）与真实功能列表定制。

## 仍损坏或未验证

- 已知缺陷：lint 9 个错误——均为 shadcn/ui 组件（badge/button-group/button/form/navigation-menu/sidebar/toggle）的 react-refresh/only-export-components 与 sidebar 的 react-hooks/purity，非核心业务代码。
- 未验证路径：中英双语切换、角色卡音频播放、Hub 链接切换等交互仅据代码结构推断，尚未在浏览器中逐一人工验证。
- 下一轮会话需要注意的风险：src/locales/en.json、zh.json 有未提交修改（CRLF/LF 行尾差异）；package-lock.json 未跟踪。

## 下一步最佳动作

- 最高优先级未完成功能：`usage-001`（使用方式区块填充）。
- 为什么它是下一步：它是 feature_list.json 中优先级最高的未完成项，也是页面唯一仍为占位符的内容区。
- 什么结果才算 passing：sections.usage 文案不再是 placeholder，中英两份 locale 文件均有真实内容，本地预览显示正常，npm run build 通过。
- 这一步中哪些东西不要动：不要清理 shadcn/ui 的 lint 错误（非本轮范围）；不要改动其他 passing 功能。

## 命令

- 启动命令：`npm run dev`（localhost:5173）
- 验证命令：`npm run build`
- 定向调试命令：`npm run lint`
