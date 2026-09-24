/**
 * chat-001 —— 网页端 SoulPod 对话抽屉。
 *
 * **本文件（连同 `chat-personas.ts` / `chat-core.ts`）是一个懒加载 chunk**：
 * 由 `src/components/ChatLaunchButton.tsx` 动态 import，只有用户第一次点「聊聊」时才拉取。
 * 主包当时只剩约 13 kB 余量（486.76 / 500 kB），这一层绝不能破。
 *
 * 视觉上是"字幕式"，刻意不用聊天气泡 —— 见 `harness/docs/design-web-chat.md` §4。
 * 整个抽屉只有发送键使用金色（DESIGN.md: warm gold as the only strong accent）。
 * 上游不可用时**不报红色错误**，改用预设台词 + 一行灰字说明（与素材库面板的既有约定一致）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, RotateCcw, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import ErrorBoundary from "@/components/ErrorBoundary";
import { SoulPodDownload } from "@/components/SoulPodDownload";
import { CHAT_LABELS, CHAT_NOTICE, CHAT_TERMS, toChatCopyLang, type ChatLabels } from "@/lib/chat-copy";
import {
  buildChatRequest,
  canSendMore,
  CHAT_CLIENT_LIMITS,
  interpretChatResponse,
  pickFallbackReply,
  trimToChars,
  turnsUsed,
  type ChatDegradeReason,
  type ChatMessage,
} from "@/lib/chat-core";
import { getChatPersona } from "@/lib/chat-personas";
import type { ChatCharKey } from "@/lib/chat-keys";
import { cn } from "@/lib/utils";

const NOTICE_STORAGE_KEY = "ms.chat.notice.v1";
const DEVICE_PAGE_HREF = "#/product/inhabit-device";
const GOLD = "oklch(0.78 0.12 75)";
/**
 * 金色 + 透明度**必须**走 CSS 的 `/ alpha` 写法。
 * 这里原先写成 `${GOLD}80`（把 `#rrggbbaa` 的习惯套到了 `oklch()` 上）→ 值非法、整条声明被浏览器丢弃，
 * 角色台词的左侧金线于是回落到主题默认描边色，变成一条灰线。打字指示点同一个错。
 */
const goldAlpha = (alpha: number) => `oklch(0.78 0.12 75 / ${alpha})`;

interface UiMessage extends ChatMessage {
  /** 非 null 表示这条回复来自预设台词库，界面必须标出来。 */
  degraded?: ChatDegradeReason | null;
}

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charKey: ChatCharKey;
  characterName: string;
  avatarSrc: string;
  enName: string;
}

/**
 * 降级原因 → 文案表字段名。四种原因走同一条降级路径，只是灰字说明不同。
 * 这里写显式字面量联合而不是 `keyof ChatLabels`：后者会把函数型成员
 * （`turnBudget` / `limitReached`）也带进来，取出来的值就不是 `string` 了。
 */
type DegradedLabelKey = "degradedUnavailable" | "degradedQuota" | "degradedDisabled" | "degradedError";

