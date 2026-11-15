import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Svg, {
  Rect,
  Line,
  Text as SvgText,
} from 'react-native-svg';

import { useThemeColors, spacing, typography } from '../theme/theme';
import { chartPoints } from '../utils/telemetry';

export default function ChartWidget({
  title,
  data = [],
  labels = [],
  color,
  unit = '',
}) {
  const themeColors = useThemeColors();
  const [chartWidth, setChartWidth] = useState(0);
  const onLayout = (event) => setChartWidth(event.nativeEvent.layout.width);
  
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const chartHeight = 220;

  const samples = useMemo(() => chartPoints(data),[data]);
  const values = samples.filter(value => value !== null);

  const activeColor = color || themeColors.primary;

  if (values.length === 0) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        {Boolean(title) ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Waiting for sensor readings...</Text>
        </View>
      </View>
    );
  }

  const observedMin = Math.min(...values);
  const observedMax = Math.max(...values);
  let min = observedMin;
  let max = observedMax;
  
  if (min === max) {
    const margin = Math.max(Math.abs(min) * 0.2,1);
    min -= margin;
    max += margin;
  }

  const range = max - min || 1;
  const padding = 24;

  const points = samples.map((value, index) => {
    if (value === null) return null;
    const x = padding + (index + 0.5) * ((chartWidth - padding * 2) / samples.length);
    const barHeight = ((value - min) / range) * (chartHeight - padding * 2);
    const finalBarHeight = Math.max(barHeight, 4);
    const y = chartHeight - padding - finalBarHeight;
    return { x, y, barHeight: finalBarHeight };
  });

  const barWidth = Math.max(((chartWidth - padding * 2) / samples.length) * 0.6, 2);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {Boolean(title) ? <Text style={styles.title}>{title}</Text> : null}

      {chartWidth > 0 && <LinearGradient
        colors={themeColors.isDarkMode
          ? ['rgba(16, 185, 129, 0.06)', 'rgba(16, 185, 129, 0.015)']
          : ['rgba(156, 175, 136, 0.24)', 'rgba(187, 201, 168, 0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.graphFrame}
      >
        <Svg width={chartWidth} height={chartHeight}>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + ((chartHeight - padding * 2) / 4) * i;
          return (
            <Line
              key={i}
              x1={padding}
              x2={chartWidth - padding}
              y1={y}
              y2={y}
              stroke={themeColors.border}
              strokeWidth={1}
            />
          );
        })}

        {points.map((p, i) => p && (
          <Rect
            key={i}
            x={p.x - barWidth / 2}
            y={p.y}
            width={barWidth}
            height={p.barHeight}
            fill={activeColor}
            rx={4}
          />
        ))}

        <SvgText
          x={2}
          y={20}
          fill={themeColors.textSecondary}
          fontSize="11"
        >
          {max.toFixed(1)}
        </SvgText>

        <SvgText
          x={2}
          y={chartHeight - 10}
          fill={themeColors.textSecondary}
          fontSize="11"
        >
          {min.toFixed(1)}
        </SvgText>

        {labels.map((label, i) => {
          if (!label) return null;
          const x = padding + (i + 0.5) * ((chartWidth - padding * 2) / labels.length);
          return (
            <SvgText
              key={i}
              x={x}
              y={chartHeight}
              fontSize="9"
              fill={themeColors.textMuted}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
        </Svg>
      </LinearGradient>}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Min: {observedMin.toFixed(1)}{unit}
        </Text>
        <Text style={styles.footerText}>
          Max: {observedMax.toFixed(1)}{unit}
        </Text>
        <Text style={styles.footerText}>
          Avg: {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}{unit}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (themeColors) => StyleSheet.create({
  container: {
    minWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  graphFrame: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.18)', 'rgba(105, 123, 91, 0.28)'),
    overflow: 'hidden',
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: themeColors.text,
  },
  empty: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: themeColors.textSecondary,
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  footerText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
});
