import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { spacing, useThemeColors } from '../theme/theme';
import { buildSensorTrend } from '../utils/sensorTrend';

const HEIGHT = 36;
const INSET = 5;
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export default function SensorTrend({ readings, color, unit }) {
  const theme = useThemeColors();
  const [width, setWidth] = useState(0);
  const trend = buildSensorTrend(readings);
  const windowSeconds = Math.round((trend?.durationMs ?? 0) / 1000);
  const timeLabel = windowSeconds < 60 ? `${windowSeconds} sec` : `${Math.round(windowSeconds / 60)} min`;
  const caption = !trend ? 'No recent readings' : trend.count === 1 ? 'Waiting for more readings' : `Last ${timeLabel}`;
  const minLabel = trend ? numberFormat.format(trend.min) : null;
  const maxLabel = trend ? numberFormat.format(trend.max) : null;
  const spanLabel = minLabel === maxLabel ? minLabel : `${minLabel}–${maxLabel}`;
  const observedRange = trend?.count > 1 ? `${spanLabel}${unit ? ` ${unit}` : ''}` : null;
  const x = point => INSET + point.x * (width - INSET * 2);
  const y = point => INSET + point.y * (HEIGHT - INSET * 2);
  const latest = trend?.segments.at(-1)?.at(-1);

  return (
    <View style={styles.container} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {trend && width > INSET * 2 ? (
        <Svg width={width} height={HEIGHT} accessible={false}>
          <Line x1={INSET} x2={width - INSET} y1={HEIGHT / 2} y2={HEIGHT / 2} stroke={theme.borderStrong} strokeDasharray="3 4" />
          {trend.segments.map((points, index) => points.length > 1 ? (
            <Polyline key={index} points={points.map(point => `${x(point)},${y(point)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <Circle key={index} cx={x(points[0])} cy={y(points[0])} r={2} fill={color} />
          ))}
          <Circle cx={x(latest)} cy={y(latest)} r={3.5} fill={color} />
        </Svg>
      ) : <View style={styles.placeholder} />}
      <View style={styles.captionRow}>
        <Text style={[styles.caption, { color: theme.textSecondary }]}>{caption}</Text>
        {observedRange ? <Text style={[styles.caption, { color: theme.textSecondary }]}>{observedRange}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm, zIndex: 1 },
  placeholder: { height: HEIGHT },
  captionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing.sm },
  caption: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
