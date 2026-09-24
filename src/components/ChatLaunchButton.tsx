/**
 * chat-001 —— 角色卡上的「聊聊」入口。
 *
 * 这个组件活在**主包**里，所以它只做三件小事：判断这张卡有没有可聊的角色、渲染一个按钮、
 * 在第一次点击时才把对话抽屉（懒加载 chunk）拉下来。
 * 真正的 persona 数据、台词库、抽屉 UI 全在那个 chunk 里 —— 主包不该为没点过的人付体积。
 */

import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { chatKeyForCharacter } from "@/lib/chat-keys";
import { cn } from "@/lib/utils";

const ChatDrawer = lazy(() => import("@/sections/ChatDrawer"));

interface ChatLaunchButtonProps {
  /** 中文角色名，与角色卡、`SOULPOD_MANIFEST` 一致。 */
  characterName: string;
  enName: string;
  /** 角色竖图，用作抽屉头部的头像。 */
  avatarSrc: string;
  compact?: boolean;
}

export function ChatLaunchButton({ characterName, enName, avatarSrc, compact }: ChatLaunchButtonProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  // 没有完整 SoulPod 包的角色不显示入口 —— 与「部署 SoulPod」按钮的 available 口径一致。
  const charKey = chatKeyForCharacter(characterName);
  if (!charKey) return null;

  return (
    <>
      <button
        type="button"
        data-chat-launch=""
        onClick={(event) => {
          event.stopPropagation();
          setMounted(true);
          setOpen(true);
        }}
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

      {mounted && (
        <Suspense fallback={null}>
          <ChatDrawer
            open={open}
            onOpenChange={setOpen}
            charKey={charKey}
            characterName={characterName}
            enName={enName}
            avatarSrc={avatarSrc}
          />
        </Suspense>
      )}
    </>
  );
}
