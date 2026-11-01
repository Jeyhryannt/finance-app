// Kartu periode untuk tab Riwayat: periode berjalan atau periode yang sudah ditutup.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import { formatDateTime, formatRupiah } from '../utils/finance';
import Button from './Button';

const Row = ({ left, sub, right, color }) => (
  <View style={s.line}>
    <View style={{ flex: 1 }}>
      <Text style={s.lineTitle} numberOfLines={1}>{left}</Text>
      <Text style={s.lineSub}>{sub}</Text>
    </View>
    <Text style={[s.lineAmt, { color }]}>{right}</Text>
  </View>
);

export default function PeriodCard({ period, current, onExport, onDeleteTopup, onRestore, onDelete }) {
  const [open, setOpen] = useState(!!current);
  return (
    <View style={[s.card, current && { borderColor: colors.primary, borderWidth: 1.5 }]}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={s.badge}>{current ? 'PERIODE BERJALAN' : 'RIWAYAT'}</Text>
        <Text style={s.range}>
          {formatDateTime(period.start.date, period.start.time)}{'\n'}s/d {formatDateTime(period.end.date, period.end.time)}
        </Text>
        <View style={s.sum}>
          <View><Text style={s.k}>Saldo Masuk</Text><Text style={[s.v, { color: colors.income }]}>{formatRupiah(period.totalTopup)}</Text></View>
          <View><Text style={s.k}>Pengeluaran</Text><Text style={[s.v, { color: colors.expense }]}>{formatRupiah(period.totalExpense)}</Text></View>
          <View><Text style={s.k}>Sisa</Text><Text style={s.v}>{formatRupiah(period.remaining)}</Text></View>
        </View>
        <Text style={s.toggle}>{open ? '▲ Sembunyikan rincian' : '▼ Lihat rincian'}</Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.section}>Saldo Masuk ({period.topups.length})</Text>
          {period.topups.length === 0 && <Text style={s.lineSub}>Tidak ada</Text>}
          {period.topups.map((t) => (
            <Pressable key={t.id} onLongPress={current ? () => onDeleteTopup?.(t) : undefined}>
              <Row left={t.note || 'Tambah saldo'} sub={formatDateTime(t.date, t.time)} right={`+ ${formatRupiah(t.amount)}`} color={colors.income} />
            </Pressable>
          ))}
          <Text style={s.section}>Pengeluaran ({period.expenses.length})</Text>
          {period.expenses.length === 0 && <Text style={s.lineSub}>Tidak ada</Text>}
          {period.expenses.map((e) => (
            <Row key={e.id} left={e.title} sub={`${e.category} • ${formatDateTime(e.date, e.time)}`} right={`- ${formatRupiah(e.amount)}`} color={colors.expense} />
          ))}
        </View>
      )}

      {!current && (
        <View style={s.actions}>
          <Button label="📄 PDF" variant="outline" style={{ flex: 1 }} onPress={() => onExport(period, 'pdf')} />
          <Button label="📊 Excel" variant="outline" style={{ flex: 1 }} onPress={() => onExport(period, 'xlsx')} />
        </View>
      )}
      {!current && (
        <View style={s.actions}>
          <Button label="↩ Kembalikan" variant="ghost" style={{ flex: 1 }} onPress={() => onRestore?.(period)} />
          <Button label="🗑 Hapus" variant="danger" style={{ flex: 1 }} onPress={() => onDelete?.(period)} />
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  badge: { color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  range: { color: colors.text, fontWeight: '600', fontSize: 13, marginBottom: 10 },
  sum: { flexDirection: 'row', justifyContent: 'space-between' },
  k: { color: colors.muted, fontSize: 11 },
  v: { fontWeight: '700', fontSize: 13, color: colors.text },
  toggle: { color: colors.muted, fontSize: 12, marginTop: 10 },
  section: { fontWeight: '700', color: colors.text, marginTop: 10, marginBottom: 4, fontSize: 13 },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  lineSub: { color: colors.muted, fontSize: 11 },
  lineAmt: { fontWeight: '700', fontSize: 12, marginLeft: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
