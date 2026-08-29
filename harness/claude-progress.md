# 进度日志

## 当前已验证状态

- 仓库根目录：G:\Memory-Series\Memory-Series.github.io（Git 仓库，origin = github.com/Memory-Series/Memory-Series.github.io）
- 标准启动路径：`npm run dev` → http://localhost:5173/
- 标准验证路径：`npm run build`（tsc -b && vite build）——2026-08-21 通过
- 当前最高优先级未完成功能：`flash-001`（网页烧录 ESP32-S3 1.85B 设备）——已规划，待实现
- 当前 blocker：无。lint 已清理至 0 错误（2026-08-21）。
- 附加：`compositions/` 含 Trace/Inhabit 产品宣传视频组合（`index.html`），`trace-inhabit-promo.mp4` 已渲染（2.7MB，18.5s，1920×1080），未提交（见 .gitignore），视频不参与网页

## 会话记录

### Session 007

- 日期：2026-08-23
- 本轮目标：规划网页烧录功能（flash-001）需求并写入 harness
- 已完成：调研 esp-claw 官方 flash-tool（WebSerial + tasmota-webserial-esptool + firmware.json + merged bin）；确认固件产物组成（bootloader/partition-table/edge_agent.bin 4091KB/emote_assets 2676KB/storage 3456KB/ota_data_initial，16MB flash）；澄清决策（固件从 esp-claw 产物合并、仅烧录不含配网/console、仅支持 ESP32-S3 1.85B、新增页内锚点区块）；写入 feature_list.json 的 flash-001（not_started）
- 运行过的验证：esp-claw 构建产物存在性 + sdkconfig flash 配置确认（16MB/QIO）
- 已记录证据：feature_list.json 的 flash-001 项（含固件组成清单）
- 提交记录：尚未提交
- 更新过的文件或工件：harness/feature_list.json、harness/claude-progress.md
- 已知风险或未解决问题：WebSerial 需 HTTPS（GitHub Pages 可用）；固件合并需 esptool 命令确认偏移；烧录实机验证需设备在手
- 下一步最佳动作：实现 flash-001（设计烧录区块 UI → 合并固件 → 实现 WebSerial 烧录逻辑 → 实机验证）

### Session 006

- 日期：2026-08-23
- 本轮目标：执行 perf-001 构建产物体积优化
- 已完成：vite.config.ts 添加 manualChunks 代码分割（motion/i18n/ui 独立 chunk），主 index.js 519kB→291kB 消除 500kB 警告；ffmpeg 压缩大图（庄方宜 3.2MB→379KB、拓跋玉儿 3.9MB→124KB、hero-bg 462KB→46KB）；拓跋玉儿 png 改名 jpg 并更新 import
- 运行过的验证：`npm run build`（通过，无 chunk 警告）、`npm run lint`（0 错误）、用户预览确认视觉质量可接受
- 已记录证据：build 无警告 + lint 0 + 产物大小对比
- 提交记录：f441459（perf: code-split vendor chunks and compress images），未推送
- 更新过的文件或工件：vite.config.ts、src/pages/Product.tsx、src/assets/hero-bg.jpeg、src/assets/demo/trace-inhabit/庄方宜/庄方宜.jpeg、拓跋玉儿 .png→.jpg、harness/feature_list.json、harness/claude-progress.md
- 已知风险或未解决问题：无
- 下一步最佳动作：feature_list.json 全部 passing，可推送并收尾

### Session 005

- 日期：2026-08-23
- 本轮目标：填充 usage-001 使用方式区块
- 已完成：sections.usage 由 placeholder 替换为 lead + 3 步结构化文案（寻迹 Trace 提取 → SoulPod 生成 → 入心 Inhabit 对话），中英双语文案齐备；Product.tsx usage 区块渲染与 intro 区块样式完全一致
- 运行过的验证：`npm run build`（通过）、`npm run lint`（0 错误）、locale 键结构一致性检查（zh/en 各 3 steps）
- 已记录证据：build 通过、lint 0、双语文案对齐
- 提交记录：尚未提交
- 更新过的文件或工件：src/locales/zh.json、src/locales/en.json、src/pages/Product.tsx、harness/feature_list.json、harness/claude-progress.md
- 已知风险或未解决问题：无
- 下一步最佳动作：perf-001 构建产物体积优化（JS 517kB 警告 + 大图压缩）

