import React, { useState, useMemo } from 'react';
import {
  Printer,
  Layers,
  Tag,
  Building,
  CreditCard,
  Ticket,
  Info
} from 'lucide-react';
import {
  formatRp,
  terbilang,
  formatTanggalCetak,
  getActiveItemKey
} from '../../utils/formatters';

// 21 Baris Standar STSU Hasil Retribusi Tiket & Parkir
const STSU_ITEMS_DEF = [
  // 1-16: Retribusi Rekreasi
  { no: 1, name: 'Dewasa', group: 'rekreasi', rate: 4000 },
  { no: 2, name: 'Anak', group: 'rekreasi', rate: 3000 },
  { no: 3, name: 'Rombongan Dewasa Reduksi 25%', group: 'rekreasi', rate: 3000 },
  { no: 4, name: 'Rombongan Anak Reduksi 25%', group: 'rekreasi', rate: 2250 },
  { no: 5, name: 'Kuda Tunggang', group: 'rekreasi', rate: 5000 },
  { no: 6, name: 'Unta Tunggang', group: 'rekreasi', rate: 7500 },
  { no: 7, name: 'Gajah Tunggang', group: 'rekreasi', rate: 10000 },
  { no: 8, name: 'Taman Satwa Anak', group: 'rekreasi', rate: 2500 },
  { no: 9, name: "Hari Selasa-Jum'at Pst Primata-Dewasa", group: 'rekreasi', rate: 6000 },
  { no: 10, name: "Hari Selasa-Jum'at Pst Primata-Anak", group: 'rekreasi', rate: 6000 },
  { no: 11, name: "Hari Selasa-Jum'at Pst Primata-Romb Dws Reduksi 25%", group: 'rekreasi', rate: 4500 },
  { no: 12, name: "Hari Selasa-Jum'at Pst Primata-Romb Anak Reduksi 25%", group: 'rekreasi', rate: 4500 },
  { no: 13, name: 'Hari Sabtu-Minggu/Besar Pst Primata-Dewasa', group: 'rekreasi', rate: 7500 },
  { no: 14, name: 'Hari Sabtu-Minggu/Besar Pst Primata-Anak', group: 'rekreasi', rate: 7500 },
  { no: 15, name: 'Hari Sabtu-Minggu/Besar Pst Primata-Romb Anak Reduksi 25%', group: 'rekreasi', rate: 5625 },
  { no: 16, name: 'Hari Sabtu-Minggu/Besar Pst Primata-Romb Dws Reduksi 25%', group: 'rekreasi', rate: 5625 },
  // 17-21: Retribusi Parkir
  { no: 17, name: 'Golongan I (Bus Besar, Truk Besar, dan Mobil Box Besar)', group: 'parkir', rate: 15000 },
  { no: 18, name: 'Golongan II (Bus Kecil, Truk Kecil, Mobil Box Kecil dan Pick Up Besar)', group: 'parkir', rate: 12500 },
  { no: 19, name: 'Golongan III (Mobil, Sedan Minibus/Sejenis, Pick up Kecil)', group: 'parkir', rate: 6000 },
  { no: 20, name: 'Sepeda Motor dan Kendaraan Roda Tiga', group: 'parkir', rate: 3000 },
  { no: 21, name: 'Sepeda', group: 'parkir', rate: 1000 }
];

/**
 * Mencocokkan kategori dari daftar categories berdasarkan channel yang dipilih
 */
const isCategoryMatchChannel = (catName = '', selectedChannel = '') => {
  const lower = String(catName || '').toLowerCase();
  if (selectedChannel === 'GATE') {
    return /new\s*gate/i.test(lower);
  }
  if (selectedChannel === 'TVM') {
    return /tvm|vending|vinding/i.test(lower);
  }
  if (selectedChannel === 'MERCHANT_PAGE') {
    return /online|merchant/i.test(lower);
  }
  if (selectedChannel === 'OLD_GATE') {
    return /old\s*gate|iwm/i.test(lower);
  }
  return false;
};

/**
 * Mencocokkan nama sub-item ke nomor urut baris STSU (1 s/d 21)
 */
