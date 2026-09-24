/**
 * chat-001 —— 哪些角色可以聊天（**极小模块，唯一允许进主包的 chat 代码**）。
 *
 * 为什么单独拆一个文件：`DemoSection` 是主包里的组件，它需要知道"这张卡要不要显示「聊聊」"。
 * 如果把这份判断塞进 `chat-personas.ts`（里面还有开场白与降级台词库，约 3–4 kB），
 * 就会被主包静态引用进去 —— 主包当时只剩约 13 kB 余量（486.76 / 500 kB）。
 *
 * 所以这里只放「角色名 → 角色 key」这一层最轻的映射（几百字节），
 * 真正的 persona 数据全部留在 `chat-personas.ts`，随对话抽屉那个懒加载 chunk 走。
 *
 * 口径必须与 `src/lib/soulpod.ts` 里 `available: true` 的角色一致 ——
 * 只有拿到完整 SoulPod 包的角色才谈得上"和这个角色聊天"。
 */

export const CHAT_CHARACTERS = [
  { name: "叶修", key: "ye-xiu" },
  { name: "夏以昼", key: "xia-yizhou" },
  { name: "秦彻", key: "qin-che" },
] as const;

export type ChatCharKey = (typeof CHAT_CHARACTERS)[number]["key"];

const BY_NAME: ReadonlyMap<string, ChatCharKey> = new Map(
  CHAT_CHARACTERS.map((c) => [c.name, c.key]),
);

/** 角色名 → 角色 key；没有完整 SoulPod 包的角色返回 null（界面上不显示入口）。 */
export function chatKeyForCharacter(characterName: string): ChatCharKey | null {
  return BY_NAME.get(characterName) ?? null;
}
