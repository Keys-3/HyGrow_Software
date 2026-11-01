import { forwardRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, type ScrollViewProps } from 'react-native';
import { spacing } from '../../theme/theme';

/** Shared page gutters and readable desktop width. The tab shell owns safe areas. */
export const PageScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function PageScrollView({ contentContainerStyle, style, ...props }, ref) {
    const { width } = useWindowDimensions();

    return (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...props}
        style={[styles.scroll, style]}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: width < 768 ? spacing.md : spacing.lg },
          contentContainerStyle,
        ]}
      />
    );
  },
);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
