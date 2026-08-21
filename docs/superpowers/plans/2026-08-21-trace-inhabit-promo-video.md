# Trace/Inhabit 产品宣传视频实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 hyperframes 生成一段 45s、1920×1080 的 Trace/Inhabit 产品宣传视频（理念/品牌叙事），产出 MP4 供网站 Hero 区使用。

**Architecture:** 在 `compositions/` 目录创建独立 hyperframes 组合（HTML + `data-*` 时间属性 + GSAP 时间线）。四幕结构：开场主标题 → 寻迹 Trace → 入心 Inhabit → 收束。纯视觉+文字字幕（本阶段无音乐，后续补）。设计遵循 `harness/docs/DESIGN.md` 的 Cinematic Tech-Noir Minimalism。

**Tech Stack:** hyperframes CLI v0.8.6、GSAP 3（CDN）、HTML/CSS、Chrome Headless Shell（渲染）、FFmpeg 8.1.1（已就绪）

---

## 文件结构

- `compositions/index.html` — 主组合（standalone，无 `<template>`）
- `compositions/trace-inhabit-promo.mp4` — 渲染产物（生成）
- `docs/superpowers/plans/2026-08-21-trace-inhabit-promo-video.md` — 本计划
- 设计规范参照：`docs/superpowers/specs/2026-08-21-trace-inhabit-promo-video-design.md`
- 文案来源：`harness/docs/product-page-copy.md`、`src/lib/products.ts`、`src/locales/zh.json`

---

### Task 1: 准备渲染环境

**Files:**
- Modify: 无（环境配置）

- [ ] **Step 1: 安装 Chrome Headless Shell**

Run: `npx hyperframes browser ensure`
Expected: 成功下载并安装 Chrome Headless Shell，无报错。

- [ ] **Step 2: 验证环境就绪**

Run: `npx hyperframes doctor`
Expected: `✓ Node.js`、`✓ FFmpeg`、`✓ FFprobe`、`✓ Chrome` 全部通过（TTS Kokoro 可选，不需要）。

- [ ] **Step 3: 提交**

```bash
git status  # 确认无意外文件
```

（本任务为环境配置，通常无代码提交。）

---

### Task 2: 初始化组合项目结构

**Files:**
- Create: `compositions/index.html`（骨架）
- Modify: 无

- [ ] **Step 1: 创建 compositions 目录与空 index.html**

在 `G:\Memory-Series\Memory-Series.github.io` 下创建 `compositions/` 目录，新建 `index.html` 骨架：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Trace/Inhabit · Promo</title>
  </head>
  <body>
    <div id="stage" data-composition-id="trace-promo" data-start="0" data-duration="45" data-width="1920" data-height="1080">
      <!-- scenes will be added in Task 3-6 -->
    </div>
  </body>
</html>
```

- [ ] **Step 2: 初步 lint 验证**

Run: `npx hyperframes check compositions`
Expected: 结构校验通过（骨架无内容仍应无结构错误）。

> 若 `check`/`render` 报"找不到项目"或路径错误，说明该版本 CLI 需要从 `compositions/` 目录内运行或使用其它路径形式——到 Task 2 应尽快暴露并记录正确用法，后续 Task 沿用。

- [ ] **Step 3: 确认字体方案（重要前置）**

hyperframes 编译器内置 18 个预捆绑字体（离线确定性渲染）；**Manrope 与 Noto Sans SC 均不在内置列表**，但都是真实 Google 字体——本地渲染时编译器会在 build 阶段从 Google Fonts 自动获取并内嵌（会触发 `font_family_without_font_face` lint warning，本地渲染可用；云端/分布式渲染 fail-closed，本任务只本地渲染，不受影响）。

处理方式：
1. 写 CSS 时使用 `font-family: Manrope, "Noto Sans SC", sans-serif`（Manrope 标题 + Noto Sans SC 正文，与网站一致）
2. 预期 `check` 会有字体 lint warning——记录为已知、可接受的（本地渲染正常），**不要**为了消警告而改字体，以免与网站视觉不一致
3. 若 Google Fonts 不可达导致渲染失败，回退方案：下载 Manrope/Noto Sans SC 的 `.woff2` 放入 `compositions/fonts/` 并写 `@font-face`（见 "Finding Fonts"）

---

### Task 3: 场景 1 — 开场主标题（0-8s）

**Files:**
- Modify: `compositions/index.html`

- [ ] **Step 1: 编写场景 1 HTML 与 CSS**

在 `#stage` 内加入场景 1。设计令牌（来自 DESIGN.md）：
- 背景：深空蓝 `#0d1326`（近似 `oklch(0.145 0.03 262)`）
- 标题：冷银 `#e8ecf5`（近似 `oklch(0.92 0.02 265)`），Manrope 字体
- 强调：暖金 `#d9a441`（近似 `oklch(0.78 0.12 75)`），金色光点

