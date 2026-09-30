/**
 * chat-003 —— 助手回复上的**语音播放按钮**。
 *
 * 本文件在懒 chunk 内（由 `ChatDrawer` 引入，而 `ChatDrawer` 是动态 import 的 chunk），
 * 所以主包不因为这条特性多出一行逻辑 —— 只有那个显示判据跟着抽屉走。
 *
 * 视觉纪律：`DESIGN.md` 规定「暖金是唯一的强强调色、且克制使用」。因此这里的
 * 进行中状态用**金色描边**而不是实心金块 —— 实心金块是发送键的专属语义
 * （"这是这次交互的主动作"），一个可选的辅助功能不该抢它。
 *
 * a11y：可访问名**以可见文案开头**（`听语音 · 正在合成…`），满足 WCAG 2.5.3
 * 「Label in Name」——不能出现"看得见的字"与"读屏听到的字"对不上的情况。
 * `prefersReducedMotion` 下转圈动画降级为静态状态文字（沿用抽屉既有约定）。
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pause, Play, Volume2 } from "lucide-react";

import type { ChatLabels } from "@/lib/chat-copy";
import type { ChatCharKey } from "@/lib/chat-keys";
import { releaseSpeech, toggleSpeech, type SpeakStatus } from "@/lib/chat-tts-audio";
import type { TtsFailReason } from "@/lib/chat-tts";
import { cn } from "@/lib/utils";

/** 失败原因 → 灰字文案。四种原因走同一条降级路径，只是说明不同。 */
function failLabel(reason: TtsFailReason, labels: ChatLabels): string {
  if (reason === "quota") return labels.speakQuota;
  if (reason === "disabled") return labels.speakDisabled;
  return labels.speakUnavailable;
}

export default function ChatSpeakButton({
  messageId,
  charKey,
  text,
  labels,
  reducedMotion,
}: {
  messageId: string;
  charKey: ChatCharKey;
  text: string;
  /** 文案表由父层传入 —— 每个按钮各订阅一次 i18n 是白花的开销。 */
  labels: ChatLabels;
  reducedMotion: boolean;
}) {
  const [status, setStatus] = useState<SpeakStatus | null>(null);

  // 卸载时如果这条正在播就停下 —— 否则关了抽屉声音还在响。
  useEffect(() => () => releaseSpeech(messageId), [messageId]);

  const onClick = useCallback(() => {
    void toggleSpeech({ id: messageId, charKey, text, onStatus: setStatus });
  }, [messageId, charKey, text]);

  const state = status?.state ?? "idle";
  const active = state === "playing" || state === "paused";

  /** 状态说明：失败时是失败文案，进行中/暂停时是状态文案，空闲时为空。 */
  const hint =
    status?.state === "failed"
      ? failLabel(status.reason, labels)
      : state === "loading"
        ? labels.speakLoading
        : state === "playing"
          ? labels.speakPlaying
          : state === "paused"
            ? labels.speakPaused
            : "";

  const aria = hint ? `${labels.speak} · ${hint}` : labels.speak;

  // 说明文字何时**可见**：失败时必显示（这是降级约定）；降级动效时也显示，
  // 用静态文字替代那个转圈动画。
  const showNote = status?.state === "failed" || (reducedMotion && state !== "idle");

  const icon =
    state === "loading" ? (
      <Loader2 className={cn("h-3 w-3", !reducedMotion && "animate-spin")} />
    ) : state === "playing" ? (
      <Pause className="h-3 w-3" />
    ) : state === "paused" ? (
      <Play className="h-3 w-3" />
    ) : (
      <Volume2 className="h-3 w-3" />
    );

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-chat-speak={state}
        onClick={onClick}
        aria-label={aria}
        title={aria}
        style={active ? { borderColor: "oklch(0.78 0.12 75 / 0.5)" } : undefined}
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] transition-colors",
          active ? "text-foreground/75" : "border-border/60 text-foreground/55 hover:text-foreground",
        )}
      >
        {icon}
        <span>{labels.speak}</span>
      </button>
      {showNote && hint && (
        <span data-chat-speak-note={state} className="text-[10px] text-foreground/45">
          {hint}
        </span>
      )}
    </span>
  );
}
