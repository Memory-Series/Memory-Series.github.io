# harness/docs 索引

本目录收纳项目的历史零散文档，供 coding agent 在会话中快速查阅。这些文档是从仓库根目录整理迁移而来，内容未改动。

## 文档清单

| 文件 | 原位置 | 内容 | 何时阅读 |
|------|--------|------|----------|
| `README.md` | 仓库根目录 | 项目主页介绍（Trace / Inhabit、寻迹/入心、主页/项目地址、Agent Skill 说明） | 首次接触仓库时 |
| `DESIGN.md` | 仓库根目录 | 设计系统规范：配色、字体、布局节奏、动效、产品页模式、可访问性（Cinematic Tech-Noir Minimalism） | 涉及样式/UI 改动时 |
| `product-page-copy.md` | `core/` | Trace / Inhabit 产品页完整中文文案（Hero、定义、价值、体验、技术、场景、结尾、一句话） | 修改产品文案时 |

## 与 harness 其他文件的关联

- 设计令牌的实际实现：`src/index.css`（Tailwind v4 `@theme`）—— 见 `DESIGN.md`
- 产品文案的代码载体：`src/lib/products.ts` + `src/locales/{zh,en}.json` —— 见 `product-page-copy.md`
- 功能状态：见 `feature_list.json`
- 会话进度：见 `claude-progress.md`

## 使用规则

- 以上文档是**引用材料**，不是唯一的 truth。运行时代码与 locale 文件才是最终事实来源。
- 文档与代码不一致时，以代码为准，并在 `claude-progress.md` 记录差异。
- 修改产品文案时，需同步更新 `src/lib/products.ts`、`src/locales/zh.json`、`src/locales/en.json` 三处。
