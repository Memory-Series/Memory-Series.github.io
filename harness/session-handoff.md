# 会话交接

## 当前已验证

- 现在明确可用的部分：`npm run build` 通过；`npm run lint` 0 错误 0 警告；`npm run lint:locales` 通过；`npm run dev` 可启动；远程 origin/main 与本地同步。
- 本轮实际跑过的验证：
    - `npm run build` ×2（cleanup-001 / ci-001 完成后 + clean rebuild 校验）
    - `npm run lint` ×1（0 错误 0 警告）
    - `npm run lint:locales` ×4（含反演 fail-pass 闭环 ×2）
    - `git push origin main` 成功（2 次 retry，遭遇沙箱代理 502 后恢复）
    - GitHub Actions run #90 自动触发并成功（commit 7f2d5bb，56s 完成）—— **ci-001 首次实测通过**
    - https://memory-series.github.io/ → HTTP 200，主 bundle `index-mu4Dtlme.js`
    - https://www.traceinhabit.cn/ → HTTP 200，主 bundle `index-DYXyFfqU.js`

## 本轮改动

- 本次会话（2026-09-09 late evening + late night）完成 2 项后端工程化债，零 UI 改动：
    - **cleanup-001**（p2）：删除 src/App.css（grep 确认零引用，纯 Vite 模板死代码；606 字节）
    - **ci-001**（p0）：.github/workflows/deploy-pages.yml 加 `Lint (ESLint)` + `Lint locales` 两个 step 在 `npm run build` 之前；同时 scripts/lint-locales.cjs REQUIRED map 补 `footer.links.{privacy,terms,contact}` 3 个 key
- 累计本次完整长会话（下午 + 晚间 + 深夜）完成 **7 项后端工程化债**：
    - perf-002 / infra-001 / i18n-002 / data-001 / ts-strict-001（Session 016-020，下午 + 晚间）
    - cleanup-001 / ci-001（Session 022-024 + 本次推送，深夜）

### 完整改动清单

**新增文件（4 个）**：
- `src/lib/i18n-storage.ts`（i18n 持久化 helper）
- `src/lib/schemas.ts`（zod LocaleSchema + ProductInfoSchema）
- `src/components/ErrorBoundaryFallback.tsx`（降级 UI 函数组件）
- `scripts/lint-locales.cjs`（纯 cjs CI gate）

**删除文件（1 个）**：
- `src/App.css`（cleanup-001）

**修改文件（14 个）**：
- `vite.config.ts`（sourcemap 'hidden' + ANALYZE 钩子）
- `tsconfig.app.json`（strict: false → true）
- `package.json`（+1 devDependency rollup-plugin-visualizer + 1 script lint:locales）
- `package-lock.json`（rollup-plugin-visualizer 依赖树 + 29 个新包）
- `src/components/ErrorBoundary.tsx`（升级：name / fallback / onError props + componentDidCatch）
- `src/i18n.ts`（lng: resolveInitialLng() + fallbackLng: 'en'）
- `src/main.tsx`（DEV 时调用 assertLocalesAtBoot）
- `src/pages/Product.tsx`（3 处 ErrorBoundary 包裹 + 语言按钮 persistLng + aria-pressed）
- `src/locales/zh.json` + `src/locales/en.json`（新增 errorBoundary.degraded.{title,body,retry,reload}）
- `.github/workflows/deploy-pages.yml`（ci-001 加 lint + lint:locales step）
- `harness/claude-progress.md`（Session 016-025）
- `harness/feature_list.json`（21 个功能，20 passing / 1 not_started）
- `harness/session-handoff.md`（本文件）

## 仍损坏或未验证

- 已知缺陷：无
- 未验证路径：
    - infra-001 的 ErrorBoundary 降级 UI 浏览器手动 throw 验证（build/lint/静态 + dev server 启动验证已通过，但浏览器交互式触发未做）
    - ts-strict-001 其他 strict flag（`noUncheckedIndexedAccess` 等）按最小改动原则未开启，预演显示会暴露 6 处 CharacterDeploy / Product.tsx 字典访问错误
