# Trace/Inhabit 产品宣传视频设计文档

- 日期：2026-08-21
- 状态：已批准（用户确认方案 A）
- 目标工具：hyperframes（HTML → MP4 确定性渲染）
- 关联 harness 文档：`harness/docs/DESIGN.md`、`harness/docs/product-page-copy.md`

## 1. 目标与定位

用 hyperframes 为 Memory Series · Trace/Inhabit（寻迹/入心）生成一段**产品宣传视频**，嵌入网站 Hero 区填充空白展示区域。

- 时长：约 45 秒
- 比例：16:9（1920×1080）
- 平台：网站 Hero 区自动循环播放（`<video muted playsinline autoplay loop>`）
- 叙事重点：理念/品牌叙事
- 声音：背景音乐 + 字幕文字动画（无旁白）

## 2. 设计系统（来自 harness/docs/DESIGN.md）

- **风格**：Cinematic Tech-Noir Minimalism
- **背景**：深空蓝 `oklch(0.145 0.03 262)`（`background` token）
- **前景**：冷银 `oklch(0.92 0.02 265)`（`foreground` token）
- **强调色**：暖金 `oklch(0.78 0.12 75)`（`accent` token），仅用于 CTA/焦点/关键点，克制使用
- **标题字体**：Manrope（semibold，`tracking-[-0.02em]`）
- **正文字体**：Noto Sans SC
- **眉标样式**：`text-xs`，`tracking-[0.34em]`，前景 60% 不透明度
- **动效**：短淡入 + 小幅位移动画，~0.75s，ease `[0.16, 1, 0.3, 1]`

## 3. 场景结构（4 幕）

| 幕 | 时间 | 内容 | 动效 |
|----|------|------|------|
| 1 开场 | 0-8s | 深空背景，金色光点缓缓浮现，主标题「让存在，不止停留在记忆里。」 | 光点淡入、标题逐行浮现 |
| 2 寻迹 Trace | 8-20s | 眉标「寻迹 Trace」+ 三条要点 | 每条逐行淡入 + 微光 |
| 3 入心 Inhabit | 20-34s | 眉标「入心 Inhabit」+ 三条要点 | 同上，节奏略快 |
| 4 结尾 | 34-45s | 收束句 + 金色收束线 + 产品名 | 文字汇拢、金色线收束 |

### 场景间过渡

- 所有场景间使用柔和交叉淡化（crossfade），符合慢镜节奏
- 每幕元素用入场动画（`gsap.from`），无提前退场；仅结尾幕允许淡出

## 4. 叙事文案（来源：harness/docs/product-page-copy.md）

### 场景 1 主标题
让存在，不止停留在记忆里。

> 注：主标题以 `src/lib/products.ts` 的 `heroTitle`（trace 产品，第 50 行）「让存在，不止停留在记忆里。」为准（这是网站 Hero H1 的实际文案来源）。`product-page-copy.md` 中的「让存在感，不止停留在记忆里。」存在"感"字差异——以 products.ts / 站点实际渲染为准，视频与页面同屏时保持一致。zh.json 的 `hero.title` 是「Trace/Inhabit · SKILL」，不是主标题。

### 场景 2 寻迹 Trace
- 从小说、剧本、动漫素材提取角色人格
- 分析语言风格、性格特征、行为模式
- 输出 SoulPod（profile.json / system_prompts.txt / memories）

### 场景 3 入心 Inhabit
- 加载 SoulPod，以角色身份对话
- 模式：复刻模式 / 伴侣模式
- 能力：角色场景对话，角色图像生成，角色语音生成

### 场景 4 收束
让行为逻辑与角色能力，以更持续的数字生命形式继续存在。
Memory · Trace / Inhabit

## 5. 音乐

- 来源：通过 hyperframes 的 media-use 工作流，使用 `bgm` 动词从 HeyGen 曲目库（10k+ 曲目）解析 ambient / cinematic 风格背景音乐，冻结为本地文件
- 音量：~0.5（背景垫底，不压字幕）
- 时长：~45s，与视频同步
- 回退：若曲目库不可用（需 HeyGen 授权/网络），回退到用户提供的本地音频文件

## 6. 交付物

1. hyperframes 组合 HTML（`index.html`，含 `data-*` 时间属性 + GSAP 时间线 + 音轨声明）
2. 背景音乐文件（通过 media-use `bgm` 解析的 ambient 音频，置于 compositions 目录）
3. 渲染输出 `trace-inhabit-promo.mp4`（1920×1080）
4. 网站嵌入建议：Hero 区 `<video muted playsinline autoplay loop>`，使用 `object-fit: cover` 全屏铺满（避免黑边/拉伸），替换/补充现有 hero-bg

## 7. 验证标准

- `npx hyperframes check` 通过（单命令覆盖 lint + runtime + layout + motion + WCAG 对比度五项）
- 渲染产出 MP4 正常播放，时长 ~45s

> 注：`validate`/`inspect`/`layout` 单独命令已废弃（仍可用但打印 deprecation），以 `check` 为主门；`lint` 仍是快速静态反馈的有效命令。

## 8. 范围外（YAGNI）

- 不做英文版旁白/字幕（如需要后续加字幕轨）
- 不做多版本变体
- 不处理角色图片版权素材（纯文字+光效理念叙事）
- 不在本任务内嵌入网站（仅产出视频 + 建议）

## 9. 实施前置

- 需要 `npx hyperframes browser ensure` 安装 Chrome Headless Shell（当前缺失）
- 需要初始化 hyperframes 组合目录结构