const matchItemToStsuRowNo = (itemName = '', itemNote = '', isWeekend = false) => {
  const norm = `${itemName} ${itemNote}`
    .toLowerCase()
    .replace(/sepededa/g, 'sepeda')
    .replace(/gol iii/g, 'gol 3')
    .replace(/gol ii\b/g, 'gol 2')
    .replace(/gol i\b/g, 'gol 1');

  if (/kuda/i.test(norm)) return 5;
  if (/unta/i.test(norm)) return 6;
  if (/gajah/i.test(norm)) return 7;
  if (/taman\s*satwa|satwa\s*anak|\btsa\b|children/i.test(norm)) return 8;
  if (/motor/i.test(norm)) return 20;
  if (/sepeda/i.test(norm)) return 21;
  if (/gol\s*3|golongan\s*3|golongan\s*iii|mobil/i.test(norm)) return 19;
  if (/gol\s*2|golongan\s*2|golongan\s*ii\b|bus\s*kecil/i.test(norm)) return 18;
  if (/gol\s*1|golongan\s*1|golongan\s*i\b|bus\s*besar/i.test(norm)) return 17;

  const isPrimata = /primata|schmutzer/i.test(norm);
  const isRomb = /romb/i.test(norm);
  const isAnak = /anak|3-12/i.test(norm);
  const isDewasa = /dewasa/i.test(norm);

  if (isPrimata) {
    const isExplicitLibur = /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(norm);
    const isExplicitBiasa = /wd|weekday|biasa|selasa|rabu|kamis|jumat|jum'at/i.test(norm);
    const libur = isExplicitLibur ? true : isExplicitBiasa ? false : isWeekend;

    if (isRomb) {
      if (libur) return isAnak ? 15 : 16;
      return isAnak ? 12 : 11;
    } else {
      if (libur) return isAnak ? 14 : 13;
      return isAnak ? 10 : 9;
    }
  }

  if (isRomb) {
    return isAnak ? 4 : 3;
  }

  if (isAnak) return 2;
  if (isDewasa) return 1;

  return null;
};

