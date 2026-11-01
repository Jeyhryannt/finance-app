import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import { exportExcel, exportPdf, filterByPeriod, PERIODS } from '../services/exporter';

export default function ExportModal({ visible, onClose, transactions, balance }) {
  const [period, setPeriod] = useState('this');
  const [busy, setBusy] = useState(false);

  const run = async (kind) => {
    const { list, label } = filterByPeriod(transactions, period);
    if (!list.length) return Alert.alert('Tidak ada data', `Belum ada pengeluaran pada periode: ${label}.`);
    setBusy(true);
    try {
      if (kind === 'pdf') await exportPdf({ list, label, balance });
      else await exportExcel({ list, label });
    } catch (e) {
      Alert.alert('Ekspor gagal', e.message || 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <Text style={s.title}>Ekspor Laporan</Text>
          <Text style={s.label}>Periode</Text>
          <View style={s.row}>
            {PERIODS.map((p) => (
              <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[s.pill, period === p.key && s.pillOn]}>
                <Text style={[s.pillText, period === p.key && { color: '#fff' }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>Format</Text>
          <View style={s.row}>
            <Pressable disabled={busy} style={[s.btn, { backgroundColor: colors.expense }]} onPress={() => run('pdf')}><Text style={s.btnText}>📄 PDF</Text></Pressable>
            <Pressable disabled={busy} style={[s.btn, { backgroundColor: colors.income }]} onPress={() => run('xlsx')}><Text style={s.btnText}>📊 Excel</Text></Pressable>
          </View>
          {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
          <Pressable onPress={onClose} style={{ alignSelf: 'center', marginTop: 14 }}><Text style={{ color: colors.muted }}>Tutup</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', backgroundColor: colors.border },
  pillOn: { backgroundColor: colors.primary },
  pillText: { fontWeight: '600', color: colors.muted, fontSize: 13 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
