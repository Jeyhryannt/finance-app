import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

// Tombol persegi panjang (sudut sedikit membulat)
export default function Button({ label, onPress, variant = 'primary', style }) {
  const v = VARIANTS[variant];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, v.btn, pressed && { opacity: 0.8 }, style]}>
      <Text style={[s.text, v.text]}>{label}</Text>
    </Pressable>
  );
}
const VARIANTS = {
  primary: { btn: { backgroundColor: colors.primary }, text: { color: '#fff' } },
  amber: { btn: { backgroundColor: colors.wishlist }, text: { color: '#fff' } },
  outline: { btn: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary }, text: { color: colors.primary } },
  light: { btn: { backgroundColor: '#fff' }, text: { color: colors.primary } },
  danger: { btn: { backgroundColor: '#FEE2E2' }, text: { color: colors.expense } },
  ghost: { btn: { backgroundColor: colors.border }, text: { color: colors.muted } },
};
const s = StyleSheet.create({
  btn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', fontSize: 14 },
});
