# 会话交接

## 当前已验证

- 现在明确可用的部分：`npm run build` 通过；`npm run lint` 0 错误 0 警告；`npm run lint:locales` 通过；`npm run dev` 可启动；**双路由页面结构**（split-001）与**硬件页产品影片区块**（showcase-001）均已由用户在浏览器实测确认无问题。
- 本轮实际跑过的验证：
    - `npm run build`（tsc -b → 0；vite build → 0；main `index-Cp38yVaE.js` 487.07 kB / gzip 149.23 kB）——干净重建（先清空 dist）
    - `npm run lint`（ESLint → 0 错误 0 警告）
    - `npm run lint:locales`（9 top-level keys zh/en aligned）
    - dev server（:5173）上 `/media/inhabit-device.mp4` 684845B / `-poster.jpg` 44021B 均 HTTP 200
    - 用户浏览器实测两个页面，确认无问题
    - `git push origin main` 成功（`f094616..61132a1`）
    - GitHub Actions run #34662124552：build 46s（Lint ESLint ✓ / Lint locales ✓ / build ✓）+ deploy 9s ✓
    - 线上 https://memory-series.github.io/ → 200，主 bundle `index-2BFTwUJQ.js`，其内 showcase 文案 / 视频路径 / 双路由 / bridge key 全部 FOUND；`/media/inhabit-device.mp4` 200 684845B、`-poster.jpg` 200 44021B

## 本轮改动

本次会话（2026-09-12 凌晨）完成 2 项工作，性质与往轮不同——**首次涉及可见 UI 与信息架构改动**：

### split-001（P1，architecture）— 单页拆分为双产品页

**背景**：原 `src/pages/Product.tsx`（717 行单页）把两个产品混在一条叙事线里——Trace/Inhabit SKILL（软件）与 ESP32-S3 硬件（固件烧录 + 角色部署）。读者从「提取人格」被要求「插 USB 烧固件」，心智模型断裂。

- 删除 `src/pages/Product.tsx`；新建 `src/pages/TracePage.tsx` + `src/pages/InhabitDevicePage.tsx`
- 区块抽到 `src/sections/*`：Hero / Intro / Usage / Demo / Implementation / Contact / FlashDeployRow / **Setup**(新) / **CrossLink**(新) / shared
- 共享骨架抽到 `src/components/SiteHeader.tsx`（含产品切换器）+ `SiteFooter.tsx`
- 常量抽到 `src/lib/motion.ts`（ease / fadeUp / scrollToAnchor）—— 为绕开 ESLint `react-refresh/only-export-components`
- `src/lib/products.ts` 加 `PRODUCT_ROUTES`；`App.tsx` 双页路由，旧路径全部重定向到 `/product/trace`
- 硬件页新增「完整上手向导」（SetupSection）；两页底部各一张桥接卡（SoulPod 是接口：SKILL 产出、硬件消费）
- 角色卡两页都放，语义不同（SKILL=产出展示 / Device=可部署角色库）

### showcase-001（P2，content）— 硬件页产品影片区块

- 源素材 `F:/Pictures/TraceInhabit/Memory · Inhabit Device.mp4`（720×1280 竖屏 / 10s / H.264+AAC / 2.9MB）
- ffmpeg CRF 30 重压 → `public/media/inhabit-device.mp4` **684KB（-76%）** + `+faststart`；抽 1.5s 首帧为 poster（44KB）
- 新增 `src/sections/ShowcaseSection.tsx`，挂载于硬件页 Hero 之后、Setup 之前
- 设计决策：竖屏素材不拉伸成 16:9，作为「设备屏幕」立置于区块右侧；金色辉光呼应基调；默认静音自动循环播放，右下角按钮切声音

### 完整改动清单

**新增文件**：
- `src/pages/TracePage.tsx`、`src/pages/InhabitDevicePage.tsx`
- `src/sections/`：`HeroSection` `IntroSection` `UsageSection` `DemoSection` `ImplementationSection` `ContactSection` `FlashDeployRow` `SetupSection` `CrossLinkSection` `ShowcaseSection` `shared`
- `src/components/SiteHeader.tsx`、`src/components/SiteFooter.tsx`
- `src/lib/motion.ts`
- `public/media/inhabit-device.mp4`（684KB）、`public/media/inhabit-device-poster.jpg`（44KB）

**删除文件**：
- `src/pages/Product.tsx`（717 行，内容全部拆到 sections）

**修改文件**：
- `src/App.tsx`（双页路由 + 旧路径重定向）
- `src/lib/products.ts`（+ `PRODUCT_ROUTES`）
- `src/locales/zh.json` + `en.json`（+ `productSwitch` `device.hero` `sections.setup` `sections.showcase` `sections.demo.cardMeta*` `bridge.*` `nav.anchors.{deploy,setup}`）
- `harness/AGENTS.md`（页面结构描述修正 + lint/locales 命令现状）
- `harness/claude-progress.md`（头部当前状态 + Session 026/027）
- `harness/feature_list.json`（23 项：22 passing / 1 not_started）
- `harness/session-handoff.md`（本文件）

