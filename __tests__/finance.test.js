import {
  calcBalance, purchaseWishlist, upsertCategory, suggestCategories, buildPeriod, archiveState,
  migrateV1, formatThousands, formatRupiah, formatDateTime, EMPTY_STATE, restorePeriod, deletePeriod, PRESET_CATEGORIES, sanitizeState,
} from '../src/utils/finance';

const topup = (amount, date = '2026-10-01', time = '08:00') => ({ id: 't' + amount + date + time, amount, date, time, note: '' });
const expense = (amount, date = '2026-10-02', time = '12:00') => ({ id: 'e' + amount + date + time, title: 'x', amount, category: 'Makan', date, time });
const base = (extra = {}) => ({
  ...EMPTY_STATE,
  wishlist: [{ id: 'w1', title: 'Headset', estimatedPrice: 250000, category: 'Gadget', date: '2026-10-01', isPurchased: false }],
  ...extra,
});

import { lockoutSeconds, triesLeft, isValidPin, MAX_FREE_TRIES } from '../src/security/policy';

describe('saldo', () => {
  test('tanpa data = 0', () => expect(calcBalance([], [])).toBe(0));
  test('saldo masuk dikurangi pengeluaran', () => expect(calcBalance([topup(1000000), topup(500000, '2026-10-03')], [expense(100000)])).toBe(1400000));
  test('boleh negatif', () => expect(calcBalance([], [expense(5000)])).toBe(-5000));
});

describe('wishlist', () => {
  test('wishlist baru tidak memotong saldo', () => {
    const s = base({ topups: [topup(1000000)] });
    expect(calcBalance(s.topups, s.expenses)).toBe(1000000);
  });
  test('markAsPurchased memotong saldo, ada jam, kategori tersimpan', () => {
    const s = purchaseWishlist(base({ topups: [topup(1000000)] }), 'w1');
    expect(s.wishlist[0].isPurchased).toBe(true);
    expect(calcBalance(s.topups, s.expenses)).toBe(750000);
    expect(s.expenses[0].time).toMatch(/^\d{2}:\d{2}$/);
    expect(s.categories).toContain('Gadget');
  });
  test('idempoten', () => {
    const once = purchaseWishlist(base(), 'w1');
    expect(purchaseWishlist(once, 'w1').expenses).toHaveLength(1);
  });
});

describe('cetak & tutup periode', () => {
  const state = base({ topups: [topup(1000000, '2026-10-01', '08:00'), topup(200000, '2026-10-05', '09:30')], expenses: [expense(100000), expense(50000, '2026-10-06', '10:00')] });
  test('periode: mulai dari catatan paling awal, total benar', () => {
    const p = buildPeriod(state, { date: '2026-10-30', time: '11:26' });
    expect(p.start).toEqual({ date: '2026-10-01', time: '08:00' });
    expect(p.end).toEqual({ date: '2026-10-30', time: '11:26' });
    expect([p.totalTopup, p.totalExpense, p.remaining]).toEqual([1200000, 150000, 1050000]);
  });
  test('tutup periode: saldo 0, pengeluaran kosong, wishlist tetap, masuk riwayat', () => {
    const { state: next, period } = archiveState(state, { date: '2026-10-30', time: '11:26' });
    expect(calcBalance(next.topups, next.expenses)).toBe(0);
    expect(next.expenses).toHaveLength(0);
    expect(next.wishlist).toHaveLength(1);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].id).toBe(period.id);
    expect(next.history[0].expenses).toHaveLength(2);
  });
  test('tanpa data -> tidak membuat periode', () => {
    expect(archiveState(base()).period).toBeNull();
  });
});

describe('migrasi v1', () => {
  test('saldo awal & transaksi lama dipindahkan', () => {
    const s = migrateV1({
      initialBalance: 500000,
      transactions: [{ id: 'a', title: 'Ikan asin', amount: 10000, category: 'Makanan', date: '2026-10-30', isExpense: true }],
      wishlist: [], categories: ['Makanan'],
    });
    expect(calcBalance(s.topups, s.expenses)).toBe(490000);
    expect(s.categories).toEqual(['Makanan']);
  });
});

describe('format', () => {
  test('titik ribuan di input', () => {
    expect(formatThousands('1500000')).toBe('1.500.000');
    expect(formatThousands('25000')).toBe('25.000');
    expect(formatThousands('abc')).toBe('');
  });
  test('rupiah & waktu', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    expect(formatDateTime('2026-10-30', '11:26')).toBe('30 Okt 2026, 11:26');
    expect(formatDateTime('2026-10-30', '')).toBe('30 Okt 2026');
  });
});

