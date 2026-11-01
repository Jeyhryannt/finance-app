import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import { formatDateTime, formatRupiah } from '../utils/finance';
import CategoryChip from './CategoryChip';

export default function TransactionItem({ item, onLongPress }) {
  return (
    <Pressable onLongPress={onLongPress} style={s.row}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        <View style={s.meta}><CategoryChip label={item.category} /></View>
        <Text style={s.date}>{formatDateTime(item.date, item.time)}</Text>
      </View>
      <Text style={s.amount}>- {formatRupiah(item.amount)}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 14, borderRadius: radius.md, marginHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { color: colors.muted, fontSize: 12 },
  amount: { fontWeight: '700', fontSize: 14, marginLeft: 8, color: colors.expense },
});
