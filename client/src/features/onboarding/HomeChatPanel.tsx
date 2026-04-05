import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Send } from "lucide-react";
import { messageFontRem } from "./home-chat-font";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const OPENING = "Hi there.";

const ASSISTANT_REPLIES = [
  "What brings you here today?",
  "Tell me what you’re hoping to work on.",
  "Are you joining as an individual or with an organization?",
  "We can route you to tasks that match your skills next.",
];

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type HomeChatPanelProps = {
  /** Called when user sends a message (e.g. sync LED matrix) */
  onUserMessage?: (messageIndex: number, text: string) => void;
};

export function HomeChatPanel({ onUserMessage }: HomeChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: id(), role: "assistant", text: OPENING },
  ]);
  const [draft, setDraft] = useState("");
  const [replyIdx, setReplyIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;

    const userIndex = messages.length;
    setMessages((prev) => [
      ...prev,
      { id: id(), role: "user", text },
    ]);
    setDraft("");
    onUserMessage?.(userIndex, text);

    const reply = ASSISTANT_REPLIES[replyIdx % ASSISTANT_REPLIES.length];
    setReplyIdx((n) => n + 1);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: id(), role: "assistant", text: reply },
      ]);
    }, 450);
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 font-mono border border-border bg-background">
      <header className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Entry
          </p>
          <p className="text-xs font-bold uppercase tracking-tight">
            Scientific Revolution
          </p>
        </div>
        <Link href="/dashboard">
          <a className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors">
            Dashboard
          </a>
        </Link>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-10 custom-scrollbar">
        {messages.map((m, i) => {
          const rem = messageFontRem(i);
          return (
            <div
              key={m.id}
              className={
                m.role === "user" ? "text-right pl-8" : "text-left pr-8"
              }
            >
              <p
                className="font-bold tracking-tight leading-snug break-words"
                style={{
                  fontSize: `${rem}rem`,
                  lineHeight: rem > 1.75 ? 1.15 : 1.35,
                }}
              >
                {m.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border p-4 bg-card/30">
        <div className="relative max-w-3xl mx-auto">
          <label htmlFor="home-chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="home-chat-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a reply…"
            className="w-full resize-none bg-background border-2 border-border px-4 py-3 pr-14 text-sm focus:outline-none focus:border-foreground rounded-none font-mono"
          />
          <button
            type="button"
            onClick={send}
            className="absolute right-2 bottom-2 p-2 border border-border hover:bg-foreground hover:text-background transition-colors"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] text-muted-foreground uppercase tracking-widest">
          <Link href="/admin">
            <a className="hover:text-foreground hover:underline underline-offset-4">
              Admin
            </a>
          </Link>
          <span className="opacity-40">Scientific Revolution · Sail v0</span>
        </div>
      </div>
    </div>
  );
}
