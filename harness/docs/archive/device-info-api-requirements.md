> ⚠️ **本文档已作废（2026-09-10）**
>
> 原方向为「网页端从设备读取开机动画与各角色 SoulPod 概览」，需要固件侧配合（CORS / 混合内容）。
> 用户已推翻该方向：改为**纯网页端提供可下载素材 + 告知 SD 卡放置位置**，零固件改动，
> 跨源与混合内容问题一并绕开。相关功能登记见 `feature_list.json` 的 `assets-001`。
>
> **本文档不再作为开发依据。** 仅保留两节仍有参考价值：
> 素材格式规范（`.eaf` / `dialogue_bg.bin`）与 SD 卡目录结构。
> 如需当前素材规格，请以 `src/lib/device-assets.ts` 与 `assets-001` 的 notes 为准。

---

# 设备信息读取 · 固件侧需求规格书

> 面向：硬件 / 固件开发者
> 提出方：Memory Series 展示站（网页端）
> 日期：2026-09-12（R2 决策更新：2026-09-12）
> 状态：**一期范围已确认 —— 只做 R1（CORS），R2 后置为二期独立特性**

## 0. 一句话目标

让网页端能够**通过浏览器直连设备**，读取 SD 卡上的**开机动画**与**各角色 SoulPod 的基本信息**，为后续（第二期）的替换操作提供可视化依据。

网页端**不改固件业务逻辑**，只消费 HTTP 接口。

---

## 1. 现状与缺口

### 1.1 设备已具备的能力（无需改动）

设备 HTTP 服务已注册以下端点（`application/edge_agent/components/http_server/http_server_files_api.c`）：

| 端点 | 方法 | 能力 |
|---|---|---|
| `/api/files?volume=&path=` | GET | 列目录，支持 `volume=sdcard` |
| `/files/*` | GET | 下载文件，支持 `/files/sdcard/...` 前缀自动切到 SD 卷 |
| `/api/files/upload?path=` | POST | 上传文件 |
| `/api/files/mkdir` | POST | 建目录 |
| `/api/files` | DELETE | 删文件/目录 |
| `/api/status` | GET | 设备状态（含 `sdcard{mounted, mount_point, capacity_mb, free_bytes}`） |

**关键结论：读 SD 卡的能力已经存在，网页端需要的全部数据都能拿到。**

SD 卡挂载点为 `/sdcard`（`boards/waveshare/.../board_sdcard.h` 的 `BOARD_SDCARD_MOUNT_POINT`）。

### 1.2 唯一缺口：浏览器够不到设备

网页端部署在 **HTTPS** 域名（`https://www.traceinhabit.cn/`、`https://memory-series.github.io/`），设备 HTTP 服务监听 **http://192.168.x.x:80**。

浏览器拦截原因有两条，**任意一条都会导致请求失败**：

1. **混合内容（Mixed Content）**：HTTPS 页面发起 `http://` 请求，浏览器在**发出请求前**直接拦截。这是浏览器安全策略，`fetch` 无法绕过。
2. **CORS 缺失**：设备 HTTP 服务未返回任何 `Access-Control-*` 响应头，也未注册 `OPTIONS` 预检处理器（已全局检索 `Access-Control` / `OPTIONS` / `cors`，C 源码中无实现）。

> 现状代码证据：`http_server_core.c:64-96` 的 `http_server_start()`，`httpd_config_t` 未配置任何 CORS 相关项；所有 `http_server_*.c` 中无 `Access-Control-Allow-Origin` 字样。

---

## 2. 需求项

### R1（必需）· CORS 支持

**目的**：允许网页端从 HTTPS 域名跨源读取设备接口。

**要求**：

- 在 HTTP 服务全局层（建议 `http_server_core.c` 的 `http_server_start()` 或新增统一响应封装）为**所有响应**附加：
  ```
  Access-Control-Allow-Origin: *
  ```
