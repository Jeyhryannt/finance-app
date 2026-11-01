import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { lockoutSeconds, triesLeft } from './policy';

// Semua disimpan di SecureStore (Android Keystore), bukan AsyncStorage.
const K = { hash: 'fin_pin_hash', salt: 'fin_pin_salt', bio: 'fin_bio', fails: 'fin_fails', until: 'fin_until' };

const sha = (s) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);
async function hashPin(pin, salt) {
  let h = pin + salt;
  for (let i = 0; i < 200; i++) h = await sha(h + salt);
  return h;
}

export async function getConfig() {
  try {
    const [h, b] = await Promise.all([SecureStore.getItemAsync(K.hash), SecureStore.getItemAsync(K.bio)]);
    return { enabled: !!h, bio: b === '1' };
  } catch {
    return { enabled: false, bio: false };
  }
}

const resetFails = async () => {
  await SecureStore.deleteItemAsync(K.fails);
  await SecureStore.deleteItemAsync(K.until);
};

export async function setPin(pin) {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(K.salt, salt);
  await SecureStore.setItemAsync(K.hash, await hashPin(pin, salt));
  await resetFails();
}

export async function getLockWait() {
  const until = Number(await SecureStore.getItemAsync(K.until)) || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

// -> { ok } | { ok:false, wait, left }
export async function verifyPin(pin) {
  const wait = await getLockWait();
  if (wait > 0) return { ok: false, wait, left: 0 };
  const [hash, salt] = await Promise.all([SecureStore.getItemAsync(K.hash), SecureStore.getItemAsync(K.salt)]);
  if (!hash || !salt) return { ok: true };
  if ((await hashPin(pin, salt)) === hash) { await resetFails(); return { ok: true }; }
  const fails = (Number(await SecureStore.getItemAsync(K.fails)) || 0) + 1;
  await SecureStore.setItemAsync(K.fails, String(fails));
  const w = lockoutSeconds(fails);
  if (w > 0) await SecureStore.setItemAsync(K.until, String(Date.now() + w * 1000));
  return { ok: false, wait: w, left: triesLeft(fails) };
}

export async function disableLock() {
  await Promise.all(Object.values(K).map((k) => SecureStore.deleteItemAsync(k)));
}

export async function setBio(on) {
  if (on) await SecureStore.setItemAsync(K.bio, '1');
  else await SecureStore.deleteItemAsync(K.bio);
}

export async function biometricAvailable() {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch { return false; }
}

export async function biometricAuth() {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Buka Finance', cancelLabel: 'Pakai PIN', disableDeviceFallback: true,
    });
    return !!r.success;
  } catch { return false; }
}
