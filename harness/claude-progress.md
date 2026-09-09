# 进度日志

## 当前已验证状态

- 仓库根目录：G:\Memory-Series\Memory-Series.github.io（Git 仓库，origin = github.com/Memory-Series/Memory-Series.github.io）
- 标准启动路径：`npm run dev` → http://localhost:5173/
- 标准验证路径：`npm run build`（tsc -b && vite build）——2026-08-21 通过
- 当前最高优先级未完成功能：无（feature_list.json 全部 passing）
- 当前 blocker：无。lint 已清理至 0 错误（2026-08-21）。
- 附加：`compositions/` 含 Trace/Inhabit 产品宣传视频组合（`index.html`），`trace-inhabit-promo.mp4` 已渲染（2.7MB，18.5s，1920×1080），未提交（见 .gitignore），视频不参与网页；网页已部署京东云 https://www.traceinhabit.cn/（HTTPS 200 已验证，WebSerial 烧录功能可用）

## 会话记录

### Session 015

- 日期：2026-09-09
- 本轮目标：部署脚本安全化（SSH 密钥认证）+ 仓库整洁
- 已完成：本地 id_rsa 公钥上传主机 ~/.ssh/authorized_keys；deploy-jd.ps1 重写为优先 SSH 密钥认证（KeyFile），密码改为仅从 $env:JD_PASS 读取作为后备，移除硬编码密码；.workbuddy/（本地 agent 记忆工具数据）加入 .gitignore
- 运行过的验证：deploy-jd.ps1 用密钥认证完整执行成功（uploaded → HTTP 301 HTTPS 正常）；HTTPS 站点 200
- 已记录证据：脚本输出 "Using SSH key" + 部署成功
- 提交记录：f8af91b（security: SSH key auth for deploy...），已推送
- 更新过的文件或工件：scripts/deploy-jd.ps1、.gitignore、harness/claude-progress.md（本次）
- 已知风险或未解决问题：无（历史提交 898cb45/9b81558 曾含云主机密码，均已改密钥认证且云主机密码已更新，旧密码失效）
- 下一步最佳动作：无待办

### Session 014

- 日期：2026-09-09
- 本轮目标：域名备案完成 + 京东云 HTTPS 配置
- 已完成：域名 www.traceinhabit.cn 备案通过；DNS 解析到 111.228.60.135；HTTPS 在 nginx 容器上配置（容器现映射 80+443，HTTP 自动 301 → HTTPS）；验证 https://www.traceinhabit.cn/ 200
- 运行过的验证：HTTPS 200、固件 bin 200、hash 路由 200；本地 dist 与线上 JS 哈希一致（index-Do-BFPhf）
- 已记录证据：curl HTTPS 200；GitHub Pages Actions 部署 success
- 提交记录：e5afc03（docs: record production domain...）、9b81558（chore: update JD creds...），已推送
- 更新过的文件或工件：harness/docs/deployment.md、harness/claude-progress.md
- 已知风险或未解决问题：SSH 密码变更（旧密码失效），已改密钥认证
- 下一步最佳动作：无待办

### Session 012-013（合并）

- 日期：2026-08-29
- 本轮目标：deploy-001 实机验证 + 京东云部署完成 + 部署管理纳入 harness
- 已完成：用户实机验证 deploy-001 获取设备地址成功（console 模式 wifi --status 读 IP，标记 passing）；京东云站点部署完成（CentOS7+Docker20.10.21，Nginx 容器 80 端口挂载 /opt/memory-series，HTTP 200）；解决 Docker Hub 不可达（配 daocloud/dockerproxy/USTC 镜像加速）与 CentOS7+nginx pwrite 限制（--privileged）；修复 GitHub Pages 工作流 pnpm→npm（lockfile 已迁至 package-lock.json）；新建 scripts/deploy-jd.ps1 部署脚本；新增 harness/docs/deployment.md 部署管理文档；更新 AGENTS.md 与 docs README 索引
- 运行过的验证：京东云 curl HTTP 200、JS/CSS/固件 bin 均 200、首页 title 正常；deploy-001 实机验证通过；deploy-jd.ps1 完整执行成功
- 已记录证据：curl 200 响应；部署脚本输出；用户实机验证 deploy-001
- 提交记录：50d05d3（deploy-001 passing）、898cb45（部署脚本+文档）、b7992bd（harness 部署管理记录），均已推送
- 更新过的文件或工件：.github/workflows/deploy-pages.yml、scripts/deploy-jd.ps1、harness/docs/deployment.md、harness/docs/README.md、harness/AGENTS.md、harness/feature_list.json、harness/claude-progress.md
- 已知风险或未解决问题：当时 WebSerial 需 HTTPS（域名备案中）、部署脚本含明文密码——均已在 Session 014/015 解决
- 下一步最佳动作：已完成（后续见 Session 014/015）

