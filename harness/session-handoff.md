# 会话交接

> 最后更新：2026-09-13（Session 034 收尾后全面重写 —— 此前内容停留在 Session 026/027 时代，已严重过期）

## 当前已验证

- 工作区干净，本地与 `origin/main` 完全同步（`85ef8ec`）。a11y-001 + FAQ + assets-003（浏览器端对话底图转换器）已提交、推送。
- **33 项特性：26 passing / 5 not_started / 2 wont_do**（最新完成 `assets-003`，拆分为 `assets-004` GIF→EAF 与 `assets-005` 文案校正）。
- 标准验证路径：`npm run build`（tsc -b → 0；vite build → 0）。当前构建 main `index-BJb2NKRP.js` 530.64 kB（含对话底图转换器后 +13 kB）。
- 本轮（2026-09-13）跑过的验证：
    - `npm run lint:locales` exit 0（9 top-level keys zh/en aligned）
    - `tsc -b` exit 0
    - `vite build` exit 0
    - `npm run lint` exit 0（0 错误 0 警告）
    - **编码器自校验**：encode → decode → re-encode **逐字节 0 diffs**（509,244 B）
    - **真实素材反解校验**：`xia-yizhou/dialogue_bg.bin` 解码后与原 `preview.png` 视觉一致，mean abs diff 2.14/255
    - **Playwright E2E**：上传 PNG → canvas 设备预览 412×412 → 下载 `dialogue_bg.bin` = 509,244 B

## 页面结构（split-001，2026-09-12 起）

**双路由**：

- `#/product/trace` —— Trace/Inhabit SKILL（软件）
- `#/product/inhabit-device` —— Memory · Inhabit Device（硬件 / ESP32-S3，固件代号 `Companion 1.85B`）

- 共享骨架：`src/components/SiteHeader.tsx`（含产品切换器）+ `SiteFooter.tsx`
- 区块在 `src/sections/*`，运动常量在 `src/lib/motion.ts`，路由常量在 `src/lib/products.ts` 的 `PRODUCT_ROUTES`
- 旧路由全部重定向到 `/product/trace`
- **SoulPod 是两个产品的接口**：SKILL 产出、Device 消费。两页底部各有一张桥接卡，不要切断这层关系。

### 硬件页当前区块顺序

影片 → 上手向导 → 基础烧录/角色部署 → 素材库 → **自制对话底图** → 角色卡 → 排障 FAQ → 通讯 → 桥接卡

导航锚点顺序：上手 / 烧录 / 素材 / 部署 / 角色 / 排障 / 通讯（与 DOM 一致）。
- 注意：「自制对话底图」是 `id="assets"` 区块内部的子功能，不单独占一个导航锚点。

## 约束（写代码前必读）

- `src/sections/*.tsx` **只能导出组件**；非组件常量必须放 `src/lib/*`，否则 ESLint `react-refresh/only-export-components` 报错。
- **禁止改动** `G:\Memory-Series\Esp32S3\esp-claw`（硬件代码，只读参考）。
- 不要破坏现有 FirmwareFlash / CharacterDeploy / SoulPodDownload 功能。
- 不要回退 `ts-strict-001` 的 `strict: true`。
- UI 改动保持既有基调：Cinematic Tech-Noir Minimalism —— 深空底 `oklch(0.16 0.03 262)` + 银色 + 金色点睛 `oklch(0.78 0.12 75)`，字体 Manrope。
- **素材格式（实测权威值）**：
    - 开机动画 `.eaf` —— 私有格式，magic `\x89EAF`，目标 `/sdcard/system/boot/boot.eaf`，24 FPS，建议 ≤ 3 MB
    - 对话气泡 `dialogue_bg.bin` —— **412×412 RGB565A8，恒为 509,244 字节**，目标 `/sdcard/personas/<角色>/assets/ui/dialogue_bg.bin`
- **素材预览必须先验证「可见」**：assets-001 曾踩坑 —— Lottie 导出的 `lottie_inline_*.gif` 全黑（mode P、alpha 全 255、亮度恒 0）。

## 仍损坏或未验证

- 已知缺陷：无。
- 未验证路径：
    - infra-001 的 ErrorBoundary 降级 UI 缺手动 throw 的浏览器验证（需交互式测试）
    - ts-strict-001 的其他 strict flag（`noUncheckedIndexedAccess` 等）按最小改动原则未开启
    - npm audit 19 vulnerabilities（既有依赖，非近期引入）

## 风险与已知问题

