import { describe, expect, it } from "vitest";

import { SOULPOD_MANIFEST, soulPodUrls } from "@/lib/soulpod";

/**
 * `soulpod-002` 的回归网（下载链路的**地址拼装**与**多源兜底**）。
 *
 * 背景一：`raw()` 曾写成 `[REPO_RAW, "inhabit", …].map(encodeURIComponent).join("/")`，
 * 把 **含 scheme 的域名前缀也编码了** → 整串以 `https%3A%2F%2F` 开头、不再是绝对 URL，
 * 浏览器 `fetch()` 把它当**相对路径**解析到站点自身域 → 每个文件 404。
 * 「下载 SoulPod」因此自上线起从未成功，而 harness 里那条 `passing` 的证据只验了
 * 直连 raw 地址可访问、没验代码实际拼出来的那一条 —— 假通过。
 *
 * 背景二：只走 `raw.githubusercontent.com` 在国内长尾极差（实测最慢 21.3 s、
 * 点 4 次失败 2 次），所以打包改为**多源依次尝试**。下面同时钉住源的顺序与数量，
 * 防止有人「顺手」把某个源删掉或挪到前面。
 *
 * 这些断言不需要网络、不需要浏览器，跑一次单测就能拦住同类回归。
 */

const PERSONA_MARKER = "/inhabit/personas/";

describe("SoulPod 下载地址拼装", () => {
  const allFiles = SOULPOD_MANIFEST.flatMap((m) =>
    m.files.map((f) => ({ character: m.name, ...f })),
  );

  it("每个地址都是绝对 URL，且指向 Trace-Inhabit 仓库的 personas 目录", () => {
    expect(allFiles.length).toBeGreaterThan(0);
    for (const { character, zipPath, url } of allFiles) {
      // 这一条就足以钉死原缺陷：被编码过的 scheme 过不了 `new URL()` 的绝对性判定。
      expect(() => new URL(url), `${character}/${zipPath} 不是绝对 URL: ${url}`).not.toThrow();
      expect(url, `${character}/${zipPath} 未指向 personas 目录`).toContain(PERSONA_MARKER);
    }
  });

  it("任何一个地址都不含「被编码的 scheme」—— 原缺陷的特征串", () => {
    for (const { character, zipPath, url } of allFiles) {
      expect(url, `${character}/${zipPath} 含 %3A%2F%2F，说明域名前缀又被一起编码了`).not.toContain(
        "%3A%2F%2F",
      );
      expect(url.startsWith("http"), `${character}/${zipPath} 不以 scheme 开头`).toBe(true);
    }
  });

  it("中文路径段逐个百分号编码，且 '/' 仍作分隔符", () => {
    // 只编码每一段、保留分隔符 —— 这是「编码路径段」与「编码整串」的分界。
    const yeXiu = allFiles.find((f) => f.character === "叶修" && f.zipPath === "profile.json");
    expect(yeXiu?.url).toContain("叶修".replace("叶修", "%E5%8F%B6%E4%BF%AE") + "/profile.json");

    const urls = soulPodUrls("叶修", "memories", "raw_memories.json");
    for (const u of urls) {
      expect(u).toContain("%E5%8F%B6%E4%BF%AE/memories/raw_memories.json");
    }
  });

  it("多源兜底：每个文件都有 3 条候选，顺序为 jsDelivr → raw → gh-proxy", () => {
    const urls = soulPodUrls("叶修", "profile.json");
    expect(urls).toHaveLength(3);
    expect(urls[0]).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\//);
    expect(urls[1]).toMatch(/^https:\/\/raw\.githubusercontent\.com\//);
    expect(urls[2]).toMatch(/^https:\/\/gh-proxy\.com\/https:\/\/raw\.githubusercontent\.com\//);
    // 三条都必须是绝对 URL（原缺陷会让它们全部变成相对路径）
    for (const u of urls) expect(() => new URL(u)).not.toThrow();
    // 三条指向同一个文件（路径尾巴一致），否则兜底会拿到别的角色的素材
    for (const u of urls) expect(u).toContain("%E5%8F%B6%E4%BF%AE/profile.json");
  });

  it("manifest 里的 url 就是首选项（避免清单与实际请求的源不一致）", () => {
    for (const { character, zipPath, url } of allFiles) {
      expect(url, `${character}/${zipPath} 的 url 与 soulPodUrls 首选项不一致`).toBe(
        soulPodUrls(character, ...zipPath.split("/"))[0],
      );
    }
  });

  it("可下载角色的文件清单非空，且与 available 口径一致", () => {
    for (const m of SOULPOD_MANIFEST) {
      if (m.available) {
        expect(m.files.length, `${m.name} 标为可下载却没有文件`).toBeGreaterThan(0);
        // SoulPod 的最小集合：没有这几份，设备侧认不出这个角色。
        const paths = m.files.map((f) => f.zipPath);
        for (const required of ["profile.json", "config.json", "prompt/universal_prompt.txt"]) {
          expect(paths, `${m.name} 缺少 ${required}`).toContain(required);
        }
      } else {
        expect(m.files, `${m.name} 标为不可下载却带文件清单`).toEqual([]);
      }
    }
  });

  it("zip 内路径都是相对路径（不含 scheme、不以 / 开头）", () => {
    for (const { character, zipPath } of allFiles) {
      expect(zipPath, `${character} 的 zipPath 异常: ${zipPath}`).not.toMatch(/^https?:|^\//);
    }
  });
});
