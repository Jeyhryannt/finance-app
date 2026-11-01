import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { formatDateID, formatRupiah, formatTime } from '../utils/finance';

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const PERIODS = [
  { key: 'this', label: 'Bulan ini' },
  { key: 'last', label: 'Bulan lalu' },
  { key: 'all', label: 'Semua' },
];

export function filterByPeriod(transactions, period, now = new Date()) {
  let list = transactions;
  let label = 'Semua periode';
  if (period !== 'all') {
    const target = period === 'last' ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
    const key = monthKey(target);
    list = transactions.filter((t) => t.date.startsWith(key));
    label = `${BULAN_PANJANG[target.getMonth()]} ${target.getFullYear()}`;
  }
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  return { list: sorted, label };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const total = (list) => list.reduce((s, t) => s + t.amount, 0);

async function share(uri, mimeType, UTI) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Fitur bagikan tidak tersedia di perangkat ini.');
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle: 'Bagikan laporan' });
}

export async function exportPdf({ list, label, balance }) {
  const rows = list.map((t, i) => `
    <tr><td>${i + 1}</td><td>${esc(formatDateID(t.date))}</td><td>${esc(formatTime(t.createdAt))}</td>
    <td>${esc(t.title)}</td><td>${esc(t.category)}</td><td class="r">${esc(formatRupiah(t.amount))}</td></tr>`).join('');
  const html = `<html><head><meta charset="utf-8"/><style>
    body{font-family:Helvetica,Arial,sans-serif;padding:24px;color:#0F172A}
    h1{color:#0F766E;margin:0 0 4px} .sub{color:#64748B;margin-bottom:16px;font-size:13px}
    .box{background:#CCFBF1;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#0F766E;color:#fff;text-align:left;padding:8px} td{padding:7px 8px;border-bottom:1px solid #E2E8F0}
    .r{text-align:right} tfoot td{font-weight:bold;border-top:2px solid #0F766E}
  </style></head><body>
    <h1>Laporan Pengeluaran</h1>
    <div class="sub">Periode: ${esc(label)} · Dicetak: ${esc(formatDateID(new Date().toISOString().slice(0, 10)))}</div>
    <div class="box">Jumlah transaksi: <b>${list.length}</b><br/>Total pengeluaran: <b>${esc(formatRupiah(total(list)))}</b><br/>Saldo saat ini: <b>${esc(formatRupiah(balance))}</b></div>
    <table><thead><tr><th>No</th><th>Tanggal</th><th>Jam</th><th>Nama Barang</th><th>Kategori</th><th class="r">Jumlah</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Tidak ada data.</td></tr>'}</tbody>
    <tfoot><tr><td colspan="5">TOTAL</td><td class="r">${esc(formatRupiah(total(list)))}</td></tr></tfoot></table>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await share(uri, 'application/pdf', 'com.adobe.pdf');
}

export async function exportExcel({ list, label }) {
  const header = ['No', 'Tanggal', 'Jam', 'Nama Barang', 'Kategori', 'Jumlah (Rp)'];
  const body = list.map((t, i) => [i + 1, formatDateID(t.date), formatTime(t.createdAt), t.title, t.category, t.amount]);
  const aoa = [[`Laporan Pengeluaran - ${label}`], [], header, ...body, [], ['', '', '', '', 'TOTAL', total(list)]];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 16 }];
  Object.keys(ws).forEach((addr) => {
    if (addr[0] !== '!' && addr.startsWith('F') && typeof ws[addr].v === 'number') ws[addr].z = '#,##0';
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const file = new File(Paths.cache, `Laporan-${label.replace(/\s+/g, '-')}.xlsx`);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(out));
  await share(file.uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'org.openxmlformats.spreadsheetml.sheet');
}