const DEGRADED_LABEL: Record<ChatDegradeReason, DegradedLabelKey> = {
  unavailable: "degradedUnavailable",
  quota: "degradedQuota",
  disabled: "degradedDisabled",
  error: "degradedError",
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readNoticeAck(): boolean {
  try {
    return window.sessionStorage.getItem(NOTICE_STORAGE_KEY) === "1";
  } catch {
    // 隐私模式 / 存储被禁用时当作"没看过"，只是会再提示一次，不影响功能。
    return false;
  }
}

function writeNoticeAck(): void {
  try {
    window.sessionStorage.setItem(NOTICE_STORAGE_KEY, "1");
  } catch {
    /* 同上，忽略 */
  }
}

/**
 * 逐字显现。只用于"最新一条角色回复"，历史消息整段显示。
 * `prefers-reduced-motion` 下直接整段显示（a11y-001 的既有约定）。
 *
 * 实现上刻意**不在 effect 体内同步 setState**（会触发级联渲染，eslint 的
 * `react-hooks/set-state-in-effect` 也会报错）—— 只用定时器推进一个计数，
 * 显示文本由计数纯派生。每条消息的 key 是 message.id，所以新消息一定是新挂载，计数天然从 0 起。
 */
function useRevealedText(text: string, animate: boolean): { shown: string; revealing: boolean } {
  const [ticks, setTicks] = useState(0);
  const perTick = 2;
  const need = Math.max(1, Math.ceil(text.length / perTick));

  useEffect(() => {
    if (!animate) return;
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setTicks(n);
      if (n >= need) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [animate, text, need]);

  if (!animate) return { shown: text, revealing: false };
  const shown = ticks >= need ? text : text.slice(0, ticks * perTick);
  return { shown, revealing: shown.length < text.length };
}

function MessageBubble({
  message,
  labels,
  animate,
  onRevealDone,
  onRetry,
}: {
  message: UiMessage;
  /** 文案表由父层传入 —— 每条消息各订阅一次 i18n 是白花的开销。 */
  labels: ChatLabels;
  animate: boolean;
  onRevealDone: () => void;
  onRetry: () => void;
}) {
  const { shown, revealing } = useRevealedText(message.content, animate);

  useEffect(() => {
    if (!revealing) onRevealDone();
  }, [revealing, onRevealDone]);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] text-right text-sm leading-7 text-foreground/60">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div data-chat-role="assistant" className="border-l-2 pl-3.5" style={{ borderColor: goldAlpha(0.5) }}>
      <p className="text-[15px] leading-7 text-foreground">
        {shown}
        {revealing && <span className="ml-0.5 inline-block h-4 w-[2px] align-middle" style={{ backgroundColor: GOLD }} />}
      </p>
      {!revealing && message.degraded && (
        <p
          data-chat-degraded={message.degraded}
          className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-foreground/45"
        >
          <span data-chat-degraded-label="">{labels[DEGRADED_LABEL[message.degraded]]}</span>
          {message.degraded === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-border/60 px-2 py-[2px] text-foreground/55 transition-colors hover:text-foreground"
            >
              {labels.retry}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

export default function ChatDrawer({
  open,
  onOpenChange,
  charKey,
  characterName,
  avatarSrc,
  enName,
}: ChatDrawerProps) {
  const { i18n } = useTranslation();
  const persona = useMemo(() => getChatPersona(charKey), [charKey]);
  const isEn = (i18n.resolvedLanguage ?? i18n.language ?? "zh").startsWith("en");
  // 首须知与完整条款不放 locales —— 它们只在抽屉里可达，应当随抽屉一起懒加载（见 chat-copy.ts）。
  const copyLang = toChatCopyLang(i18n.resolvedLanguage ?? i18n.language);
  // 抽屉文案表：与须知/条款同一个文件、同一套语言口径，随懒 chunk 一起下来。
  const L = CHAT_LABELS[copyLang];

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [openerIndex, setOpenerIndex] = useState(0);
  const [noticeAck, setNoticeAck] = useState(false);
  const [view, setView] = useState<"chat" | "terms">("chat");

  const seq = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const nextId = useCallback(() => {
    seq.current += 1;
    return `m${seq.current}`;
  }, []);

  // 会话生命周期（设计文档 §5/§6）：**不落任何存储**，刷新即清；但同一次页面访问里
  // 关闭再打开会保留对话 —— 首次点击后抽屉组件就常驻了，误按 Esc 不该让人白聊一场。
  // 显式重置只有「清空重来」一个入口。
  useEffect(() => {
    if (!open) return;
    setView("chat");
    setDraft("");
    setNoticeAck(readNoticeAck());
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const opener = persona?.openers[0] ?? "";
      return opener ? [{ id: nextId(), role: "assistant", content: opener, degraded: null }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, persona]);

  // 关闭时中断在途请求，避免"关了抽屉还在计费"。
  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }, [open]);

  // 卸载时同样中断 —— 抽屉被懒加载卸载后不该继续跑请求。
  useEffect(() => () => abortRef.current?.abort(), []);

  // 依赖里必须带 `open`：抽屉关闭时 Radix 会把内容卸载，重新打开时 `messages` 没变、
  // 这个 effect 就不会跑，列表会停在最上面 —— 看起来像"这次的对话丢了"。
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // 焦点进入输入框：Radix 默认会把焦点给第一个可聚焦元素（关闭按钮），
  // 而这里的意图是"打开就能说话"。故意不聚焦，改用显式 focus。
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => composerRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const acceptNotice = useCallback(() => {
    writeNoticeAck();
    setNoticeAck(true);
    composerRef.current?.focus();
  }, []);

  const remaining = CHAT_CLIENT_LIMITS.maxTurns - turnsUsed(messages);
  const atLimit = remaining <= 0;

  const send = useCallback(
    async (rawText: string, options: { silentUserMessage?: boolean } = {}) => {
      if (!persona || sending) return;
      const text = trimToChars(rawText);
      if (!text) return;
      if (!canSendMore(messages)) return;

      const userMessage: UiMessage = { id: nextId(), role: "user", content: text, degraded: null };
      const history = options.silentUserMessage ? messages : [...messages, userMessage];

      if (!options.silentUserMessage) {
        setMessages(history);
        setDraft("");
        const el = composerRef.current;
        if (el) el.style.height = "auto";
      }
      setSending(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 20_000);

      let reply = "";
      let degraded: ChatDegradeReason | null = null;

      try {
        const payload = buildChatRequest(persona.key, history);
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const verdict = interpretChatResponse({
          status: response.status,
          contentType: response.headers.get("content-type"),
          bodyText: await response.text(),
        });
        if (verdict.ok) {
          reply = verdict.reply;
        } else {
          degraded = verdict.reason;
        }
      } catch {
        // 网络失败 / 超时 / 被 abort：一律降级。用户看不到任何红色错误。
        degraded = "unavailable";
      } finally {
        window.clearTimeout(timeout);
        abortRef.current = null;
      }

      if (degraded) {
        reply = pickFallbackReply(
          persona.fallback,
          persona.defaultReplies,
          text,
          turnsUsed(history),
        );
      }

      if (!reply) {
        setSending(false);
        return;
      }

      const replyId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: replyId, role: "assistant", content: reply, degraded },
      ]);
      // 必须在同一次提交里就把 revealingId 定下来：如果放到 effect 里再派生，
      // 新消息会先以"整段"渲染一帧、然后才塌回去重新逐字显现（肉眼可见的闪一下）。
      setRevealingId(reducedMotion ? null : replyId);
      setSending(false);
    },
    [messages, nextId, persona, reducedMotion, sending],
  );

  const retryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // 去掉最后那条降级回复，再重发同一条提问（silent = 不重复插入用户消息）。
    setMessages((prev) => (prev[prev.length - 1]?.degraded ? prev.slice(0, -1) : prev));
    void send(lastUser.content, { silentUserMessage: true });
  }, [messages, send]);

  const clearSession = useCallback(() => {
    abortRef.current?.abort();
    setSending(false);
    setDraft("");
    setRevealingId(null);
    const next = (openerIndex + 1) % Math.max(persona?.openers.length ?? 1, 1);
    setOpenerIndex(next);
    const opener = persona?.openers[next] ?? "";
    setMessages(opener ? [{ id: nextId(), role: "assistant", content: opener, degraded: null }] : []);
    const el = composerRef.current;
    if (el) el.style.height = "auto";
  }, [nextId, openerIndex, persona]);

  const autoGrow = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  const [revealingId, setRevealingId] = useState<string | null>(null);

  const handleRevealDone = useCallback(() => setRevealingId(null), []);
  const handleRetry = useCallback(() => retryLast(), [retryLast]);

  const source = isEn ? persona?.sourceEn : persona?.sourceZh;
  const openers = persona?.openers ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-chat-drawer=""
          aria-describedby={undefined}
          style={{ height: "100dvh" }}
          className={cn(
            "fixed right-0 top-0 z-50 flex h-screen w-full flex-col",
            "border-l border-border/50 bg-card/40 backdrop-blur-2xl",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "sm:w-[420px] sm:max-w-[92vw]",
          )}
        >
          {/* 头部：L1 微标（「粉丝演示 · 非官方」）在用户输入之前就常驻可见 */}
          <header className="flex items-start gap-3 border-b border-border/40 px-5 py-4">
            {view === "terms" ? (
              <>
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="mt-0.5 inline-flex h-8 items-center gap-1 rounded-full border border-border/60 px-2.5 text-[11px] text-foreground/70 transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {L.termsBack}
                </button>
                <Dialog.Title className="mt-1 font-[Manrope] text-sm font-medium tracking-[-0.01em] text-foreground">
                  {L.termsTitle}
                </Dialog.Title>
              </>
            ) : (
              <>
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-border/50 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="font-[Manrope] text-sm font-medium tracking-[-0.01em] text-foreground">
                    {characterName}
                    <span className="ml-1.5 align-middle text-[10px] font-normal text-foreground/35">
                      {enName}
                    </span>
                  </Dialog.Title>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] tracking-[0.2em] text-foreground/55">
                    {source && <span>{source}</span>}
                    {source && <span className="text-foreground/25">·</span>}
                    <span data-chat-unofficial="">{L.unofficial}</span>
                    <span className="text-foreground/25">·</span>
                    <span data-chat-language-tag="">{L.languageTag}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={clearSession}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] text-foreground/50 transition-colors hover:text-foreground"
                    aria-label={L.clear}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <Dialog.Close
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition-colors hover:text-foreground"
                    aria-label={L.close}
                  >
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
              </>
            )}
          </header>

          {view === "terms" ? (
            <div
              data-chat-terms=""
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-xs leading-6 text-foreground/70"
            >
              {CHAT_TERMS[copyLang].map((item, idx) => (
                <p key={idx} className="flex gap-2">
                  <span className="shrink-0 text-foreground/35">{idx + 1}.</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                aria-live="polite"
                aria-busy={revealingId !== null || sending}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
              >
                {!noticeAck && (
                  <div
                    data-chat-notice=""
                    className="rounded-2xl border border-border/50 bg-background/25 p-3.5"
                  >
                    <p className="text-[11px] tracking-[0.2em] text-foreground/55">
                      {L.noticeTitle}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {CHAT_NOTICE[copyLang].map((item, idx) => (
                        <li key={idx} className="flex gap-2 text-xs leading-6 text-foreground/70">
                          <span className="shrink-0 text-foreground/30">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      data-chat-notice-accept=""
                      onClick={acceptNotice}
                      className="mt-2 text-[11px] text-foreground/60 transition-colors hover:text-foreground"
                    >
                      {L.noticeAccept}
                    </button>
                  </div>
                )}

                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    labels={L}
                    animate={message.id === revealingId}
                    onRevealDone={handleRevealDone}
                    onRetry={handleRetry}
                  />
                ))}

                {sending && (
                  <div className="flex items-center gap-1.5" aria-label={L.typing}>
                    {[0, 160, 320].map((delay) => (
                      <span
                        key={delay}
                        className="h-1.5 w-1.5 animate-pulse rounded-full"
                        style={{ backgroundColor: goldAlpha(0.6), animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                )}

                {messages.length <= 1 && !sending && openers.length > 1 && (
                  <div className="pt-1">
                    <p className="text-[10px] tracking-[0.2em] text-foreground/40">
                      {L.openersTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {openers.slice(1).map((opener) => (
                        <button
                          key={opener}
                          type="button"
                          onClick={() => void send(opener)}
                          className="pointer-events-auto rounded-full border border-border/70 bg-background/25 px-3 py-1.5 text-left text-[11px] leading-5 text-foreground/75 transition-colors hover:bg-background/40 hover:text-foreground"
                        >
                          {opener}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border/40 px-5 py-3">
                {atLimit ? (
                  <p className="text-[11px] leading-5 text-foreground/60">
                    {L.limitReached(characterName)}
                  </p>
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void send(draft);
                    }}
                    className="flex items-end gap-2"
                  >
                    <label htmlFor="chat-composer" className="sr-only">
                      {L.inputLabel}
                    </label>
                    <textarea
                      id="chat-composer"
                      ref={composerRef}
                      rows={1}
                      value={draft}
                      disabled={sending}
                      maxLength={CHAT_CLIENT_LIMITS.maxChars}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        autoGrow();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          void send(draft);
                        }
                      }}
                      placeholder={L.inputPlaceholder}
                      className="min-h-9 flex-1 resize-none rounded-2xl border border-border/60 bg-background/25 px-3 py-2 text-sm leading-5 text-foreground placeholder:text-foreground/35 focus-visible:ring-1"
                    />
                    <button
                      type="submit"
                      data-chat-send=""
                      disabled={sending || draft.trim().length === 0}
                      aria-label={L.send}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[oklch(0.16_0.03_262)] transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: GOLD }}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {!atLimit && remaining <= 3 && (
                  <p className="mt-1.5 text-[10px] text-foreground/40">
                    {L.turnBudget(remaining)}
                  </p>
                )}
              </div>

              <footer className="border-t border-border/40 px-5 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-[10px] text-foreground/40">{L.nextStepTitle}</span>
                  {/* 与角色卡那边同一条边界：SoulPod 打包失败不该把整个抽屉一起带走。 */}
                  <ErrorBoundary name="chat-soulpod">
                    <SoulPodDownload characterName={characterName} compact appearance="outline" />
                  </ErrorBoundary>
                  <a
                    href={DEVICE_PAGE_HREF}
                    onClick={() => onOpenChange(false)}
                    className="text-[10px] text-foreground/55 underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    {L.nextStepDevice}
                  </a>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-foreground/45">
                  <span data-chat-footer-note="">{L.footerNote}</span>
                  <span className="text-foreground/25">·</span>
                  <button
                    type="button"
                    data-chat-terms-link=""
                    onClick={() => setView("terms")}
                    className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    {L.termsLink}
                  </button>
                </p>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
