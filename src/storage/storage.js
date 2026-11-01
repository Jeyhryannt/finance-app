import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_STATE, migrateV1, sanitizeState } from '../utils/finance';

const KEY = '@finance_v2';
const OLD_KEY = '@finance_v1';
const BACKUP_KEY = '@finance_v2_backup';   // salinan otomatis dari pembukaan app terakhir yang sehat
const CORRUPT_KEY = '@finance_v2_corrupt'; // salinan mentah data yang rusak (untuk pemulihan darurat)

const tryParse = (raw) => {
  try { return sanitizeState(JSON.parse(raw)); } catch { return null; }
};

// status: 'ready' | 'recovered' (dipulihkan dari cadangan otomatis) | 'corrupt' | 'error'
// PENTING: pada 'corrupt' dan 'error' aplikasi TIDAK boleh menyimpan apa pun, agar data lama tidak tertimpa.
export async function loadState() {
  let raw;
  try {
    raw = await AsyncStorage.getItem(KEY);
  } catch (e) {
    return { status: 'error', state: EMPTY_STATE, error: String(e?.message || e) };
  }

  if (raw == null) {
    try { // data versi 1 dipindahkan otomatis
      const old = await AsyncStorage.getItem(OLD_KEY);
      if (old) return { status: 'ready', state: migrateV1(JSON.parse(old)) };
    } catch { /* data v1 rusak: abaikan */ }
    return { status: 'ready', state: EMPTY_STATE };
  }

  const parsed = tryParse(raw);
  if (parsed) {
    AsyncStorage.setItem(BACKUP_KEY, raw).catch(() => {});
    return { status: 'ready', state: parsed };
  }

  try { await AsyncStorage.setItem(CORRUPT_KEY, raw); } catch { /* abaikan */ }
  try {
    const b = await AsyncStorage.getItem(BACKUP_KEY);
    const bp = b ? tryParse(b) : null;
    if (bp) return { status: 'recovered', state: bp };
  } catch { /* abaikan */ }
  return { status: 'corrupt', state: EMPTY_STATE };
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('saveState gagal', e);
    return false;
  }
}

// Simpan salinan sebelum data diganti (mis. saat impor cadangan).
export async function saveSafetyCopy(state) {
  try { await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(state)); } catch { /* abaikan */ }
}
