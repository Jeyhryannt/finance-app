// Cadangkan seluruh data ke satu file .json, dan pulihkan dari file itu.
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { gate } from '../security/lockGate';
import { nowTime, sanitizeState, todayISO } from '../utils/finance';
import { writeCacheFile } from './report';

export async function exportBackup(state) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Fitur berbagi file tidak tersedia di perangkat ini.');
  const payload = { app: 'finance', version: 2, exportedAt: new Date().toISOString(), data: state };
  const name = `Cadangan-Finance_${todayISO()}_${nowTime().replace(':', '')}.json`;
  const uri = await writeCacheFile(name, JSON.stringify(payload));
  gate.suspend = true;
  try {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Simpan cadangan data', UTI: 'public.json' });
  } finally {
    gate.suspend = false;
  }
}

// -> state yang sudah dibersihkan, atau null jika dibatalkan
export async function pickBackup() {
  gate.suspend = true;
  let res;
  try {
    res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  } finally {
    gate.suspend = false;
  }
  if (res.canceled) return null;
  let obj;
  try {
    const text = await (await fetch(res.assets[0].uri)).text();
    obj = JSON.parse(text);
  } catch {
    throw new Error('File tidak bisa dibaca. Pastikan itu file cadangan Finance (.json).');
  }
  const state = sanitizeState(obj?.data ?? obj);
  if (!state) throw new Error('File ini bukan cadangan Finance yang valid.');
  return state;
}
