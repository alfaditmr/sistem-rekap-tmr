/**
 * Helper ekspor file Excel (.xls) resmi dengan template & styling identik
 * acuan folder 'format laporan' (UP Taman Margasatwa Ragunan - DKI Jakarta).
 */
import { formatRp, safeString, formatTanggalTtd } from './formatters';

const getHeaderStyles = () => `
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #777; padding: 4px 6px; vertical-align: middle; }
    .title-main { font-size: 14px; font-weight: bold; text-align: center; border: none; }
    .title-sub { font-size: 12px; font-weight: bold; text-align: center; border: none; }
    .title-left { font-size: 12px; font-weight: bold; text-align: left; border: none; }
    .th-green { background-color: #2e7d32; color: #ffffff; font-weight: bold; text-align: center; }
    .th-blue { background-color: #1976d2; color: #ffffff; font-weight: bold; text-align: center; }
    .th-amber { background-color: #f59e0b; color: #ffffff; font-weight: bold; text-align: center; }
    .th-gray { background-color: #e5e7eb; color: #111827; font-weight: bold; text-align: center; }
    .num { text-align: right; }
    .center { text-align: center; }
    .total-row { font-weight: bold; background-color: #d1fae5; }
    .libur-satwa { background-color: #fee2e2; color: #991b1b; font-style: italic; }
    .weekend { background-color: #fef3c7; }
  </style>
`;

