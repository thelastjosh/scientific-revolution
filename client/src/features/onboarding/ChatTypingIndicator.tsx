/** Three-dot “thinking” row for assistant responses */
export function ChatTypingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 py-1 pl-0.5"
      role="status"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}
