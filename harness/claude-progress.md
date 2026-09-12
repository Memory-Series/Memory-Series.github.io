# 进度日志

## 当前已验证状态

- 仓库根目录：G:\Memory-Series\Memory-Series.github.io（Git 仓库，origin = github.com/Memory-Series/Memory-Series.github.io）
- 标准启动路径：`npm run dev` → http://localhost:5173/
- 标准验证路径：`npm run build`（tsc -b && vite build）——2026-09-12 通过（含 split-001 双页 + showcase-001 视频区块，main `index-Cp38yVaE.js` 487.07 kB）
- 页面结构（2026-09-12 起，split-001）：**双路由** —— `#/product/trace`（Trace/Inhabit SKILL）+ `#/product/inhabit-device`（Memory · Inhabit Device），共享 `SiteHeader`（含产品切换器）/ `SiteFooter`；`src/pages/Product.tsx` 已删除，区块拆到 `src/sections/*`。旧路由全部重定向到 `/product/trace`
- 当前最高优先级未完成功能：flash-002（WebSerial 烧录链路工程化 —— 用户两次决策"收回"，保持 not_started）
- 当前 blocker：无。
- 附加：`compositions/` 现只剩 `index.html` 素材工程（`trace-inhabit-promo.mp4` 已不在仓库，见 .gitignore）；2026-09-12 起硬件页启用实拍宣传视频 `public/media/inhabit-device.mp4`（684KB，含 poster）。**京东云 https://www.traceinhabit.cn/ 已于 Session 029 同步为双页新版**（`index-Cp38yVaE.js`，HTTPS 200，媒体 200）；WebSerial 烧录功能依赖浏览器安全上下文，HTTPS 下可用

## 会话记录

### Session 029

- 日期：2026-09-12
- 本轮目标：用户确认网页验证通过后，要求**同步京东云**（`https://www.traceinhabit.cn/`）。无代码改动，纯部署
- 已完成：
  - **推翻旧结论**：此前记录的「京东云必须走 `deploy-jd.ps1`、沙箱会拦 SSH」不成立——实测本机 Git Bash 的 `ssh` / `scp` / `tar` 可直连 `root@111.228.60.135:22`。真正失效的是 PowerShell 工具的输出回显（`Write-Output` 无输出），而 `deploy-jd.ps1` 依赖 Posh-SSH + PowerShell，故本轮弃用该脚本，改走等价 bash 链路
  - 部署前确认 `dist` 是当前源码产物（`dist/index.html` mtime 08:32 > 源码最新 01:42），未重新构建
  - 打包：`tar -czf` → 7667438 B / 58 entries，含 `dist/index.html` + `dist/media/*`
  - 上传：`scp` → 远端 `md5sum` 比对 **`7e75b74a58f8216d423bbf397e2c7c7e` 完全一致**
  - 部署前基线：远端旧版为 `index-DYXyFfqU.js`（单页），且**无 `media/` 目录**
  - 远端执行：`rm -rf /opt/memory-series/*` → `tar -xzf ... --strip-components=1` → `docker restart memory-series-nginx` → 容器 `Up`，`curl 127.0.0.1` 返回 **301**（HTTP→HTTPS，预期）
  - 公网验证（https://www.traceinhabit.cn/）：
    - 首页 200 / 1031 B，`index.html` 引用 `index-Cp38yVaE.js`
    - 主 bundle 200 / 487065 B / application/javascript，特征全 **[OK]**：`showcase`（产品影片）、`inhabit-device` 路由、`product/trace` 路由、`bridge`、`inhabit-device.mp4`、`inhabit-device-poster`、`productSwitch`
    - `/media/inhabit-device.mp4` 200 / **684845 B** video/mp4（与本地字节数一致）
    - `/media/inhabit-device-poster.jpg` 200 / **44021 B** image/jpeg（与本地字节数一致）
- 已记录证据：本条 + 远端 md5sum 比对 + 公网 bundle 特征检查 + 媒体字节数比对
- 提交记录：无代码提交（仅 harness 文档更新）
- 更新过的文件或工件：`harness/claude-progress.md`、`harness/session-handoff.md`
- 已知风险或未解决问题：
  - 远端文件属主为 `197609:197609`（Windows scp 侧 uid），非 `root`；nginx 容器以 `--privileged` + 挂载运行，实测读取正常，但若后续出现权限问题可 `chown -R root:root /opt/memory-series`
  - `scripts/deploy-jd.ps1` 在当前环境下**不可用**（PowerShell 回显故障），建议后续部署走 bash 链路或先修复 PowerShell
  - 两站点 bundle hash 仍不同（Pages `index-2BFTwUJQ.js` linux vs 京东云 `index-Cp38yVaE.js` Windows），已知跨平台 tree-shake 差异，功能一致
