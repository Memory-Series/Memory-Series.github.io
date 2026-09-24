/**
 * chat-002 —— 对话抽屉的**共享加载器 + 打开请求类型**。
 *
 * 为什么单独一个文件：抽屉要能被两个地方用到 ——
 *   ① 角色卡上的「聊聊」按钮（已知角色、负责预热）；
 *   ② 区块级的 `ChatDrawerHost`（负责真正渲染，不受卡片失焦影响）。
 * 两边必须共用同一份模块缓存，否则会各自 `import()` 一次。
 *
 * 这里只用**类型**引用 `ChatDrawer`（`typeof import(...)`，编译后消失），
 * 所以它进主包只花几百字节，抽屉本体仍然是懒加载 chunk。
 */

import type { ChatCharKey } from "@/lib/chat-keys";

/** 打开抽屉所需的最小上下文。 */
export interface ChatDrawerRequest {
  charKey: ChatCharKey;
  characterName: string;
  enName: string;
  avatarSrc: string;
}

type ChatDrawerComponent = typeof import("@/sections/ChatDrawer")["default"];

let cachedDrawer: ChatDrawerComponent | null = null;
let inflight: Promise<ChatDrawerComponent> | null = null;

/** 已加载完成的抽屉组件（没有则 null）。用于 `useState` 初值，避免二次加载。 */
export function getCachedChatDrawer(): ChatDrawerComponent | null {
  return cachedDrawer;
}

/** 加载抽屉 chunk；并发调用复用同一个 promise，失败后允许重试。 */
export function loadChatDrawer(): Promise<ChatDrawerComponent> {
  if (cachedDrawer) return Promise.resolve(cachedDrawer);
  if (!inflight) {
    inflight = import("@/sections/ChatDrawer")
      .then((mod) => {
        cachedDrawer = mod.default;
        return cachedDrawer;
      })
      .catch((err) => {
        inflight = null; // 允许下一次重试
        throw err;
      });
  }
  return inflight;
}

/** 预热：吞掉错误，供「用户可能马上要打开」的时机（按钮挂载）调用。 */
export function preloadChatDrawer(): void {
  void loadChatDrawer().catch(() => {
    /* 静默：真正打开时会再试一次 */
  });
}