- 同时附加：
  ```
  Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  Access-Control-Max-Age: 86400
  ```

- 注册一个 **通配 `OPTIONS` 预检处理器**（可注册在 `/*` 路径，方法 `OPTIONS`），对预检请求返回 204 且携带上述响应头。

**说明与取舍**：

- 用 `*` 而非白名单，是因为网页端有**两个部署域名**（GitHub Pages + 京东云），且后续可能增加；设备本身在局域网内、无敏感凭据、无鉴权体系，`*` 的风险可控。
- 若硬件侧有安全顾虑，可改为白名单，但需要同时包含：
  - `https://www.traceinhabit.cn`
  - `https://memory-series.github.io`
  - `http://localhost:*`（本地开发）
- **注意**：`Access-Control-Allow-Origin` 不能同时用 `*` 和 `Access-Control-Allow-Credentials: true`。本需求不涉及 Cookie/凭据，**不要开启 credentials**。

**验收**（一期口径：以本机 http 场景为准）：

```bash
# 1) 预检：期望 204（或 200），且响应头含 Access-Control-Allow-Origin
curl -i -X OPTIONS "http://<device-ip>/api/files" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"

# 2) 实际请求：期望 200，且响应头含 Access-Control-Allow-Origin
curl -i "http://<device-ip>/api/files?volume=sdcard&path=/personas" \
  -H "Origin: http://localhost:5173"
```

**浏览器端验收（关键，务必实测）**：在本地 dev server 页面（`http://localhost:5173`）的控制台执行：

```js
fetch("http://<device-ip>/api/files?volume=sdcard&path=/personas")
  .then(r => r.json()).then(console.log)
```

期望：正常返回 JSON，**控制台无 CORS 报错**。

> 注：从 https 页面读取设备**不在本期验收范围**（依赖二期 HTTPS）。

---

### R2（已决策）· 混合内容放行方案 → **一期只做 R1，HTTPS 后置**

**问题**：即使 CORS 配好，HTTPS 页面请求 `http://192.168.x.x` 仍会被浏览器以 Mixed Content 拦截。

> **硬件侧决策（2026-09-12 已确认）**：
> 一期只做 **R1（CORS）**，选**方案 3 —— 先打通「局域网 / 本地 http:// 开发」**，把网页端开发阻塞解开；**HTTPS 作为独立特性二期再上**。
> R3（聚合接口）与 HEAD 一期均不做，网页端用现有 `/api/files` 自行拼装。

**这意味着 R1 完成后，能力边界如下（重要，避免误判"做完了"）**：

| 场景 | R1 完成后可达？ | 原因 |
|---|---|---|
| 本地开发（`http://localhost:5173`）读设备 | ✅ 可以 | http → http，无混合内容，CORS 已放行 |
| 局域网内用 http 页面读设备 | ✅ 可以 | 同上 |
| 生产站（`https://www.traceinhabit.cn`）读设备 | ❌ **仍然不行** | HTTPS 页面 → HTTP 设备，Mixed Content 拦截 |
| 生产站（`https://memory-series.github.io`）读设备 | ❌ **仍然不行** | 同上 |

**结论：R1 解决的是"开发期可验证"，不解决"生产环境可用"。** 生产路径依赖二期 HTTPS。

因此对 R1 的验收标准相应调整为：

- **必过**：从 `http://localhost:<port>` 页面能成功跨源读取设备（用 `curl` 或本地 http 页面验证）。
- **不作要求**：从 https 页面读设备（留待二期）。

网页端在此期间的产品策略：
- 设备信息面板**先以本地/局域网场景立项开发**（`http://localhost` 与局域网 http 部署可用）。
- 生产站上的入口**需明确降级提示**，或暂不上线该面板，直到二期 HTTPS 就绪。**不得让用户在生产站点看到一个必然失败的功能。**

---

#### 二期备选路径（保留待议）