```html
<section class="scene" id="scene-1">
  <div class="grain"></div>
  <div class="glow-dots" aria-hidden="true"></div>
  <h1 class="clip hero-title" data-start="0.5" data-duration="7">
    让存在，不止停留在记忆里。
  </h1>
</section>
```

CSS 要点：
- `.scene` 全屏 1920×1080，**绝对定位叠放（`position: absolute; inset: 0`）共享同一画布**，`display: flex` 居中内容——四个场景必须同层叠放，交叉淡化才能生效（评审确认）
- `.hero-title`：Manrope semibold，`font-size: 84px`，`tracking-[-0.02em]`，`color: #e8ecf5`，`text-balance`
- `.glow-dots`：绝对定位的金色柔光点（`border-radius: 50%` + `filter: blur()`）
- `.grain`：细噪点覆盖层，`opacity: 0.06`
- **所有场景（1-4）都设置初始 `opacity: 0`**，由各自场景的 `tl.fromTo(... opacity: 0 → 1)` 控制显现（场景 1 由时间线开头淡入，场景 2/3/4 由交叉淡化淡入）

> 注意：文本 clip 省略 `data-track-index`（同场景内多个文本元素若同 track 且时间重叠会触发 check 报错）。仅在同一 track 上时间严格不重叠时才需显式 track-index。

- [ ] **Step 2: 添加 GSAP 动画**

在 `#stage` 底部加入 GSAP CDN 与时间线：

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  tl.from("#scene-1 .glow-dots", { opacity: 0, duration: 2, ease: "sine.out" }, 0);
  tl.from("#scene-1 .hero-title", { opacity: 0, y: 30, duration: 0.75, ease: "power3.out" }, 1.2);
  window.__timelines["trace-promo"] = tl;
</script>
```

约束（来自 hyperframes skill 非协商规则）：
- 时间线必须 `{ paused: true }` 并注册到 `window.__timelines["trace-promo"]`
- 无 `Math.random()`、无 `repeat: -1`、无异步构建

- [ ] **Step 3: 运行 check 验证**

Run: `npx hyperframes check compositions`
Expected: lint/runtime/layout/motion/contrast 全部通过，无文本溢出。

- [ ] **Step 4: 提交**

```bash
git add compositions/index.html
git commit -m "feat(compositions): scene 1 hero title for trace/inhabit promo"
```

---

### Task 4: 场景 2 — 寻迹 Trace（8-20s）

**Files:**
- Modify: `compositions/index.html`

- [ ] **Step 1: 编写场景 2 HTML**

在场景 1 后追加场景 2（交叉淡化过渡）：

```html
<section class="scene" id="scene-2">
  <div class="grain"></div>
  <p class="clip eyebrow" data-start="8.5" data-duration="11">寻迹 TRACE</p>
  <h2 class="clip section-title" data-start="9.0" data-duration="10.5">从素材中提取角色人格</h2>
  <ul class="clip bullets" data-start="10.5" data-duration="9">
    <li>从小说、剧本、动漫素材提取角色人格</li>
    <li>分析语言风格、性格特征、行为模式</li>
    <li>输出 SoulPod（profile.json / system_prompts.txt / memories）</li>
  </ul>
</section>
```

CSS 要点：
- `.eyebrow`：`font-size: 18px`，`letter-spacing: 0.34em`，`color: #d9a441`（金色眉标）
- `.section-title`：Manrope，`font-size: 56px`，冷银
- `.bullets`：Noto Sans SC，`font-size: 28px`，`color: #e8ecf5`，`line-height: 1.7`
- `.scene` 绝对定位叠放共享画布，初始 `opacity: 0`（由交叉淡化淡入）

- [ ] **Step 2: 添加场景 2 入场动画与过渡**

GSAP 追加到同一条时间线：

```js
// 场景 1 → 2 交叉淡化（8.0s 起，1.2s）
tl.fromTo("#scene-2", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "sine.inOut" }, 8.0);
tl.to("#scene-1", { opacity: 0, duration: 1.2, ease: "sine.inOut" }, 8.0);
// 场景 2 元素入场（逐行）
// 重要：选择器必须限定场景作用域（#scene-2 .xxx），否则会匹配其它场景的同名 class 元素
tl.from("#scene-2 .eyebrow", { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" }, 8.6);
tl.from("#scene-2 .section-title", { opacity: 0, y: 24, duration: 0.6, ease: "power3.out" }, 9.1);
tl.from("#scene-2 .bullets li", { opacity: 0, y: 16, stagger: 0.18, duration: 0.5, ease: "power2.out" }, 10.6);
```