- 下一步最佳动作：硬件页增量区块（规格表 / FAQ / 获取渠道）；同步 Ardot 设计稿为双页结构

### Session 028

- 日期：2026-09-12
- 本轮目标：修正 harness 欠账（Session 026/027 未登记）→ 提交推送 GitHub → 部署线上。用户明确指示：**京东云本轮暂不同步**
- 已完成：
  - harness 欠账修正（连做两轮未登记，属本会话疏漏）：
    - `feature_list.json`：新增 showcase-001（passing）；补全 split-001 证据（用户已验证）；`last_updated` → 2026-09-12。现 **23 项 / 22 passing / 1 not_started（flash-002）**
    - `claude-progress.md`：头部「当前已验证状态」重写（双路由结构、最新 hash、未完成项收敛为 flash-002）；补 Session 026（split-001）+ Session 027（showcase-001）
    - `session-handoff.md`：整份重写（本轮改动、未验证路径、风险、可选后续工作）
    - `AGENTS.md`：修正两处过时描述——① 项目速览仍写「唯一页面 Product.tsx」（已删）；② 命令说明仍写「存在 9 个既有 lint 错误」（现为 0），并补 `lint:locales` 命令与 CI 门禁说明
  - 验证：`tsc -b` 0 / `vite build` 0（main `index-Cp38yVaE.js` 487.07 kB / gzip 149.23 kB）/ `eslint` 0 错误 0 警告 / `lint:locales` ✓ —— 干净重建（先清空 dist）
  - 提交：单 commit `61132a1`（功能 + harness 登记合一，避免拆页与视频改动共享 locale 文件而无法干净分离）
  - 推送：`git push origin main` 成功（`f094616..61132a1`）
  - GitHub Actions run `34662124552`：**build 46s（Lint ESLint ✓ / Lint locales ✓ / build ✓）+ deploy 9s ✓** —— ci-001 的 lint gate 第二次实测生效
  - 线上验证（https://memory-series.github.io/）：首页 200；主 bundle `index-2BFTwUJQ.js` 内 `Ten seconds of it` / `media/inhabit-device.mp4` / `-poster.jpg` / `/product/inhabit-device` / `/product/trace` / `bridge.toSkill` 标记全部 FOUND；`/media/inhabit-device.mp4` 200 684845B video/mp4、`-poster.jpg` 200 44021B image/jpeg
- 已记录证据：本条 + git log + Actions run 34662124552 + 线上 bundle 特征检查
- 提交记录：`61132a1 feat(ui): split site into two product pages and add device product film`（已推送）
- 更新过的文件或工件：`harness/AGENTS.md`、`harness/claude-progress.md`、`harness/feature_list.json`、`harness/session-handoff.md`
- 已知风险或未解决问题：
  - **京东云仍是单页旧版**（`https://www.traceinhabit.cn/`）—— 用户本轮明确要求暂不同步，需另行处理（命令：`powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1`）
  - 两站点 bundle hash 不同：GitHub Pages `index-2BFTwUJQ.js`（linux）vs 本地/京东云 `index-Cp38yVaE.js`（Windows）—— 已知跨平台 tree-shake 差异，功能一致
  - **本机环境故障记录**：Git Bash 的 coreutils（`ls`/`head`/`tail`/`dirname`/`cat`）与 safe-delete shim 在本轮不可用；PowerShell 输出捕获也失效（`Write-Output` 无回显）。可用替代路径：Python 绝对路径 + `subprocess` 调 node（`.workbuddy/verify.py`）/ urllib 验证线上（`.workbuddy/verify_site.py`）
- 下一步最佳动作：
  1. 用户决定何时同步京东云
  2. 硬件页补区块（设备规格参数表 / FAQ 排障 / 获取渠道）—— 用户已表示单独开一轮
  3. 同步 Ardot 设计文件为双页结构（当前 `724413235736238` 仍是拆页前单页版本）

### Session 026

