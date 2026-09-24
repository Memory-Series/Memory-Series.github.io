# 网页端对话服务（C1 极薄代理）—— 见 harness/docs/spec-chat-server.md
#
# 为什么镜像这么短：**零 npm 依赖**。整个服务只用 `node:` 内置模块，
# 所以没有 `npm ci`、没有 node_modules、没有构建步骤 —— 改一行代码
# 重新 `docker build` 只要几秒，而带依赖的镜像每次都要重装一遍。
#
# 安全姿态与现有 nginx 容器保持一致：非 root 用户、只读根 FS（运行时用
# `--read-only` 传入）、不落任何东西到镜像里。
#
# 用 20-alpine 而不是 22：本机 Docker 在 CentOS 7 / 内核 3.10 上，
# nginx 曾因为新镜像的写入行为踩过 EPERM，Node 这侧先取保守版本，
# 部署前会在临时容器 + 临时端口上干跑一次（spec §10 第 4 步）。
# 代码用到 `import.meta.dirname`，需要 Node ≥ 20.11。
FROM node:20-alpine

WORKDIR /app

# personas/ 与 state/ 由 .dockerignore 排除：
#   personas —— 部署期在宿主机生成、以只读卷挂到 /app/server/personas，
#               打进镜像会让"镜像里的那本"和"挂载的那本"可能不一致；
#   state    —— 运行时可变的计数，绝不能固化进镜像。
COPY --chown=node:node . /app/server/

USER node

ENV NODE_ENV=production \
    CHAT_PORT=8787 \
    CHAT_STATE_DIR=/app/state

EXPOSE 8787

# 用它自己的健康接口（不鉴权、不暴露配置）。
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.CHAT_PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# 不通过 shell 启动，让 node 直接持有 PID 1、能正确收到 SIGTERM
# （入口里有优雅关闭逻辑，SIGTERM 会被处理）。
CMD ["node", "server/index.mjs"]
