// Form dipakai ulang: modal Pengeluaran dan modal Wishlist.
// Kategori: 4 pilihan utama + "Lainnya" (isi sendiri).
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import {
  PRESET_CATEGORIES, formatThousands, isValidISODate, isValidTime, nowTime, parseAmount, todayISO,
} from '../utils/finance';
import Button from './Button';
import CategoryChip from './CategoryChip';

const CUSTOM = '__custom';

function Choice({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.choice, selected && s.choiceOn]}>
      <Text style={[s.choiceText, selected && s.choiceTextOn]}>{label}</Text>
    </Pressable>
  );
}

export default function ItemForm({ mode = 'expense', initial, suggest, onSubmit, onCancel, submitLabel = 'Simpan' }) {
  const isWish = mode === 'wishlist';
  const initCat = initial?.category ?? '';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial?.amount ? formatThousands(String(initial.amount)) : '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [time, setTime] = useState(initial?.time ?? nowTime());
  const [picked, setPicked] = useState(PRESET_CATEGORIES.includes(initCat) ? initCat : initCat ? CUSTOM : '');
  const [custom, setCustom] = useState(PRESET_CATEGORIES.includes(initCat) ? '' : initCat);

  const category = picked === CUSTOM ? custom : picked;
  // saran: kategori buatan sendiri yang pernah dipakai
  const saved = useMemo(
    () => suggest(custom).filter((c) => !PRESET_CATEGORIES.some((p) => p.toLowerCase() === c.toLowerCase())).slice(0, 8),
    [custom, suggest]
  );

  const submit = () => {
    const value = parseAmount(amount);
    if (!title.trim()) return Alert.alert('Nama barang wajib diisi');
    if (value <= 0) return Alert.alert('Harga harus lebih dari 0');
    if (!isValidISODate(date)) return Alert.alert('Format tanggal harus YYYY-MM-DD');
    if (!isWish && !isValidTime(time)) return Alert.alert('Format jam harus HH:mm, contoh 14:30');
    if (!category.trim()) return Alert.alert('Pilih kategori, atau pilih Lainnya lalu isi sendiri');
    onSubmit({ title, amount: value, date, time, category: category.trim() });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={s.label}>Nama Barang</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="mis. Nasi goreng" placeholderTextColor={colors.placeholder} />

      <Text style={s.label}>{isWish ? 'Perkiraan Harga (Rp)' : 'Harga (Rp)'}</Text>
      <TextInput style={s.input} value={amount} onChangeText={(t) => setAmount(formatThousands(t))} keyboardType="numeric" placeholder="25.000" placeholderTextColor={colors.placeholder} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 2, gap: 12 }}>
          <Text style={s.label}>Tanggal (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-11-01" placeholderTextColor={colors.placeholder} />
        </View>
        {!isWish && (
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={s.label}>Jam (HH:mm)</Text>
            <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="14:30" placeholderTextColor={colors.placeholder} />
          </View>
        )}
      </View>

      <Text style={s.label}>Kategori</Text>
      <View style={s.choices}>
        {PRESET_CATEGORIES.map((c) => (
          <Choice key={c} label={c} selected={picked === c} onPress={() => setPicked(c)} />
        ))}
        <Choice label="✏️ Lainnya" selected={picked === CUSTOM} onPress={() => setPicked(CUSTOM)} />
      </View>
      {picked === CUSTOM && (
        <>
          <TextInput style={s.input} value={custom} onChangeText={setCustom} placeholder="Tulis kategori sendiri, mis. Skincare" placeholderTextColor={colors.placeholder} autoFocus />
          {saved.length > 0 && (
            <View style={s.choices}>{saved.map((c) => <CategoryChip key={c} label={c} onPress={() => setCustom(c)} />)}</View>
          )}
        </>
      )}

      <View style={s.actions}>
        {onCancel && <Button label="Batal" variant="ghost" onPress={onCancel} />}
        <Button label={submitLabel} onPress={submit} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  choiceTextOn: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