describe('kategori', () => {
  test('tanpa duplikat', () => expect(upsertCategory(['Makan', 'Kuota'], 'makan')).toEqual(['makan', 'Kuota']));
  test('suggest', () => expect(suggestCategories(['Makan', 'Kuota'], 'ma')).toEqual(['Makan']));
});

describe('riwayat: kembalikan & hapus', () => {
  const closed = () => archiveState(base({ topups: [topup(1000000)], expenses: [expense(100000)] }), { date: '2026-10-30', time: '11:26' });
  test('kembalikan: saldo & pengeluaran aktif lagi, riwayat hilang, wishlist tetap', () => {
    const { state, period } = closed();
    const back = restorePeriod(state, period.id);
    expect(calcBalance(back.topups, back.expenses)).toBe(900000);
    expect(back.history).toHaveLength(0);
    expect(back.wishlist).toHaveLength(1);
  });
  test('kembalikan digabung dengan data periode berjalan', () => {
    const { state, period } = closed();
    const withNew = { ...state, topups: [topup(50000, '2026-11-01')] };
    const back = restorePeriod(withNew, period.id);
    expect(calcBalance(back.topups, back.expenses)).toBe(950000);
  });
  test('hapus: riwayat hilang permanen, saldo tidak berubah', () => {
    const { state, period } = closed();
    const gone = deletePeriod(state, period.id);
    expect(gone.history).toHaveLength(0);
    expect(calcBalance(gone.topups, gone.expenses)).toBe(0);
  });
  test('id tidak ada -> state sama', () => {
    const { state } = closed();
    expect(restorePeriod(state, 'x')).toBe(state);
  });
  test('4 kategori utama', () => expect(PRESET_CATEGORIES).toHaveLength(4));
});

describe('sanitizeState (data rusak / impor)', () => {
  test('bukan objek -> null', () => {
    expect(sanitizeState(null)).toBeNull();
    expect(sanitizeState('x')).toBeNull();
    expect(sanitizeState([1, 2])).toBeNull();
  });
  test('entri rusak dibuang, sisanya dipertahankan', () => {
    const s = sanitizeState({
      topups: [{ id: 'a', amount: 1000, date: '2026-10-01', time: '08:00' }, { amount: -5 }, { amount: 'x' }, null],
      expenses: [{ id: 'b', title: 'Kopi', amount: 20000, category: 'Makanan', date: '2026-10-02' }, { amount: NaN }],
      wishlist: [{ id: 'w', title: 'Tas', estimatedPrice: 90000, category: 'Belanja', date: '2026-10-03', isPurchased: 'ya' }],
      categories: ['Makanan', 5, '  '],
    });
    expect(s.topups).toHaveLength(1);
    expect(s.expenses).toHaveLength(1);
    expect(s.wishlist[0].isPurchased).toBe(false);
    expect(s.categories).toEqual(['Makanan']);
    expect(s.history).toEqual([]);
  });
  test('tanggal tidak valid diganti, total periode dihitung ulang', () => {
    const s = sanitizeState({
      history: [{ id: 'p', start: { date: 'ngawur' }, end: { date: '2026-10-30', time: '11:26' },
        topups: [{ amount: 100 }], expenses: [{ amount: 30 }], totalTopup: 999999 }],
    });
    const p = s.history[0];
    expect(p.totalTopup).toBe(100);
    expect(p.remaining).toBe(70);
    expect(p.start.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test('data sehat tidak berubah isinya', () => {
    const src = { topups: [topup(1000000)], expenses: [expense(100000)], wishlist: [], categories: ['Makanan'], history: [] };
    const s = sanitizeState(src);
    expect(calcBalance(s.topups, s.expenses)).toBe(900000);
  });
});

describe('kebijakan PIN', () => {
  test('5 percobaan gratis lalu tunggu, makin lama', () => {
    expect([1, 2, 3, 4].map(lockoutSeconds)).toEqual([0, 0, 0, 0]);
    expect(lockoutSeconds(5)).toBe(30);
    expect(lockoutSeconds(6)).toBe(0);
    expect(lockoutSeconds(10)).toBe(60);
    expect(lockoutSeconds(15)).toBe(120);
    expect(lockoutSeconds(500)).toBe(900);
  });
  test('sisa percobaan', () => {
    expect(triesLeft(1)).toBe(MAX_FREE_TRIES - 1);
    expect(triesLeft(5)).toBe(5);
  });
  test('PIN harus 6 digit angka', () => {
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a456')).toBe(false);
  });
});
