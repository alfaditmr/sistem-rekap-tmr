import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Megaphone,
  DollarSign,
  Search,
  Calendar,
  FileText,
  RefreshCw,
  Layers,
  Building2,
  Radio,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { formatRp, safeString } from '../../../utils/formatters';
import { FASILITAS_COLUMNS, getPemakaianTempatData, getPromoMediaData, setGlobalApiDataCache, fetchApiDataBackground } from '../../../utils/reportDataHelper';

export default function FasilitasPromoTable({
  reportType,
  data,
  monthStr = '',
  allReports = {},
  categories = [],
  bankRows = [],
  apiData = [],
  onApiDataUpdate
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiStatusMsg, setApiStatusMsg] = useState('');
  const [activeData, setActiveData] = useState(data);

  useEffect(() => {
    setActiveData(data);
  }, [data]);

  // Background auto-sync data dari API web fasilitas/promo untuk menjamin tanggal pemakaian dan detail terbaru selalu sinkron
  useEffect(() => {
    let isMounted = true;
    const autoSync = async () => {
      try {
        const merged = await fetchApiDataBackground();
        if (isMounted && merged && merged.length > 0) {
          if (onApiDataUpdate) onApiDataUpdate(merged);
          const isFas = reportType === 'pemakaian_tempat';
          if (isFas) {
            const updated = getPemakaianTempatData(allReports, categories, monthStr || activeData?.monthStr || '', bankRows, merged);
            setActiveData(updated);
          } else {
            const updated = getPromoMediaData(allReports, categories, monthStr || activeData?.monthStr || '', bankRows, merged);
            setActiveData(updated);
          }
        }
      } catch (e) {
        // Abaikan jika offline / koneksi lambat, data lokal tetap digunakan
      }
    };
    autoSync();
    return () => { isMounted = false; };
  }, [reportType, monthStr]);

  const handleSyncApiFasilitas = async () => {
    setApiLoading(true);
    setApiStatusMsg('Menghubungi API Fasilitas Ragunan...');
    try {
      const url = `https://sistem-informasi-ragunan.vercel.app/api/fasilitas?date=semua`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.data && json.data.length > 0) {
        const newFas = json.data.map(d => ({ ...d, source: 'Fasilitas' }));
        let existing = [];
        try {
          const saved = localStorage.getItem('tmr_apiData');
          if (saved) existing = JSON.parse(saved);
        } catch (e) {}
        const merged = [...existing.filter(d => d.source !== 'Fasilitas'), ...newFas];
        try {
          localStorage.setItem('tmr_apiData', JSON.stringify(merged));
        } catch (e) {}
        setGlobalApiDataCache(merged);
        if (onApiDataUpdate) onApiDataUpdate(merged);

        // Hitung ulang data laporan fasilitas dengan API data terbaru
        const updated = getPemakaianTempatData(allReports, categories, monthStr || activeData?.monthStr || '', bankRows, merged);
        setActiveData(updated);
        setApiStatusMsg(`Berhasil memuat ${newFas.length} transaksi Fasilitas dari API!`);
        setTimeout(() => setApiStatusMsg(''), 4000);
      } else {
        setApiStatusMsg('Tidak ada data dari API fasilitas.');
        setTimeout(() => setApiStatusMsg(''), 3000);
      }
    } catch (e) {
      console.error('Error sync api fasilitas:', e);
      setApiStatusMsg('Gagal terhubung ke API fasilitas.');
      setTimeout(() => setApiStatusMsg(''), 4000);
    }
    setApiLoading(false);
  };

  const handleSyncApiPromo = async () => {
    setApiLoading(true);
    setApiStatusMsg('Menghubungi API Promo Ragunan...');
    try {
      const url = `https://sistem-informasi-ragunan.vercel.app/api/promo?date=semua`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.data && json.data.length > 0) {
        const newPromo = json.data.map(d => ({ ...d, source: 'Promo' }));
        let existing = [];
        try {
          const saved = localStorage.getItem('tmr_apiData');
          if (saved) existing = JSON.parse(saved);
        } catch (e) {}
        const merged = [...existing.filter(d => d.source !== 'Promo'), ...newPromo];
        try {
          localStorage.setItem('tmr_apiData', JSON.stringify(merged));
        } catch (e) {}
        setGlobalApiDataCache(merged);
        if (onApiDataUpdate) onApiDataUpdate(merged);

        // Hitung ulang data laporan promo dengan API data terbaru
        const updated = getPromoMediaData(allReports, categories, monthStr || activeData?.monthStr || '', bankRows, merged);
        setActiveData(updated);
        setApiStatusMsg(`Berhasil memuat ${newPromo.length} transaksi Promo dari API!`);
        setTimeout(() => setApiStatusMsg(''), 4000);
      } else {
        setApiStatusMsg('Tidak ada data dari API promo.');
        setTimeout(() => setApiStatusMsg(''), 3000);
      }
    } catch (e) {
      console.error('Error sync api promo:', e);
      setApiStatusMsg('Gagal terhubung ke API promo.');
      setTimeout(() => setApiStatusMsg(''), 4000);
    }
    setApiLoading(false);
  };

  if (!activeData) return null;

  // =========================================================================
  // A. Laporan Pemakaian Tempat & Fasilitas Fisik (Format Persis Gambar 1)
  // =========================================================================
  if (reportType === 'pemakaian_tempat') {
    const { rows = [], totalNominal = 0, facilityTotals = {}, columns = FASILITAS_COLUMNS, monthName = '', year = '' } = activeData;

    const filteredFasRows = rows.filter(r => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const instansi = (r.penyewa || r.perusahaan || '').toLowerCase();
      const ket = (r.keterangan || '').toLowerCase();
      const tglB = (r.tglBayarFormatted || r.tglBayar || '').toLowerCase();
      const tglP = (r.tglPakaiFormatted || r.tglPakai || '').toLowerCase();
      return instansi.includes(term) || ket.includes(term) || tglB.includes(term) || tglP.includes(term);
    });

    return (
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
        {/* Header Resmi Gambar 1 */}
        <div className="bg-gradient-to-b from-emerald-800 via-emerald-900 to-slate-900 text-white p-5 text-center relative border-b-2 border-amber-400">
          <div className="text-sm font-black tracking-wider uppercase text-amber-300">
            REKAPITULASI DATA PEMAKAIAN FASILITAS BULAN {monthName ? monthName.toUpperCase() : ''} {year}
          </div>
          <div className="text-xs font-bold tracking-wide mt-1 text-emerald-100">
            UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN
          </div>
          <div className="text-[11px] font-medium tracking-wide text-emerald-200/80">
            DINAS PERTAMANAN DAN HUTAN KOTA PROVINSI DKI JAKARTA
          </div>
        </div>

        {/* KPI Cards & Toolbar */}
        <div className="p-4 bg-slate-50/80 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Total Retribusi</div>
                <div className="text-xs font-black text-gray-800 font-mono">{formatRp(totalNominal)}</div>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <MapPin size={18} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Total Agenda</div>
                <div className="text-xs font-black text-blue-700">{rows.length} Kegiatan</div>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Maximize2 size={18} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Lahan Tersewa</div>
                <div className="text-xs font-black text-teal-700">{facilityTotals.lahan || 0} M²</div>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Building2 size={18} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Panggung & Wireles</div>
                <div className="text-xs font-black text-indigo-700">{(facilityTotals.panggung || 0) + (facilityTotals.wireles || 0)} Unit</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
            {apiStatusMsg && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-pulse">
                {apiStatusMsg}
              </span>
            )}
            <button
              onClick={handleSyncApiFasilitas}
              disabled={apiLoading}
              className="w-full sm:w-auto px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              title="Tarik data transaksi sewa fasilitas terbaru dari API"
            >
              <RefreshCw size={14} className={apiLoading ? 'animate-spin' : ''} />
              {apiLoading ? 'Menarik API...' : 'Tarik Data API Fasilitas'}
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Cari penyewa, lokasi, tanggal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Tabel Matriks Persis Gambar 1 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              {/* Header Baris 1: Kolom Utama & Kategori Fasilitas */}
              <tr className="bg-emerald-900 text-white border-b border-emerald-950">
                <th rowSpan={2} className="px-2 py-2.5 border border-emerald-950 text-center font-bold w-10">No</th>
                <th rowSpan={2} className="px-3 py-2.5 border border-emerald-950 text-center font-bold min-w-[95px]">
                  Tanggal Bayar<br/><span className="text-[10px] font-normal text-emerald-200">( Transfer )</span>
                </th>
                <th rowSpan={2} className="px-4 py-2.5 border border-emerald-950 text-left font-bold min-w-[160px]">
                  Nama / Instansi
                </th>
                <th rowSpan={2} className="px-3 py-2.5 border border-emerald-950 text-center font-bold min-w-[95px]">
                  Tanggal Pemakaian
                </th>
                <th colSpan={columns.length} className="px-3 py-1.5 border border-emerald-950 text-center font-black tracking-wide text-amber-300 bg-emerald-950/70">
                  FASILITAS / TEMPAT TERPAKAI (SUB-KATEGORI RESMI)
                </th>
                <th rowSpan={2} className="px-3 py-2.5 border border-emerald-950 text-right font-black bg-amber-500 text-slate-900 min-w-[110px]">
                  Pendapatan ( Rp )
                </th>
                <th rowSpan={2} className="px-4 py-2.5 border border-emerald-950 text-left font-bold min-w-[120px]">
                  Keterangan (Lokasi)
                </th>
              </tr>
              {/* Header Baris 2: Sub-Kategori Fasilitas Murni */}
              <tr className="bg-emerald-800 text-emerald-50 border-b border-emerald-950 text-[10px]">
                {columns.map((col) => {
                  const isHighlighted = ['lahan', 'panggung', 'wireles', 'auditorium'].includes(col.key);
                  return (
                    <th
                      key={col.key}
                      className={`px-2 py-2 border border-emerald-900 text-center font-bold ${
                        isHighlighted ? 'bg-emerald-700 text-amber-200' : ''
                      }`}
                      style={{ minWidth: col.key === 'lahan' ? '60px' : '55px' }}
                    >
                      {col.shortLabel || col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredFasRows.length === 0 ? (
                <tr>
                  <td colSpan={4 + columns.length + 2} className="px-4 py-12 text-center text-gray-500 italic">
                    {rows.length === 0
                      ? 'Belum ada transaksi pemakaian fasilitas pada bulan ini. Klik tombol "Tarik Data API Fasilitas" untuk menyinkronkan data.'
                      : 'Tidak ada data pemakaian fasilitas yang cocok dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredFasRows.map((r, i) => {
                  const hasBorderTop = r.isFirstOfDate && i > 0;
                  return (
                    <tr
                      key={r.id || i}
                      className={`hover:bg-amber-50/50 transition-colors ${
                        hasBorderTop ? 'border-t-2 border-emerald-300/80 bg-slate-50/30' : 'border-t border-gray-200'
                      }`}
                    >
                      <td className="px-2 py-2 border border-gray-300 text-center font-semibold text-gray-600 bg-gray-50/50">
                        {r.no}
                      </td>
                      {/* Tanggal Bayar: ditampilkan di baris pertama tiap tanggal, kosong jika sama (persis Gambar 1) */}
                      <td className="px-3 py-2 border border-gray-300 text-center font-mono font-bold text-gray-800">
                        {r.tglBayarDisplay ? (
                          <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200 text-[10px]">
                            {r.tglBayarDisplay}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 border border-gray-300 font-bold text-gray-900">
                        {safeString(r.penyewa)}
                      </td>
                      <td className="px-3 py-2 border border-gray-300 text-center font-mono font-medium text-gray-700">
                        {r.tglPakaiFormatted || '-'}
                      </td>

                      {/* Kolom-kolom fasilitas matriks persis Gambar 1 */}
                      {columns.map((col) => {
                        const val = r.facilities ? r.facilities[col.key] : null;
                        const hasVal = val !== undefined && val !== null && val !== '' && val !== 0;
                        return (
                          <td
                            key={col.key}
                            className={`px-2 py-2 border border-gray-300 text-center font-bold ${
                              hasVal
                                ? col.key === 'lahan'
                                  ? 'bg-emerald-100 text-emerald-950 font-mono text-xs'
                                  : col.key === 'panggung'
                                  ? 'bg-blue-100 text-blue-950 font-mono text-xs'
                                  : col.key === 'wireles'
                                  ? 'bg-purple-100 text-purple-950 font-mono text-xs'
                                  : 'bg-amber-100 text-amber-950 font-mono text-xs'
                                : 'text-gray-200'
                            }`}
                          >
                            {hasVal ? val : ''}
                          </td>
                        );
                      })}

                      {/* Pendapatan (Rp) */}
                      <td className="px-3 py-2 border border-gray-300 text-right font-black font-mono text-slate-900 bg-amber-50/60">
                        {formatRp(r.nominal)}
                      </td>

                      {/* Keterangan / Lokasi */}
                      <td className="px-4 py-2 border border-gray-300 text-left font-medium text-gray-700">
                        {r.keterangan ? (
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                            {safeString(r.keterangan)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Baris Total Laporan Persis Gambar 1 */}
              <tr className="bg-emerald-900 text-white font-black border-t-2 border-emerald-950">
                <td colSpan={4} className="px-4 py-3 border border-emerald-950 text-right font-black tracking-wide text-xs">
                  TOTAL PENDAPATAN BULAN {monthName ? monthName.toUpperCase() : ''}
                </td>
                {columns.map((col) => {
                  const tot = facilityTotals[col.key] || 0;
                  return (
                    <td key={col.key} className="px-2 py-3 border border-emerald-950 text-center font-mono font-black text-xs text-amber-300 bg-emerald-950/60">
                      {tot > 0 ? tot : ''}
                    </td>
                  );
                })}
                <td className="px-3 py-3 border border-emerald-950 text-right font-mono font-black text-xs text-slate-900 bg-amber-400">
                  {formatRp(totalNominal)}
                </td>
                <td className="px-4 py-3 border border-emerald-950 bg-emerald-950"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // B. Rekap Promosi Produk & Media Banner (Format Persis Gambar 2:
  // REKAPITULASI DATA EVENT PROMO SAMPLING / SELLING)
  // 11 Kolom: No | Tanggal Transfer | Nama Perusahaan | Nama Produk | Tanggal Event |
  // Jumlah hari | Jumlah titik | Banner/ Umbul2 | Spanduk | Harga (Rp) | Ket
  // =========================================================================
  const {
    rows = [],
    totalNominal = 0,
    totalHari = 0,
    totalTitik = 0,
    totalBanner = 0,
    totalSpanduk = 0,
    monthName = '',
    year = ''
  } = activeData;

  const filteredPromoRows = rows.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const p = (r.perusahaan || '').toLowerCase();
    const pr = (r.produk || '').toLowerCase();
    const te = (r.tglEvent || '').toLowerCase();
    const tf = (r.tglTransferFormatted || r.tglTransferDisplay || '').toLowerCase();
    const ket = (r.keterangan || '').toLowerCase();
    return p.includes(term) || pr.includes(term) || te.includes(term) || tf.includes(term) || ket.includes(term);
  });

  const displayTotalHari = filteredPromoRows.reduce((acc, r) => acc + (Number(r.jumlahHari) || 0), 0);
  const displayTotalTitik = filteredPromoRows.reduce((acc, r) => acc + (Number(r.jumlahTitik) || 0), 0);
  const displayTotalBanner = filteredPromoRows.reduce((acc, r) => acc + (Number(r.banner) || 0), 0);
  const displayTotalSpanduk = filteredPromoRows.reduce((acc, r) => acc + (Number(r.spanduk) || 0), 0);
  const displayTotalNominal = filteredPromoRows.reduce((acc, r) => acc + (Number(r.nominal) || 0), 0);

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
      {/* Header Resmi Gambar 2 */}
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-5 text-center relative border-b-2 border-amber-400">
        <div className="text-sm font-black tracking-wider uppercase text-amber-300">
          REKAPITULASI DATA EVENT PROMO SAMPLING / SELLING
        </div>
        <div className="text-xs font-bold tracking-wide mt-1 text-slate-100">
          UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN
        </div>
        <div className="text-[11px] font-medium tracking-wide text-slate-300/80">
          DINAS PERTAMANAN DAN HUTAN KOTA PROVINSI DKI JAKARTA
        </div>
        <div className="text-xs font-black tracking-wider uppercase text-amber-200 mt-1">
          BULAN {monthName ? monthName.toUpperCase() : ''} {year}
        </div>
      </div>

      {/* KPI Cards & Toolbar */}
      <div className="p-4 bg-slate-50/80 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Total Retribusi Promo</div>
              <div className="text-xs font-black text-gray-800 font-mono">{formatRp(displayTotalNominal)}</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Megaphone size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Total Event / Mitra</div>
              <div className="text-xs font-black text-indigo-700">{filteredPromoRows.length} Agenda</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Total Hari Promo</div>
              <div className="text-xs font-black text-blue-700">{displayTotalHari} Hari</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Titik & Media</div>
              <div className="text-xs font-black text-amber-700 font-mono">
                {displayTotalTitik} Ttk | {displayTotalBanner + displayTotalSpanduk} Mda
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
          {apiStatusMsg && (
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 animate-pulse">
              {apiStatusMsg}
            </span>
          )}
          <button
            onClick={handleSyncApiPromo}
            disabled={apiLoading}
            className="w-full sm:w-auto px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            title="Tarik data transaksi promo penjualan produk & banner dari API"
          >
            <RefreshCw size={14} className={apiLoading ? 'animate-spin' : ''} />
            {apiLoading ? 'Menarik API...' : 'Tarik Data API Promo'}
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Cari perusahaan, produk, event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Matriks Persis Gambar 2 (11 Kolom) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-slate-900 text-white border-b border-slate-950">
              <th className="px-2.5 py-3 border border-slate-800 text-center font-bold w-10">No</th>
              <th className="px-3.5 py-3 border border-slate-800 text-center font-bold min-w-[100px]">
                Tanggal Transfer
              </th>
              <th className="px-4 py-3 border border-slate-800 text-left font-bold min-w-[180px]">
                Nama Perusahaan
              </th>
              <th className="px-4 py-3 border border-slate-800 text-left font-bold min-w-[140px]">
                Nama Produk
              </th>
              <th className="px-4 py-3 border border-slate-800 text-left font-bold min-w-[200px]">
                Tanggal Event
              </th>
              <th className="px-2.5 py-3 border border-slate-800 text-center font-bold min-w-[65px]">
                Jumlah<br/>hari
              </th>
              <th className="px-2.5 py-3 border border-slate-800 text-center font-bold min-w-[65px]">
                Jumlah<br/>titik
              </th>
              <th className="px-2.5 py-3 border border-slate-800 text-center font-bold min-w-[75px]">
                Banner/<br/>Umbul2
              </th>
              <th className="px-2.5 py-3 border border-slate-800 text-center font-bold min-w-[65px]">
                Spanduk
              </th>
              <th className="px-3.5 py-3 border border-slate-800 text-right font-black bg-amber-500 text-slate-950 min-w-[115px]">
                Harga (Rp)
              </th>
              <th className="px-3.5 py-3 border border-slate-800 text-left font-bold min-w-[110px]">
                Ket
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPromoRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-gray-500 italic">
                  {rows.length === 0
                    ? 'Belum ada transaksi promo & banner pada bulan ini. Klik tombol "Tarik Data API Promo" untuk menyinkronkan data.'
                    : 'Tidak ada data promo yang cocok dengan pencarian.'}
                </td>
              </tr>
            ) : (
              filteredPromoRows.map((r, i) => {
                const hasBorderTop = r.isFirstOfDate && i > 0;
                return (
                  <tr
                    key={r.id || i}
                    className={`hover:bg-amber-50/50 transition-colors ${
                      hasBorderTop ? 'border-t-2 border-slate-400 bg-slate-50/40' : 'border-t border-gray-200'
                    }`}
                  >
                    <td className="px-2.5 py-2.5 border border-gray-300 text-center font-semibold text-gray-600 bg-gray-50/50">
                      {r.no}
                    </td>
                    {/* Tanggal Transfer: ditampilkan hanya di baris pertama per tanggal (persis Gambar 2) */}
                    <td className="px-3.5 py-2.5 border border-gray-300 text-center font-mono font-bold text-gray-800">
                      {r.tglTransferDisplay ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold border border-slate-300 text-[10px]">
                          {r.tglTransferDisplay}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 border border-gray-300 font-bold text-gray-900">
                      {safeString(r.perusahaan)}
                    </td>
                    <td className="px-4 py-2.5 border border-gray-300 font-medium text-gray-800">
                      {safeString(r.produk)}
                    </td>
                    <td className="px-4 py-2.5 border border-gray-300 font-medium text-gray-700 whitespace-normal">
                      {safeString(r.tglEvent)}
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-300 text-center font-mono font-bold text-blue-900 bg-blue-50/30">
                      {r.jumlahHari ? r.jumlahHari : ''}
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-300 text-center font-mono font-bold text-teal-900 bg-teal-50/30">
                      {r.jumlahTitik ? r.jumlahTitik : ''}
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-300 text-center font-mono font-bold text-amber-900 bg-amber-50/30">
                      {r.banner ? r.banner : ''}
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-300 text-center font-mono font-bold text-purple-900 bg-purple-50/30">
                      {r.spanduk ? r.spanduk : ''}
                    </td>
                    <td className="px-3.5 py-2.5 border border-gray-300 text-right font-black font-mono text-slate-950 bg-amber-50/70">
                      {formatRp(r.nominal)}
                    </td>
                    <td className="px-3.5 py-2.5 border border-gray-300 text-left font-medium text-gray-700">
                      {r.keterangan ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                          {safeString(r.keterangan)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Baris Total Laporan Persis Gambar 2 */}
            <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-950">
              <td colSpan={5} className="px-4 py-3 border border-slate-950 text-right font-black tracking-wide text-xs text-amber-300">
                TOTAL KESELURUHAN PENERIMAAN PROMO BULAN {monthName ? monthName.toUpperCase() : ''}
              </td>
              <td className="px-2.5 py-3 border border-slate-950 text-center font-mono font-black text-xs text-amber-300 bg-slate-950/70">
                {displayTotalHari || ''}
              </td>
              <td className="px-2.5 py-3 border border-slate-950 text-center font-mono font-black text-xs text-amber-300 bg-slate-950/70">
                {displayTotalTitik || ''}
              </td>
              <td className="px-2.5 py-3 border border-slate-950 text-center font-mono font-black text-xs text-amber-300 bg-slate-950/70">
                {displayTotalBanner || ''}
              </td>
              <td className="px-2.5 py-3 border border-slate-950 text-center font-mono font-black text-xs text-amber-300 bg-slate-950/70">
                {displayTotalSpanduk || ''}
              </td>
              <td className="px-3.5 py-3 border border-slate-950 text-right font-mono font-black text-xs text-slate-950 bg-amber-400">
                {formatRp(displayTotalNominal)}
              </td>
              <td className="px-3.5 py-3 border border-slate-950 bg-slate-950"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