const triggerDownload = (html, filename) => {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const renderSignatures = (signatures = {}, reportDateStr = '') => {
  const tglTtd = formatTanggalTtd(reportDateStr || new Date().toISOString().substring(0, 10));
  return `
    <table style="border:none; margin-top:20px;">
      <tr style="border:none;">
        <td colspan="4" style="border:none;"></td>
        <td colspan="4" style="border:none; text-align:center; font-size:11px;">Jakarta, ${tglTtd}</td>
      </tr>
      <tr style="border:none;">
        <td colspan="4" style="border:none; text-align:center; font-weight:bold; font-size:11px;">${safeString(signatures.rightRole || 'Kasatpel Pelayanan & Informasi')}</td>
        <td colspan="4" style="border:none; text-align:center; font-weight:bold; font-size:11px;">${safeString(signatures.leftRole || 'Bendahara Penerimaan')}</td>
      </tr>
      <tr style="border:none; height:50px;">
        <td colspan="4" style="border:none;"></td>
        <td colspan="4" style="border:none;"></td>
      </tr>
      <tr style="border:none;">
        <td colspan="4" style="border:none; text-align:center; font-weight:bold; text-decoration:underline;">${safeString(signatures.rightName || 'PIMPINAN')}</td>
        <td colspan="4" style="border:none; text-align:center; font-weight:bold; text-decoration:underline;">${safeString(signatures.leftName || 'BENDAHARA')}</td>
      </tr>
      <tr style="border:none;">
        <td colspan="4" style="border:none; text-align:center;">NIP. ${safeString(signatures.rightNip || '-')}</td>
        <td colspan="4" style="border:none; text-align:center;">NIP. ${safeString(signatures.leftNip || '-')}</td>
      </tr>
    </table>
  `;
};

// =========================================================================
// 1. Ekspor Data Pengunjung & Kendaraan TMR (DATA PENGUNJUNG 2026.xls)
// =========================================================================
export const exportPengunjungTmrExcel = (data, signatures) => {
  const { year, monthName, rows, totals } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="12" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="12" class="title-sub">DATA PENGUNJUNG DAN KENDARAAN TAHUN ${year}</th></tr>
      <tr><th colspan="12" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="12" style="border:none; height:10px;"></th></tr>
      <tr>
        <th rowspan="2" class="th-green">Tanggal</th>
        <th rowspan="2" class="th-green">Hari</th>
        <th colspan="3" class="th-green">Pengunjung (Orang)</th>
        <th rowspan="2" class="th-green">Total Pengunjung</th>
        <th colspan="5" class="th-blue">Kendaraan (Unit)</th>
        <th rowspan="2" class="th-blue">Total Kendaraan</th>
        <th rowspan="2" class="th-amber">Total Pendapatan (Rp)</th>
      </tr>
      <tr>
        <th class="th-green">Dewasa</th>
        <th class="th-green">Anak</th>
        <th class="th-green">Rombongan</th>
        <th class="th-blue">Motor</th>
        <th class="th-blue">Mobil (Gol III)</th>
        <th class="th-blue">Gol II (Bus Sedang)</th>
        <th class="th-blue">Gol I (Bus Besar)</th>
        <th class="th-blue">Sepeda</th>
      </tr>`;

  rows.forEach(r => {
    const rowClass = r.isMonday && r.totalRp === 0 ? 'libur-satwa' : r.isWeekend ? 'weekend' : '';
    html += `<tr class="${rowClass}">
      <td class="center">${r.day}</td>
      <td class="center">${r.dayName}</td>
      <td class="num">${r.dewasaQty || ''}</td>
      <td class="num">${r.anakQty || ''}</td>
      <td class="num">${r.rombQty || ''}</td>
      <td class="num font-bold">${r.totalPengunjung || ''}</td>
      <td class="num">${r.motorQty || ''}</td>
      <td class="num">${r.mobilQty || ''}</td>
      <td class="num">${r.gol2Qty || ''}</td>
      <td class="num">${r.gol1Qty || ''}</td>
      <td class="num">${r.sepedaQty || ''}</td>
      <td class="num font-bold">${r.totalKendaraan || ''}</td>
      <td class="num font-bold">${r.totalRp > 0 ? formatRp(r.totalRp) : (r.keterangan || '')}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="2" class="center font-bold">JUMLAH</td>
    <td class="num font-bold">${totals.dewasaQty}</td>
    <td class="num font-bold">${totals.anakQty}</td>
    <td class="num font-bold">${totals.rombQty}</td>
    <td class="num font-bold">${totals.grandPengunjung}</td>
    <td class="num font-bold">${totals.motorQty}</td>
    <td class="num font-bold">${totals.mobilQty}</td>
    <td class="num font-bold">${totals.gol2Qty}</td>
    <td class="num font-bold">${totals.gol1Qty}</td>
    <td class="num font-bold">${totals.sepedaQty}</td>
    <td class="num font-bold">${totals.grandKendaraan}</td>
    <td class="num font-bold">${formatRp(totals.grandTotalRp)}</td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `DATA PENGUNJUNG ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 2. Ekspor Pusat Primata Schmutzer (DATA PENGUNJUNG PPS 2026.xls)
// =========================================================================
export const exportPusatPrimataExcel = (data, signatures) => {
  const { year, monthName, rows, totals } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="7" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="7" class="title-sub">DATA PENGUNJUNG DAN REALISASI PENDAPATAN PUSAT PRIMATA SCHMUTZER</th></tr>
      <tr><th colspan="7" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="7" style="border:none; height:10px;"></th></tr>
      <tr>
        <th rowspan="2" class="th-green">Tanggal</th>
        <th rowspan="2" class="th-green">Hari</th>
        <th colspan="3" class="th-green">Jumlah Pengunjung (Orang)</th>
        <th rowspan="2" class="th-green">Total Pengunjung</th>
        <th rowspan="2" class="th-amber">Realisasi Pendapatan (Rp)</th>
      </tr>
      <tr>
        <th class="th-green">Dewasa</th>
        <th class="th-green">Anak</th>
        <th class="th-green">Rombongan</th>
      </tr>`;

  rows.forEach(r => {
    const rowClass = r.isMonday && r.totalRp === 0 ? 'libur-satwa' : r.isWeekend ? 'weekend' : '';
    html += `<tr class="${rowClass}">
      <td class="center">${r.day}</td>
      <td class="center">${r.dayName}</td>
      <td class="num">${r.dewasaQty || ''}</td>
      <td class="num">${r.anakQty || ''}</td>
      <td class="num">${r.rombQty || ''}</td>
      <td class="num font-bold">${r.totalQty || ''}</td>
      <td class="num font-bold">${r.totalRp > 0 ? formatRp(r.totalRp) : (r.isMonday ? 'Libur Satwa' : '')}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="2" class="center font-bold">TOTAL</td>
    <td class="num font-bold">${totals.dewasaQty}</td>
    <td class="num font-bold">${totals.anakQty}</td>
    <td class="num font-bold">${totals.rombQty}</td>
    <td class="num font-bold">${totals.grandTotalQty}</td>
    <td class="num font-bold">${formatRp(totals.grandTotalRp)}</td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `DATA PENGUNJUNG PPS ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 3. Ekspor Taman Satwa Anak (DATA PENGUNJUNG TSA 2026.xls)
// =========================================================================
export const exportTamanSatwaAnakExcel = (data, signatures) => {
  const { year, monthName, rows, totals } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="8" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="8" class="title-sub">DATA PENGUNJUNG DAN PENDAPATAN TAMAN SATWA ANAK</th></tr>
      <tr><th colspan="8" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="8" style="border:none; height:10px;"></th></tr>
      <tr>
        <th rowspan="2" class="th-green">Tanggal</th>
        <th rowspan="2" class="th-green">Hari</th>
        <th colspan="4" class="th-green">Rincian Pengunjung & Wahana (Orang)</th>
        <th rowspan="2" class="th-green">Total Pengunjung</th>
        <th rowspan="2" class="th-amber">Total Pendapatan (Rp)</th>
      </tr>
      <tr>
        <th class="th-green">Tiket Masuk TSA</th>
        <th class="th-green">Kuda Tunggang</th>
        <th class="th-green">Unta Tunggang</th>
        <th class="th-green">Gajah Tunggang</th>
      </tr>`;

  rows.forEach(r => {
    const rowClass = r.isMonday && r.totalRp === 0 ? 'libur-satwa' : r.isWeekend ? 'weekend' : '';
    html += `<tr class="${rowClass}">
      <td class="center">${r.day}</td>
      <td class="center">${r.dayName}</td>
      <td class="num">${r.tsaQty || ''}</td>
      <td class="num">${r.kudaQty || ''}</td>
      <td class="num">${r.untaQty || ''}</td>
      <td class="num">${r.gajahQty || ''}</td>
      <td class="num font-bold">${r.totalQty || ''}</td>
      <td class="num font-bold">${r.totalRp > 0 ? formatRp(r.totalRp) : (r.isMonday ? 'Libur Satwa' : '')}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="2" class="center font-bold">TOTAL</td>
    <td class="num font-bold">${totals.tsaQty}</td>
    <td class="num font-bold">${totals.kudaQty}</td>
    <td class="num font-bold">${totals.untaQty}</td>
    <td class="num font-bold">${totals.gajahQty}</td>
    <td class="num font-bold">${totals.grandTotalQty}</td>
    <td class="num font-bold">${formatRp(totals.grandTotalRp)}</td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `DATA PENGUNJUNG TSA ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 4. Ekspor Rekap E-Ticketing (INPUT E-TICKETING 2026.xls)
// =========================================================================
export const exportEticketingExcel = (data, signatures) => {
  const { year, monthName, rows, totals } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="11" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="11" class="title-sub">REKAPITULASI PENDAPATAN E-TICKETING & ASURANSI</th></tr>
      <tr><th colspan="11" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="11" style="border:none; height:10px;"></th></tr>
      <tr>
        <th class="th-green">Tgl</th>
        <th class="th-green">Hari</th>
        <th class="th-green">Dewasa (Rp)</th>
        <th class="th-green">Anak (Rp)</th>
        <th class="th-green">Rombongan (Rp)</th>
        <th class="th-green">PPS Schmutzer (Rp)</th>
        <th class="th-green">TSA Satwa Anak (Rp)</th>
        <th class="th-green">Wahana Tunggang (Rp)</th>
        <th class="th-green">Kendaraan (Rp)</th>
        <th class="th-blue">Asuransi (Lembar)</th>
        <th class="th-amber">Total Pendapatan (Rp)</th>
      </tr>`;

  rows.forEach(r => {
    html += `<tr>
      <td class="center">${r.day}</td>
      <td class="center">${r.dayName}</td>
      <td class="num">${r.dewasa > 0 ? formatRp(r.dewasa) : ''}</td>
      <td class="num">${r.anak > 0 ? formatRp(r.anak) : ''}</td>
      <td class="num">${r.rombongan > 0 ? formatRp(r.rombongan) : ''}</td>
      <td class="num">${r.pps > 0 ? formatRp(r.pps) : ''}</td>
      <td class="num">${r.tsa > 0 ? formatRp(r.tsa) : ''}</td>
      <td class="num">${r.wahana > 0 ? formatRp(r.wahana) : ''}</td>
      <td class="num">${r.kendaraan > 0 ? formatRp(r.kendaraan) : ''}</td>
      <td class="num font-bold">${r.asuransiLembar > 0 ? r.asuransiLembar : ''}</td>
      <td class="num font-bold">${r.total > 0 ? formatRp(r.total) : ''}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="2" class="center font-bold">TOTAL</td>
    <td class="num font-bold">${formatRp(totals.dewasa)}</td>
    <td class="num font-bold">${formatRp(totals.anak)}</td>
    <td class="num font-bold">${formatRp(totals.rombongan)}</td>
    <td class="num font-bold">${formatRp(totals.pps)}</td>
    <td class="num font-bold">${formatRp(totals.tsa)}</td>
    <td class="num font-bold">${formatRp(totals.wahana)}</td>
    <td class="num font-bold">${formatRp(totals.kendaraan)}</td>
    <td class="num font-bold">${totals.asuransiLembar}</td>
    <td class="num font-bold">${formatRp(totals.grandTotal)}</td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `INPUT E-TICKETING ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 5. Ekspor Rekap Pendapatan per Pintu Masuk / Gate (INPUT NEW GATE 2026.xlsx)
// =========================================================================
export const exportGateRevenueExcel = (data, signatures) => {
  const { year, monthName, rows, totals } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="9" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="9" class="title-sub">REKAPITULASI PENDAPATAN PER GERBANG / PINTU MASUK</th></tr>
      <tr><th colspan="9" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="9" style="border:none; height:10px;"></th></tr>
      <tr>
        <th class="th-green">Tgl</th>
        <th class="th-green">Hari</th>
        <th class="th-green">Pintu Utama / Gate Utama (Rp)</th>
        <th class="th-green">Pintu Barat (Rp)</th>
        <th class="th-green">Pintu Timur (Rp)</th>
        <th class="th-green">Pintu Utara (Rp)</th>
        <th class="th-blue">Ticket Online (Rp)</th>
        <th class="th-blue">Vending Machine / TVM (Rp)</th>
        <th class="th-amber">Total Pendapatan (Rp)</th>
      </tr>`;

  rows.forEach(r => {
    html += `<tr>
      <td class="center">${r.day}</td>
      <td class="center">${r.dayName}</td>
      <td class="num">${r.pintuUtama > 0 ? formatRp(r.pintuUtama) : ''}</td>
      <td class="num">${r.pintuBarat > 0 ? formatRp(r.pintuBarat) : ''}</td>
      <td class="num">${r.pintuTimur > 0 ? formatRp(r.pintuTimur) : ''}</td>
      <td class="num">${r.pintuUtara > 0 ? formatRp(r.pintuUtara) : ''}</td>
      <td class="num">${r.online > 0 ? formatRp(r.online) : ''}</td>
      <td class="num">${r.tvm > 0 ? formatRp(r.tvm) : ''}</td>
      <td class="num font-bold">${r.total > 0 ? formatRp(r.total) : ''}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="2" class="center font-bold">TOTAL</td>
    <td class="num font-bold">${formatRp(totals.pintuUtama)}</td>
    <td class="num font-bold">${formatRp(totals.pintuBarat)}</td>
    <td class="num font-bold">${formatRp(totals.pintuTimur)}</td>
    <td class="num font-bold">${formatRp(totals.pintuUtara)}</td>
    <td class="num font-bold">${formatRp(totals.online)}</td>
    <td class="num font-bold">${formatRp(totals.tvm)}</td>
    <td class="num font-bold">${formatRp(totals.grandTotal)}</td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `INPUT NEW GATE ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 6. Ekspor Rekap STSU Kas Daerah / Jagir (REKAP STSU PENDAPATAN 2026.xls)
// =========================================================================
export const exportStsuKasDaerahExcel = (data, signatures) => {
  const { year, monthName, rows, totalJagir } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="6" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="6" class="title-sub">DINAS PERTAMANAN DAN HUTAN KOTA PROVINSI DKI JAKARTA</th></tr>
      <tr><th colspan="6" class="title-sub">REKAPITULASI STSU PENDAPATAN KAS DAERAH (JAGIR) BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="6" style="border:none; height:10px;"></th></tr>
      <tr>
        <th class="th-green">No</th>
        <th class="th-green">Hari</th>
        <th class="th-green">Tanggal</th>
        <th class="th-green">Nomor STSU</th>
        <th class="th-amber">Pendapatan Retribusi / Jagir (Rp)</th>
        <th class="th-blue">Kumulatif Setoran (Rp)</th>
      </tr>`;

  rows.forEach(r => {
    html += `<tr>
      <td class="center">${r.day}</td>
      <td class="center">${r.dayName}</td>
      <td class="center">${r.dateStr}</td>
      <td class="center font-medium">${r.stsuNo}</td>
      <td class="num font-bold">${r.nominalJagir > 0 ? formatRp(r.nominalJagir) : (r.keterangan || '')}</td>
      <td class="num font-bold">${r.kumulatif > 0 ? formatRp(r.kumulatif) : ''}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="4" class="center font-bold">TOTAL PENERIMAAN STSU BULAN ${monthName.toUpperCase()}</td>
    <td class="num font-bold">${formatRp(totalJagir)}</td>
    <td class="num font-bold">${formatRp(totalJagir)}</td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `REKAP STSU PENDAPATAN ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 7. Ekspor Rekap Pemakaian Tempat & Fasilitas (REKAP PEMAKAIAN TEMPAT 2026.xlsx)
// =========================================================================
export const exportPemakaianTempatExcel = (data, signatures) => {
  const { year, monthName, rows, totalNominal } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="7" class="title-main">DINAS PERTAMANAN DAN HUTAN KOTA PROVINSI DKI JAKARTA</th></tr>
      <tr><th colspan="7" class="title-sub">REKAPITULASI PEMAKAIAN TEMPAT DAN FASILITAS TMR</th></tr>
      <tr><th colspan="7" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="7" style="border:none; height:10px;"></th></tr>
      <tr>
        <th class="th-green">No</th>
        <th class="th-green">Tanggal Transfer / STSU</th>
        <th class="th-green">Nama / Instansi Penyewa</th>
        <th class="th-green">Tanggal Pemakaian</th>
        <th class="th-green">Jenis Fasilitas / Lokasi</th>
        <th class="th-amber">Pendapatan (Rp)</th>
        <th class="th-green">Keterangan</th>
      </tr>`;

  if (rows.length === 0) {
    html += `<tr><td colspan="7" class="center" style="padding:15px; color:#666;">Belum ada data pemakaian tempat / fasilitas pada bulan ini.</td></tr>`;
  } else {
    rows.forEach(r => {
      html += `<tr>
        <td class="center">${r.no}</td>
        <td class="center">${r.tglBayar}</td>
        <td>${safeString(r.penyewa)}</td>
        <td class="center">${r.tglPakai}</td>
        <td>${safeString(r.jenisFasilitas)}</td>
        <td class="num font-bold">${formatRp(r.nominal)}</td>
        <td>${safeString(r.keterangan)}</td>
      </tr>`;
    });
  }

  html += `<tr class="total-row">
    <td colspan="5" class="center font-bold">TOTAL PENDAPATAN SEWA TEMPAT</td>
    <td class="num font-bold">${formatRp(totalNominal)}</td>
    <td></td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `REKAP PEMAKAIAN TEMPAT ${year} - ${monthName.toUpperCase()}.xls`);
};

// =========================================================================
// 8. Ekspor Rekap Promosi & Media (REKAP PROMO 2026.xlsx)
// =========================================================================
export const exportPromoMediaExcel = (data, signatures) => {
  const { year, monthName, rows, totalNominal } = data;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>${getHeaderStyles()}</head>
  <body>
    <table>
      <tr><th colspan="8" class="title-main">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>
      <tr><th colspan="8" class="title-sub">DINAS PERTAMANAN DAN HUTAN KOTA PROVINSI DKI JAKARTA</th></tr>
      <tr><th colspan="8" class="title-sub">REKAPITULASI PROMOSI PENJUALAN PRODUK & MEDIA LUAR RUANG</th></tr>
      <tr><th colspan="8" class="title-sub">BULAN ${monthName.toUpperCase()} ${year}</th></tr>
      <tr><th colspan="8" style="border:none; height:10px;"></th></tr>
      <tr>
        <th class="th-green">No</th>
        <th class="th-green">Tanggal Transfer / STSU</th>
        <th class="th-green">Nama Perusahaan / Mitra</th>
        <th class="th-green">Produk / Brand</th>
        <th class="th-green">Tanggal Event / Periode</th>
        <th class="th-green">Bentuk Promosi / Media</th>
        <th class="th-amber">Harga / Pendapatan (Rp)</th>
        <th class="th-green">Keterangan</th>
      </tr>`;

  if (rows.length === 0) {
    html += `<tr><td colspan="8" class="center" style="padding:15px; color:#666;">Belum ada data promosi / banner pada bulan ini.</td></tr>`;
  } else {
    rows.forEach(r => {
      html += `<tr>
        <td class="center">${r.no}</td>
        <td class="center">${r.tglTransfer}</td>
        <td>${safeString(r.perusahaan)}</td>
        <td>${safeString(r.produk)}</td>
        <td class="center">${r.tglEvent}</td>
        <td>${safeString(r.media)}</td>
        <td class="num font-bold">${formatRp(r.nominal)}</td>
        <td>${safeString(r.keterangan)}</td>
      </tr>`;
    });
  }

  html += `<tr class="total-row">
    <td colspan="6" class="center font-bold">TOTAL PENDAPATAN PROMOSI & BANNER</td>
    <td class="num font-bold">${formatRp(totalNominal)}</td>
    <td></td>
  </tr></table>`;

  html += renderSignatures(signatures);
  html += `</body></html>`;

  triggerDownload(html, `REKAP PROMO ${year} - ${monthName.toUpperCase()}.xls`);
};