export default function FormatRekonChannelReport({
  reportDate = '',
  currentReport = {},
  allReports = {},
  categories = [],
  signatures = {}
}) {
  // Channel Tab: 'GATE' | 'TVM' | 'MERCHANT_PAGE' | 'OLD_GATE' | 'ROMBONGAN'
  const [selectedChannel, setSelectedChannel] = useState('GATE');

  const dayData = allReports[reportDate] || {};
  const isWeekend = useMemo(() => {
    if (!reportDate) return false;
    const dt = new Date(reportDate);
    return dt.getDay() === 0 || dt.getDay() === 6;
  }, [reportDate]);

  // Hanya gunakan metadata 3A & IWM asli yang sudah ditarik pada tanggal tersebut (tanpa data dummy)
  const rekon3a = dayData.rekon3aSummary || null;
  const rekonIwm = dayData.rekonIwmSettlement || null;

  // Data Rombongan IWM: Ambil dari hasil tarik bot IWM pada tanggal tersebut,
  // atau dari item Rombongan yang sudah diinput pada kategori Old Gate di tanggal tersebut
  const rombonganData = useMemo(() => {
    if (Array.isArray(dayData.rekonIwmRombongan) && dayData.rekonIwmRombongan.length > 0) {
      return dayData.rekonIwmRombongan;
    }

    // Cek apakah ada item rombongan diinput pada kategori Old Gate di tanggal ini
    const fallbackRows = [];
    const [yr, mo, dy] = (reportDate || '').split('-');
    const tglStr = dy && mo && yr ? `${dy}-${mo}-${yr}` : reportDate;

    Object.keys(dayData).forEach((tKey) => {
      const docData = dayData[tKey];
      if (!docData || !docData.formData || !Array.isArray(docData.activeItems)) return;
      docData.activeItems.forEach((ai) => {
        const cat = categories.find((c) => c.id === ai.catId);
        if (!cat || !isCategoryMatchChannel(cat.name, 'OLD_GATE')) return;

        const catItem = cat.items?.find((i) => i.id === (ai.itemId || ai.id));
        const itemName = catItem ? catItem.name : (ai.itemName || ai.name || '');
        if (!/romb/i.test(itemName)) return;

        const itemKey = getActiveItemKey(
          ai.catId,
          ai.itemId || ai.id,
          ai.isSusulan,
          ai.validDate,
          ai.itemDate,
          ai.itemNote
        );
        const nominal = Number(docData.formData[itemKey] || docData.formData[`${ai.catId}_${ai.itemId || ai.id}`] || 0);
        if (nominal <= 0) return;

        const isPrimata = /primata|schmutzer/i.test(itemName);
        const isAnak = /anak|3-12/i.test(itemName);
        const rate = isPrimata ? (isWeekend ? 5625 : 4500) : (isAnak ? 2250 : 3000);
        const qty = Math.round(nominal / rate);

        fallbackRows.push({
          no: fallbackRows.length + 1,
          lokasi: isPrimata ? 'Pusat Primata' : 'Pintu Masuk',
          pos: 'POS Utama',
          kode_rombongan: '-',
          nama_rombongan: ai.itemNote || itemName,
          tgl_kunjungan: tglStr,
          terdaftar_anak: isAnak ? qty : 0,
          terdaftar_dewasa: isAnak ? 0 : qty,
          masuk_anak: isAnak ? qty : 0,
          masuk_dewasa: isAnak ? 0 : qty,
          pendapatan_rp: nominal
        });
      });
    });

    return fallbackRows;
  }, [dayData, categories, reportDate, isWeekend]);

  // Hitung Nilai STSU per Baris sesuai data nyata pada reportDate & selectedChannel
  const channelStsuData = useMemo(() => {
    const stsu = {};
    for (let i = 1; i <= 21; i++) {
      stsu[i] = { qty: 0, nominal: 0 };
    }

    if (selectedChannel === 'ROMBONGAN') return stsu;

    Object.keys(dayData).forEach((tKey) => {
      const docData = dayData[tKey];
      if (!docData || !docData.formData || !Array.isArray(docData.activeItems)) return;

      docData.activeItems.forEach((ai) => {
        const cat = categories.find((c) => c.id === ai.catId);
        if (!cat || !isCategoryMatchChannel(cat.name, selectedChannel)) return;

        const catItem = cat.items?.find((i) => i.id === (ai.itemId || ai.id));
        const itemName = catItem ? catItem.name : (ai.itemName || ai.name || '');
        const itemNote = ai.itemNote || '';

        const itemKey = getActiveItemKey(
          ai.catId,
          ai.itemId || ai.id,
          ai.isSusulan,
          ai.validDate,
          ai.itemDate,
          ai.itemNote
        );

        const nominal = Number(
          docData.formData[itemKey] ||
          docData.formData[`${ai.catId}_${ai.itemId || ai.id}`] ||
          docData.formData[ai.catId] ||
          0
        );
        if (nominal <= 0) return;

        const rowNo = matchItemToStsuRowNo(itemName, itemNote, isWeekend);
        if (rowNo && stsu[rowNo]) {
          const def = STSU_ITEMS_DEF[rowNo - 1];
          stsu[rowNo].nominal += nominal;
          stsu[rowNo].qty = def.rate > 0 ? Math.round(stsu[rowNo].nominal / def.rate) : 0;
        }
      });
    });

    return stsu;
  }, [dayData, categories, selectedChannel, isWeekend]);

  const channelTotalNominal = useMemo(() => {
    return Object.values(channelStsuData).reduce((sum, item) => sum + (item.nominal || 0), 0);
  }, [channelStsuData]);

  const channelDisplayName = useMemo(() => {
    switch (selectedChannel) {
      case 'GATE': return 'NEW GATE';
      case 'TVM': return 'TICKET VENDING MACHINE';
      case 'MERCHANT_PAGE': return 'TIKET ONLINE';
      case 'OLD_GATE': return 'OLD GATE';
      default: return 'DATA PENGUNJUNG ROMBONGAN';
    }
  }, [selectedChannel]);

  const channelSummaryData = useMemo(() => {
    if (!rekon3a) return null;
    if (selectedChannel === 'GATE') return rekon3a.GATE || null;
    if (selectedChannel === 'TVM') return rekon3a.TVM || null;
    if (selectedChannel === 'MERCHANT_PAGE') return rekon3a.MERCHANT_PAGE || null;
    return null;
  }, [selectedChannel, rekon3a]);

  // Format Nomor STSU
  const [y, m, d] = (reportDate || '').split('-');
  const seqStr = currentReport?.sequence ? `${currentReport.sequence}` : '      ';
  const computedStsuNo = d && m && y ? `${seqStr}/${d}/${m}/SU/${y}` : '';

  // Detail Baris Rekonsiliasi untuk Tabel Lembar 2
  const rekonRows = useMemo(() => {
    const list = [];
    let no = 1;
    for (let i = 1; i <= 21; i++) {
      const it = STSU_ITEMS_DEF[i - 1];
      const dat = channelStsuData[i];
      if (dat && dat.nominal > 0) {
        const area = (i >= 9 && i <= 16)
          ? 'Pusat Primata Schmutzer'
          : (i === 8)
          ? 'Children Zoo (TSA)'
          : (i >= 17)
          ? 'Kawasan Parkir'
          : 'Pintu Masuk';
        list.push({
          no: no++,
          area,
          uraian: it.name,
          qty: dat.qty,
          nominal: dat.nominal
        });
      }
    }
    return list;
  }, [channelStsuData]);

  const totalQtyAll = rekonRows.reduce((s, r) => s + r.qty, 0);
  const isChannelEmpty = selectedChannel === 'ROMBONGAN'
    ? rombonganData.length === 0
    : channelTotalNominal === 0;

  return (
    <div className="w-full">
      {/* 🧭 NAVIGATION BAR CHANNEL (NO-PRINT) */}
      <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
            <Ticket size={20} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-gray-800">
              Format STSU & Bukti Rekonsiliasi Per Channel (2 Lembar)
            </h4>
            <p className="text-xs text-gray-500 font-medium">
              Sesuai format PDF bot 3A & IWM: Lembar 1 STSU Resmi (Portrait) & Lembar 2 Bukti Rekon K-2 (Landscape)
            </p>
          </div>
        </div>

        {/* Action Button Print */}
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-sm shrink-0"
        >
          <Printer size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* CHANNEL SELECTOR PILLS (NO-PRINT) */}
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button
          type="button"
          onClick={() => setSelectedChannel('GATE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            selectedChannel === 'GATE'
              ? 'bg-blue-600 text-white shadow-md scale-102'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
          }`}
        >
          <CreditCard size={15} /> 3A: NEW GATE (2 Lembar)
        </button>

        <button
          type="button"
          onClick={() => setSelectedChannel('TVM')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            selectedChannel === 'TVM'
              ? 'bg-indigo-600 text-white shadow-md scale-102'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-indigo-50'
          }`}
        >
          <Ticket size={15} /> 3A: VENDING TVM (2 Lembar)
        </button>

        <button
          type="button"
          onClick={() => setSelectedChannel('MERCHANT_PAGE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            selectedChannel === 'MERCHANT_PAGE'
              ? 'bg-cyan-600 text-white shadow-md scale-102'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-cyan-50'
          }`}
        >
          <Layers size={15} /> 3A: TIKET ONLINE (2 Lembar)
        </button>

        <button
          type="button"
          onClick={() => setSelectedChannel('OLD_GATE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            selectedChannel === 'OLD_GATE'
              ? 'bg-purple-600 text-white shadow-md scale-102'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-purple-50'
          }`}
        >
          <Building size={15} /> IWM: OLD GATE (2 Lembar)
        </button>

        <button
          type="button"
          onClick={() => setSelectedChannel('ROMBONGAN')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            selectedChannel === 'ROMBONGAN'
              ? 'bg-amber-600 text-white shadow-md scale-102'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-50'
          }`}
        >
          <Tag size={15} /> IWM: LAPORAN ROMBONGAN (11 Kolom)
        </button>
      </div>

      {/* INFO BANNER APABILA BELUM ADA DATA PADA TANGGAL TERSEBUT (NO-PRINT) */}
      {isChannelEmpty && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 text-xs font-semibold no-print">
          <Info size={18} className="text-amber-600 shrink-0" />
          <div>
            Belum ada data untuk <strong>{channelDisplayName}</strong> pada tanggal <strong>{formatTanggalCetak(reportDate)}</strong>. Silakan tarik data dari Bot {selectedChannel === 'OLD_GATE' || selectedChannel === 'ROMBONGAN' ? 'IWM' : '3A'} atau isi nominal pada menu <strong>Input</strong> terlebih dahulu.
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* KONDISI 1: JIKA MEMILIH LAPORAN ROMBONGAN IWM (11 KOLOM STANDAR)    */}
      {/* =================================================================== */}
      {selectedChannel === 'ROMBONGAN' ? (
        <div id="printable-area" className="bg-white p-6 sm:p-10 shadow-lg mx-auto border border-gray-200 text-black max-w-6xl print:max-w-none print:p-0 print:border-none print:shadow-none">
          <div className="text-center mb-6">
            <h2 className="font-extrabold text-lg uppercase tracking-wide">DATA PENGUNJUNG ROMBONGAN</h2>
            <h3 className="font-bold text-base uppercase">KANTOR PENGELOLA TAMAN MARGASATWA RAGUNAN</h3>
            <p className="text-xs text-gray-600 mt-1">
              TANGGAL : {d}-{m}-{y} s/d {d}-{m}-{y}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead className="bg-gray-100 text-black font-bold">
                <tr>
                  <th className="border border-black p-2 text-center w-8">No</th>
                  <th className="border border-black p-2 text-left">Lokasi</th>
                  <th className="border border-black p-2 text-center">POS</th>
                  <th className="border border-black p-2 text-center">Kode Rombongan</th>
                  <th className="border border-black p-2 text-left">Nama Rombongan</th>
                  <th className="border border-black p-2 text-center">Tanggal Kunjungan</th>
                  <th className="border border-black p-2 text-right">Jumlah Terdaftar Anak</th>
                  <th className="border border-black p-2 text-right">Jumlah Terdaftar Dewasa</th>
                  <th className="border border-black p-2 text-right">Jumlah Masuk Anak</th>
                  <th className="border border-black p-2 text-right">Jumlah Masuk Dewasa</th>
                  <th className="border border-black p-2 text-right">Pendapatan (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {rombonganData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-black p-6 text-center text-gray-500 italic">
                      Belum ada data pengunjung rombongan untuk tanggal {d}-{m}-{y}.
                    </td>
                  </tr>
                ) : (
                  rombonganData.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border border-black p-1.5 text-center">{r.no || (idx + 1)}</td>
                      <td className="border border-black p-1.5 text-left">{r.lokasi}</td>
                      <td className="border border-black p-1.5 text-center">{r.pos || 'POS 1 Utama'}</td>
                      <td className="border border-black p-1.5 text-center font-mono">{r.kode_rombongan || '-'}</td>
                      <td className="border border-black p-1.5 text-left font-semibold">{r.nama_rombongan}</td>
                      <td className="border border-black p-1.5 text-center">{r.tgl_kunjungan || `${d}-${m}-${y}`}</td>
                      <td className="border border-black p-1.5 text-right font-mono">{(r.terdaftar_anak ?? r.masuk_anak ?? 0).toLocaleString('id-ID')}</td>
                      <td className="border border-black p-1.5 text-right font-mono">{(r.terdaftar_dewasa ?? r.masuk_dewasa ?? 0).toLocaleString('id-ID')}</td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">{(r.masuk_anak || 0).toLocaleString('id-ID')}</td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">{(r.masuk_dewasa || 0).toLocaleString('id-ID')}</td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">
                        {formatRp(r.pendapatan_rp || 0)}
                      </td>
                    </tr>
                  ))
                )}
                {/* Baris Total */}
                <tr className="bg-gray-200 font-bold border-t-2 border-black text-black">
                  <td colSpan={6} className="border border-black p-2 text-center font-black">TOTAL</td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + (r.terdaftar_anak ?? r.masuk_anak ?? 0), 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + (r.terdaftar_dewasa ?? r.masuk_dewasa ?? 0), 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + (r.masuk_anak || 0), 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + (r.masuk_dewasa || 0), 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono font-black">
                    Rp {formatRp(rombonganData.reduce((s, r) => s + (r.pendapatan_rp || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-xs text-gray-500 italic">
            Tanggal Cetak : {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('id-ID')} WIB
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* KONDISI 2: FORMAT STSU (LEMBAR 1) & BUKTI REKON K-2 (LEMBAR 2)     */
        /* =================================================================== */
        <div id="printable-area" className="flex flex-col gap-10">
          
          {/* ================================================================= */}
          {/* 📄 LEMBAR 1: FORM STSU RESMI KEDINASAN (PORTRAIT A4)               */}
          {/* ================================================================= */}
          <div className="bg-white p-6 sm:p-10 shadow-lg mx-auto border border-gray-200 text-black max-w-[210mm] w-full min-h-[297mm] relative print:max-w-none print:p-0 print:border-none print:shadow-none print:min-h-0 page-break-after">
            {/* Header Dokumen */}
            <div className="flex justify-between items-start text-xs sm:text-sm font-bold tracking-tight">
              <div>
                <div>BLUD TAMAN MARGASATWA</div>
                <div>RAGUNAN PROV.DKI JAKARTA</div>
              </div>
              <div className="text-right">
                <div>SURAT TANDA SETOR UANG</div>
                <div>DASAR HASIL RETRIBUSI</div>
                <div className="text-blue-900 font-extrabold uppercase">{channelDisplayName}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center text-xs font-semibold">
              <span className="w-10">No</span>
              <span className="mx-1">:</span>
              <span className="font-mono">{computedStsuNo}</span>
            </div>

            <div className="my-2 border-t border-dashed border-black"></div>

            {/* Header Kolom */}
            <div className="grid grid-cols-12 text-xs font-bold py-1">
              <div className="col-span-1 text-center">NO</div>
              <div className="col-span-8 text-center">URAIAN</div>
              <div className="col-span-3 text-center">JUMLAH</div>
            </div>

            <div className="my-1 border-t border-dashed border-black"></div>

            {/* Bagian 1: Retribusi Pelayanan Tempat Rekreasi */}
            <div className="text-xs font-bold mt-2">4.1.02 Pendapatan Retribusi Daerah</div>
            <div className="text-xs font-bold pl-2 mb-1">
              4.1.02.02.009.00001 Retribusi Pelayanan Tempat Rekreasi, Pariwisata, dan Olahraga
            </div>

            <div className="text-xs space-y-1">
              {STSU_ITEMS_DEF.filter(it => it.group === 'rekreasi').map((it) => {
                const val = channelStsuData[it.no]?.nominal || 0;
                return (
                  <div key={it.no} className="grid grid-cols-12 py-0.5">
                    <div className="col-span-1 text-center font-mono">{it.no}.</div>
                    <div className="col-span-8 truncate pr-2">{it.name}</div>
                    <div className="col-span-3 flex justify-between font-mono">
                      <span>Rp.</span>
                      <span className="font-semibold">{val > 0 ? formatRp(val) : '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bagian 2: Retribusi Parkir */}
            <div className="text-xs font-bold pl-2 mt-3 mb-1">
              4.1.02.02.014.00001 Retribusi Penyediaan Tempat Khusus Parkir Di Luar Badan Jalan
            </div>

            <div className="text-xs space-y-1">
              {STSU_ITEMS_DEF.filter(it => it.group === 'parkir').map((it) => {
                const val = channelStsuData[it.no]?.nominal || 0;
                return (
                  <div key={it.no} className="grid grid-cols-12 py-0.5">
                    <div className="col-span-1 text-center font-mono">{it.no}.</div>
                    <div className="col-span-8 truncate pr-2">{it.name}</div>
                    <div className="col-span-3 flex justify-between font-mono">
                      <span>Rp.</span>
                      <span className="font-semibold">{val > 0 ? formatRp(val) : '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-2 border-t border-dashed border-black"></div>

            {/* Baris Total STSU */}
            <div className="grid grid-cols-12 text-xs font-bold py-1">
              <div className="col-span-1"></div>
              <div className="col-span-8 text-center font-extrabold">JUMLAH</div>
              <div className="col-span-3 flex justify-between font-mono font-black text-sm">
                <span>Rp.</span>
                <span>{channelTotalNominal > 0 ? formatRp(channelTotalNominal) : '-'}</span>
              </div>
            </div>

            <div className="my-1 border-t border-dashed border-black"></div>

            {/* Terbilang */}
            <div className="mt-3 text-xs italic">
              <span className="font-semibold not-italic">Terbilang : </span>
              {channelTotalNominal > 0 ? `${terbilang(channelTotalNominal)} rupiah.-` : 'Nol rupiah.-'}
            </div>

            {/* Tanda Tangan Resmi */}
            <div className="mt-10 grid grid-cols-2 text-center text-xs">
              <div>
                <div>Mengetahui,</div>
                <div className="font-semibold mt-1">Kepala Seksi Pelayanan dan Informasi</div>
                <div className="h-20"></div>
                <div className="font-bold underline">Afriana Pulungan, S.Si., M.AP.</div>
                <div className="text-[11px] text-gray-700">NIP 197304212007012021</div>
              </div>

              <div>
                <div>Jakarta, {formatTanggalCetak(reportDate)}</div>
                <div className="font-semibold mt-1">Bendahara Penerimaan</div>
                <div className="h-20"></div>
                <div className="font-bold underline">Evi Irmawati</div>
                <div className="text-[11px] text-gray-700">NIP 198101082009042006</div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 📄 LEMBAR 2: BUKTI REKONSILIASI PENJUALAN TIKET & K-2 (LANDSCAPE)  */}
          {/* ================================================================= */}
          <div className="bg-white p-6 sm:p-10 shadow-lg mx-auto border border-gray-200 text-black max-w-6xl w-full print:max-w-none print:p-0 print:border-none print:shadow-none">
            {/* Header Banner Landscape */}
            <div className="bg-indigo-700 text-white p-3 text-center rounded-t-lg">
              <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                BUKTI REKONSILIASI DARI SISTEM {selectedChannel === 'OLD_GATE' ? 'IWM (OLD GATE)' : '3A'}
              </h3>
              <p className="text-xs font-semibold mt-0.5 opacity-90 uppercase">
                HARI, TANGGAL: {formatTanggalCetak(reportDate)} &nbsp;|&nbsp; CHANNEL: {channelDisplayName}
              </p>
            </div>

            {/* TABEL 1: RINCIAN TIKET & NOMINAL */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold">
                  <tr>
                    <th className="border border-gray-300 p-2 text-center w-10">NO</th>
                    <th className="border border-gray-300 p-2 text-left w-48">LOKASI / AREA</th>
                    <th className="border border-gray-300 p-2 text-left">URAIAN JENIS TIKET</th>
                    <th className="border border-gray-300 p-2 text-right w-36">TOTAL TIKET (QTY)</th>
                    <th className="border border-gray-300 p-2 text-right w-44">TOTAL NOMINAL (RP)</th>
                  </tr>
                </thead>
                <tbody>
                  {rekonRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-gray-300 p-6 text-center text-gray-500 italic">
                        Belum ada rincian transaksi untuk channel {channelDisplayName} pada tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    rekonRows.map((r) => (
                      <tr key={r.no} className="hover:bg-indigo-50/20">
                        <td className="border border-gray-300 p-1.5 text-center font-mono">{r.no}</td>
                        <td className="border border-gray-300 p-1.5 text-left font-medium">{r.area}</td>
                        <td className="border border-gray-300 p-1.5 text-left">{r.uraian}</td>
                        <td className="border border-gray-300 p-1.5 text-right font-mono">
                          {r.qty.toLocaleString('id-ID')}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-right font-mono font-bold">
                          {formatRp(r.nominal)}
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Baris Total Tabel 1 */}
                  <tr className="bg-gray-200 font-extrabold text-gray-900 border-t-2 border-gray-400">
                    <td colSpan={3} className="border border-gray-300 p-2 text-center uppercase tracking-wide">
                      TOTAL PENDAPATAN & KARCIS {channelDisplayName}
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono">
                      {totalQtyAll > 0 ? totalQtyAll.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono font-black text-emerald-800">
                      {channelTotalNominal > 0 ? `Rp ${formatRp(channelTotalNominal)}` : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABEL 2: SUMMARY LEMBAR K-2 (3A) ATAU SETTLEMENT BERJALAN (IWM) */}
            <div className="mt-6">
              {selectedChannel === 'OLD_GATE' ? (
                // TABEL 2 (IWM): RINGKASAN SETTLEMENT TRANSAKSI BERJALAN
                <div>
                  <div className="bg-indigo-700 text-white px-3 py-1.5 text-xs font-black uppercase text-center rounded-t-md">
                    RINGKASAN SETTLEMENT TRANSAKSI BERJALAN (GATE & POS BANK DKI)
                  </div>
                  <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold">
                      <tr>
                        <th className="border border-gray-300 p-2 text-left">STATUS TRANSAKSI</th>
                        <th className="border border-gray-300 p-2 text-right">JUMLAH TRANSAKSI (TAPING)</th>
                        <th className="border border-gray-300 p-2 text-right">PENGUNJUNG (ANAK + DEWASA)</th>
                        <th className="border border-gray-300 p-2 text-right">KENDARAAN</th>
                        <th className="border border-gray-300 p-2 text-right">TOTAL NOMINAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-bold text-gray-800">
                          {rekonIwm?.status || 'Total Transaksi Approve'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-purple-800">
                          {rekonIwm?.jumlah_transaksi
                            ? `${rekonIwm.jumlah_transaksi.toLocaleString('id-ID')} Transaksi`
                            : '-'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-bold text-emerald-800">
                          {rekonIwm && (rekonIwm.pengunjung_anak || rekonIwm.pengunjung_dewasa)
                            ? `${((rekonIwm.pengunjung_anak || 0) + (rekonIwm.pengunjung_dewasa || 0)).toLocaleString('id-ID')} (${rekonIwm.pengunjung_anak || 0} ank / ${rekonIwm.pengunjung_dewasa || 0} dws)`
                            : '-'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-bold text-indigo-800">
                          {rekonIwm?.jumlah_kendaraan
                            ? `${rekonIwm.jumlah_kendaraan.toLocaleString('id-ID')} Unit`
                            : '-'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-green-700">
                          {(rekonIwm?.nominal || channelTotalNominal) > 0
                            ? `Rp ${formatRp(rekonIwm?.nominal || channelTotalNominal)}`
                            : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                // TABEL 2 (3A): SUMMARY BY CHANNEL ORDER (LEMBAR K-2)
                <div>
                  <div className="bg-indigo-700 text-white px-3 py-1.5 text-xs font-black uppercase text-center rounded-t-md">
                    SUMMARY BY CHANNEL ORDER (LEMBAR K-2)
                  </div>
                  <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold">
                      <tr>
                        <th className="border border-gray-300 p-2 text-left">CHANNEL ORDER</th>
                        <th className="border border-gray-300 p-2 text-right">TRANSACTION QTY</th>
                        <th className="border border-gray-300 p-2 text-right">TOTAL NOMINAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-bold text-gray-800">
                          {channelSummaryData?.channelName || channelDisplayName}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-blue-800">
                          {(channelSummaryData?.transactionQty || totalQtyAll) > 0
                            ? `${(channelSummaryData?.transactionQty || totalQtyAll).toLocaleString('id-ID')} Transaksi`
                            : '-'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-emerald-800">
                          {(channelSummaryData?.totalNominal || channelTotalNominal) > 0
                            ? `Rp ${formatRp(channelSummaryData?.totalNominal || channelTotalNominal)}`
                            : '-'}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-300 p-2 text-center font-black">TOTAL</td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-blue-900">
                          {(channelSummaryData?.transactionQty || totalQtyAll) > 0
                            ? (channelSummaryData?.transactionQty || totalQtyAll).toLocaleString('id-ID')
                            : '-'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-emerald-900">
                          {(channelSummaryData?.totalNominal || channelTotalNominal) > 0
                            ? `Rp ${formatRp(channelSummaryData?.totalNominal || channelTotalNominal)}`
                            : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 text-[10px] text-gray-500 italic">
              * Data diekstrak dari sistem rekon untuk tanggal: {formatTanggalCetak(reportDate)} | Sumber: {selectedChannel === 'OLD_GATE' ? 'ragunan_iwm' : '3A Portal'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
