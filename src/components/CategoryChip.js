import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function CategoryChip({ label, onPress }) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp onPress={onPress} style={s.chip}>
      <Text style={s.text}>{label}</Text>
    </Comp>
  );
}
const s = StyleSheet.create({
  chip: { backgroundColor: colors.chipBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { color: colors.chipText, fontSize: 12, fontWeight: '600' },
});
