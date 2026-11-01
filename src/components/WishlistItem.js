import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import { formatRupiah } from '../utils/finance';
import CategoryChip from './CategoryChip';

export default function WishlistItem({ item, onPurchase, onLongPress }) {
  return (
    <Pressable onLongPress={onLongPress} style={s.row}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        <View style={s.meta}><CategoryChip label={item.category} /><Text style={s.price}>Est. {formatRupiah(item.estimatedPrice)}</Text></View>
      </View>
      <Pressable onPress={onPurchase} style={s.btn} hitSlop={6}>
        <Text style={s.btnText}>☐ Sudah Dibeli</Text>
      </Pressable>
    </Pressable>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 14, borderRadius: radius.md, marginHorizontal: 16, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: colors.wishlist },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { color: colors.muted, fontSize: 12 },
  btn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 8 },
  btnText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
});
