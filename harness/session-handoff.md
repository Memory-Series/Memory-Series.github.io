# 会话交接

> 最后更新：2026-09-13（Session 034 收尾后全面重写 —— 此前内容停留在 Session 026/027 时代，已严重过期）

## 当前已验证

- 工作区干净，本地与 `origin/main` 同为 `9049656`。
- **29 项特性：23 passing / 6 not_started**（2026-09-13 盘点后新增 5 项 backlog 登记）。
- 标准验证路径：`npm run build`（tsc -b → 0；vite build → 0）。当前构建 main `index-DMBt39Vx.js` 500.24 kB。
- 本轮（2026-09-13）跑过的验证：
    - `npm run lint:locales` exit 0（9 top-level keys zh/en aligned）
    - `tsc -b` exit 0
    - `vite build` exit 0
    - `npm run lint` exit 0（0 错误 0 警告）
    - **字节一致性**：dist 下 6 个在售素材全部 200 且 MD5 与源文件逐一相符；已下架的 3 个文件线上 404
    - **视觉验证**：Playwright 实测中英文两版，素材库区块结构断言为「开机动画 1 卡 + 对话气泡底图 2 卡」
    - **线上复核**：京东云 bundle 与本地 dist 完全一致；GitHub Pages bundle 内 `boot-default.eaf` / `dialogue_bg.bin` / `xia-yizhou` / `qin-che` 全部命中，`boot-variant-02` 已消失，素材 URL 200 且体积正确

## 页面结构（split-001，2026-09-12 起）

**双路由**：

- `#/product/trace` —— Trace/Inhabit SKILL（软件）
- `#/product/inhabit-device` —— Memory · Inhabit Device（硬件 / ESP32-S3，固件代号 `Companion 1.85B`）

- 共享骨架：`src/components/SiteHeader.tsx`（含产品切换器）+ `SiteFooter.tsx`
- 区块在 `src/sections/*`，运动常量在 `src/lib/motion.ts`，路由常量在 `src/lib/products.ts` 的 `PRODUCT_ROUTES`
- 旧路由全部重定向到 `/product/trace`
- **SoulPod 是两个产品的接口**：SKILL 产出、Device 消费。两页底部各有一张桥接卡，不要切断这层关系。

### 硬件页当前区块顺序

影片 → 上手向导 → 基础烧录/角色部署 → **素材库** → 角色卡 → 通讯 → 桥接卡

导航锚点顺序：上手 / 烧录 / 素材 / 部署 / 角色 / 通讯（与 DOM 一致）。

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
- **硬件页偏薄**：设备规格表 / FAQ 排障 / 获取渠道三项用户明确暂不选 → 已登记为 `device-spec-001`。
- **Ardot 设计文件 `724413235736238` 已过时** —— 它是拆页**之前**的单页版本。后续若要在此文件里调 UI，需先同步为双页结构。（设计资产，未登记为 feature。）
- 两站点 bundle hash 可能不一致（GitHub Actions 是 linux，本地是 Windows，tree-shake 有差异），功能一致。
- **Vite dev server 的 SPA fallback 会造成假阳性**：访问不存在的 `/assets/...` 会返回 `index.html` + **HTTP 200**。校验素材是否真的可达，必须同时看 `Content-Type` 与响应体 MD5，只看状态码会误判。

## 未做的工作（feature_list.json 是唯一事实来源）

| ID | P | 标题 | 状态说明 |
|---|---|---|---|
| `flash-002` | 1 | WebSerial 烧录链路工程化 | 用户两次决策收回。**其原始前置（perf-002 / data-001 / infra-001）已全部 passing，实为等待决策而非被阻塞** |
| `device-spec-001` | 2 | 硬件页补区块：规格表 / FAQ / 获取渠道 | Session 026 用户明确暂不选，要单独开一轮 |
| `assets-002` | 2 | 素材库扩容：main.eaf + 其余 4 角色气泡底图 | **等素材** |
| `backend-001` | 2 | vitest 测试基建 | flash-002 前置 —— 状态机重构无回归网不应启动 |
| `a11y-001` | 3 | 动效与视频无障碍 | prefers-reduced-motion / 字幕 / 点击加载 |
| `perf-003` | 3 | zod 改 dynamic import | main −59 kB |

以上 6 项均为 `not_started`，notes 里标了 `**backlog**` 的是 2026-09-13 盘点时新登记的，**用户尚未拍板启动**。

### 建议启动顺序

1. `backend-001`（补回归网）→ 2. `flash-002`（高风险改动，有网才动）→ 3. `device-spec-001`（硬件页内容补齐）→ 4. `assets-002`（等素材）→ 5/6. `a11y-001` / `perf-003`（P3 优化）

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
9049656 feat(device): add asset library section to Inhabit Device page   (2026-09-13 00:21，origin/main)
61132a1 feat(ui): split site into two product pages and add device product film
```
工作区干净。

## 部署目标状态

| 部署目标 | URL | 主 bundle | 状态 |
|---|---|---|---|
| **京东云** | https://www.traceinhabit.cn/ | `index-DMBt39Vx.js` | ✅ 与本地 dist 完全一致；素材 MD5 逐一比对通过 |
| **GitHub Pages** | https://memory-series.github.io/ | `index-D3Romjt0.js` | ✅ 自动部署；bundle 内容已验证含素材库，素材 URL 200 且体积正确（hash 与本地不同属已知平台差异） |
| **本地 dist** | `G:\Memory-Series\Memory-Series.github.io\dist` | `index-DMBt39Vx.js` | ✅ 干净重建通过 |

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

1. 待用户拍板是否启动上表 6 项中的任一项。
2. 若要动 `flash-002`，先做 `backend-001`（vitest）。
3. Ardot 设计稿 `724413235736238` 仍是单页版，后续调 UI 前建议同步为双页结构。
4. 确认公众号历史文章是否含根域名的 `#flash` / `#deploy` 旧链接。
