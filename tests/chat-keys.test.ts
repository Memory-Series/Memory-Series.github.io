import { describe, expect, it } from "vitest";

import { CHAT_CHARACTERS, chatKeyForCharacter } from "@/lib/chat-keys";
import { SOULPOD_MANIFEST } from "@/lib/soulpod";

describe("chatKeyForCharacter", () => {
  it("有完整 SoulPod 包的角色都能拿到 key", () => {
    expect(chatKeyForCharacter("叶修")).toBe("ye-xiu");
    expect(chatKeyForCharacter("夏以昼")).toBe("xia-yizhou");
    expect(chatKeyForCharacter("秦彻")).toBe("qin-che");
  });

  it("没有完整包的角色返回 null —— 界面上不显示「聊聊」入口", () => {
    for (const name of ["庄方宜", "拓跋玉儿", "戴安娜"]) {
      expect(chatKeyForCharacter(name)).toBeNull();
    }
  });

  it("未知 / 空 / 带空格的输入都返回 null（匹配是精确的）", () => {
    expect(chatKeyForCharacter("")).toBeNull();
    expect(chatKeyForCharacter("叶修 ")).toBeNull();
    expect(chatKeyForCharacter("Nobody")).toBeNull();
  });

  it("英文名不是匹配口径", () => {
    // 角色卡上的显示名可能随语言切换，但匹配走的是中文名 —— 这条钉住现状：
    // 若哪天想让英文名也能匹配，必须先想清楚中英切换时入口会不会整片消失。
    expect(chatKeyForCharacter("Ye Xiu")).toBeNull();
    expect(chatKeyForCharacter("Sylus")).toBeNull();
  });

  it("key 不重复", () => {
    const keys = CHAT_CHARACTERS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("chat-keys 与 SoulPod 清单的口径一致性", () => {
  // 可聊角色这份名单和 SoulPod 下载清单是两份独立维护的数据，界面上承担的却是
  // 同一个判断："这张角色卡要不要显示「聊聊」"。任何一边单独增删角色，都会变成
  // 「有入口没数据」或「有数据没入口」—— 而这两种错都不会报错、只会让用户点进去
  // 发现没人应答。`chat-keys.ts` 的注释里写明了这条约束，这里给它一张回归网。
  it("可聊角色 == 有完整 SoulPod 包的角色", () => {
    const chatKeys = CHAT_CHARACTERS.map((c) => c.key).sort();
    const availableKeys = SOULPOD_MANIFEST.filter((m) => m.available)
      .map((m) => m.key)
      .sort();
    expect(chatKeys).toEqual(availableKeys);
  });

  it("角色显示名与 SoulPod 清单一致", () => {
    for (const c of CHAT_CHARACTERS) {
      const entry = SOULPOD_MANIFEST.find((m) => m.key === c.key);
      expect(entry, `SoulPod 清单里缺少 ${c.key}`).toBeDefined();
      expect(entry?.name).toBe(c.name);
    }
  });

  it("每个可聊角色在清单里都有文件列表（不是空壳）", () => {
    for (const c of CHAT_CHARACTERS) {
      const entry = SOULPOD_MANIFEST.find((m) => m.key === c.key);
      expect(entry?.files.length, `${c.key} 的文件列表为空`).toBeGreaterThan(0);
    }
  });
});
