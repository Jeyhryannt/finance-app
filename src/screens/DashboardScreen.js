import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BalanceCard from '../components/BalanceCard';
import Button from '../components/Button';
import ItemForm from '../components/ItemForm';
import PeriodCard from '../components/PeriodCard';
import SegmentedTabs from '../components/SegmentedTabs';
import SettingsScreen from './SettingsScreen';
import TransactionItem from '../components/TransactionItem';
import WishlistItem from '../components/WishlistItem';
import { createReport, shareReport } from '../services/report';
import { colors, radius } from '../theme/colors';
import { buildPeriod, formatDateTime, formatRupiah, formatThousands, nowStamp, parseAmount, sortNewestFirst } from '../utils/finance';

const TABS = [
  { key: 'expense', label: 'Pengeluaran' },
  { key: 'wishlist', label: 'Rencana Belanja' },
  { key: 'history', label: 'Riwayat' },
];

export default function DashboardScreen({ finance, lock }) {
  const f = finance;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('expense');
  const [modal, setModal] = useState(null); // 'expense' | 'wishlist' | 'topup' | 'settings'
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmDelete = (label, fn) =>
    Alert.alert('Hapus?', label, [{ text: 'Batal', style: 'cancel' }, { text: 'Hapus', style: 'destructive', onPress: fn }]);

  const confirmPurchase = (item) =>
    Alert.alert('Tandai sudah dibeli?', `Saldo akan dipotong ${formatRupiah(item.estimatedPrice)}.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, potong saldo', onPress: () => f.markAsPurchased(item.id) },
    ]);

  const askRestore = (period) =>
    Alert.alert('Kembalikan periode ini?', 'Saldo masuk dan pengeluaran periode ini aktif lagi (digabung dengan data periode berjalan), dan entri riwayatnya dihapus. Cocok kalau kamu salah menekan Cetak & Tutup.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Kembalikan', onPress: () => { f.restoreHistory(period.id); setTab('expense'); } },
    ]);
  const askDeleteHistory = (period) =>
    Alert.alert('Hapus riwayat ini?', 'Data periode ini dihapus permanen dan tidak bisa dikembalikan. File PDF/Excel yang sudah tersimpan tidak terpengaruh.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => f.deleteHistory(period.id) },
    ]);

  const saveTopup = () => {
    const v = parseAmount(topupAmount);
    if (v <= 0) return Alert.alert('Jumlah saldo harus lebih dari 0');
    f.addTopup(v, topupNote);
    setTopupAmount(''); setTopupNote(''); setModal(null);
  };

  // Buat file dulu; hanya jika berhasil periode ditutup (saldo & pengeluaran dikosongkan).
  const runExport = async (period, format, closeAfter) => {
    setBusy(true);
    let file;
    try {
      file = await createReport(period, format);
      if (closeAfter) f.closePeriod(period.end);
    } catch (e) {
      setBusy(false);
      return Alert.alert('Gagal membuat laporan', `${e.message || e}\n\nData kamu tidak berubah.`);
    }
    setBusy(false);
    try { await shareReport(file); } catch (e) {
      Alert.alert('Laporan dibuat', `Gagal membuka menu simpan: ${e.message || e}\n\nCetak ulang dari tab Riwayat.`);
    }
  };

  const askCloseAndPrint = () => {
    const period = buildPeriod({ topups: f.topups, expenses: f.expenses });
    if (!period) return Alert.alert('Belum ada data', 'Tambah saldo atau pengeluaran terlebih dahulu.');
    Alert.alert(
      'Cetak & Tutup Periode',
      'Laporan dibuat, lalu Total Saldo menjadi Rp 0 dan semua pengeluaran dikosongkan. Rencana Belanja tetap. Data periode ini tersimpan di tab Riwayat.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Excel', onPress: () => runExport(period, 'xlsx', true) },
        { text: 'PDF', onPress: () => runExport(period, 'pdf', true) },
      ]
    );
  };

  const empty = (text) => <Text style={s.empty}>{text}</Text>;
  const modalPad = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.headerRow}>
        <Text style={s.header}>Finance</Text>
        <Pressable onPress={() => setModal('settings')} hitSlop={10} style={s.gear}><Text style={{ fontSize: 22 }}>⚙️</Text></Pressable>
      </View>
      <BalanceCard balance={f.balance} expense={f.totalExpense} onAddBalance={() => setModal('topup')} />
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'expense' && (
        <>
          <View style={s.btnRow}>
            <Button label="+ Pengeluaran" style={{ flex: 1 }} onPress={() => setModal('expense')} />
          </View>
          <Button label="📄 Cetak & Tutup Periode (PDF / Excel)" variant="outline" style={s.printBtn} onPress={askCloseAndPrint} />
          <FlatList
            contentContainerStyle={{ paddingBottom: 24 }}
            data={sortNewestFirst(f.expenses)} keyExtractor={(i) => i.id}
            ListEmptyComponent={empty('Belum ada pengeluaran.')}
            renderItem={({ item }) => <TransactionItem item={item} onLongPress={() => confirmDelete(item.title, () => f.deleteExpense(item.id))} />}
          />
        </>
      )}

      {tab === 'wishlist' && (
        <>
          <Button label="+ Wishlist" variant="amber" style={s.printBtn} onPress={() => setModal('wishlist')} />
          <FlatList
            contentContainerStyle={{ paddingBottom: 24 }}
            data={f.pendingWishlist} keyExtractor={(i) => i.id}
            ListHeaderComponent={f.pendingWishlist.length ? (
              <Text style={s.hint}>Total rencana: {formatRupiah(f.pendingWishlist.reduce((a, w) => a + w.estimatedPrice, 0))} (belum memotong saldo)</Text>
            ) : null}
            ListEmptyComponent={empty('Wishlist kosong.')}
            renderItem={({ item }) => <WishlistItem item={item} onPurchase={() => confirmPurchase(item)} onLongPress={() => confirmDelete(item.title, () => f.deleteWishlist(item.id))} />}
          />
        </>
      )}

      {tab === 'history' && (
        <FlatList
          style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 24 }}
          data={f.history} keyExtractor={(i) => i.id}
          ListHeaderComponent={f.currentPeriod ? (
            <PeriodCard current period={buildPeriod({ topups: f.topups, expenses: f.expenses })}
              onDeleteTopup={(t) => confirmDelete(`Saldo masuk ${formatRupiah(t.amount)}`, () => f.deleteTopup(t.id))} />
          ) : null}
          ListEmptyComponent={empty('Belum ada riwayat. Riwayat muncul setelah kamu mencetak & menutup periode.')}
          renderItem={({ item }) => <PeriodCard period={item} onExport={(p, fmt) => runExport(p, fmt, false)} onRestore={askRestore} onDelete={askDeleteHistory} />}
        />
      )}

      <Modal visible={modal === 'expense'} animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={[s.safe, modalPad]}>
          <Text style={s.mTitle}>Catat Pengeluaran</Text>
          <ItemForm suggest={f.suggest} onCancel={() => setModal(null)}
            onSubmit={(v) => { f.addExpense(v); setModal(null); }} />
        </View>
      </Modal>

      <Modal visible={modal === 'wishlist'} animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={[s.safe, modalPad]}>
          <Text style={s.mTitle}>Tambah Rencana Belanja</Text>
          <ItemForm mode="wishlist" suggest={f.suggest} onCancel={() => setModal(null)}
            onSubmit={(v) => { f.addWishlist(v); setModal(null); }} />
        </View>
      </Modal>

      <Modal visible={modal === 'settings'} animationType="slide" onRequestClose={() => setModal(null)}>
        <SettingsScreen finance={f} lock={lock} onClose={() => setModal(null)} />
      </Modal>

      <Modal visible={modal === 'topup'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.mTitle}>Tambah Saldo</Text>
            <TextInput style={s.input} keyboardType="numeric" value={topupAmount}
              onChangeText={(t) => setTopupAmount(formatThousands(t))} placeholder="mis. 1.500.000" placeholderTextColor={colors.placeholder} />
            <TextInput style={s.input} value={topupNote} onChangeText={setTopupNote} placeholder="Catatan (opsional), mis. Gaji" placeholderTextColor={colors.placeholder} />
            <Text style={s.stamp}>Dicatat otomatis: {formatDateTime(nowStamp().date, nowStamp().time)}</Text>
            <View style={s.dialogBtns}>
              <Button label="Batal" variant="ghost" onPress={() => setModal(null)} />
              <Button label="Simpan" style={{ flex: 1 }} onPress={saveTopup} />
            </View>
          </View>
        </View>
      </Modal>

      {busy && (
        <View style={[StyleSheet.absoluteFill, s.busy]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 10 }}>Membuat laporan…</Text>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  header: { fontSize: 20, fontWeight: '700', color: colors.primary },
  gear: { padding: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
  printBtn: { marginHorizontal: 16, marginTop: 10, marginBottom: 12 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, paddingHorizontal: 32 },
  hint: { marginHorizontal: 16, marginBottom: 8, color: colors.muted, fontSize: 12 },
  mTitle: { fontSize: 20, fontWeight: '700', color: colors.text, padding: 20, paddingBottom: 0 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: radius.lg, paddingBottom: 20 },
  input: { marginHorizontal: 20, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 16, color: colors.text },
  stamp: { marginHorizontal: 20, marginTop: 10, color: colors.muted, fontSize: 12 },
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 14, marginHorizontal: 20 },
  busy: { backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center' },
});
