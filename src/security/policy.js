// Aturan percobaan PIN (murni, mudah diuji).
export const PIN_LENGTH = 6;
export const MAX_FREE_TRIES = 5;
export const LOCK_AFTER_MS = 15000; // kunci otomatis bila app di latar belakang lebih dari 15 detik

// Setiap 5 kali salah: tunggu 30 dtk, lalu 60, 120, ... maksimal 15 menit.
export const lockoutSeconds = (fails) => {
  if (fails < MAX_FREE_TRIES || fails % MAX_FREE_TRIES !== 0) return 0;
  return Math.min(30 * 2 ** (fails / MAX_FREE_TRIES - 1), 900);
};
export const triesLeft = (fails) => MAX_FREE_TRIES - (fails % MAX_FREE_TRIES);
export const isValidPin = (p) => /^\d{6}$/.test(p);
