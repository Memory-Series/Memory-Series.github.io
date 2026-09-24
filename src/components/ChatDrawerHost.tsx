/**
 * chat-002 —— 对话抽屉的**区块级宿主**。
 *
 * 为什么要有这个组件：入口按钮长在角色卡里，而卡片一旦失焦（`DemoSection` 的
 * `onMouseLeave`）就会被卸载 —— 按钮身上的「打开意图」也会一起消失。
 * 实测时间线：点击 → 约 831ms 后卡片失焦、按钮被卸载 → chunk 约 1770ms 才到，
 * 此时已经没人记得要打开了。京东云 nginx 快、chunk 先到所以看不出来；
 * GitHub Pages 走 CDN 慢，真实用户点「聊聊」就是毫无反应。
 *
 * 所以把抽屉挂在区块这一层：它不随卡片失焦卸载，任何时刻到达的打开请求都能兑现。
 *
 * 分工：
 *   - `request` 由父级持有（不随卡片失焦清空）→ 保留上下文，退场动画也能跑完；
 *   - `open` 由父级事件处理器驱动 → 不在 effect 里同步 setState；
 *   - 这里只做一件事：`request` 非空时把 chunk 加载进来，就绪了就渲染。
 *     没有 Suspense，不依赖 React 的重试机制；「点了但 chunk 还没到」会在到达后自动打开。
 */

import { useEffect, useState } from "react";

import { getCachedChatDrawer, loadChatDrawer, type ChatDrawerRequest } from "@/lib/chat-drawer-loader";

interface ChatDrawerHostProps {
  /** 要打开谁；一旦非空就保持（关闭只翻 `open`），这样退场动画与再次打开都不用重新传参。 */
  request: ChatDrawerRequest | null;
  /** 抽屉是否展开。 */
  open: boolean;
  /** 抽屉请求开/关（关闭动画结束后 Radix 会调用 `false`）。 */
  onOpenChange: (open: boolean) => void;
}

export function ChatDrawerHost({ request, open, onOpenChange }: ChatDrawerHostProps) {
  const [Drawer, setDrawer] = useState(() => getCachedChatDrawer());

  const wanted = request !== null;

  // 只负责把 chunk 拿进来；`setDrawer` 在 then 回调里（不是 effect 体内同步调用）。
  // 按钮悬停时通常已经预热过，这里多半命中缓存、不产生网络请求。
  useEffect(() => {
    if (!wanted || Drawer) return;
    let alive = true;
    loadChatDrawer()
      .then((C) => {
        if (alive) setDrawer(() => C);
      })
      .catch(() => {
        /* chunk 加载失败：保持静默，用户可再点一次 */
      });
    return () => {
      alive = false;
    };
  }, [wanted, Drawer]);

  if (!request || !Drawer) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      charKey={request.charKey}
      characterName={request.characterName}
      enName={request.enName}
      avatarSrc={request.avatarSrc}
    />
  );
}
