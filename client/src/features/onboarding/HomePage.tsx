import { useCallback, useState } from "react";
import {
  LedMatrixBar,
  LED_COUNT,
  createLedCells,
  setLed,
  toggleLed,
  type LedCells,
} from "./LedMatrixBar";
import { HomeChatPanel } from "./HomeChatPanel";

export default function Home() {
  const [leds, setLeds] = useState<LedCells>(() => createLedCells());

  const handleLedToggle = useCallback((index: number) => {
    setLeds((prev) => toggleLed(prev, index));
  }, []);

  /** Light a pixel when the user sends a message — independent instrumentation per event */
  const handleUserMessage = useCallback((messageIndex: number) => {
    setLeds((prev) => {
      const i = (messageIndex * 13 + 7) % LED_COUNT;
      return setLed(prev, i, true);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-row bg-background text-foreground">
      <aside
        className="shrink-0 border-r border-border flex flex-col items-stretch py-4 pl-3 pr-4 gap-6 bg-card/20"
        aria-label="LED bank"
      >
        <div className="flex flex-col items-center gap-3">
          <p className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground text-center leading-tight max-w-[4rem]">
            Status
          </p>
          <LedMatrixBar cells={leds} onToggle={handleLedToggle} />
        </div>
        <div className="flex-1 min-h-[1rem]" />
        <p className="text-[8px] text-muted-foreground uppercase tracking-widest text-center leading-relaxed px-1">
          4×40 · 3px · 2px gap
        </p>
      </aside>

      <main className="flex-1 min-w-0 min-h-screen flex flex-col">
        <HomeChatPanel onUserMessage={handleUserMessage} />
      </main>
    </div>
  );
}
