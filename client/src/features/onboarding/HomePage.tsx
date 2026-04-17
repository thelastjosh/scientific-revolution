import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LedMatrixBar,
  LED_COUNT,
  createLedCells,
  setLed,
  toggleLed,
  type LedCells,
} from "./LedMatrixBar";
import { HomeChatPanel } from "./HomeChatPanel";

const MD_BREAKPOINT_PX = 768;

/** True when viewport is below Tailwind `md` — context pane stays collapsed. */
function useIsBelowMd(): boolean {
  const [below, setBelow] = useState(() =>
    typeof window !== "undefined"
      ? window.innerWidth < MD_BREAKPOINT_PX
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MD_BREAKPOINT_PX - 1}px)`);
    const sync = () => setBelow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return below;
}

export default function Home() {
  const searchString = useSearch();
  const inviteToken = useMemo(() => {
    const q = new URLSearchParams(searchString);
    return q.get("invite")?.trim() || null;
  }, [searchString]);

  const [leds, setLeds] = useState<LedCells>(() => createLedCells());
  const isSmallScreen = useIsBelowMd();
  /** Desktop-only: user has collapsed the context pane */
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const contextCollapsed = isSmallScreen || desktopCollapsed;

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

  const handleResetHome = useCallback(() => {
    setLeds(createLedCells());
  }, []);

  const expandContext = useCallback(() => {
    if (!isSmallScreen) setDesktopCollapsed(false);
  }, [isSmallScreen]);

  const collapseContext = useCallback(() => {
    if (!isSmallScreen) setDesktopCollapsed(true);
  }, [isSmallScreen]);

  return (
    <div className="h-dvh max-h-dvh overflow-hidden flex flex-row bg-background text-foreground">
      <aside
        className={cn(
          "shrink-0 h-full min-h-0 border-r border-border flex flex-col bg-card/20 transition-[width,min-width] duration-200 ease-out",
          contextCollapsed
            ? "w-11 min-w-11 items-center overflow-hidden py-2 px-1"
            : "w-auto min-w-0 items-stretch overflow-hidden py-4 pl-3 pr-4",
        )}
        aria-label="LED bank"
      >
        {contextCollapsed ? (
          <div className="flex h-full min-h-0 w-full flex-col items-center">
            <p className="shrink-0 text-[8px] uppercase tracking-[0.2em] text-muted-foreground text-center leading-tight [writing-mode:vertical-rl] rotate-180 select-none pt-1">
              Context
            </p>
            <div className="min-h-0 flex-1" aria-hidden />
            {!isSmallScreen ? (
              <div className="flex w-full shrink-0 justify-center">
                <button
                  type="button"
                  onClick={expandContext}
                  className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Expand context"
                  title="Expand context"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3">
            <div className="shrink-0">
              <span className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground leading-tight">
                Context
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
              <LedMatrixBar cells={leds} onToggle={handleLedToggle} />
            </div>
            <div className="flex w-full shrink-0 justify-center pt-1">
              <button
                type="button"
                onClick={collapseContext}
                className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Collapse context"
                title="Collapse context"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <HomeChatPanel
          inviteToken={inviteToken}
          onUserMessage={handleUserMessage}
          onResetHome={handleResetHome}
        />
      </main>
    </div>
  );
}
