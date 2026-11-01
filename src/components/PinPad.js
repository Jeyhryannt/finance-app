import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { PIN_LENGTH } from '../security/policy';

const KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

export default function PinPad({ title, subtitle, error, onComplete, extraLeft, disabled }) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return undefined;
    const t = setTimeout(() => { const p = pin; setPin(''); onComplete(p); }, 120);
    return () => clearTimeout(t);
  }, [pin]); // eslint-disable-line

  const press = (d) => { if (!disabled) setPin((p) => (p.length < PIN_LENGTH ? p + d : p)); };
  const back = () => setPin((p) => p.slice(0, -1));

  const Key = ({ label, onPress }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [s.key, pressed && { backgroundColor: colors.border }]}>
      <Text style={s.keyText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
      <View style={s.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[s.dot, i < pin.length && s.dotOn]} />
        ))}
      </View>
      <Text style={s.error}>{error || ' '}</Text>
      {KEYS.map((row, i) => (
        <View key={i} style={s.row}>{row.map((k) => <Key key={k} label={k} onPress={() => press(k)} />)}</View>
      ))}
      <View style={s.row}>
        <View style={s.key}>{extraLeft}</View>
        <Key label="0" onPress={() => press('0')} />
        <Key label="⌫" onPress={back} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sub: { color: colors.muted, textAlign: 'center', marginTop: 6, fontSize: 13 },
  dots: { flexDirection: 'row', gap: 14, marginTop: 24 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.primary },
  dotOn: { backgroundColor: colors.primary },
  error: { color: colors.expense, minHeight: 20, marginVertical: 12, textAlign: 'center', fontSize: 13 },
  row: { flexDirection: 'row', gap: 18, marginBottom: 14 },
  key: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  keyText: { fontSize: 26, color: colors.text, fontWeight: '500' },
});
