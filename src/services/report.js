// Membuat laporan PDF (expo-print) dan Excel .xlsx (SheetJS) dari sebuah "periode".
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { gate } from '../security/lockGate';
import { formatDateID, formatDateTime, formatRupiah } from '../utils/finance';

const PDF = 'application/pdf';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rangeText = (p) => `${formatDateTime(p.start.date, p.start.time)} s/d ${formatDateTime(p.end.date, p.end.time)}`;
const baseName = (p) => `Laporan-Keuangan_${p.end.date}_${(p.end.time || '').replace(':', '')}`;

function buildHtml(p) {
  const topupRows = p.topups.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(formatDateTime(t.date, t.time))}</td><td>${esc(t.note || '-')}</td><td class="r">${formatRupiah(t.amount)}</td></tr>`).join('');
  const expRows = p.expenses.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(formatDateTime(e.date, e.time))}</td><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td class="r">${formatRupiah(e.amount)}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"/><style>
  body{font-family:Helvetica,Arial,sans-serif;color:#0F172A;padding:24px;font-size:12px}
  h1{color:#0F766E;margin:0 0 4px} h2{margin:22px 0 8px;font-size:14px}
  .muted{color:#64748B} table{width:100%;border-collapse:collapse}
  th{background:#0F766E;color:#fff;text-align:left;padding:6px} td{padding:6px;border-bottom:1px solid #E2E8F0}
  .r{text-align:right} .sum td{font-weight:bold;border-top:2px solid #0F766E}
  .box{display:flex;gap:12px;margin-top:12px} .b{flex:1;background:#F5F7FA;border-radius:8px;padding:10px}
  </style></head><body>
  <h1>Laporan Keuangan</h1><div class="muted">Periode: ${esc(rangeText(p))}</div>
  <div class="box">
    <div class="b"><div class="muted">Total Saldo Masuk</div><b>${formatRupiah(p.totalTopup)}</b></div>
    <div class="b"><div class="muted">Total Pengeluaran</div><b>${formatRupiah(p.totalExpense)}</b></div>
    <div class="b"><div class="muted">Sisa Saldo</div><b>${formatRupiah(p.remaining)}</b></div>
  </div>
  <h2>Riwayat Saldo Masuk</h2>
  <table><tr><th>No</th><th>Waktu</th><th>Catatan</th><th class="r">Jumlah</th></tr>${topupRows || '<tr><td colspan="4">Tidak ada data</td></tr>'}
  <tr class="sum"><td colspan="3">Total</td><td class="r">${formatRupiah(p.totalTopup)}</td></tr></table>
  <h2>Daftar Pengeluaran</h2>
  <table><tr><th>No</th><th>Waktu</th><th>Nama Barang</th><th>Kategori</th><th class="r">Jumlah</th></tr>${expRows || '<tr><td colspan="5">Tidak ada data</td></tr>'}
  <tr class="sum"><td colspan="4">Total</td><td class="r">${formatRupiah(p.totalExpense)}</td></tr></table>
  <p class="muted" style="margin-top:20px">Dicetak: ${esc(formatDateTime(p.end.date, p.end.time))}</p>
  </body></html>`;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64ToBytes(b64) {
  const clean = String(b64).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let buffer = 0, bits = 0, p = 0;
  for (let i = 0; i < clean.length; i++) {
    buffer = (buffer << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; out[p++] = (buffer >> bits) & 0xff; buffer &= (1 << bits) - 1; }
  }
  return out;
}

// Simpan byte ke folder cache milik app sendiri (folder yang boleh dibaca Sharing).
export async function writeCacheFile(name, bytes) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  await file.create();
  await file.write(bytes);
  return file.uri;
}

async function createPdf(p) {
  // Ambil PDF sebagai base64 lalu tulis ulang ke cache app: file bawaan expo-print
  // tidak bisa dibaca oleh menu berbagi (error "Not allowed to read file under given URL").
  const { base64 } = await Print.printToFileAsync({ html: buildHtml(p), base64: true });
  const name = `${baseName(p)}.pdf`;
  return { uri: await writeCacheFile(name, base64ToBytes(base64)), mimeType: PDF, name };
}

function numberFormat(ws, cols) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    cols.forEach((c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0';
    });
  }
}

async function createXlsx(p) {
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ['Laporan Keuangan'],
    ['Periode', rangeText(p)],
    [],
    ['Total Saldo Masuk', p.totalTopup],
    ['Total Pengeluaran', p.totalExpense],
    ['Sisa Saldo', p.remaining],
  ]);
  summary['!cols'] = [{ wch: 22 }, { wch: 46 }];
  numberFormat(summary, [1]);
  XLSX.utils.book_append_sheet(wb, summary, 'Ringkasan');

  const top = XLSX.utils.aoa_to_sheet([
    ['No', 'Tanggal', 'Jam', 'Jumlah', 'Catatan'],
    ...p.topups.map((t, i) => [i + 1, formatDateID(t.date), t.time || '', t.amount, t.note || '']),
    ['', '', 'Total', p.totalTopup, ''],
  ]);
  top['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 28 }];
  numberFormat(top, [3]);
  XLSX.utils.book_append_sheet(wb, top, 'Saldo Masuk');

  const exp = XLSX.utils.aoa_to_sheet([
    ['No', 'Tanggal', 'Jam', 'Nama Barang', 'Kategori', 'Jumlah'],
    ...p.expenses.map((e, i) => [i + 1, formatDateID(e.date), e.time || '', e.title, e.category, e.amount]),
    ['', '', '', '', 'Total', p.totalExpense],
  ]);
  exp['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 16 }];
  numberFormat(exp, [5]);
  XLSX.utils.book_append_sheet(wb, exp, 'Pengeluaran');

  const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  const name = `${baseName(p)}.xlsx`;
  return { uri: await writeCacheFile(name, bytes), mimeType: XLSX_MIME, name };
}

export const createReport = (period, format) => (format === 'pdf' ? createPdf(period) : createXlsx(period));

export async function shareReport(file) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Fitur berbagi file tidak tersedia di perangkat ini.');
  gate.suspend = true; // jangan kunci otomatis saat menu bagikan terbuka
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType,
      dialogTitle: 'Simpan / bagikan laporan',
      UTI: file.mimeType === PDF ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
    });
  } finally {
    gate.suspend = false;
  }
}
