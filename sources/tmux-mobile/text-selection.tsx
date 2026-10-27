import * as React from 'react';
import { FpsModal as Modal } from './fps-monitor';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTheme } from '@/theme';
import { textSelectionHtml } from './text-selection-html';

export type TextSelectionTarget = { title: string; text: string; monospace?: boolean };
export function SelectableTextPage({ text, theme, monospace = false }: { text: string; theme: AppTheme; monospace?: boolean }) {
  const source = React.useMemo(() => ({ html: textSelectionHtml(text, theme.colors.background, theme.colors.text, theme.dark, monospace) }), [text, theme.colors.background, theme.colors.text, theme.dark, monospace]);
  return <WebView source={source} originWhitelist={['*']} javaScriptEnabled={false} dataDetectorTypes="none"
    onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
    style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}
/** Stay inside the existing sheet: iOS cannot reliably present a sibling Modal over it. */
export function TextSelectionSurface({ target, theme, onClose, children }: {
  target: TextSelectionTarget | null; theme: AppTheme; onClose: () => void; children: React.ReactNode;
}) {
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1 }} pointerEvents={target ? 'none' : 'auto'} accessibilityElementsHidden={Boolean(target)} importantForAccessibility={target ? 'no-hide-descendants' : 'auto'}>
      {children}
    </View>
    {target ? <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]} accessibilityViewIsModal>
      <TextSelectionPanel target={target} theme={theme} onClose={onClose} />
    </View> : null}
  </View>;
}

function TextSelectionPanel({ target, theme, onClose }: { target: TextSelectionTarget; theme: AppTheme; onClose: () => void }) {
  const [copyLabel, setCopyLabel] = React.useState('Copy all');
  React.useEffect(() => { setCopyLabel('Copy all'); }, [target]);
  return <>
    <View style={[styles.header, { borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{target.title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Copy all text" style={styles.button} onPress={async () => {
        try { await Clipboard.setStringAsync(target.text); setCopyLabel('Copied'); }
        catch { setCopyLabel('Try again'); }
      }}><Text style={{ color: theme.colors.accent }}>{copyLabel}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Return from text selection" style={styles.button} onPress={onClose}><Text style={{ color: theme.colors.accent }}>Done</Text></Pressable>
    </View>
    <Text style={{ color: theme.colors.textMuted, paddingHorizontal: 16, paddingVertical: 8 }}>Long-press a word, then drag the handles to select. This copy stays still while the session updates.</Text>
    <SelectableTextPage text={target.text} theme={theme} monospace={target.monospace} />
  </>;
}
export function TextSelectionModal({ target, theme, onClose }: { target: TextSelectionTarget | null; theme: AppTheme; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [copyLabel, setCopyLabel] = React.useState('Copy all');
  React.useEffect(() => { setCopyLabel('Copy all'); }, [target]);
  return <Modal visible={Boolean(target)} animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={[styles.header, { borderColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{target?.title || 'Select text'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Copy all text" style={styles.button} onPress={async () => {
          try { await Clipboard.setStringAsync(target?.text || ''); setCopyLabel('Copied'); }
          catch { setCopyLabel('Try again'); }
        }}><Text style={{ color: theme.colors.accent }}>{copyLabel}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close text selection" style={styles.button} onPress={onClose}><Text style={{ color: theme.colors.text, fontSize: 24 }}>×</Text></Pressable>
      </View>
      <Text style={{ color: theme.colors.textMuted, paddingHorizontal: 16, paddingVertical: 8 }}>Long-press a word to select and copy. This text stays still while the session updates.</Text>
      {target ? <SelectableTextPage text={target.text} theme={theme} /> : null}
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 18, fontWeight: '600' },
  button: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
});
