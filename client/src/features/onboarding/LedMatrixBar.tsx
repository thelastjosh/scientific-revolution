import { useCallback, useMemo } from "react";

export const LED_COLS = 4;
export const LED_ROWS = 40;
export const LED_COUNT = LED_COLS * LED_ROWS;

export type LedCells = boolean[];

function idxToRC(i: number): { row: number; col: number } {
  return { row: Math.floor(i / LED_COLS), col: i % LED_COLS };
}

/** Create empty matrix */
export function createLedCells(): LedCells {
  return Array(LED_COUNT).fill(false) as boolean[];
}

/** Set one pixel */
export function setLed(cells: LedCells, index: number, on: boolean): LedCells {
  if (index < 0 || index >= LED_COUNT) return cells;
  const next = [...cells];
  next[index] = on;
  return next;
}

/** Toggle one pixel */
export function toggleLed(cells: LedCells, index: number): LedCells {
  if (index < 0 || index >= LED_COUNT) return cells;
  const next = [...cells];
  next[index] = !next[index];
  return next;
}

/** Apply a full pattern (length LED_COUNT or shorter, padded with false) */
export function applyLedPattern(pattern: boolean[]): LedCells {
  const next = createLedCells();
  for (let i = 0; i < Math.min(pattern.length, LED_COUNT); i++) {
    next[i] = pattern[i] ?? false;
  }
  return next;
}

type LedMatrixBarProps = {
  cells: LedCells;
  onToggle: (index: number) => void;
  /** Optional: run a named preset (e.g. demo sweep) via parent */
  className?: string;
};

/**
 * Thin vertical LED bank: 4×40 lights, each cell 3×3 CSS px, 2px gap.
 * Each light is its own button for a11y + individual instrumentation.
 */
export function LedMatrixBar({ cells, onToggle, className }: LedMatrixBarProps) {
  const gridStyle = useMemo(
    () =>
      ({
        display: "grid",
        gridTemplateColumns: `repeat(${LED_COLS}, 3px)`,
        gridTemplateRows: `repeat(${LED_ROWS}, 3px)`,
        gap: "2px",
        width: "max-content",
      }) as const,
    [],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle(index);
      }
    },
    [onToggle],
  );

  return (
    <div
      className={className}
      style={gridStyle}
      role="img"
      aria-label="LED status matrix, 4 by 40 pixels"
    >
      {cells.map((on, index) => {
        const { row, col } = idxToRC(index);
        return (
          <button
            key={index}
            type="button"
            data-led-index={index}
            data-led-row={row}
            data-led-col={col}
            aria-label={`LED row ${row + 1} column ${col + 1}, ${on ? "on" : "off"}`}
            aria-pressed={on}
            onClick={() => onToggle(index)}
            onKeyDown={(e) => handleKey(e, index)}
            className="p-0 border-0 bg-transparent cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0"
            style={{
              width: 3,
              height: 3,
              minWidth: 3,
              minHeight: 3,
            }}
          >
            <span
              className="block w-full h-full border border-border/60 transition-colors"
              style={{
                backgroundColor: on
                  ? "hsl(var(--foreground))"
                  : "hsl(var(--muted) / 0.35)",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