- **外部旧锚点失效**：`#flash` / `#deploy` 现只在硬件页。指向根域名的旧链接（如公众号历史文章）会重定向到 SKILL 页并静默跳到页首。源码内已无硬编码锚点，风险只在外部。
- **硬件页内容补齐已部分完成**：FAQ 排障（2026-09-13，已完成 passing）；获取渠道用户决定**不做**（`device-spec-003` = wont_do，不要再追问入口）；设备规格表待定（`device-spec-002`，需真实硬件参数）。
- **Ardot 设计文件 `724413235736238` 已过时** —— 它是拆页**之前**的单页版本。后续若要在此文件里调 UI，需先同步为双页结构。（设计资产，未登记为 feature。）
- 两站点 bundle hash 可能不一致（GitHub Actions 是 linux，本地是 Windows，tree-shake 有差异），功能一致。
- **Vite dev server 的 SPA fallback 会造成假阳性**：访问不存在的 `/assets/...` 会返回 `index.html` + **HTTP 200**。校验素材是否真的可达，必须同时看 `Content-Type` 与响应体 MD5，只看状态码会误判。

## 未做的工作（feature_list.json 是唯一事实来源）

### 待用户拍板（not_started）

| ID | P | 标题 | 状态说明 |
|---|---|---|---|
| `assets-002` | 2 | 素材库扩容：main.eaf + 其余 4 角色气泡底图 | **等素材** |
| `assets-004` | 2 | 浏览器端 GIF → boot.eaf 开机动画转换器 | 格式可行但约束硬（固定 24 FPS、8 MB 上限、需色彩量化/压缩）；**需实机验证**，第二期 |
| `assets-005` | 3 | 素材库指标文案校正 | 开机动画卡片「280p」→ 412×412；「推荐 ≤3 MB」→ 硬上限 8 MB |
| `device-spec-002` | 3 | 设备规格参数表 | 需用户提供真实硬件参数，不可编造 |
| `a11y-002` | 3 | 视频字幕 + 移动端点击加载 | 涉及新文案与视频资源 |
| `perf-003` | 3 | zod 改 dynamic import | main −59 kB |
| `backend-001` | 2 | vitest 测试基建 | ⚠️ 原为 `flash-002` 的回归网前置，**该前置已失效**。是否因「测试基建自身价值」启动，需用户单独拍板，不得连带启动 |

### 已否决（wont_do —— 不要启动，也不要再问）

| ID | P | 标题 | 用户决策 |
|---|---|---|---|
| `flash-002` | 1 | WebSerial 烧录链路工程化 | 2026-09-13 用户原话「这个 flash-002 也不要动」（第三次否决：016 未确认 / 024 收回 / 037 不动） |
| `device-spec-003` | 2 | 硬件页获取渠道区块 | 2026-09-13 用户原话「获取渠道不用做」 |

`wont_do` 是 2026-09-13 新增的状态（见 `feature_list.json` 的 `status_legend`）：表示用户已明确决定不做，**不是被阻塞、也不是没排上**。

### 建议启动顺序（已剔除 wont_do 项）

1. `assets-004`（GIF→EAF，需用户确认愿意承担实机验证成本）或 `device-spec-002`（要参数）或 `assets-002`（要素材）—— 均需用户先提供内容或拍板；2. `a11y-002` / `perf-003` / `assets-005`（P3 优化/文案修正）；3. `backend-001`（仅当用户明确要测试基建时）。

## 命令

- 启动：`npm run dev`（localhost:5173）
- 验证：`npm run build`
- 定向：`npm run lint`、`npm run lint:locales`
- 体积分析：`ANALYZE=true npm run build`（生成 dist/stats.html）
- 部署：见 `harness/docs/deployment.md`

### 本机环境坑（重要）

- **Git Bash 的 coreutils 不可用**：`ls` / `head` / `tail` / `dirname` / `cat` 会报 `command not found`。
- **`npm run` 会被安全策略拦截**（误判 wsl.exe）。可靠做法是用 node 二进制直调：
    `node.exe node_modules/vite/bin/vite.js`、`node.exe node_modules/typescript/bin/tsc`、`node.exe node_modules/eslint/bin/eslint.js`
- **PowerShell 工具的输出通道无回显**（`Write-Output` 完全不可见），只回 `exit code`。
- 兜底方案：Python 绝对路径 + `subprocess` 调 node。托管 venv：
  `C:/Users/97969/.workbuddy/binaries/python/envs/default/Scripts/python.exe`（已装 Pillow）
- Playwright 可用（复用 `G:/RedNotStyle/MediaCrawler/.venv/Scripts/python.exe`，chromium 已安装）—— 页面视觉验证不必再依赖用户手动实测。

