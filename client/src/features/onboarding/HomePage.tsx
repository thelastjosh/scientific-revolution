import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeChatPanel } from "./HomeChatPanel";
import { ContextOrganizationsPanel } from "./ContextOrganizationsPanel";
import { ContextCollapsedOrgs } from "./ContextCollapsedOrgs";

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

  const isSmallScreen = useIsBelowMd();
  /** Desktop-only: user has collapsed the context pane */
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const contextCollapsed = isSmallScreen || desktopCollapsed;

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
            : "w-[132px] min-w-[132px] items-stretch overflow-hidden py-4 pl-3 pr-3",
        )}
        aria-label="Context pane"
      >
        {contextCollapsed ? (
          <div className="flex h-full min-h-0 w-full flex-col items-center">
            <p className="shrink-0 text-[8px] uppercase tracking-[0.2em] text-muted-foreground text-center leading-tight [writing-mode:vertical-rl] rotate-180 select-none pt-1">
              Context
            </p>
            <ContextCollapsedOrgs />
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
            <ContextOrganizationsPanel />
            <div className="min-h-0 flex-1" aria-hidden />
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
        <HomeChatPanel inviteToken={inviteToken} />
      </main>
    </div>
  );
}
