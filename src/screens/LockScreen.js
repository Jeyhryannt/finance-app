import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PinPad from '../components/PinPad';
import { biometricAuth, getLockWait, verifyPin } from '../security/lock';
import { colors } from '../theme/colors';

export default function LockScreen({ config, onUnlock }) {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const tried = useRef(false);

  const tryBio = useCallback(async () => { if (await biometricAuth()) onUnlock(); }, [onUnlock]);

  useEffect(() => { getLockWait().then(setWait); }, []);
  useEffect(() => {
    if (config.bio && !tried.current) { tried.current = true; tryBio(); }
  }, []); // eslint-disable-line
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line

  const onPin = async (pin) => {
    const r = await verifyPin(pin);
    if (r.ok) return onUnlock();
    if (r.wait > 0) { setWait(r.wait); setError('Terlalu banyak percobaan.'); } else setError(`PIN salah. Sisa ${r.left} percobaan.`);
    return undefined;
  };

  return (
    <View style={[s.safe, { paddingTop: insets.top + 40, paddingBottom: insets.bottom }]}>
      <PinPad
        title="Finance terkunci"
        subtitle={wait > 0 ? `Coba lagi dalam ${wait} detik` : 'Masukkan PIN 6 digit'}
        error={error}
        disabled={wait > 0}
        onComplete={onPin}
        extraLeft={config.bio ? (
          <Pressable onPress={tryBio}><Text style={{ fontSize: 28 }}>🔓</Text></Pressable>
        ) : null}
      />
      {config.bio && <Text style={s.hint}>Ketuk 🔓 untuk memakai sidik jari / wajah</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
