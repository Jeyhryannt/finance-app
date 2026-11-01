import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadState, saveSafetyCopy, saveState } from '../storage/storage';
import {
  EMPTY_STATE, archiveState, buildPeriod, calcBalance, deletePeriod, nowStamp, purchaseWishlist, restorePeriod,
  sanitizeState, sumAmount, suggestCategories, uid, upsertCategory,
} from '../utils/finance';

export default function useFinance() {
  const [data, setData] = useState(EMPTY_STATE);
  const [status, setStatus] = useState('loading'); // loading | ready | recovered | corrupt | error
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    const r = await loadState();
    setData(r.state);
    setLoadError(r.error || '');
    setStatus(r.status);
  }, []);
  useEffect(() => { load(); }, [load]);

  const ready = status === 'ready' || status === 'recovered';
  // Simpan hanya saat data sehat. Pada 'corrupt'/'error' tidak ada yang ditulis, jadi data lama aman.
  useEffect(() => { if (ready) saveState(data); }, [data, ready]);

  const balance = useMemo(() => calcBalance(data.topups, data.expenses), [data.topups, data.expenses]);
  const totalExpense = useMemo(() => sumAmount(data.expenses), [data.expenses]);
  const currentPeriod = useMemo(() => buildPeriod(data), [data.topups, data.expenses]); // eslint-disable-line

  const addTopup = useCallback((amount, note = '') => {
    setData((d) => ({ ...d, topups: [{ id: uid(), amount, note: note.trim(), ...nowStamp() }, ...d.topups] }));
  }, []);
  const deleteTopup = useCallback((id) => setData((d) => ({ ...d, topups: d.topups.filter((t) => t.id !== id) })), []);

  const addExpense = useCallback(({ title, amount, category, date, time }) => {
    setData((d) => ({
      ...d,
      expenses: [{ id: uid(), title: title.trim(), amount, category: category.trim(), date, time }, ...d.expenses],
      categories: upsertCategory(d.categories, category),
    }));
  }, []);
  const deleteExpense = useCallback((id) => {
    setData((d) => {
      const ex = d.expenses.find((e) => e.id === id);
      return {
        ...d,
        expenses: d.expenses.filter((e) => e.id !== id),
        wishlist: d.wishlist.map((w) => (ex?.fromWishlistId === w.id ? { ...w, isPurchased: false } : w)),
      };
    });
  }, []);

  const addWishlist = useCallback(({ title, amount, category, date }) => {
    setData((d) => ({
      ...d,
      wishlist: [{ id: uid(), title: title.trim(), estimatedPrice: amount, category: category.trim(), date, isPurchased: false }, ...d.wishlist],
      categories: upsertCategory(d.categories, category),
    }));
  }, []);
  const deleteWishlist = useCallback((id) => setData((d) => ({ ...d, wishlist: d.wishlist.filter((w) => w.id !== id) })), []);
  const markAsPurchased = useCallback((id, price) => setData((d) => purchaseWishlist(d, id, price)), []);

  const closePeriod = useCallback((end) => {
    const { state, period } = archiveState(data, end);
    if (period) setData(state);
    return period;
  }, [data]);
  const restoreHistory = useCallback((id) => setData((d) => restorePeriod(d, id)), []);
  const deleteHistory = useCallback((id) => setData((d) => deletePeriod(d, id)), []);

  // Ganti seluruh data (impor cadangan). Salinan data lama disimpan dulu.
  const replaceAll = useCallback(async (incoming) => {
    const clean = sanitizeState(incoming);
    if (!clean) throw new Error('Data cadangan tidak valid.');
    if (ready) await saveSafetyCopy(data);
    setData(clean);
    setStatus('ready');
  }, [data, ready]);
  const startFresh = useCallback(() => { setData(EMPTY_STATE); setStatus('ready'); }, []);

  const suggest = useCallback((q) => suggestCategories(data.categories, q), [data.categories]);

  return {
    status, ready, loadError, reload: load, startFresh, replaceAll, snapshot: data,
    balance, totalExpense, currentPeriod,
    topups: data.topups, expenses: data.expenses, history: data.history,
    wishlist: data.wishlist, pendingWishlist: data.wishlist.filter((w) => !w.isPurchased),
    addTopup, deleteTopup, addExpense, deleteExpense, addWishlist, deleteWishlist,
    markAsPurchased, closePeriod, restoreHistory, deleteHistory, suggest,
  };
}