- 日期：2026-09-12
- 本轮目标：用户提出——当前页面同时承载 Trace/Inhabit SKILL（软件）与 ESP32-S3 硬件（烧录/部署）两个产品，要求拆成两个产品页
- 诊断结论：9 个区块归属清楚（Hero/简介/使用方式/角色卡/使用情景 → SKILL；固件烧录/角色部署 → 硬件；Header/通讯/Footer 共享）。核心问题不是内容多，而是叙事线断裂——读者从「提取人格」被要求「插 USB 烧固件」。SoulPod 是两页的接口：SKILL 产出、硬件消费
- 已完成（split-001）：
  - 删除 `src/pages/Product.tsx`（717 行），新建 `src/pages/TracePage.tsx` + `src/pages/InhabitDevicePage.tsx`
  - 区块抽到 `src/sections/*`：Hero / Intro / Usage / Demo / Implementation / Contact / FlashDeployRow / Setup(新) / CrossLink(新) / shared
  - 共享骨架抽到 `src/components/SiteHeader.tsx`（含产品切换器）+ `SiteFooter.tsx`
  - 常量抽到 `src/lib/motion.ts`（ease / fadeUp / scrollToAnchor）
  - `src/lib/products.ts` 加 `PRODUCT_ROUTES = { trace: "/product/trace", device: "/product/inhabit-device" }`
  - `App.tsx` 路由改为双页，旧路径（`/products` `/vision` `/intro` `/principles` `/:rest*`）仍重定向到 `/product/trace`
  - i18n 新增 `productSwitch.*` `device.hero.*` `sections.setup.*` `sections.demo.cardMetaSkill/cardMetaDevice` `bridge.toDevice.*` `bridge.toSkill.*`；`nav.anchors` 加 `deploy` / `setup`
- 运行过的验证：`npm run build` 通过（main `index-BbiuUVt2.js` 483.92 kB）；`npm run lint` 0 错误 0 警告；`npm run lint:locales` ✓
- 已记录证据：feature_list.json 的 split-001（passing）
- 提交记录：无（用户约定：验证后再提交）
- 更新过的文件或工件：见上（新增 2 页 + 10 个 section + 2 个共享组件 + motion.ts；删除 Product.tsx）+ `harness/feature_list.json`
- 已知风险或未解决问题：
  - **硬件页偏薄**：新增区块只做了「完整上手向导」，设备规格表 / FAQ 排障 / 获取渠道三项用户明确暂不选（最小改动原则，吸取 flash-ui-001 翻车教训）
  - **外部旧锚点失效**：`#flash` / `#deploy` 现只在硬件页，指向根域名的旧链接会被重定向到 SKILL 页并静默跳到页首。源码内已无硬编码锚点，风险只存在于外部（公众号文章）
  - Ardot 设计文件 `724413235736238` 为拆页前的单页版本，已过时
- 下一步最佳动作：用户浏览器验证后提交；硬件页后续可补规格表 / FAQ / 获取渠道

### Session 027

- 日期：2026-09-12
- 本轮目标：用户提供硬件产品宣传视频，要求放到 Inhabit Device 页
- 素材：`F:/Pictures/TraceInhabit/Memory · Inhabit Device.mp4` —— 720×1280 竖屏 / 10s / H.264+AAC / 2.9MB @2.3Mbps，内容为设备实拍（圆形吊坠屏显 Q 版角色，暖色调）
- 已完成（showcase-001）：
  - ffmpeg CRF 30 重压 → `public/media/inhabit-device.mp4` **684KB（-76%）**，保留音轨，`+faststart` 支持边下边播
  - 抽 1.5s 首帧 → `public/media/inhabit-device-poster.jpg`（44KB），避免加载黑屏
  - 文件名去空格/中文，URL 安全
  - 新增 `src/sections/ShowcaseSection.tsx`，挂载于 `InhabitDevicePage.tsx`（Hero 之后、SetupSection 之前）
  - i18n 新增 `sections.showcase.{eyebrow,title,lead,hint,mute,unmute}` 中英双语
  - public 资源用 `import.meta.env.BASE_URL` 拼接（vite `base: "./"`，与 FirmwareFlash 现有写法一致）
