/** Fit complete cards into the measured content area, including the gaps. */
export function gridColumns(width: number, minimumCardWidth = 200, gap = 16): number {
  return Math.max(1, Math.min(4, Math.floor((width + gap) / (minimumCardWidth + gap))));
}