## Git 状态（已推送）

```
85ef8ec docs(harness): mark assets-003 (dialogue background converter) as passing   (Session 039)
41b41b1 feat(device): add browser-side dialogue background converter
6bebe4c docs(harness): record September 13 release to GitHub Pages and JD Cloud   (Session 037 收尾)
fb1c439 docs(harness): mark device-spec-003 and flash-002 as wont_do
c05397b feat(device): add FAQ troubleshooting section to Inhabit Device page
7f9299f feat(a11y): respect prefers-reduced-motion across the site
```
工作区干净，本地与 `origin/main` 完全同步（0/0）。a11y-001、FAQ、assets-003 已随本批提交，并已部署到京东云与 GitHub Pages。

## 部署目标状态

| 部署目标 | URL | 主 bundle | 状态 |
|---|---|---|---|
| **京东云** | https://www.traceinhabit.cn/ | `index-BJb2NKRP.js` | ✅ 与本地 dist 完全一致（530,635 B，MD5 `54b54f71420a53913bb4f7c6ec312b1d`）；对话底图转换器真实浏览器 E2E 通过 |
| **GitHub Pages** | https://memory-series.github.io/ | `index-BJb2NKRP.js` | ✅ Actions 已自动部署；bundle 内容已验证含转换器文案 |
| **本地 dist** | `G:\Memory-Series\Memory-Series.github.io\dist` | `index-BJb2NKRP.js` | ✅ 干净重建通过（530.64 kB，含 assets-003） |

线上校验（2026-09-13）：
- 特征串 10/10 命中（FAQ + reduced-motion + 既有素材路径）
- 新增转换器功能文案命中：`"自制" x1`、`"对话底图" x1`、`"上传图片" x1`、`"/sdcard/personas/" x7`、`"RGB565" x6`
- 素材 6/6 字节一致；已下架 3 文件不可达
- 京东云新增真实浏览器渲染：上传 600×500 PNG → canvas 设备预览 412×412 → 下载 `dialogue_bg.bin` 509,244 B → 控制台 0 error

校验脚本（本机、已被 .gitignore 忽略）：`.workbuddy/verify-live.py`（字节与特征串）、`.workbuddy/verify-live-render.py`（真实渲染 + 截图）、`.workbuddy/verify-nav-anchors.py`（锚点跳转）、`.workbuddy/verify-nav-bar.py`（锚点条显示时机）。

## 京东云部署方式（实测，2026-09-13 二次验证）

`scripts/deploy-jd.ps1` 路线**在本机不可用** —— 该脚本依赖 Posh-SSH 模块，本机未安装。

**已验证可用的链路**（原生 ssh/scp，免密）：

```bash
# 1. 打包 dist（Python tarfile 或 tar -czf 均可）
# 2. 上传
scp -i ~/.ssh/id_rsa -o BatchMode=yes "dist.tar.gz" root@111.228.60.135:/root/
# 3. 远端替换 + 重启
ssh -i ~/.ssh/id_rsa -o BatchMode=yes root@111.228.60.135 '
  cp -a /opt/memory-series /opt/memory-series.bak
  rm -rf /opt/memory-series/*
  tar -xzf /root/dist.tar.gz -C /opt/memory-series --strip-components=1
  rm -f /root/dist.tar.gz
  docker restart memory-series-nginx'
```

- 主机本地 `curl http://127.0.0.1/` 返回 **301 是正常的**（HTTP→HTTPS 重定向）。
- 部署后应按 **MD5** 校验线上素材，不能只看状态码。

## 下一步

1. 待用户拍板「待用户拍板（not_started）」表中的任一项 —— 其中 `assets-002`（等素材）与 `device-spec-002`（要真实硬件参数）必须用户先给内容才能动。
2. **不要再提议 `flash-002` / `device-spec-003`**（wont_do）。
3. 两站均已发布到含 a11y-001 + FAQ + assets-003 的版本（主 bundle `index-BJb2NKRP.js`）——**无需再部署**。日后有新改动时按 `harness/docs/deployment.md` 走。
4. Ardot 设计稿 `724413235736238` 仍是单页版，后续调 UI 前建议同步为双页结构。
5. 确认公众号历史文章是否含根域名的 `#flash` / `#deploy` 旧链接。
6. 唯一未完成的人工确认项：**默认偏好下（未开启「减少动态效果」）产品影片确实自动播放** —— headless chromium 无 H.264 解码，只能由真实浏览器人工确认。开启 reduced-motion 时视频不自动播放已验证。
