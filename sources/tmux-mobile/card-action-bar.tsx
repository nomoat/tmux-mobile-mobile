import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import type { AppTheme } from '@/theme';
import { CARD_ACTION_COLUMNS, CARD_ACTION_ICONS, type CardIconId } from './card-actions';
import { cardActionItems, type CardActionHandlers } from './card-action-state';
import type { AgentSession } from './types';

const shapes = { circle: Circle, line: Line, path: Path, polyline: Polyline, rect: Rect };

export function CardActionIcon({ id, color }: { id: CardIconId; color: string }) {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {CARD_ACTION_ICONS[id].map(([tag, attrs], index) => {
      const Shape = shapes[tag as keyof typeof shapes];
      return <Shape key={index} {...attrs} />;
    })}
  </Svg>;
}

export function CardActionBar({ agent, reading, handlers, theme }: {
  agent: AgentSession; reading: boolean; handlers: CardActionHandlers; theme: AppTheme;
}) {
  const [hint, setHint] = React.useState<string | null>(null);
  const items = cardActionItems(agent, reading, handlers);
  const rows = Array.from({ length: Math.ceil(items.length / CARD_ACTION_COLUMNS) }, (_, index) =>
    items.slice(index * CARD_ACTION_COLUMNS, (index + 1) * CARD_ACTION_COLUMNS));
  return <View style={styles.bar} testID="card-actions">
    {hint ? <View pointerEvents="none" style={[styles.hint, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={{ color: theme.colors.text, fontSize: 12 }}>{hint}</Text>
    </View> : null}
    {rows.map((row, index) => <View key={index} style={styles.row}>
      {row.map(action => <Pressable
        key={action.id}
        testID={`card-action-${action.id}`}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityHint={action.hint}
        accessibilityState={{ disabled: action.disabled }}
        disabled={action.disabled}
        onPress={action.onPress}
        onLongPress={() => setHint(`${action.label} · ${action.hint}`)}
        onPressOut={() => setHint(null)}
        style={({ pressed }) => [styles.button, {
          borderRadius: theme.radii.md,
          backgroundColor: action.active ? theme.colors.accentSoft : pressed ? theme.colors.surfaceMuted : 'transparent',
          opacity: action.disabled ? 0.45 : 1,
        }]}
      >
        <CardActionIcon id={action.icon} color={action.active ? theme.colors.accent : theme.colors.textMuted} />
      </Pressable>)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  bar: { width: '100%', maxWidth: 300, alignSelf: 'flex-end', gap: 4 },
  row: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', bottom: '100%', left: 0, right: 0, padding: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, zIndex: 1 },
});