约束：
- 过渡即退场：场景 1 无额外退场动画，仅由交叉淡化处理
- 不得对场景 2 提前做退场动画（仅最后场景允许淡出）

- [ ] **Step 3: 运行 check 验证**

Run: `npx hyperframes check compositions`
Expected: 通过，无重叠/溢出告警。

- [ ] **Step 4: 提交**

```bash
git add compositions/index.html
git commit -m "feat(compositions): scene 2 trace section"
```

---

### Task 5: 场景 3 — 入心 Inhabit（20-34s）

**Files:**
- Modify: `compositions/index.html`

- [ ] **Step 1: 编写场景 3 HTML**

在场景 2 后追加场景 3（结构同场景 2，节奏略快）：

```html
<section class="scene" id="scene-3">
  <div class="grain"></div>
  <p class="clip eyebrow" data-start="20.5" data-duration="13">入心 INHABIT</p>
  <h2 class="clip section-title" data-start="21.0" data-duration="12.5">以角色身份，持续存在</h2>
  <ul class="clip bullets" data-start="22.0" data-duration="11.5">
    <li>加载 SoulPod，以角色身份对话</li>
    <li>模式：复刻模式 / 伴侣模式</li>
    <li>能力：角色场景对话，角色图像生成，角色语音生成</li>
  </ul>
</section>
```

- [ ] **Step 2: 添加场景 3 入场动画与过渡**

```js
// 场景 2 → 3 交叉淡化（20.0s 起，1.0s）
tl.fromTo("#scene-3", { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "sine.inOut" }, 20.0);
tl.to("#scene-2", { opacity: 0, duration: 1.0, ease: "sine.inOut" }, 20.0);
// 场景 3 元素入场（节奏略快，选择器限定 #scene-3 作用域）
tl.from("#scene-3 .eyebrow", { opacity: 0, y: 18, duration: 0.4, ease: "power2.out" }, 20.6);
tl.from("#scene-3 .section-title", { opacity: 0, y: 22, duration: 0.5, ease: "power3.out" }, 21.1);
tl.from("#scene-3 .bullets li", { opacity: 0, y: 14, stagger: 0.15, duration: 0.4, ease: "power2.out" }, 22.1);
```

- [ ] **Step 3: 运行 check 验证**

Run: `npx hyperframes check compositions`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add compositions/index.html
git commit -m "feat(compositions): scene 3 inhabit section"
```

---

### Task 6: 场景 4 — 收束（34-45s）

**Files:**
- Modify: `compositions/index.html`

- [ ] **Step 1: 编写场景 4 HTML**

在场景 3 后追加场景 4（最后场景，允许淡出收尾）：

```html
<section class="scene" id="scene-4">
  <div class="grain"></div>
  <p class="clip closing" data-start="34.5" data-duration="10">
    让行为逻辑与角色能力，以更持续的数字生命形式继续存在。
  </p>
  <div class="clip gold-line" data-start="37.5" data-duration="6.5"></div>
  <p class="clip brand" data-start="38.5" data-duration="5.5">
    Memory · Trace / Inhabit
  </p>
</section>
```

CSS 要点：
- `.closing`：Manrope/Noto Sans SC，`font-size: 44px`，冷银，居中，`max-width: 60%` 让文本自然换行（**不使用 `<br>`**）
- `.gold-line`：水平金色细线 `height: 2px; background: #d9a441; width: 0`（由动画扩展）
- `.brand`：`font-size: 30px`，`letter-spacing: 0.2em`，金色

- [ ] **Step 2: 添加场景 4 动画与收尾淡出**

```js
// 场景 3 → 4 交叉淡化（34.0s 起，1.0s）
tl.fromTo("#scene-4", { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "sine.inOut" }, 34.0);
tl.to("#scene-3", { opacity: 0, duration: 1.0, ease: "sine.inOut" }, 34.0);
// 场景 4 元素入场
tl.from(".closing", { opacity: 0, y: 24, duration: 0.7, ease: "power3.out" }, 34.8);
tl.fromTo(".gold-line", { width: 0 }, { width: 240, duration: 0.8, ease: "power2.out" }, 37.6);
tl.from(".brand", { opacity: 0, y: 12, duration: 0.5, ease: "power2.out" }, 38.6);
// 最后场景允许淡出至黑（41.5s 起）
tl.to("#scene-4", { opacity: 0, duration: 1.2, ease: "sine.in" }, 42.5);
```

- [ ] **Step 3: 运行 check 验证**

Run: `npx hyperframes check compositions`
Expected: 通过，无文本溢出（尤其收束句两行布局）。

- [ ] **Step 4: 提交**

```bash
git add compositions/index.html
git commit -m "feat(compositions): scene 4 closing"
```

---

### Task 7: 完整验证与预览

**Files:**
- Modify: `compositions/index.html`（如发现修复项）