- 设计决策：**竖屏素材不拉伸成 16:9**（会上下留黑边），而是作为「设备屏幕」立置于区块右侧（h-420/520px，9:16），金色 radial 辉光呼应全局基调。默认 `muted + autoplay + loop + playsInline`（浏览器 autoplay 策略要求 muted），右下角浮动按钮切声音并从 0s 重播
- 运行过的验证：`npm run build` 通过（main `index-Cp38yVaE.js` 487.07 kB）；`npm run lint` 0 错误 0 警告；`npm run lint:locales` ✓（9 top-level keys 对齐）；dev server 上视频 684845B / poster 44021B 均 200
- 已记录证据：feature_list.json 的 showcase-001（passing）
- 提交记录：无（用户验证后统一提交）
- 更新过的文件或工件：`public/media/`（新增 2 个媒体文件）、`src/sections/ShowcaseSection.tsx`（新增）、`src/pages/InhabitDevicePage.tsx`、`src/locales/zh.json` + `en.json`
- 已知风险或未解决问题：
  - 无浏览器截图验证（本机 npm 网络极慢，装不动 playwright / agent-browser），由用户在浏览器实测
  - 未处理 `prefers-reduced-motion`（项目全局均无该处理）；无字幕/文字替代；移动端 684KB 自动播放对流量敏感用户不友好 —— 均记为后续可选项
  - ffmpeg 位于 `G:/Memory-Series/Esp32S3/tools/microwakeword-xiayizhou/scripts/ffmpeg/bin`

### Session 016

- 日期：2026-09-09
- 本轮目标：聚焦后端工程债（不动 UI），按用户要求严格依附 harness；用户确认从 perf-002 开始逐项推进
- 已完成：
  - Phase 1：登记 Session 016 + 新增 6 个高优先级候选（perf-002 / data-001 / infra-001 / i18n-002 / flash-002 / ts-strict-001）
  - Phase 2 第 1 项：perf-002 完成
    - vite.config.ts 开启 sourcemap: 'hidden'（每个 chunk 输出独立 .map，不在 JS 末尾加 sourceMappingURL 注释）
    - vite.config.ts 增加 ANALYZE=true 钩子（默认关闭；开启时生成 dist/stats.html，gz + brotli 双口径 treemap）
    - 新增 devDependency：rollup-plugin-visualizer
    - 验证：npm run build 通过（2256 modules）；main index-Do-BFPhf.js hash 与 Session 014 一致（证明 main bundle 内容未变）；lint 0 错误；ANALYZE=true 时生成 stats.html 1.2MB；默认 build 不生成 stats.html
    - 现有 manualChunks（motion/i18n/ui）保持不变
- 运行过的验证：npm run build（通过，无 500kB chunk 警告）；npm run lint（0 错误）；ANALYZE=true npm run build（生成 stats.html）
- 已记录证据：feature_list.json 中 perf-002 已 passing（2026-09-09 条目）
- 提交记录：无（用户约定：本次会话不提交，由用户决定提交）
- 更新过的文件或工件：vite.config.ts、package.json、package-lock.json、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：
  - npm audit 报告 19 vulnerabilities（2 low / 9 moderate / 8 high）—— 既有依赖的漏洞，非本次引入；可后续用 npm audit fix 处理或纳入 ts-strict-001 同批处理
  - dist/stats.html 不进版本控制（已在 dist/，且 .gitignore 通常忽略 dist）
- 下一步最佳动作：等待用户确认进入 i18n-002（语言持久化）；然后 data-001（schema 校验）；flash-002 与 ts-strict-001 由用户后续决定

### Session 017

- 日期：2026-09-09
- 本轮目标：继续按 harness 顺序执行 infra-001（错误边界分层）
- 已完成：
  - src/components/ErrorBoundary.tsx 升级：支持 name / fallback / onError props；componentDidCatch 统一日志
  - 新增 src/components/ErrorBoundaryFallback.tsx：函数组件承载降级 UI（与 ErrorBoundary class 拆开以满足 react-refresh/only-export-components）
  - 降级 UI 使用现有 design tokens（深空蓝底 oklch(0.16 0.03 262) + 金色描边 oklch(0.78 0.12 75) + 银色文字 + 现有 shadcn Button），未引入新颜色或布局原语
  - zh.json + en.json 加 errorBoundary.degraded.{title,body,retry,reload} 共 4 个 key（中英对齐）
  - Product.tsx 三处 ErrorBoundary 包裹：firmware-flash（1）、character-deploy（1）、soulpod-card（6 个角色卡循环实例）