### Session 004

- 日期：2026-08-23
- 本轮目标：用 hyperframes 生成 Trace/Inhabit 产品宣传视频（1920×1080），用于网站 Hero 区
- 已完成：创建 compositions/ 组合（4 幕：开场主标题→寻迹 Trace→入心 Inhabit→收束）；补充 Manrope/Noto Sans SC 字体的 @font-face（两字体不在 hyperframes 内置列表，从 Google Fonts 下载 TTF）；曾压缩时间线至 15.3s（删主标题）后按用户要求回退；最终定版为 18.5s 压缩版（去除各场景静止留白）；渲染 trace-inhabit-promo.mp4
- 运行过的验证：`npx hyperframes check compositions` 全绿（lint 0、runtime 0、layout 9 samples 0、motion 0、contrast 9/9）、ffprobe 确认 18.500000s/1920×1080/h264
- 已记录证据：check 通过 + ffprobe 输出 + 渲染日志
- 提交记录：已合并到 main 并推送（`72772d2`，fast-forward 自 ce015d6）；feature 分支已删除
- 更新过的文件或工件：compositions/index.html、compositions/fonts/（4 个 TTF）、.gitignore、harness/claude-progress.md、harness/feature_list.json
- 已知风险或未解决问题：视频当前无背景音乐（用户选择"先无音乐，后续补"）；`compositions/trace-inhabit-promo.mp4` 未提交 git；视频曾试嵌入网站 Hero 区后按用户要求回退，**视频不参与网页**（独立产物）
- 下一步最佳动作：填充 usage-001 使用方式文案（中英两份）——正在进行

### Session 003

- 日期：2026-08-21
- 本轮目标：清理项目遗留项（lint 错误、行尾符差异、lockfile 决策、进度文件模板残留）
- 已完成：清理 claude-progress.md 末尾空 Session 模板；git restore 消除 src/locales 行尾符伪改动；eslint.config.js 为 shadcn/ui 与 contexts 目录关闭 react-refresh/purity 规则，lint 归零；纳入 package-lock.json，删除 pnpm-lock.yaml；AGENTS.md 更新包管理器说明
- 运行过的验证：`npm run lint`（0 错误）、`npm run build`（通过）
- 已记录证据：lint 0 错误、build 通过
- 提交记录：尚未提交（本轮待提交）
- 更新过的文件或工件：eslint.config.js、package-lock.json（新增）、pnpm-lock.yaml（删除）、harness/AGENTS.md、harness/claude-progress.md
- 已知风险或未解决问题：无
- 下一步最佳动作：填充 usage-001 使用方式文案（中英两份）

### Session 002

- 日期：2026-08-21
- 本轮目标：整理项目中零散的历史文档，合入 harness
- 已完成：将仓库根目录的 README.md、DESIGN.md 与 core/Trace-Inhabit-Product-Page.md 迁移至 harness/docs/；新增 harness/docs/README.md 索引；更新 AGENTS.md 文档索引；删除已空的 core/ 目录
- 运行过的验证：无构建改动，未重新跑 build
- 已记录证据：docs 索引文件与 AGENTS.md 引用已就位
- 提交记录：9c423a5（docs: consolidate project docs into harness/docs），已推送
- 更新过的文件或工件：harness/docs/（4 个文件）、harness/AGENTS.md；删除 core/
- 已知风险或未解决问题：无
- 下一步最佳动作：填充 usage-001 使用方式文案（中英两份）

### Session 001

- 日期：2026-08-21
- 本轮目标：为 memory-series-site 项目定制 harness 模板（AGENTS.md / init.sh / feature_list.json / claude-progress.md / session-handoff.md）
- 已完成：完成五个 harness 文件的项目化定制
- 运行过的验证：`npm run build`（通过）、`npm run lint`（9 个既有 shadcn/ui 错误，已在 Session 003 清理）、`git fetch origin`（与远程同步）
- 已记录证据：feature_list.json 中 passing 项均有构建证据
- 提交记录：9c423a5（与 Session 002 同一次提交）
- 更新过的文件或工件：harness/ 下五个文件
- 已知风险或未解决问题：无
- 下一步最佳动作：填充 usage-001 使用方式文案（中英两份）
