# Keuanganku (Expo / React Native)
Pencatatan pengeluaran, Rencana Belanja (wishlist), saldo otomatis, riwayat periode, dan cetak PDF/Excel. Data tersimpan lokal; tanpa API key, tanpa izin kamera.
Struktur: `App.js` · `src/{theme,utils,storage,hooks,services,components,screens}` · `__tests__/`

## Paket
`npx expo install @react-native-async-storage/async-storage expo-status-bar react-native-safe-area-context expo-print expo-sharing expo-file-system` lalu `npm install xlsx`.
Panduan build APK: `docs/03-build-apk-eas.md`.

## Catatan v3
Fitur Scan Struk dihapus (tidak lagi memakai Gemini/OCR, kamera, atau galeri). Paket `expo-camera` dan `expo-image-picker` boleh dihapus: `npm uninstall expo-camera expo-image-picker`.

## Pembaruan v5 (keamanan)
- Kunci aplikasi PIN 6 digit + sidik jari/wajah (Pengaturan ⚙️). PIN disimpan sebagai hash bersalt di SecureStore, bukan teks biasa; ada jeda setelah 5 kali salah.
- Perbaikan data: data rusak/gagal dibaca tidak lagi menimpa data lama (pemulihan otomatis dari salinan, atau layar pemulihan).
- Cadangkan/Pulihkan data ke satu file .json.
Paket baru: `npx expo install expo-local-authentication expo-secure-store expo-crypto expo-document-picker`.
