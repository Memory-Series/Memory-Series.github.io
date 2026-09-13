# 部署管理

本文件记录项目的两处生产部署：**GitHub Pages**（主站点）与 **京东云主机**（镜像站点 / 后续域名主站）。

## 1. GitHub Pages（自动部署）

- **URL**：https://memory-series.github.io/
- **方式**：GitHub Actions 工作流 `.github/workflows/deploy-pages.yml`
- **触发**：push 到 `main` 分支
- **流程**：`npm ci` → `npm run build` → 上传 `dist/` → `actions/deploy-pages`
- **前置**：仓库 Settings → Pages → Source: GitHub Actions（已配置）
- **注意**：项目使用 **npm**（`package-lock.json`），工作流已从 pnpm 迁移至 npm。新增依赖时务必提交 `package-lock.json`。

## 2. 京东云主机（手动/脚本部署）

- **URL**：https://www.traceinhabit.cn/（正式域名，HTTPS 已配置，2026-08 备案完成）
- **IP 直连**：http://111.228.60.135/
- **主机**：CentOS 7 · Docker 20.10.21
- **站点根**：`/opt/memory-series`（挂载进 nginx 容器）
- **容器**：`memory-series-nginx`（nginx，`-p 80:80`，`--privileged`，`--restart unless-stopped`）
- **HTTPS**：已配置（域名 + 证书），HTTP 自动 301 → HTTPS
- **部署脚本**：`scripts/deploy-jd.ps1` —— ⚠️ **本机不可用**，该脚本依赖 Posh-SSH 模块，当前机器未安装。实际使用下方「原生 ssh/scp 链路」。

### 部署命令（推荐：原生 ssh/scp，2026-09-13 二次验证）

本机 Git Bash 自带 `ssh` / `scp`，且 `~/.ssh/config` 已映射该主机、`~/.ssh/id_rsa` 免密可用。

```bash
# 1) 本地构建
npm run build

# 2) 打包 dist（Git Bash 的 tar 可用；coreutils 其他命令可能不可用，见下）
tar -czf dist.tar.gz -C dist .

# 3) 上传
scp -i ~/.ssh/id_rsa -o BatchMode=yes dist.tar.gz root@111.228.60.135:/root/

# 4) 远端替换 + 重启
ssh -i ~/.ssh/id_rsa -o BatchMode=yes root@111.228.60.135 '
  cp -a /opt/memory-series /opt/memory-series.bak
  rm -rf /opt/memory-series/*
  tar -xzf /root/dist.tar.gz -C /opt/memory-series
  rm -f /root/dist.tar.gz
  docker restart memory-series-nginx'
```

> 若用 Python 的 `tarfile` 打包并把 `dist` 作为顶层目录（arcname=`dist`），远端解压需加 `--strip-components=1`。

脚本/手工流程的语义步骤一致：构建 → 打包 → 上传 → 备份 → 解压替换 → `docker restart memory-series-nginx`。

### 为什么不用 deploy-jd.ps1

- `scripts/deploy-jd.ps1` 依赖 **Posh-SSH**，本机未安装。
- 本机 **PowerShell 工具的输出通道无回显**（`Write-Output` 完全不可见），即便装了模块也难以排查。
- 上述 ssh/scp 链路已在 Session 029 与 2026-09-13 两次完整验证。

### 环境变量（可覆盖默认值）

| 变量 | 默认 | 说明 |
|------|------|------|
| `JD_HOST` | `111.228.60.135` | 主机 IP |
| `JD_USER` | `root` | 登录用户 |
| `JD_PASS` | （仅 `deploy-jd.ps1` 用） | **当前链路不需要** —— 走 SSH key 免密 |

### 首次部署（新主机）

```bash
# 主机端一次性准备
docker run -d --name memory-series-nginx \
  --privileged -p 80:80 \
  -v /opt/memory-series:/usr/share/nginx/html:ro \
  --restart unless-stopped nginx:alpine
```

## 3. 部署优先级与冲突

- GitHub Pages 是**自动**部署，push main 即生效；京东云是**手动**部署。
- 两处部署内容相同（同一 `dist/` 构建产物）。
- **流程约定**：日常开发 push 到 main（GitHub Pages 自动更新）；需要同步京东云时手动走上方 ssh/scp 链路。
- **bundle hash 差异属正常**：GitHub Actions 是 linux、本地是 Windows，tree-shake 结果不同，`index-*.js` 的文件名会不一样。功能一致，不要当成部署失败。
- **冲突风险**：域名备案完成后，京东云作为正式域名站点；GitHub Pages 继续作为演示站/镜像。此时需注意 HTTPS 证书与 CORS（WebSerial 需 HTTPS）。

## 4. HTTPS / WebSerial 注意事项

- **WebSerial 烧录功能要求 HTTPS**（或 localhost）。
- GitHub Pages 已自动提供 HTTPS。
- 京东云正式域名 **https://www.traceinhabit.cn/** 已配置 HTTPS（2026-08），WebSerial 烧录功能可用。
- 纯 IP 访问 http://111.228.60.135/ 时 WebSerial 不可用（非 HTTPS 且非 localhost）。

## 5. 部署后验证清单

> ⚠️ **静态站点没有 dev server 的 SPA fallback，但校验仍不能只看状态码。** 本机 dev server 会对任意 `/assets/...` 返回 `index.html` + HTTP 200，曾造成「已删文件仍可下载」的假阳性。校验素材必须同时看 `Content-Type` 与响应体 MD5。

- [ ] 首页 HTTPS 200（`curl -s -o /dev/null -w '%{http_code}' https://www.traceinhabit.cn/`）
- [ ] 关键资源 200：`/assets/index-*.js`、`/assets/index-*.css`
- [ ] **服务端 `index.html` 引用的 bundle hash 与本地 `dist/index.html` 一致**（京东云应完全一致；GitHub Pages 因 linux 构建会不同，属已知差异）
- [ ] 固件可访问：`/merged_binary/memory-series-1.85b.bin`
- [ ] 页面 title 正确（`Memory Series（记忆系列）`）
- [ ] WebSerial 连接设备烧录（HTTPS 下验证）
- [ ] **素材库 6 个文件逐个校验**：URL 200 + 体积正确 + MD5 与本地 `dist/` 一致
    - `assets/boot/boot-default.eaf` 3,054,945 B
    - `assets/boot/boot-preview-default.png` 14,148 B
    - `assets/dialogue/xia-yizhou/dialogue_bg.bin` 509,244 B
    - `assets/dialogue/xia-yizhou/preview.png` 155,503 B
    - `assets/dialogue/qin-che/dialogue_bg.bin` 509,244 B
    - `assets/dialogue/qin-che/preview.png` 254,908 B
- [ ] **已下架素材返回 404**：`assets/boot/boot-variant-02.eaf`、`boot-preview-01.png`、`boot-preview-02.png`

### 主机本地 curl 返回 301 是正常的

容器内已配 HTTP → HTTPS 重定向，`curl http://127.0.0.1/` 返回 **301** 表示配置生效，不是错误。HTTPS 直连才应返回 200。