**方案 A · 设备提供 HTTPS（自签）**

设备 HTTP 服务启用 TLS（`httpd_ssl_config_t`），使用自签证书，监听 443（或同时保留 80）。

- 优点：网页端可直连，生产站可用。
- **关键坑（务必评估）**：浏览器对 `fetch` 到**自签 HTTPS 同样会失败**，除非用户先手动访问一次 `https://<ip>/` 并接受证书（点「高级 → 继续」）。这需要产出一条清晰的用户引导，否则体验上等于"功能坏了"。
- 影响：需额外 flash 存放证书（自签 2048-bit RSA 约 1-2 KB，可接受）。
- 另需评估：ESP32-S3 上 TLS 握手的内存占用与耗时，以及是否影响现有 http（80）服务的稳定性。

**方案 C · 网页端导出本地快照**

网页端生成一个含读取逻辑的本地 HTML 文件，用户双击以 `file://` 打开，由它去读设备。

- 优点：零固件改动，且**生产站上下文仍可生成该文件**。
- 缺点：跳出网站、体验割裂、`file://` 下跨源行为因浏览器而异（Chrome 对 `file://` 发起的 http 请求默认较宽松，但仍需验证）。

> 二期选 A 还是 C，建议等 R1 落地、网页端在本地跑通后再评估——届时能拿到真实的交互数据来判断证书引导成本。


---

### R3（建议）· 新增聚合接口 `/api/device/info`

**目的**：把网页端需要的信息一次返回，避免网页端发起 10+ 次串行请求（ESP32 HTTP 服务 `max_open_sockets = 12`、`stack_size = 8192`，串行请求慢且占连接）。

**建议返回结构**：

```json
{
  "device": {
    "persona_active": "夏以昼",
    "mode": "inhabit",
    "sdcard": { "mounted": true, "capacity_mb": 15600, "free_bytes": 8123456789 }
  },
  "boot_anim": {
    "path": "/sdcard/system/boot/boot.eaf",
    "exists": true,
    "size": 1048576,
    "mtime": 1760000000
  },
  "personas": [
    {
      "id": "夏以昼",
      "path": "/sdcard/personas/夏以昼",
      "is_active": true,
      "profile": {
        "name": "夏以昼",
        "alias": "…",
        "occupation": "…"
      },
      "tts": {
        "provider": "minimax",
        "model": "speech-2.8-turbo",
        "voice_id": "XiaYizhou01",
        "emotion": "happy"
      },
      "assets": {
        "has_profile": true,
        "has_config": true,
        "has_main_anim": true,
        "has_avatar": true,
        "has_memories": true,
        "has_prompt": true
      },
      "main_anim": {
        "path": "/sdcard/personas/夏以昼/assets/gif/main/main.eaf",
        "size": 4567890
      },
      "avatar": {
        "path": "/sdcard/personas/夏以昼/assets/image/夏以昼头像.jpeg",
        "size": 123456
      }
    }
  ]
}
```

**字段说明（供实现参考）**：

- `persona_active`：来自 `/sdcard/companion/device.json` 的 `active_persona_id`，缺失时 fallback 为 `夏以昼`（`COMPANION_PERSONA_DEFAULT_ID`）。
- `tts`：来自 `personas/<id>/config.json` 的 `tts` 对象。**判断「是否配置音色」= `tts.voice_id` 是否存在且非空**。若无该字段，返回 `null`。
- `has_main_anim`：需按设备现有查找顺序依次探测（`emote_sd_main_anim.c` 的 `k_eaf_path_fmts[]`）：
  1. `/sdcard/personas/<id>/assets/gif/main/main.eaf`
  2. `/sdcard/personas/<id>/assets/gif/main/bin/main.eaf`
  3. `/sdcard/companion/personas/<id>/animations/main/main.eaf`
  4. `/sdcard/personas/<id>/assets/gif/main_gif.eaf`