- 下一轮会话需要注意的风险：
    - **两站点 bundle hash 不一致**：GitHub Pages `index-mu4Dtlme.js`（Actions linux 平台 build）vs 京东云 `index-DYXyFfqU.js`（本地 Windows 平台 build）。原因：zod 同步加载在两个平台 tree-shake 行为略不同。功能一致但文件名不同。如需统一，未来可改 zod 为 dynamic import。
    - npm audit 19 vulnerabilities（既有依赖，2 low / 9 moderate / 8 high，非本次引入）
    - data-001 引入 zod 同步打包导致 main +59 kB（474.76 kB → gzip 145.56 kB），可后续 dynamic import 优化
    - safe-delete shim 触发条件：单次删 >50 文件需确认。dist 构建产物已 50+ 文件，触发 vite emptyOutDir 与 dev server deps_temp 清理告警。绕过方式：先手动清空 dist 再 build

## 下一步最佳动作

- **本次会话最高优先级未完成功能**：无业务功能阻塞。
- **未 passing 工作项**：flash-002（WebSerial 烧录链路工程化）—— 第二次用户决策为"收回"（理由：核心业务工程化改动 + 实机验证成本高 + 用户已满意现有 UI 与功能）。保持 not_started。
- **可选后续工作**（按 ROI 排序）：
    1. data-001 zod 体积优化（dynamic import，main -59 kB，P3）
    2. ts-strict 渐进开启其他 flag（多次小 PR 推进，P3）
    3. vitest 配置（未来 flash-002 启动前先加测试基建，P2）
    4. App.css 之外的其他技术债（src/lib/ 边界模糊、shadcn/ui 50+ 全量引入等，按需清理）
- **这一步中哪些东西不要动**：7 项 passing 后端工程的所有改动（不要因 git diff 而"清理"，它们是已验证的工程化债清理）；不要恢复 ts-strict-001 的 strict: false；不要撤回 data-001 的 zod 同步

## 命令

- 启动命令：`npm run dev`（localhost:5173 或 5274）
- 验证命令：`npm run build`
- 定向调试命令：`npm run lint`、`npm run lint:locales`
- 体积分析命令：`ANALYZE=true npm run build`（生成 dist/stats.html）
- 部署命令：见 `harness/docs/deployment.md`
- GitHub Pages：自动（push 到 main 触发；现在含 lint gate，会拦截回归）

## Git 状态（全部已推送）

```
7f2d5bb docs(harness): sync progress log with Session 022-024  (本次收尾)
413a44d ci: gate GitHub Pages deploy on npm run lint + lint:locales  (ci-001)
a1ec036 chore(cleanup): remove unused src/App.css  (cleanup-001)
807a27d docs(harness): sync progress log with Session 016-020 backend hardening  (Session 021)
4ebdbe9 chore(tsconfig): enable TypeScript strict mode  (ts-strict-001)
e65be72 feat(data): add locale schema validation + CI gate  (data-001)
a2babef feat(i18n): persist language preference + symmetric fallback  (i18n-002)
be794b6 feat(infra): add section-level error boundaries with i18n fallback  (infra-001)
d2d9ad6 chore(perf): add sourcemap + visualizer for build observability  (perf-002)
```

## 部署目标状态

| 部署目标 | URL | 主 bundle hash | 状态 |
|---|---|---|---|
| **GitHub Pages** | https://memory-series.github.io/ | `index-mu4Dtlme.js` | ✅ Actions run #90 自动完成（56s）|
| **京东云** | https://www.traceinhabit.cn/ | `index-DYXyFfqU.js` | ✅ 用户 PowerShell 手动跑 deploy-jd.ps1 完成 |
| **本地 dist** | G:\Memory-Series\Memory-Series.github.io\dist | `index-DYXyFfqU.js` | ✅ 与京东云一致 |
