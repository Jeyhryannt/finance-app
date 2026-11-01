import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';

export default function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <View style={s.wrap}>
      {tabs.map((t) => (
        <Pressable key={t.key} onPress={() => onChange(t.key)} style={[s.tab, value === t.key && s.active]}>
          <Text style={[s.text, value === t.key && s.activeText]} numberOfLines={1}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, marginHorizontal: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  active: { backgroundColor: colors.card },
  text: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  activeText: { color: colors.primary },
});