## 仍损坏或未验证

- 已知缺陷：无
- 未验证路径：
    - **本机无浏览器自动化环境**（npm 网络极慢，playwright / agent-browser 装不动）——所有页面验证均依赖用户手动浏览器实测，本轮已确认通过
    - infra-001 的 ErrorBoundary 降级 UI 浏览器手动 throw 验证仍缺
    - ts-strict-001 其他 strict flag（`noUncheckedIndexedAccess` 等）按最小改动原则未开启
    - showcase-001 的 `prefers-reduced-motion` / 字幕文字替代 / 移动端流量优化均未做（记为可选后续，非 blocker）
- 下一轮会话需要注意的风险：
    - **外部旧锚点失效**：`#flash` / `#deploy` 现只在硬件页。指向根域名的旧链接（如公众号文章）会被重定向到 SKILL 页并静默跳到页首。源码内已无硬编码锚点，风险只在外部
    - **硬件页偏薄**：设备规格表 / FAQ 排障 / 获取渠道三项用户明确暂不选（Session 026 决策），硬件页目前是「影片 + 向导 + 烧录部署 + 角色卡」
    - **Ardot 设计文件 `724413235736238` 已过时**——它是拆页前的单页版本，后续若要在 Ardot 里调 UI，需先同步成双页结构
    - 两站点 bundle hash 可能不一致（Actions linux vs 本地 Windows tree-shake 差异），功能一致
    - npm audit 19 vulnerabilities（既有依赖，非本轮引入）
    - data-001 引入 zod 同步打包 main +59 kB，可后续 dynamic import 优化
    - **bash 环境注意**：本机 Git Bash 的 coreutils（`ls`/`head`/`tail`/`dirname`）与 safe-delete shim 在部分会话中不可用；PowerShell 输出捕获也可能失效。可靠路径是用 Python 绝对路径调用 `subprocess` 跑 node 命令（本轮用 `.workbuddy/verify.py` 完成全量验证）

## 下一步最佳动作

- **本次会话最高优先级未完成功能**：无业务功能阻塞。
- **未 passing 工作项**：flash-002（WebSerial 烧录链路工程化）—— 用户两次决策"收回"。保持 not_started。
- **可选后续工作**（按 ROI 排序）：
    1. 硬件页补区块：设备规格参数表 / FAQ 排障 / 获取渠道（P2，用户明确说要单独开一轮）
    2. 同步 Ardot 设计文件为双页结构（P2，便于后续 UI 调整）
    3. showcase 无障碍与流量优化：`prefers-reduced-motion`、字幕、点击加载（P3）
    4. data-001 zod 体积优化（dynamic import，main -59 kB，P3）
    5. vitest 配置（未来 flash-002 启动前先加测试基建，P2）
- **这一步中哪些东西不要动**：split-001 的区块归属与路由结构（已实测通过）；showcase-001 的竖屏「设备屏幕」呈现方式（竖屏是优势不是缺陷，不要改成 16:9）；7 项 passing 后端工程的所有改动；不要恢复 ts-strict 的 `strict: false`

## 命令

- 启动命令：`npm run dev`（localhost:5173）
- 验证命令：`npm run build`
- 定向调试命令：`npm run lint`、`npm run lint:locales`
- 体积分析命令：`ANALYZE=true npm run build`（生成 dist/stats.html）
- 部署命令：见 `harness/docs/deployment.md`
- GitHub Pages：自动（push 到 main 触发；含 lint gate）
- 京东云：`powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1`（需用户手动，沙箱拦截 SSH）

## Git 状态（已推送）

```
61132a1 feat(ui): split site into two product pages and add device product film   (本轮，已推送 = origin/main)
f094616 docs(harness): closeout Session 025 — git add + commit + push + deploy
```
工作区干净。

## 部署目标状态

| 部署目标 | URL | 主 bundle hash | 状态 |
|---|---|---|---|
| **GitHub Pages** | https://memory-series.github.io/ | `index-2BFTwUJQ.js` | ✅ Actions run #34662124552（build 46s + deploy 9s）；线上 bundle 特征全 FOUND，媒体 200 |
| **京东云** | https://www.traceinhabit.cn/ | `index-DYXyFfqU.js` | ⚠️ **仍是单页旧版**——用户本轮明确要求暂不同步；需另行 `powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1` |
| **本地 dist** | G:\Memory-Series\Memory-Series.github.io\dist | `index-Cp38yVaE.js` | ✅ 干净重建通过（Windows 构建，与 Pages 的 linux hash 不同属已知差异） |
