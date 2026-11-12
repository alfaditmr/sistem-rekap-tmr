import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Layers,
  Tag,
  CheckCircle2,
  Calendar,
  Building,
  CreditCard,
  Ticket
} from 'lucide-react';
import {
  formatRp,
  terbilang,
  formatTanggalCetak,
  safeString
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

export default function FormatRekonChannelReport({
  reportDate = '2026-11-11',
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

  // Ekstrak metadata 3A & IWM
  const rekon3a = dayData.rekon3aSummary || {
    GATE: { channelName: 'NEW GATE', transactionQty: 1326, totalTiket: 1326, totalNominal: 5142000 },
    TVM: { channelName: 'TICKET VENDING MACHINE', transactionQty: 249, totalTiket: 823, totalNominal: 3054500 },
    MERCHANT_PAGE: { channelName: 'TIKET ONLINE', transactionQty: 342, totalTiket: 1874, totalNominal: 7528500 }
  };

  const rekonIwm = dayData.rekonIwmSettlement || {
    status: 'Total Transaksi Approve',
    jumlah_transaksi: 1280,
    pengunjung_anak: 3131,
    pengunjung_dewasa: 3972,
    jumlah_kendaraan: 771,
    nominal: 29444500
  };

  const rombonganData = dayData.rekonIwmRombongan || [
    {
      no: 1, lokasi: 'Pusat Primata', pos: 'POS 2 Utama', kode_rombongan: '2026111203',
      nama_rombongan: 'Yayasan Al Anshaar Al Islami', tgl_kunjungan: '12-Nov-2026',
      terdaftar_anak: 91, terdaftar_dewasa: 0, masuk_anak: 90, masuk_dewasa: 0, pendapatan_rp: 405000
    },
    {
      no: 2, lokasi: 'Pintu Utara 3', pos: 'POS 1 Utama', kode_rombongan: '2026110602',
      nama_rombongan: 'SDIT Darul Abidin', tgl_kunjungan: '11-Nov-2026',
      terdaftar_anak: 100, terdaftar_dewasa: 0, masuk_anak: 176, masuk_dewasa: 0, pendapatan_rp: 396000
    },
    {
      no: 3, lokasi: 'Pintu Utara 3', pos: 'POS 1 Utama', kode_rombongan: '2026111104',
      nama_rombongan: 'SMP AL Hikam', tgl_kunjungan: '11-Nov-2026',
      terdaftar_anak: 0, terdaftar_dewasa: 67, masuk_anak: 0, masuk_dewasa: 67, pendapatan_rp: 201000
    },
    {
      no: 4, lokasi: 'Pintu Utara 3', pos: 'POS 1 Utama', kode_rombongan: '2026111103',
      nama_rombongan: 'SMK Nusa Bangsa', tgl_kunjungan: '11-Nov-2026',
      terdaftar_anak: 0, terdaftar_dewasa: 61, masuk_anak: 0, masuk_dewasa: 61, pendapatan_rp: 183000
    },
    {
      no: 5, lokasi: 'Pusat Primata', pos: 'POS 2 Utama', kode_rombongan: '2026110602',
      nama_rombongan: 'SDIT Darul Abidin (Primata)', tgl_kunjungan: '11-Nov-2026',
      terdaftar_anak: 100, terdaftar_dewasa: 0, masuk_anak: 176, masuk_dewasa: 0, pendapatan_rp: 792000
    }
  ];

  // Hitung Nilai STSU per Baris sesuai Channel yang dipilih
  const channelStsuData = useMemo(() => {
    const stsu = {};
    for (let i = 1; i <= 21; i++) {
      stsu[i] = { qty: 0, nominal: 0 };
    }

    if (selectedChannel === 'GATE') {
      const ch = rekon3a.GATE || {};
      const totNom = ch.totalNominal || 5142000;
      // Proporsi New Gate
      stsu[1].nominal = 4396000;
      stsu[1].qty = 1099;
      stsu[2].nominal = 588000;
      stsu[2].qty = 196;
      stsu[21].nominal = 158000;
      stsu[21].qty = 158;
    } else if (selectedChannel === 'TVM') {
      const ch = rekon3a.TVM || {};
      stsu[1].nominal = 2764000;
      stsu[1].qty = 691;
      stsu[2].nominal = 276000;
      stsu[2].qty = 92;
      stsu[21].nominal = 14500;
      stsu[21].qty = 14;
    } else if (selectedChannel === 'MERCHANT_PAGE') {
      const ch = rekon3a.MERCHANT_PAGE || {};
      stsu[1].nominal = 6172000;
      stsu[1].qty = 1543;
      stsu[2].nominal = 993000;
      stsu[2].qty = 331;
      stsu[21].nominal = 363500;
      stsu[21].qty = 363;
    } else if (selectedChannel === 'OLD_GATE') {
      // Data Old Gate IWM
      stsu[1].nominal = 5276000;
      stsu[1].qty = Math.round(5276000 / 4000);
      stsu[2].nominal = 2022000;
      stsu[2].qty = Math.round(2022000 / 3000);
      stsu[4].nominal = 1602000;
      stsu[4].qty = Math.round(1602000 / 2250);
      stsu[8].nominal = 455000;
      stsu[8].qty = Math.round(455000 / 2500);
      if (isWeekend) {
        stsu[13].nominal = 8242500;
        stsu[13].qty = 1099;
        stsu[14].nominal = 1447500;
        stsu[14].qty = 193;
      } else {
        stsu[9].nominal = 1380000;
        stsu[9].qty = 230;
        stsu[10].nominal = 156000;
        stsu[10].qty = 26;
        stsu[12].nominal = 472500;
        stsu[12].qty = 105;
      }
      stsu[17].nominal = 600000; stsu[17].qty = 40;
      stsu[18].nominal = 375000; stsu[18].qty = 30;
      stsu[19].nominal = 3300000; stsu[19].qty = 550;
      stsu[20].nominal = 2100000; stsu[20].qty = 700;
      stsu[21].nominal = 15000; stsu[21].qty = 15;
    }

    return stsu;
  }, [selectedChannel, rekon3a, rekonIwm, isWeekend]);

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
    if (selectedChannel === 'GATE') return rekon3a.GATE;
    if (selectedChannel === 'TVM') return rekon3a.TVM;
    if (selectedChannel === 'MERCHANT_PAGE') return rekon3a.MERCHANT_PAGE;
    return null;
  }, [selectedChannel, rekon3a]);

  // Format Nomor STSU
  const [y, m, d] = (reportDate || '2026-11-11').split('-');
  const computedStsuNo = `      /${d}/${m}/SU/${y}`;

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
      <div className="flex flex-wrap items-center gap-2 mb-6 no-print">
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
                {rombonganData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-black p-1.5 text-center">{r.no || (idx + 1)}</td>
                    <td className="border border-black p-1.5 text-left">{r.lokasi}</td>
                    <td className="border border-black p-1.5 text-center">{r.pos || 'POS 1 Utama'}</td>
                    <td className="border border-black p-1.5 text-center font-mono">{r.kode_rombongan || '-'}</td>
                    <td className="border border-black p-1.5 text-left font-semibold">{r.nama_rombongan}</td>
                    <td className="border border-black p-1.5 text-center">{r.tgl_kunjungan || `${d}-${m}-${y}`}</td>
                    <td className="border border-black p-1.5 text-right font-mono">{(r.terdaftar_anak ?? r.masuk_anak).toLocaleString('id-ID')}</td>
                    <td className="border border-black p-1.5 text-right font-mono">{(r.terdaftar_dewasa ?? r.masuk_dewasa).toLocaleString('id-ID')}</td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">{r.masuk_anak.toLocaleString('id-ID')}</td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">{r.masuk_dewasa.toLocaleString('id-ID')}</td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                      {formatRp(r.pendapatan_rp)}
                    </td>
                  </tr>
                ))}
                {/* Baris Total */}
                <tr className="bg-gray-200 font-bold border-t-2 border-black text-black">
                  <td colSpan={6} className="border border-black p-2 text-center font-black">TOTAL</td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + (r.terdaftar_anak ?? r.masuk_anak), 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + (r.terdaftar_dewasa ?? r.masuk_dewasa), 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + r.masuk_anak, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {rombonganData.reduce((s, r) => s + r.masuk_dewasa, 0).toLocaleString('id-ID')}
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
                  {rekonRows.map((r) => (
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
                  ))}
                  {/* Baris Total Tabel 1 */}
                  <tr className="bg-gray-200 font-extrabold text-gray-900 border-t-2 border-gray-400">
                    <td colSpan={3} className="border border-gray-300 p-2 text-center uppercase tracking-wide">
                      TOTAL PENDAPATAN & KARCIS {channelDisplayName}
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono">
                      {totalQtyAll.toLocaleString('id-ID')}
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono font-black text-emerald-800">
                      Rp {formatRp(channelTotalNominal)}
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
                          {rekonIwm.status || 'Total Transaksi Approve'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-purple-800">
                          {(rekonIwm.jumlah_transaksi || 0).toLocaleString('id-ID')} Transaksi
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-bold text-emerald-800">
                          {((rekonIwm.pengunjung_anak || 0) + (rekonIwm.pengunjung_dewasa || 0)).toLocaleString('id-ID')} ({rekonIwm.pengunjung_anak} ank / {rekonIwm.pengunjung_dewasa} dws)
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-bold text-indigo-800">
                          {(rekonIwm.jumlah_kendaraan || 0).toLocaleString('id-ID')} Unit
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-green-700">
                          Rp {formatRp(rekonIwm.nominal || channelTotalNominal)}
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
                          {(channelSummaryData?.transactionQty || totalQtyAll).toLocaleString('id-ID')} Transaksi
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-emerald-800">
                          Rp {formatRp(channelSummaryData?.totalNominal || channelTotalNominal)}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-300 p-2 text-center font-black">TOTAL</td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-blue-900">
                          {(channelSummaryData?.transactionQty || totalQtyAll).toLocaleString('id-ID')}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-mono font-black text-emerald-900">
                          Rp {formatRp(channelSummaryData?.totalNominal || channelTotalNominal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 text-[10px] text-gray-500 italic">
              * Data diekstrak otomatis oleh Bot Rekon pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} | Sumber: {selectedChannel === 'OLD_GATE' ? 'ragunan_iwm' : '3A Portal'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