- [ ] **Step 1: 全量 check**

Run: `npx hyperframes check compositions`
Expected: 五项（lint/runtime/layout/motion/contrast）全部通过，无 WCAG 对比度告警。

- [ ] **Step 2: 视觉审查（对比度与布局）**

Run: `npx hyperframes check --snapshots compositions`
Expected: 生成 5 张快照到 `snapshots/`，人工检查四幕文字清晰、无重叠、无溢出。

若发现问题：
- 调整配色（保持在 DESIGN.md 色系内）或字号/间距
- 重新跑 check 直至干净

- [ ] **Step 3: 提交（如有修复）**

```bash
git add compositions/index.html snapshots/
git commit -m "fix(compositions): address check findings"
```

---

### Task 8: 渲染 MP4

**Files:**
- Create: `compositions/trace-inhabit-promo.mp4`（产物）

- [ ] **Step 1: 渲染**

Run: `npx hyperframes render compositions --output compositions/trace-inhabit-promo.mp4`
Expected: 渲染成功，产出 1920×1080，~45s 的 MP4。

- [ ] **Step 2: 验证产物**

Run: `ffprobe -v quiet -print_format json -show_format compositions/trace-inhabit-promo.mp4`
Expected: `duration` ≈ 45s，`width=1920, height=1080`。

- [ ] **Step 3: 播放抽查**

用系统播放器打开 `compositions/trace-inhabit-promo.mp4`，确认四幕顺序正确、过渡平滑、结尾淡出正常。

- [ ] **Step 4: 提交**

> 注意：MP4 是二进制产物。建议将 `trace-inhabit-promo.mp4` 加入 `.gitignore`（避免仓库膨胀），或按用户偏好提交。默认策略：**产物不提交**，仅提交 `index.html` 源码；如用户要求嵌入网站（Task 10）再单独处理资源。

---

### Task 9: 记录与更新 harness

**Files:**
- Modify: `harness/claude-progress.md`
- Modify: `harness/feature_list.json`
- Modify: `docs/superpowers/specs/2026-08-21-trace-inhabit-promo-video-design.md`（如音乐/嵌入说明有变化）

- [ ] **Step 1: 更新 claude-progress.md**

新增 Session 004 记录：hyperframes 视频渲染完成，产物路径 `compositions/trace-inhabit-promo.mp4`，音乐待后续补充。

- [ ] **Step 2: 更新 feature_list.json**

新增功能项（如 `video-001`）："Trace/Inhabit 产品宣传视频渲染"，状态 `passing`，证据 = 渲染产物 + check 通过。或按用户意愿将音乐补充记为未完成子项。

- [ ] **Step 3: 提交**

```bash
git add harness/ docs/
git commit -m "docs: record promo video render in harness"
```

---

### Task 10: （可选）嵌入网站 Hero 区

> 注意：此任务在规格中列为"范围外（YAGNI）—— 仅产出视频 + 建议"，是否执行由用户决定。默认跳过，除非用户明确要求。

**Files:**
- Modify: `src/pages/Product.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: （若执行）在 Hero 区加入 `<video>`**

将 `compositions/trace-inhabit-promo.mp4` 复制到 `src/assets/`，在 Hero 区用 `<video muted playsinline autoplay loop>` + `object-fit: cover` 替换/补充 hero-bg。

- [ ] **Step 2: 验证构建**

Run: `npm run build`
Expected: 通过。

---

## 风险与备注

- **音乐**：本阶段无音乐（用户选择"先无音乐，后续补"）。后续补充路径：media-use `bgm`（需 heygen CLI 登录）或用户提供本地音频，加入 `<audio data-track-index="N">` 即可。
- **Chrome Headless**：Task 1 需联网下载，若网络受限需 VPN（用户已具备）。
- **字体**：Manrope / Noto Sans SC 不在 hyperframes 内置 18 家族中，本地渲染经 Google Fonts build-time 获取内嵌（lint warning 可接受）；Google 不可达时用本地 `.woff2` + `@font-face` 回退。CJK 内置替代是 Noto Sans JP，但为与网站视觉一致，正文仍用 Noto Sans SC。
- **GSAP 选择器作用域（关键）**：所有 GSAP 选择器必须限定场景作用域（`#scene-N .xxx`），因为最终 index.html 中四个场景同时存在于 DOM，未限定的 `from()` 会匹配所有场景的同名 class 元素，导致退场场景元素被重新动画（可见闪烁）。`check` 检测不到此类瑕疵，须在动画编写时遵守。
- **`<br>` 使用**：收束句已改用 `max-width` 自然换行，避免 `<br>` 导致文本溢出（hyperframes 非协商规则）。
- **对比度**：深色背景上冷银/金色文字应满足 WCAG AA；若告警则微调色值（保持在色系内）。
