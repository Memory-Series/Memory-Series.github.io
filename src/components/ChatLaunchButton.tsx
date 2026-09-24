/**
 * chat-001 / chat-002 —— 角色卡上的「聊聊」入口（**瘦按钮**）。
 *
 * 这个组件活在**主包**里，所以它只做三件事：判断这张卡有没有可聊的角色、渲染一个按钮、
 * 把对话抽屉（懒加载 chunk）拉下来。真正的 persona 数据、台词库、抽屉 UI 全在那个 chunk 里 ——
 * 主包不该为没点过的人付体积。
 *
 * ---
 * Session 056：抽屉不再挂在这个按钮下面，改为上报给区块级的 `ChatDrawerHost`。
 *
 * 起因是线上实测（GitHub Pages，真实 Chrome/Edge 复现）**首次点击「聊聊」毫无反应**：
 * 点击事件确实到达按钮、onClick 也确实执行、chunk 请求 200，但抽屉始终不挂载；
 * 同一份代码在京东云 100% 正常。本地用「故意延迟 chunk 响应」的服务器复现出了同一条竞态，
 * 时间线抓到了根因：
 *
 *   t≈0     点击「聊聊」→ 按钮上报打开意图（state 在自己身上）
 *   t≈831   卡片失焦（`DemoSection` 的 `onMouseLeave` 把 `focusedDemoCard` 置 null）
 *           → 入口按钮被卸载 → **它身上的打开意图跟着一起消失**
 *   t≈1770  chunk 到达 —— 但已经没有人记得要打开了
 *
 * 京东云 nginx 快，chunk 在卡片失焦之前就到了，所以看不出问题；GitHub Pages 走 CDN 慢，
 * 这个窗口必然出现，真实用户就点了没反应。
 *
 * 现在：按钮只管「上报请求 + 预热」，抽屉由不会随卡片失焦卸载的 host 渲染，
 * 因此无论鼠标之后怎么动都不会丢意图。
 *
 * 为什么不在 `index.html` 里硬编码 `<link rel=modulepreload>`：CI(ubuntu) 与本地(Windows)
 * 的内容哈希不同，产物文件名两站不一致，硬编码必然有一边失效；走源码 `import()` 则由
 * bundler 解析文件名与依赖，两边都对。也避免为「没点过的人」在首屏多付 51 kB。
 */

import { useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { chatKeyForCharacter } from "@/lib/chat-keys";
import { preloadChatDrawer, type ChatDrawerRequest } from "@/lib/chat-drawer-loader";
import { cn } from "@/lib/utils";

interface ChatLaunchButtonProps {
  /** 中文角色名，与角色卡、`SOULPOD_MANIFEST` 一致。 */
  characterName: string;
  enName: string;
  /** 角色竖图，用作抽屉头部的头像。 */
  avatarSrc: string;
  /** 点击后把「打开谁」上报给区块级的抽屉宿主。 */
  onLaunch: (request: ChatDrawerRequest) => void;
  compact?: boolean;
}

export function ChatLaunchButton({
  characterName,
  enName,
  avatarSrc,
  onLaunch,
  compact,
}: ChatLaunchButtonProps) {
  const { t } = useTranslation();

  // 没有完整 SoulPod 包的角色不显示入口 —— 与「部署 SoulPod」按钮的 available 口径一致。
  const charKey = chatKeyForCharacter(characterName);

  // 按钮一出现（= 用户已悬停卡片、极可能马上点击）就开始预热 chunk。
  // 不能等点击才加载：那会把上面那条竞态窗口完全暴露给用户。
  useEffect(() => {
    if (charKey) preloadChatDrawer();
  }, [charKey]);

  if (!charKey) return null;

  const handleLaunch = (event: ReactMouseEvent<HTMLButtonElement>) => {
    // 卡片本身有 onClick（聚焦），这里别让它抢走这次点击。
    event.stopPropagation();
    onLaunch({ charKey, characterName, enName, avatarSrc });
  };

  return (
    <button
      type="button"
      data-chat-launch=""
      onClick={handleLaunch}
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
        "border border-[oklch(0.78_0.12_75/0.55)] bg-transparent text-[oklch(0.78_0.12_75)]",
        "hover:border-[oklch(0.78_0.12_75/0.85)] hover:bg-[oklch(0.78_0.12_75/0.1)]",
        compact && "text-[10px]",
      )}
      aria-label={t("sections.chat.launchAria", { name: characterName })}
    >
      <MessageCircle className="h-3 w-3" />
      {t("sections.chat.launch")}
    </button>
  );
}
