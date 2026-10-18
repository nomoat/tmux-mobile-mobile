import * as React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ChevronLeft, RefreshCcw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTheme } from '@/theme';
import type { TmuxMobileApi } from './api';
import { draftNavigationAllowed, validateDraftHandoff } from './drafts-navigation';

// Mounted only while open: closing also destroys the WebView and pending work.
export function DraftsModal({ api, initialPath, theme, onClose }: {
  api: TmuxMobileApi;
  initialPath: string;
  theme: AppTheme;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const browser = React.useRef<WebView>(null);
  const [source, setSource] = React.useState<{ uri: string } | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    setSource(null);
    setError('');
    setLoading(true);
    setCanGoBack(false);
    api.browserHandoff(initialPath).then(handoff => {
      if (active) setSource({ uri: validateDraftHandoff(api.baseUrl, handoff.handoffUrl) });
    }).catch(reason => {
      if (active) { setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false); }
    });
    return () => { active = false; };
  }, [api, initialPath, attempt]);
  const themeScript = `try { localStorage.setItem('tmux-mobile-theme', JSON.stringify({theme:${JSON.stringify(theme.dark ? 'dark' : 'kami')}})); document.documentElement.dataset.theme=${JSON.stringify(theme.dark ? 'dark' : 'kami')}; } catch (_) {} true;`;
  React.useEffect(() => { browser.current?.injectJavaScript(themeScript); }, [themeScript]);
  const back = () => canGoBack ? browser.current?.goBack() : onClose();
  const control = (label: string, icon: React.ReactNode, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.control} hitSlop={4}>{icon}</Pressable>
  );
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={back}>
      <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          {control('Back', <ChevronLeft size={22} color={theme.colors.text} />, back)}
          <Text style={[styles.title, theme.typography.section, { color: theme.colors.text }]}>Drafts</Text>
          {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
          {control('Refresh drafts', <RefreshCcw size={19} color={theme.colors.text} />, () => {
            if (error || !source) setAttempt(value => value + 1);
            else browser.current?.reload();
          })}
          {control('Close drafts', <X size={22} color={theme.colors.text} />, onClose)}
        </View>
        {error ? (
          <View style={styles.error}>
            <Text accessibilityRole="alert" style={{ color: theme.colors.text }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={styles.retry}>
              <Text style={{ color: theme.colors.accent }}>Try again</Text>
            </Pressable>
          </View>
        ) : source ? (
          <WebView
            ref={browser}
            source={source}
            style={[styles.screen, { backgroundColor: theme.colors.background }]}
            originWhitelist={["*"]}
            onShouldStartLoadWithRequest={request => draftNavigationAllowed(api.baseUrl, request.url)}
            onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={event => { setError(event.nativeEvent.description); setLoading(false); }}
            onHttpError={event => {
              if (['/auth/browser-handoff', '/drafts'].includes(new URL(event.nativeEvent.url).pathname)) {
                setError(`Could not load Drafts (${event.nativeEvent.statusCode}). Try again.`);
                setLoading(false);
              }
            }}
            injectedJavaScriptBeforeContentLoaded={themeScript}
            injectedJavaScript={themeScript}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures
            onContentProcessDidTerminate={() => setAttempt(value => value + 1)}
          />
        ) : null}
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, marginLeft: 4 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { padding: 24, gap: 16 },
  retry: { alignSelf: 'flex-start', paddingVertical: 12 },
});
