import {
  LED_COLS,
  LED_COUNT,
  LED_ROWS,
  createLedCells,
  type LedCells,
} from "./LedMatrixBar";

export { LED_COLS, LED_ROWS, LED_COUNT };

/** Fill one row (0 … LED_ROWS-1). */
export function setRow(cells: LedCells, row: number, on: boolean): LedCells {
  if (row < 0 || row >= LED_ROWS) return cells;
  const next = [...cells];
  for (let c = 0; c < LED_COLS; c++) {
    next[row * LED_COLS + c] = on;
  }
  return next;
}

/** Fill one column (0 … LED_COLS-1). */
export function setCol(cells: LedCells, col: number, on: boolean): LedCells {
  if (col < 0 || col >= LED_COLS) return cells;
  const next = [...cells];
  for (let r = 0; r < LED_ROWS; r++) {
    next[r * LED_COLS + col] = on;
  }
  return next;
}

/** Clear all pixels. */
export function clearLeds(): LedCells {
  return createLedCells();
}

/**
 * Frame index 0…∞ — vertical bar "scans" for a simple display test.
 * Call from requestAnimationFrame or setInterval to animate.
 */
export function frameScanVertical(t: number): LedCells {
  let next = createLedCells();
  const col = t % LED_COLS;
  for (let r = 0; r < LED_ROWS; r++) {
    const on = r % 3 === (t % 3);
    next[r * LED_COLS + col] = on;
  }
  return next;
}