### Session 010

- 日期：2026-08-29
- 本轮目标：设备配置向导 + 烧录区块拆分为「固件烧录」/「角色部署」两个独立区块
- 已完成：调研确认设备有 http_server WebUI（端口 80）且支持 `wifi --status` console 命令返回设备 IP（官方 flash-tool 同机制）；FlashTool 拆为两个独立组件——FirmwareFlash（连接+烧录+进度）和 CharacterDeploy（获取设备地址→打开配置界面→导入 SoulPod 指引）；两个区块眉标区分（固件/角色），横向并列（lg:grid-cols-2），flash 区块移到 max-w-6xl 容器
- 运行过的验证：`npm run build`（通过）、`npm run lint`（0 错误 0 警告）
- 已记录证据：build/lint 通过；用户确认布局符合要求
- 提交记录：fed8753（refactor(flash): split into firmware flash and character deploy sections），未推送
- 更新过的文件或工件：src/components/FirmwareFlash.tsx（原 FlashTool rename）、src/components/CharacterDeploy.tsx（新增）、src/locales/zh.json/en.json、src/pages/Product.tsx
- 已知风险或未解决问题：获取设备地址需实机验证（console 模式读 IP）；设备 WebUI 跳转需设备与电脑同网络；设备 WebUI 域名/captive portal 行为待确认
- 下一步最佳动作：实机验证 CharacterDeploy 获取设备地址 → 推送远程

### Session 009

- 日期：2026-08-29
- 本轮目标：角色卡直接下载 SoulPod 包（soulpod-001）
- 已完成：创建 src/lib/soulpod.ts（角色→SoulPod 文件清单 manifest，从 Trace-Inhabit 远程仓库 raw 拉取）；创建 SoulPodDownload 组件（JSZip 动态打包 zip 下载，有包可下载/无包「即将上线」）；角色卡聚焦时在标签下方显示下载按钮；FlashTool 还原为纯烧录功能；清理未用 locale
- 运行过的验证：`npm run build`（通过）、`npm run lint`（0 错误）、远程 raw URL 可访问性验证（夏以昼 profile/叶修图片 200）
- 已记录证据：build/lint 通过；远程文件 URL 验证；用户确认布局
- 提交记录：900410a（feat(soulpod): add per-character SoulPod zip download on demo cards），未推送
- 更新过的文件或工件：package.json/lock、src/lib/soulpod.ts（新增）、src/components/SoulPodDownload.tsx（新增）、src/pages/Product.tsx、src/locales/zh.json/en.json、harness/feature_list.json、harness/claude-progress.md
- 已知风险或未解决问题：SoulPod zip 需用户解压后手动放 SD 卡；设备固件无文件上传协议（网页直写 SD 暂不可行，用户已放弃该方案）；庄方宜/拓跋玉儿/戴安娜无完整包
- 下一步最佳动作：推送 soulpod-001 到远程

### Session 008

- 日期：2026-08-29
- 本轮目标：实现并验证 flash-001 网页烧录功能（WebSerial + esptool.js）
- 已完成：合并 esp-claw 固件（6 分区 → public/merged_binary/memory-series-1.85b.bin 15.1MB）；安装 tasmota-webserial-esptool；创建 FlashTool 组件（连接/初始化/烧录/进度/错误处理，双语）；烧录区块嵌入 Product.tsx（demo 与 implementation 之间）；用户确认 UI 风格与实机烧录成功
- 运行过的验证：`npm run build`（通过）、`npm run lint`（0 错误）、实机烧录（用户确认成功）
- 已记录证据：build/lint 通过；固件复制进 dist；实机烧录成功
- 提交记录：83038de（feat: add WebSerial firmware flashing）、36d398d（harness 记录）、待提交本次 passing 更新
- 更新过的文件或工件：package.json/lock、src/locales/zh.json/en.json、src/pages/Product.tsx、src/components/FlashTool.tsx（新增）、public/merged_binary/（新增）、harness/feature_list.json、harness/claude-progress.md
- 已知风险或未解决问题：WebSerial 需 HTTPS（GitHub Pages 部署后可用，localhost 预览也可）；Windows 5170-5269 保留端口导致 dev 用 5273；固件后续更新需重新 merge
- 下一步最佳动作：推送 flash-001 到远程；未来规划：连接设备后可选角色卡直接烧录固件 + 下载 SoulPod

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
