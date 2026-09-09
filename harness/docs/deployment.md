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
- **部署脚本**：`scripts/deploy-jd.ps1`

### 部署命令（PowerShell）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1
```

脚本执行：
1. `npm run build`（本地构建）
2. 打包 `dist/` 为 tar.gz
3. SFTP 上传到主机 `/root/`
4. 解压替换 `/opt/memory-series/` 内容
5. `docker restart memory-series-nginx`
6. curl 验证——返回 **301** 为正常（容器已配 HTTP→HTTPS 重定向）；HTTPS 直连返回 200

### 环境变量（可覆盖默认值）

| 变量 | 默认 |
|------|------|
| `JD_HOST` | `111.228.60.135` |
| `JD_USER` | `root` |
| `JD_PASS` | （脚本内配置，**建议用 `$env:JD_PASS` 覆盖，勿明文提交**）|

### 首次部署（新主机）

```bash
# 主机端一次性准备
docker run -d --name memory-series-nginx \
  --privileged -p 80:80 \
  -v /opt/memory-series:/usr/share/nginx/html:ro \
  --restart unless-stopped nginx:alpine
```

## 3. 部署优先级与冲突

- GitHub Pages 是**自动**部署，push main 即生效；京东云是**手动**脚本部署。
- 两处部署内容相同（同一 `dist/` 构建产物）。
- **流程约定**：日常开发 push 到 main（GitHub Pages 自动更新）；需要同步京东云时手动跑 `deploy-jd.ps1`。
- **冲突风险**：域名备案完成后，京东云作为正式域名站点；GitHub Pages 继续作为演示站/镜像。此时需注意 HTTPS 证书与 CORS（WebSerial 需 HTTPS）。

## 4. HTTPS / WebSerial 注意事项

- **WebSerial 烧录功能要求 HTTPS**（或 localhost）。
- GitHub Pages 已自动提供 HTTPS。
- 京东云正式域名 **https://www.traceinhabit.cn/** 已配置 HTTPS（2026-08），WebSerial 烧录功能可用。
- 纯 IP 访问 http://111.228.60.135/ 时 WebSerial 不可用（非 HTTPS 且非 localhost）。

## 5. 部署后验证清单

- [ ] 首页 HTTPS 200（`curl -s -o /dev/null -w '%{http_code}' https://www.traceinhabit.cn/`）
- [ ] 关键资源 200：`/assets/index-*.js`、`/assets/index-*.css`
- [ ] 固件可访问：`/merged_binary/memory-series-1.85b.bin`
- [ ] 页面 title 正确（`Memory Series（记忆系列）`）
- [ ] WebSerial 连接设备烧录（HTTPS 下验证）