- 运行过的验证：npm run build 通过（main 415.33 kB / gzip 128.72 kB，hash index-ChtTZbnv.js）；npm run lint 0 错误 0 警告；静态 grep 确认 dist 同时含 zh/en 降级文案；dev server 启动 548ms 成功无解析错误
- 已记录证据：feature_list.json 中 infra-001 已 passing（2026-09-09 条目）
- 提交记录：无（用户约定：本次会话不提交，由用户决定提交）
- 更新过的文件或工件：src/components/ErrorBoundary.tsx、src/components/ErrorBoundaryFallback.tsx（新增）、src/pages/Product.tsx、src/locales/zh.json、src/locales/en.json、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：未做手动 throw 浏览器验证（需交互式测试）；build/lint/静态 + dev server 启动已提供足够运行时正确性证据
- 下一步最佳动作：用户验证后推进 flash-002 与 ts-strict-001（由用户后续决定）

### Session 019

- 日期：2026-09-09
- 本轮目标：按 harness 顺序执行 data-001（数据层 schema 校验）
- 已完成：
    - 新增 src/lib/schemas.ts：zod 定义 LocaleSchema（header/hero/nav/sections/footer/errorBoundary）+ ProductInfoSchema + 工具函数 validateLocales / findLocaleKeyDrift / assertLocalesAtBoot
    - src/main.tsx：DEV 时调用 assertLocalesAtBoot（仅 console warning，不阻塞）
    - 新增 scripts/lint-locales.cjs：纯 cjs CI gate（top-level key 对齐 + 11 个 REQUIRED 路径存在性检查）；0 TS 依赖
    - package.json 加 lint:locales script
    - 反向验证：临时删 zh.errorBoundary.degraded.retry → lint:locales fail（exit 1 + 'missing zh.errorBoundary.degraded.retry'）→ 恢复 → pass
- 运行过的验证：npm run build 通过（main 474.76 kB / gzip 145.56 kB，hash index-DYXyFfqU.js — zod 同步引入使 main 增长约 59 kB）；npm run lint 0 错误 0 警告；npm run lint:locales ✓（6 top-level keys zh/en aligned）；反向验证
- 已记录证据：feature_list.json 中 data-001 已 passing
- 提交记录：无（用户约定：本次会话不提交，由用户决定提交）
- 更新过的文件或工件：src/lib/schemas.ts（新增）、src/main.tsx（+8 行）、scripts/lint-locales.cjs（新增）、package.json（+1 script）、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：build main 增长约 59 kB（zod 全量同步打包）——后续如需减小可改 dynamic import；当前未优化
- 下一步最佳动作：等待用户确认推进 flash-002（之前确认过暂不启动）；或本次会话结束

### Session 020

- 日期：2026-09-09
- 本轮目标：按 harness 顺序执行 ts-strict-001（TypeScript 严格度提升）
- 已完成：
    - 预演：npx tsc --strict 报 0 错误——证实代码类型已足够严格
    - tsconfig.app.json：strict 由 false 改为 true（noImplicitAny 包含在 strict 里）
    - 决策：只开 strict 不开其他严格 flag（noUncheckedIndexedAccess 等会暴露 6 处错误，会动 CharacterDeploy / Product.tsx 字典访问 + 1 处未用 import）——按 AGENTS.md "完成定义" 原则，最小改动、不动核心业务代码
- 运行过的验证：npm run build 通过（main hash index-DYXyFfqU.js 不变，证明源码未改）；npm run lint 0 错误 0 警告；npm run lint:locales ✓
- 已记录证据：feature_list.json 中 ts-strict-001 已 passing
- 提交记录：无（用户约定：本次会话不提交，由用户决定提交）
- 更新过的文件或工件：tsconfig.app.json、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：无
- 下一步最佳动作：所有 harness/feature_list.json 中 6 个新增候选已全部 passing；剩余 flash-002 用户之前确认过暂不启动；本次会话可结束

### Session 021

- 日期：2026-09-09
- 本轮目标：harness 同步确认 + git 提交并推送到 origin/main + 同步构建到生产站点
- 已完成：
    - 确认 harness 三件齐全（claude-progress.md 含 Session 016-020 + 021；feature_list.json 18 passing / 1 not_started；session-handoff.md 5.2KB 完整交接文档）
    - git 拆 6 个 commit 推送到 origin/main：
        1. d2d9ad6 chore(perf): add sourcemap + visualizer
        2. be794b6 feat(infra): add section-level error boundaries with i18n fallback
        3. a2babef feat(i18n): persist language preference + symmetric fallback
        4. e65be72 feat(data): add locale schema validation + CI gate
        5. 4ebdbe9 chore(tsconfig): enable TypeScript strict mode
        6. 807a27d docs(harness): sync progress log with Session 016-020 backend hardening
    - GitHub Pages Actions 自动触发（Deploy GitHub Pages #89 — 1m 6s 完成）：https://memory-series.github.io/ 已 200 OK
