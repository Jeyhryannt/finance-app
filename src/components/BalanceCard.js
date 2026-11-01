import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import { formatRupiah } from '../utils/finance';
import Button from './Button';

export default function BalanceCard({ balance, expense, onAddBalance }) {
  return (
    <View style={s.card}>
      <Text style={s.label}>Total Saldo</Text>
      <Text style={[s.amount, balance < 0 && { color: '#FECACA' }]}>{formatRupiah(balance)}</Text>
      <View style={s.row}>
        <View>
          <Text style={s.sub}>Total Pengeluaran</Text>
          <Text style={s.val}>{formatRupiah(expense)}</Text>
        </View>
        <Button label="+ Tambah Saldo" variant="light" onPress={onAddBalance} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  label: { color: colors.primarySoft, fontSize: 13 },
  amount: { color: '#fff', fontSize: 32, fontWeight: '700', marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  sub: { color: colors.primarySoft, fontSize: 11 },
  val: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