- `avatar`：取 `assets/image/` 下第一个 `.jpg/.jpeg/.png`。
- **注意路径编码**：角色 id 是中文（`夏以昼`）。JSON 响应必须是 UTF-8，且网页端会对 URL 做 `encodeURIComponent`。

**是否实现 R3 由硬件侧评估**：
- 若实现成本高，**R3 可降级为「不实现」** —— 网页端可以自己用 `/api/files` 逐层遍历拼装，只是慢一些。
- 但 R1（CORS）与 R2（HTTPS）**是硬性前置**，缺一不可。

---

### R4（建议）· 动画文件的浏览器可读格式

**问题**：`.eaf` 是设备私有动画格式，浏览器无法解码。

**网页端一期只做「元信息 + 静态预览」**，因此**最低要求是不需要改动**：

- 开机动画：网页端展示「文件名 / 大小 / 是否存在」，预览图使用仓库里已有的 `boot.gif` / `boot.mp4`（`G:\Memory-Series\Esp32S3\docs\start\`）。
- 角色动画：网页端展示「是否存在 / 大小 / 路径来源（4 条候选路径中命中的哪条）」。
- 角色头像：`.jpg/.jpeg/.png` 浏览器可直接显示，**需要 R1/R2 打通后才能取**。

**可选增强（二期）**：

如果希望网页能真实预览动画，建议设备端提供一个「取首帧」能力：

```
GET /api/anim/frame?path=/sdcard/system/boot/boot.eaf&index=0
→ 返回 PNG（或 BMP）单帧位图
```

- 设备端已有 EAF 解码能力（`expression_emote` + `gfx`），只需把解码后的一帧以位图形式输出。
- 需要明确：输出宽高、像素格式、是否含 alpha。
- **此项列为二期，不阻塞一期。**

---

### R5（可选）· 一期不做写操作

用户已明确**第一期只做「看」，不做「写」**。

设备现有的 `POST /api/files/upload` / `DELETE /api/files` 保持不动即可。**不建议在一期为网页端开放写接口**——写坏 `/sdcard/system/boot/boot.eaf` 可能导致设备无法正常启动。

---

## 3. 接口契约汇总（网页端依赖清单）

网页端一期只会调用以下接口，**硬件侧需保证这些接口在跨源场景下可用**：

| 用途 | 请求 | 依赖 |
|---|---|---|
| 设备状态 | `GET /api/status` | R1 |
| 列角色目录 | `GET /api/files?volume=sdcard&path=/personas` | R1 |
| 列某角色内容 | `GET /api/files?volume=sdcard&path=/personas/<id>` | R1 |
| 读角色 profile | `GET /files/sdcard/personas/<id>/profile.json` | R1 |
| 读角色 TTS 配置 | `GET /files/sdcard/personas/<id>/config.json` | R1 |
| 探角色主动画 | `GET /files/sdcard/personas/<id>/assets/gif/main/main.eaf`（HEAD 或首段 GET） | R1 |
| 读角色头像 | `GET /files/sdcard/personas/<id>/assets/image/<file>` | R1 |
| 探开机动画 | `GET /files/sdcard/system/boot/boot.eaf`（HEAD 或首段 GET） | R1 |
| 读当前角色 | `GET /files/sdcard/companion/device.json` | R1 |

**关于探测存在性的建议**：网页端需要判断文件是否存在但不想下载完整内容。设备当前**不支持 `HEAD` 方法**（`http_server_files_api.c` 只注册了 `GET`）。

> **一期决策**：HEAD 不做。网页端**一律用 `GET /api/files?path=...` 列目录**，从 `entries[]` 的 `size` / `is_dir` 字段判断存在性与大小。**此方式零硬件改动**，可以完全替代 HEAD，并顺带拿到目录内的文件清单。

因此一期网页端的实际请求模式是：

1. `GET /api/files?volume=sdcard&path=/personas` → 拿到角色目录列表
2. 对每个角色：`GET /api/files?volume=sdcard&path=/personas/<id>/assets/gif/main` → 判断主动画是否存在
3. 只在需要**读取内容**时才用 `/files/sdcard/...`（profile.json / config.json / 头像）

---

## 4. 优先级与验收（一期范围 · 已确认）

### 一期必须（唯一的固件侧改动）

- [ ] **R1 · CORS 响应头（全局）+ OPTIONS 通配预检 → 204**

### 一期明确不做

- [x] ~~R2 · HTTPS~~ → 后置为二期独立特性
- [x] ~~R3 · 聚合接口~~ → 网页端用现有 `/api/files` 自行拼装
- [x] ~~HEAD 支持~~ → 用列目录替代
- [x] ~~R4 · 动画首帧~~ → 二期
- [x] ~~R5 · 写操作~~ → 一期只读

### 二期再议

- [ ] R2 · 设备 HTTPS（自签）或网页端导出本地快照
- [ ] R3 · 聚合接口 `/api/device/info`
- [ ] R4 · 动画首帧位图接口
- [ ] 写保护策略（替换开机动画 / 角色图片时的安全机制）


### 二期

- [ ] R4 · 动画首帧位图接口

### 全局验收

1. 在 `https://www.traceinhabit.cn/` 页面控制台执行：
   ```js
   fetch("http://<device-ip>/api/status").then(r => r.json()).then(console.log)
   ```
   期望：正常返回 JSON，**无 CORS 报错，无 Mixed Content 拦截**。