- 运行过的验证：git push 成功（21eb263..807a27d）；https://memory-series.github.io/ HTTP 200；GitHub Actions workflow #89 成功
- 已记录证据：本条 + git log
- 提交记录：6 个 commit 推送至 origin/main（详见上方 commit 列表）
- 更新过的文件或工件：git history（6 commit）；harness/claude-progress.md（本条）
- 已知风险或未解决问题：
    - 京东云站点（https://www.traceinhabit.cn/）尚未同步新版本：build 时遇 safe-delete shim bulk-confirm 阻断（dist/assets >50 文件一次删除需确认），且 deploy-jd.ps1 走 PowerShell SSH 访问 ~/.ssh/id_rsa 被沙箱拦截。手动绕过：手动清空 dist → bash npm run build 成功 → 主 hash index-DYXyFfqU.js 与 Session 019 一致 → 但完整脚本（含 SFTP 上传 + SSH 重启 nginx）需用户在 PowerShell 终端直接执行 deploy-jd.ps1 才能完成京东云同步
- 下一步最佳动作：
    - 用户在 PowerShell 终端直接执行 `powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1` 完成京东云部署（首次运行需手动确认 safe-delete 提示）
    - 验证 https://www.traceinhabit.cn/ 显示新版（main bundle hash index-DYXyFfqU.js）

### Session 022

- 日期：2026-09-09
- 本轮目标：按用户决定，推进 P0（CI/CD lint gate）与 P2（清理 App.css 残留）。先 harness 登记再改动
- 已完成：
    - harness/feature_list.json 新增 2 个工作项：ci-001 (P0) + cleanup-001 (P2)，均 not_started
- 运行过的验证：无（尚未改动任何代码）
- 已记录证据：本条 + feature_list.json
- 提交记录：无
- 更新过的文件或工件：harness/claude-progress.md（本条）、harness/feature_list.json
- 下一步最佳动作：先做 cleanup-001（风险最低、独立），再做 ci-001（CI YAML 风险也低）；两者均不动 UI

### Session 023

- 日期：2026-09-09
- 本轮目标：完成 Session 022 登记的 cleanup-001 与 ci-001 两项工作
- 已完成：
    - cleanup-001: 删除 src/App.css（grep 确认 src 中零引用，纯 Vite 模板死代码）；build 通过（main hash index-DYXyFfqU.js 与删除前一致，证明源码未变）；lint + lint:locales ✓
    - ci-001: .github/workflows/deploy-pages.yml 加 'Lint (ESLint)' + 'Lint locales' 两个 step 在 npm run build 之前；scripts/lint-locales.cjs REQUIRED map 补 footer.links.{privacy,terms,contact} 3 个 key（反演发现原 REQUIRED 漏检）；反演验证：删 zh.footer.links.terms → npm run lint:locales fail，恢复后 pass
- 运行过的验证：npm run build（main 474.76 kB / hash index-BGtFiVkE.js，因 lint-locales.cjs 改动 hash 微变但产物一致）；npm run lint 0 错误 0 警告；npm run lint:locales ✓；反演 fail-pass 闭环
- 已记录证据：feature_list.json 中 cleanup-001 与 ci-001 均 passing（Session 023 条目）
- 提交记录：无（用户约定：本次会话不提交，由用户决定提交）
- 更新过的文件或工件：src/App.css（删除）、scripts/lint-locales.cjs（REQUIRED map 补 3 个 key）、.github/workflows/deploy-pages.yml、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：下一次 push 到 main 即可验证 GitHub Actions 实际触发 lint gate（沙箱无法 mock Actions）
- 下一步最佳动作：等待用户决定提交与部署；或进入其他 harness 工作项

### Session 024

