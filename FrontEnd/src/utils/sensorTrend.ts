type Reading = { timeMs: number; value: number | null };
type Point = { x: number; y: number };

export function buildSensorTrend(readings: readonly Reading[]) {
  const values = readings.flatMap(({ value }) =>
    typeof value === 'number' && Number.isFinite(value) ? [value] : [],
  );
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const start = readings[0].timeMs;
  const durationMs = readings[readings.length - 1].timeMs - start;
  const segments: Point[][] = [];
  let segment: Point[] | undefined;
  for (const { timeMs, value } of readings) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      segment = undefined;
      continue;
    }
    if (!segment) {
      segment = [];
      segments.push(segment);
    }
    segment.push({
      x: durationMs > 0 ? (timeMs - start) / durationMs : 0.5,
      y: max === min ? 0.5 : 1 - (value - min) / (max - min),
    });
  }

  return { segments, durationMs, min, max, count: values.length };
}