2. 同上，`/api/files?volume=sdcard&path=/personas` 能列出角色目录。
3. **不得破坏现有功能**：设备自带 WebUI（`http://<ip>/`）仍正常；`wifi --status` console 命令仍正常；已有烧录/部署流程不受影响。

---

## 5. 附录 · 关键代码位置索引（供硬件侧定位）

| 内容 | 文件 |
|---|---|
| HTTP 服务启动配置 | `application/edge_agent/components/http_server/http_server_core.c:64` |
| 文件 API 路由注册 | `application/edge_agent/components/http_server/http_server_files_api.c:385` |
| 卷路径解析（sdcard/fatfs） | `application/edge_agent/components/http_server/http_server_utils.c` |
| 状态 API | `application/edge_agent/components/http_server/http_server_status_api.c` |
| SD 卡挂载点定义 | `application/edge_agent/boards/waveshare/waveshare_esp32_s3_touch_lcd_1_85b/board_sdcard.h:15` |
| 开机动画路径常量 | `components/common/emote/include/emote_sd_boot_anim.h`（`EMOTE_SD_BOOT_EAF_PATH`） |
| 角色主动画查找顺序 | `components/common/emote/emote_sd_main_anim.c`（`k_eaf_path_fmts[]`） |
| 当前角色 ID | `/sdcard/companion/device.json` 的 `active_persona_id` |
| 角色 TTS 配置 | `/sdcard/personas/<id>/config.json` 的 `tts.voice_id` |

### SD 卡目录结构（网页端读取目标）

```
/sdcard/
├── system/boot/boot.eaf                    # 开机动画（24 FPS，≤3MB）
├── companion/device.json                   # {"active_persona_id":"夏以昼","mode":"inhabit"}
└── personas/<角色id>/                       # 每个 SoulPod 一个目录
    ├── profile.json                        # name/alias/occupation/appearance/personality...
    ├── config.json                         # soulpod_version/model_preference/tts{voice_id,model}
    ├── system_prompts.txt
    ├── memories/raw_memories.json
    ├── prompt/{story_baseline,universal_prompt}.txt
    └── assets/
        ├── source.txt
        ├── image/<角色>.jpg|jpeg            # 头像（浏览器可直接显示）
        ├── gif/main/main.eaf               # 主动画（或 bin/frame_NN_delay-0.bin）
        └── sound/wake_reply.wav
```
