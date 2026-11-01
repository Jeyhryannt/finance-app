import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import PinPad from '../components/PinPad';
import { exportBackup, pickBackup } from '../services/backup';
import { biometricAuth, biometricAvailable, disableLock, setBio, setPin, verifyPin } from '../security/lock';
import { colors, radius } from '../theme/colors';

export default function SettingsScreen({ finance, lock, onClose }) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState('main'); // main | verifyDisable | verifyChange | newPin | confirmPin
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [bioOk, setBioOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { biometricAvailable().then(setBioOk); }, []);
  const back = () => { setView('main'); setFirstPin(''); setError(''); };

  const verifyThen = async (pin, next) => {
    const r = await verifyPin(pin);
    if (r.ok) { setError(''); next(); return; }
    setError(r.wait > 0 ? `Terlalu banyak percobaan. Tunggu ${r.wait} detik.` : `PIN salah. Sisa ${r.left} percobaan.`);
  };
  const onDisable = (pin) => verifyThen(pin, async () => { await disableLock(); await lock.refresh(); back(); });
  const onChangeVerify = (pin) => verifyThen(pin, () => setView('newPin'));
  const onNew = (pin) => { setFirstPin(pin); setError(''); setView('confirmPin'); };
  const onConfirm = async (pin) => {
    if (pin !== firstPin) { setError('PIN tidak sama. Ulangi dari awal.'); setFirstPin(''); setView('newPin'); return; }
    await setPin(pin);
    await lock.refresh();
    back();
    Alert.alert('PIN tersimpan', 'Jika lupa PIN dan sidik jari tidak aktif, satu-satunya cara adalah menghapus aplikasi, dan datamu ikut hilang. Simpan file cadangan secara berkala.');
  };

  const toggleBio = async (on) => {
    if (on) { if (!(await biometricAuth())) return; await setBio(true); } else { await setBio(false); }
    await lock.refresh();
  };

  const doBackup = async () => {
    setBusy(true);
    try { await exportBackup(finance.snapshot); } catch (e) { Alert.alert('Gagal mencadangkan', e.message || String(e)); }
    setBusy(false);
  };
  const doRestore = async () => {
    try {
      const st = await pickBackup();
      if (!st) return;
      Alert.alert('Ganti semua data?', `File berisi ${st.topups.length} saldo masuk, ${st.expenses.length} pengeluaran, ${st.wishlist.length} wishlist, ${st.history.length} riwayat. Data saat ini akan diganti (salinan data lama disimpan otomatis).`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ganti', style: 'destructive', onPress: async () => {
          try { await finance.replaceAll(st); Alert.alert('Berhasil', 'Data dipulihkan dari cadangan.'); onClose(); } catch (e) { Alert.alert('Gagal', e.message || String(e)); }
        } },
      ]);
    } catch (e) { Alert.alert('Gagal memulihkan', e.message || String(e)); }
  };

  const pad = { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 };

  if (view !== 'main') {
    const cfg = {
      verifyDisable: { title: 'Masukkan PIN', sub: 'Untuk mematikan kunci aplikasi', fn: onDisable },
      verifyChange: { title: 'Masukkan PIN lama', sub: 'Untuk mengubah PIN', fn: onChangeVerify },
      newPin: { title: 'Buat PIN baru', sub: '6 digit angka', fn: onNew },
      confirmPin: { title: 'Ulangi PIN', sub: 'Masukkan PIN yang sama sekali lagi', fn: onConfirm },
    }[view];
    return (
      <View style={[s.screen, pad, { paddingTop: insets.top + 40 }]}>
        <PinPad key={view} title={cfg.title} subtitle={cfg.sub} error={error} onComplete={cfg.fn} />
        <Button label="Batal" variant="ghost" onPress={back} style={{ marginHorizontal: 24, marginTop: 8 }} />
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[pad, { gap: 12, paddingHorizontal: 16 }]}>
      <Text style={s.title}>Pengaturan</Text>

      <Text style={s.section}>Keamanan</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Kunci aplikasi (PIN)</Text>
            <Text style={s.hint}>Aplikasi minta PIN saat dibuka dan setelah ditinggal sebentar.</Text>
          </View>
          <Switch value={lock.config.enabled} onValueChange={(v) => { setError(''); setView(v ? 'newPin' : 'verifyDisable'); }}
            trackColor={{ true: colors.primary }} />
        </View>
        {lock.config.enabled && (
          <>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Sidik jari / wajah</Text>
                <Text style={s.hint}>{bioOk ? 'Buka kunci lebih cepat.' : 'Tidak tersedia: belum ada sidik jari/wajah terdaftar di HP.'}</Text>
              </View>
              <Switch value={lock.config.bio && bioOk} disabled={!bioOk} onValueChange={toggleBio} trackColor={{ true: colors.primary }} />
            </View>
            <Button label="Ubah PIN" variant="outline" onPress={() => { setError(''); setView('verifyChange'); }} />
          </>
        )}
      </View>

      <Text style={s.section}>Data</Text>
      <View style={s.card}>
        <Text style={s.hint}>Data hanya tersimpan di HP ini. Simpan cadangan agar aman jika HP hilang, rusak, atau aplikasi terhapus. File cadangan berisi seluruh data keuanganmu dan tidak dienkripsi, jadi simpan di tempat pribadi.</Text>
        <Button label={busy ? 'Menyiapkan…' : '💾 Cadangkan data (file .json)'} onPress={doBackup} />
        <Button label="📂 Pulihkan dari file" variant="outline" onPress={doRestore} />
      </View>

      <Button label="Tutup" variant="ghost" onPress={onClose} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: colors.text, fontWeight: '600', fontSize: 15 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
