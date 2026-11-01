// Memastikan data rusak/gagal dibaca TIDAK pernah menimpa data lama.
const mockMem = {};
let mockFailRead = false;
const mockWrites = [];
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => { if (mockFailRead && k === '@finance_v2') throw new Error('IO error'); return k in mockMem ? mockMem[k] : null; }),
  setItem: jest.fn(async (k, v) => { mockWrites.push(k); mockMem[k] = v; }),
}), { virtual: true });

import { loadState } from '../src/storage/storage';

const good = JSON.stringify({ topups: [{ id: 'a', amount: 1000, date: '2026-10-01', time: '08:00' }], expenses: [], wishlist: [], categories: [], history: [] });
beforeEach(() => { Object.keys(mockMem).forEach((k) => delete mockMem[k]); mockWrites.length = 0; mockFailRead = false; });

test('data sehat: dibaca dan salinan cadangan dibuat', async () => {
  mockMem['@finance_v2'] = good;
  const r = await loadState();
  expect(r.status).toBe('ready');
  expect(r.state.topups).toHaveLength(1);
  expect(mockMem['@finance_v2_backup']).toBe(good);
});

test('data rusak tanpa cadangan: status corrupt, data utama TIDAK ditimpa, salinan darurat dibuat', async () => {
  mockMem['@finance_v2'] = '{rusak';
  const r = await loadState();
  expect(r.status).toBe('corrupt');
  expect(mockMem['@finance_v2']).toBe('{rusak');
  expect(mockMem['@finance_v2_corrupt']).toBe('{rusak');
  expect(mockWrites).not.toContain('@finance_v2');
});

test('data rusak dengan cadangan sehat: dipulihkan otomatis', async () => {
  mockMem['@finance_v2'] = '{rusak';
  mockMem['@finance_v2_backup'] = good;
  const r = await loadState();
  expect(r.status).toBe('recovered');
  expect(r.state.topups).toHaveLength(1);
});

test('gagal membaca penyimpanan: status error, tidak ada tulis', async () => {
  mockMem['@finance_v2'] = good;
  mockFailRead = true;
  const r = await loadState();
  expect(r.status).toBe('error');
  expect(mockWrites).toHaveLength(0);
});

test('data versi 1 dimigrasi', async () => {
  mockMem['@finance_v1'] = JSON.stringify({ initialBalance: 500000, transactions: [{ id: 'x', title: 'Ikan asin', amount: 10000, category: 'Makanan', date: '2026-10-30', isExpense: true }], wishlist: [], categories: [] });
  const r = await loadState();
  expect(r.status).toBe('ready');
  expect(r.state.topups[0].amount).toBe(500000);
  expect(r.state.expenses[0].title).toBe('Ikan asin');
});
