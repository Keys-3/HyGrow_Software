import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useThemeColors } from '../../theme/theme';

export const SCREEN_TRANSITION = { detailPushMs: 140 } as const;
type Navigate = (href: string, label?: string, mode?: 'section' | 'tab', replace?: boolean) => void;
const NavigationContext = createContext<Navigate | null>(null);
const LoadingContext = createContext<(key: symbol, busy: boolean) => void>(() => {});
export function useNavigationTransition() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error('useNavigationTransition requires ScreenTransitionProvider.');
  return navigate;
}
/** Keep existing content visible for fast reads; brand feedback appears only for slower requests. */
export function usePageLoading(busy: boolean) {
  const report = useContext(LoadingContext);
  const key = useRef(Symbol('page-load'));
  useEffect(() => { report(key.current, busy); return () => report(key.current, false); }, [busy, report]);
}
const normalize = (path: string) => path.split('?')[0].replace('/(tabs)', '').replace(/\/$/, '') || '/';
export function ScreenTransitionProvider({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useThemeColors();
  const [target, setTarget] = useState<{ href: string; label: string } | null>(null);
  const [loads, setLoads] = useState<Set<symbol>>(new Set());
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const report = useCallback((key: symbol, busy: boolean) => setLoads(previous => {
    if (previous.has(key) === busy) return previous;
    const next = new Set(previous); if (busy) next.add(key); else next.delete(key); return next;
  }), []);
  const navigate = useCallback<Navigate>((href, label = 'HyGrow', _mode, replace = false) => {
    if (!href || normalize(href) === normalize(pathname)) return;
    setDismissed(false); setTarget({ href, label });
    try { if (replace) router.replace(href as any); else router.push(href as any); }
    catch (error) { setTarget(null); throw error; }
  }, [pathname, router]);
  useEffect(() => { if (target && normalize(pathname) === normalize(target.href)) setTarget(null); }, [pathname, target]);
  const busy = Boolean(target || loads.size);
  useEffect(() => {
    if (!busy) { setVisible(false); setSlow(false); setDismissed(false); return; }
    const show = setTimeout(() => setVisible(true), 300);
    const timeout = setTimeout(() => setSlow(true), 10000);
    return () => { clearTimeout(show); clearTimeout(timeout); };
  }, [busy]);
  return <NavigationContext.Provider value={navigate}><LoadingContext.Provider value={report}>
    {children}
    {visible && !dismissed && <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.surface }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color={theme.primary} />
      <Text style={[styles.text, { color: theme.text }]}>{slow ? 'Taking longer than usual. Check your connection.' : 'Loading ' + (target?.label || 'your data') + '…'}</Text>
      {slow && <Pressable accessibilityRole="button" onPress={() => { setDismissed(true); setTarget(null); }} style={styles.button}><Text style={{ color: theme.primary }}>Continue browsing</Text></Pressable>}
    </View>}
  </LoadingContext.Provider></NavigationContext.Provider>;
}
const styles = StyleSheet.create({
  overlay: { zIndex: 10000, elevation: 10000, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  logo: { width: 120, height: 100 },
  text: { textAlign: 'center', maxWidth: '100%', flexShrink: 1 },
  button: { padding: 14, minHeight: 44 },
});
