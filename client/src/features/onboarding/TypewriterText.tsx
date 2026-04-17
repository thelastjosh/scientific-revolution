import { useEffect, useRef, useState } from "react";

type TypewriterTextProps = {
  text: string;
  /** Stable id per message — reset animation when this changes */
  messageKey: string;
  className?: string;
  style?: React.CSSProperties;
  /** Average ms between characters (jitter applied) */
  msPerChar?: number;
  /** Called as more text is revealed (e.g. scroll chat) */
  onProgress?: () => void;
  /** Blinking caret while typing */
  showCaret?: boolean;
};

function jitterMs(base: number): number {
  return Math.max(2, base + Math.round((Math.random() - 0.5) * base * 0.2));
}

export function TypewriterText({
  text,
  messageKey,
  className,
  style,
  msPerChar = 4,
  onProgress,
  showCaret = true,
}: TypewriterTextProps) {
  const [shownLen, setShownLen] = useState(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    setShownLen(0);
  }, [messageKey, text]);

  useEffect(() => {
    if (shownLen >= text.length) return;
    const id = window.setTimeout(() => {
      setShownLen((n) => n + 1);
      onProgressRef.current?.();
    }, jitterMs(msPerChar));
    return () => clearTimeout(id);
  }, [shownLen, text, msPerChar]);

  const slice = text.slice(0, shownLen);
  const done = shownLen >= text.length;

  return (
    <span className={className} style={style}>
      {slice}
      {showCaret && !done ? (
        <span
          className="inline-block h-[1em] w-px shrink-0 translate-y-[0.05em] bg-foreground align-middle opacity-70 animate-pulse ml-px"
          aria-hidden
        />
      ) : null}
    </span>
  );
}
