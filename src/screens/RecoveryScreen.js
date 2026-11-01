// Tampil jika data tersimpan gagal dibaca. Tidak ada yang ditimpa sebelum kamu memilih.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { pickBackup } from '../services/backup';
import { colors } from '../theme/colors';

export default function RecoveryScreen({ finance }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const corrupt = finance.status === 'corrupt';

  const importFile = async () => {
    setBusy(true);
    try {
      const st = await pickBackup();
      if (st) await finance.replaceAll(st);
    } catch (e) {
      Alert.alert('Gagal memulihkan', e.message || String(e));
    }
    setBusy(false);
  };
  const askFresh = () =>
    Alert.alert('Mulai dari kosong?', 'Salinan data yang rusak tetap disimpan di perangkat untuk pemulihan darurat, tetapi aplikasi akan dimulai tanpa data.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Mulai kosong', style: 'destructive', onPress: finance.startFresh },
    ]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[s.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Text style={s.title}>{corrupt ? 'Data tidak bisa dibaca' : 'Gagal membuka data'}</Text>
      <Text style={s.body}>
        {corrupt
          ? 'Data tersimpan tampaknya rusak, dan tidak ada cadangan otomatis yang sehat. Aplikasi tidak menyimpan apa pun sebelum kamu memilih, jadi tidak ada yang tertimpa.'
          : 'Penyimpanan HP gagal dibaca. Datamu belum diubah. Coba lagi; jika tetap gagal, restart HP atau pulihkan dari file cadangan.'}
      </Text>
      {!corrupt && !!finance.loadError && <Text style={s.err}>{finance.loadError}</Text>}
      <Button label="Coba lagi" onPress={finance.reload} style={s.btn} />
      <Button label="📂 Pulihkan dari file cadangan" variant="outline" onPress={importFile} style={s.btn} />
      {corrupt && <Button label="Mulai dari kosong" variant="danger" onPress={askFresh} style={s.btn} />}
      {busy && <Text style={s.body}>Memproses…</Text>}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  body: { color: colors.muted, lineHeight: 20 },
  err: { color: colors.expense, fontSize: 12 },
  btn: { marginTop: 4 },
});
