// Fungsi murni (tanpa React) -> mudah diuji.
export const EMPTY_STATE = {
  topups: [],    // saldo masuk: { id, amount, date, time, note }
  expenses: [],  // pengeluaran: { id, title, amount, category, date, time, fromWishlistId? }
  wishlist: [],  // { id, title, estimatedPrice, category, date, isPurchased }
  categories: [],
  history: [],   // periode yang sudah dicetak & ditutup
};

export const PRESET_CATEGORIES = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan'];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = (n) => String(n).padStart(2, '0');

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const nowStamp = () => ({ date: todayISO(), time: nowTime() });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const formatDateID = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(iso ?? '');
};
// "30 Okt 2026, 11:26" (jam dilewati bila tidak ada)
export const formatDateTime = (date, time) => (time ? `${formatDateID(date)}, ${time}` : formatDateID(date));

export const formatRupiah = (n) => {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '-' : ''}Rp ${s}`;
};
// Untuk kolom input: "1500000" -> "1.500.000"
export const formatThousands = (str) =>
  String(str ?? '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const parseAmount = (str) => Number(String(str ?? '').replace(/[^\d]/g, '')) || 0;
export const isValidISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const isValidTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export const sumAmount = (list) => list.reduce((s, x) => s + x.amount, 0);
// Total Saldo = Σ Saldo Masuk − Σ Pengeluaran
export const calcBalance = (topups, expenses) => sumAmount(topups) - sumAmount(expenses);

const sortKey = (x) => `${x.date} ${x.time || '00:00'}`;
export const sortNewestFirst = (list) => [...list].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
const sortOldestFirst = (list) => [...list].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

// Kategori
export const upsertCategory = (list, name) => {
  const clean = (name ?? '').trim();
  if (!clean) return list;
  return [clean, ...list.filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(0, 50);
};
export const suggestCategories = (list, query) => {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.toLowerCase().includes(q) && c.toLowerCase() !== q);
};

// Wishlist -> Pengeluaran (idempoten)
export const purchaseWishlist = (state, wishlistId, actualPrice) => {
  const item = state.wishlist.find((w) => w.id === wishlistId);
  if (!item || item.isPurchased) return state;
  const expense = {
    id: uid(), title: item.title, amount: actualPrice > 0 ? actualPrice : item.estimatedPrice,
    category: item.category, ...nowStamp(), fromWishlistId: item.id,
  };
  return {
    ...state,
    wishlist: state.wishlist.map((w) => (w.id === wishlistId ? { ...w, isPurchased: true } : w)),
    expenses: [expense, ...state.expenses],
    categories: upsertCategory(state.categories, item.category),
  };
};

// Ringkasan periode berjalan: dari catatan paling awal sampai sekarang
export const buildPeriod = (state, end = nowStamp()) => {
  const { topups, expenses } = state;
  if (!topups.length && !expenses.length) return null;
  const first = sortOldestFirst([...topups, ...expenses])[0];
  const totalTopup = sumAmount(topups);
  const totalExpense = sumAmount(expenses);
  return {
    id: uid(),
    start: { date: first.date, time: first.time || '' },
    end,
    topups: sortOldestFirst(topups),
    expenses: sortOldestFirst(expenses),
    totalTopup, totalExpense, remaining: totalTopup - totalExpense,
  };
};

// Tutup periode: pindahkan ke riwayat, saldo & pengeluaran jadi kosong, wishlist tetap.
export const archiveState = (state, end = nowStamp()) => {
  const period = buildPeriod(state, end);
  if (!period) return { state, period: null };
  return {
    period,
    state: { ...state, topups: [], expenses: [], history: [period, ...state.history] },
  };
};

// Migrasi data versi 1 (initialBalance + transactions) ke versi 2
export const migrateV1 = (old) => {
  const stamp = nowStamp();
  const topups = [];
  const expenses = [];
  if (old.initialBalance > 0) topups.push({ id: uid(), amount: old.initialBalance, ...stamp, note: 'Saldo awal' });
  (old.transactions || []).forEach((t) => {
    if (t.isExpense) expenses.push({ id: t.id, title: t.title, amount: t.amount, category: t.category, date: t.date, time: '', fromWishlistId: t.fromWishlistId });
    else topups.push({ id: t.id, amount: t.amount, date: t.date, time: '', note: t.title });
  });
  return { ...EMPTY_STATE, topups, expenses, wishlist: old.wishlist || [], categories: old.categories || [] };
};

// Riwayat: kembalikan periode ke periode berjalan (membatalkan "Cetak & Tutup"), atau hapus permanen.
export const restorePeriod = (state, id) => {
  const p = state.history.find((h) => h.id === id);
  if (!p) return state;
  return {
    ...state,
    topups: [...p.topups, ...state.topups],
    expenses: [...p.expenses, ...state.expenses],
    history: state.history.filter((h) => h.id !== id),
  };
};
export const deletePeriod = (state, id) => ({ ...state, history: state.history.filter((h) => h.id !== id) });

// Membersihkan data hasil baca/impor: membuang entri rusak, mengisi nilai bawaan.
// Mengembalikan null jika bentuknya bukan data aplikasi sama sekali.
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const str = (v) => (typeof v === 'string' ? v : '');
const okDate = (v) => (isValidISODate(str(v)) ? v : todayISO());
const arr = (x) => (Array.isArray(x) ? x : []);
const cleanTopup = (t) => (t && isNum(t.amount) && t.amount > 0
  ? { id: str(t.id) || uid(), amount: t.amount, date: okDate(t.date), time: str(t.time), note: str(t.note) } : null);
const cleanExpense = (e) => (e && isNum(e.amount) && e.amount > 0
  ? {
    id: str(e.id) || uid(), title: str(e.title) || '(tanpa nama)', amount: e.amount,
    category: str(e.category) || 'Lainnya', date: okDate(e.date), time: str(e.time),
    ...(e.fromWishlistId ? { fromWishlistId: str(e.fromWishlistId) } : {}),
  } : null);
const cleanWish = (w) => (w && isNum(w.estimatedPrice) && w.estimatedPrice > 0
  ? {
    id: str(w.id) || uid(), title: str(w.title) || '(tanpa nama)', estimatedPrice: w.estimatedPrice,
    category: str(w.category) || 'Lainnya', date: okDate(w.date), isPurchased: w.isPurchased === true,
  } : null);
const cleanPeriod = (p) => {
  if (!p || typeof p !== 'object') return null;
  const topups = arr(p.topups).map(cleanTopup).filter(Boolean);
  const expenses = arr(p.expenses).map(cleanExpense).filter(Boolean);
  const totalTopup = sumAmount(topups);
  const totalExpense = sumAmount(expenses);
  return {
    id: str(p.id) || uid(),
    start: { date: okDate(p.start?.date), time: str(p.start?.time) },
    end: { date: okDate(p.end?.date), time: str(p.end?.time) },
    topups, expenses, totalTopup, totalExpense, remaining: totalTopup - totalExpense,
  };
};
export const sanitizeState = (o) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  return {
    topups: arr(o.topups).map(cleanTopup).filter(Boolean),
    expenses: arr(o.expenses).map(cleanExpense).filter(Boolean),
    wishlist: arr(o.wishlist).map(cleanWish).filter(Boolean),
    categories: arr(o.categories).filter((c) => typeof c === 'string' && c.trim()).slice(0, 50),
    history: arr(o.history).map(cleanPeriod).filter(Boolean),
  };
};