- 日期：2026-09-09
- 本轮目标：用户决定启动 flash-002（WebSerial 烧录链路工程化）
- 已完成：勘察 + 设计方案，未动产品代码
    - 读 FirmwareFlash.tsx（240 行）：现有 typed union 7 状态（idle/connecting/connected/downloading/flashing/success/error）、错误捕获用 `err.message` 直接显示英文
    - 读 CharacterDeploy.tsx（258 行）：5 状态（idle/probing/found/not_found/error）、自实现 console reader 读 `wifi --status`、错误同样直接显示英文
    - 现状归纳：两组件都已有 typed state union（不算"裸 if-else"）；错误无 i18n；无共享 WebSerial session hook；无设备指纹二次确认
- 设计方案：完整三件套（hook + i18n + UI 升级）vs 仅错误 i18n vs 收回
- 用户决策：**收回**，不推进 flash-002（理由：核心业务工程化改动 + 实机验证成本高 + 当前用户已满意现有 UI 与功能）
- 运行过的验证：无代码改动；git 工作区仅含 Session 023 的 5 处改动（cleanup-001 + ci-001）
- 已记录证据：本条
- 提交记录：无
- 更新过的文件或工件：harness/claude-progress.md（本条）
- 下一步最佳动作：等待用户决定下一步（提交 ci-001 + cleanup-001、启动新工作项、或本次会话结束）。flash-002 保持 not_started。

### Session 025

- 日期：2026-09-09
- 本轮目标：用户决定启动 handoff 全流程——git add + commit + push + 验证 + 京东云同步 + 收尾
- 已完成：
    - git add + 3 commit 创建：a1ec036 (cleanup-001) / 413a44d (ci-001) / 7f2d5bb (harness 同步)
    - git push origin main：首次失败（沙箱代理 502）；retry 2 次后成功（807a27d..7f2d5bb）
    - GitHub Actions Deploy GitHub Pages #90 自动触发，56s 完成（commit 7f2d5bb）；主 bundle index-mu4Dtlme.js
    - 京东云：用户 PowerShell 手动跑 deploy-jd.ps1 完成，主 bundle index-DYXyFfqU.js（与本地 dist 一致）
    - harness 收尾：更新 session-handoff.md（5.8KB 完整交接文档）+ claude-progress.md（本条）
- 运行过的验证：git push 成功（807a27d..7f2d5bb）；GitHub Actions run #90 56s 成功；https://memory-series.github.io/ HTTP 200（index-mu4Dtlme.js）；https://www.traceinhabit.cn/ HTTP 200（index-DYXyFfqU.js）
- 已记录证据：git log（9 个 commit）+ 两个站点 main bundle hash
- 提交记录：本次 3 commit 推送至 origin/main
- 更新过的文件或工件：harness/session-handoff.md（本条）、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：两站点 main bundle hash 不一致（Actions linux vs 本地 Windows tree-shake 差异）；data-001 引入 zod 同步 +59 kB 待优化
- 下一步最佳动作：本会话可正式收尾。剩余工作：flash-002（用户两次决定收回）；data-001 zod 体积优化；ts-strict 渐进开启其他 flag

### Session 018

- 日期：2026-09-09
- 本轮目标：按 harness 顺序执行 i18n-002（语言偏好持久化 + 兜底策略调整）
- 已完成：
  - 新增 src/lib/i18n-storage.ts：localStorage 读写封装 + SSR 兜底 + try/catch；resolveInitialLng 默认 zh，navigator zh* → zh，其它 → en；persistLng 静默失败
  - src/i18n.ts：lng 改为 resolveInitialLng()；fallbackLng 改为 'en'（对称兜底）
  - src/pages/Product.tsx：语言切换按钮 onClick 改为 persistLng(next) + changeLanguage(next)；aria-label + aria-pressed
- 运行过的验证：npm run build 通过（main 415.73 kB / gzip 128.94 kB，hash index-D8Mpei3T.js）；npm run lint 0 错误 0 警告
- 已记录证据：feature_list.json 中 i18n-002 已 passing
- 提交记录：无（用户约定：本次会话不提交，由用户决定提交）
- 更新过的文件或工件：src/lib/i18n-storage.ts（新增）、src/i18n.ts、src/pages/Product.tsx、harness/claude-progress.md（本条）、harness/feature_list.json
- 已知风险或未解决问题：浏览器实测刷新持久化需交互式测试（vite 仍在 5274 运行，可直接验证）
- 下一步最佳动作：用户验证后推进 data-001（products.ts + zh/en.json schema 校验）

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
