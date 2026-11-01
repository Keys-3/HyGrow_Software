import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, typography, borderRadius } from '../theme/theme';
import { timeAgo } from '../utils/helpers';

export default function StatusIndicator({ isOnline, lastUpdated, stale = true, source }) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: isOnline ? themeColors.success : themeColors.danger }]} />
      <Text style={styles.text}>
        {source ? `${source === 'local' ? 'Local HTTP' : 'Cloud'} · ${stale ? 'Stale sample' : 'Fresh sample'}` : 'Device status unknown'} {lastUpdated ? `· ${timeAgo(lastUpdated)}` : ''}
      </Text>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    ...typography.caption,
    color: theme.textSecondary,
    fontWeight: '600',
  },
});
