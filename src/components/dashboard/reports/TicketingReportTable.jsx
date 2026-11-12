import React, { useState } from 'react';
import { CreditCard, ShieldCheck, DollarSign, Building, Layers, Users, BarChart3, Ticket } from 'lucide-react';
import { formatRp } from '../../../utils/formatters';

export default function TicketingReportTable({ reportType, data, channelData }) {
  if (!data) return null;
  const { rows, totals } = data;
  const cData = channelData || data;
  const cRows = cData?.rows || rows;
  const cTotals = cData?.totals || totals;

  const isChannelReport = reportType === 'rekap_transaksi_channel';
  const [viewMode, setViewMode] = useState(isChannelReport ? 'transactions' : 'nominal');

  // =========================================================================
  // VIEW MODE A: REKAP TRANSAKSI SETIAP CHANNEL (LEMBAR K-2 DARI BOT 3A & IWM)
  // =========================================================================
  if (viewMode === 'transactions' || (isChannelReport && viewMode !== 'tickets' && viewMode !== 'nominal')) {
    return (
      <div className="w-full">
        {/* Toggle Mode & Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-indigo-50/70 border-b border-indigo-200">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-700" />
            <span className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider">
              Rekapitulasi Jumlah Transaksi Setiap Channel (Lembar K-2 & Settlement)
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-indigo-200 bg-white p-0.5 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'transactions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              📊 Jumlah Transaksi (Trx)
            </button>
            <button
              onClick={() => setViewMode('tickets')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'tickets' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              🎫 Fisik Karcis / Pengunjung
            </button>
            <button
              onClick={() => setViewMode('nominal')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'nominal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              💰 Nilai Rupiah (Rp)
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Grand Total Transaksi</div>
              <div className="text-sm font-black text-gray-800">
                {(cTotals.totalTrx || 0).toLocaleString('id-ID')} Trx
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Transaksi Bot 3A (Gate+TVM+Online)</div>
              <div className="text-sm font-black text-blue-700">
                {(cTotals.subtotal3aTrx || 0).toLocaleString('id-ID')} Trx
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Old Gate IWM (Taping POS)</div>
              <div className="text-sm font-black text-purple-700">
                {(cTotals.oldGateTrx || 0).toLocaleString('id-ID')} Trx
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Omset Nominal</div>
              <div className="text-sm font-black text-emerald-700">
                {formatRp(cTotals.grandTotalNominal || totals.grandTotal || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Rekap Transaksi */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50/60 text-blue-900">New Gate 3A (Trx)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50/60 text-blue-900">Vending TVM (Trx)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50/60 text-blue-900">Tiket Online (Trx)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-black bg-blue-100 text-blue-950">Subtotal 3A (Trx)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-purple-50 text-purple-950">Old Gate IWM (Taping)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-black bg-indigo-100 text-indigo-950">Total Trx (Semua)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold text-gray-700">Total Tiket Fisik</th>
                <th className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Total Omset (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {cRows.map((r, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-center text-gray-600">{r.dayName}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.gateTrx > 0 ? r.gateTrx.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.tvmTrx > 0 ? r.tvmTrx.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.onlineTrx > 0 ? r.onlineTrx.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono font-bold bg-blue-100/50 text-blue-900">
                    {r.subtotal3aTrx > 0 ? r.subtotal3aTrx.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono font-bold bg-purple-50/50 text-purple-900">
                    {r.oldGateTrx > 0 ? r.oldGateTrx.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono font-black bg-indigo-100/60 text-indigo-950">
                    {r.totalTrx > 0 ? r.totalTrx.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono text-gray-700">
                    {r.totalTiket > 0 ? r.totalTiket.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-1.5 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                    {r.totalNominal > 0 ? formatRp(r.totalNominal) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.gateTrx > 0 ? cTotals.gateTrx.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.tvmTrx > 0 ? cTotals.tvmTrx.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.onlineTrx > 0 ? cTotals.onlineTrx.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-black text-blue-950 bg-blue-200/60">
                  {cTotals.subtotal3aTrx > 0 ? cTotals.subtotal3aTrx.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-black text-purple-950 bg-purple-200/60">
                  {cTotals.oldGateTrx > 0 ? cTotals.oldGateTrx.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-black text-indigo-950 bg-indigo-200/70">
                  {cTotals.totalTrx > 0 ? cTotals.totalTrx.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-gray-800">
                  {cTotals.totalTiket > 0 ? cTotals.totalTiket.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                  {formatRp(cTotals.grandTotalNominal || totals.grandTotal || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE B: REKAP FISIK KARCIS & TIKET TERBIT (SEMUA JENIS TIKET)
  // =========================================================================
  if (viewMode === 'tickets') {
    return (
      <div className="w-full">
        {/* Toggle Mode */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-teal-50/70 border-b border-teal-200">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-teal-700" />
            <span className="font-extrabold text-xs text-teal-950 uppercase tracking-wider">
              Rekapitulasi Fisik Tiket & Pengunjung Terdaftar (Semua Jenis Tiket)
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-teal-200 bg-white p-0.5 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'transactions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              📊 Jumlah Transaksi (Trx)
            </button>
            <button
              onClick={() => setViewMode('tickets')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'tickets' ? 'bg-teal-600 text-white shadow-xs' : 'text-gray-600 hover:text-teal-600'
              }`}
            >
              🎫 Fisik Karcis / Pengunjung
            </button>
            <button
              onClick={() => setViewMode('nominal')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'nominal' ? 'bg-teal-600 text-white shadow-xs' : 'text-gray-600 hover:text-teal-600'
              }`}
            >
              💰 Nilai Rupiah (Rp)
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Tiket & Pengunjung</div>
              <div className="text-sm font-black text-gray-800">
                {(cTotals.totalTiket || 0).toLocaleString('id-ID')} Lembar/Orang
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Ticket size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Tiket Bot 3A (Gate+TVM+Online)</div>
              <div className="text-sm font-black text-blue-700">
                {(cTotals.subtotal3aTiket || 0).toLocaleString('id-ID')} Tiket
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Pengunjung Old Gate (IWM)</div>
              <div className="text-sm font-black text-emerald-700">
                {(cTotals.oldGatePengunjung || 0).toLocaleString('id-ID')} Orang
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Kendaraan Masuk (IWM)</div>
              <div className="text-sm font-black text-purple-700">
                {(cTotals.oldGateKendaraan || 0).toLocaleString('id-ID')} Unit
              </div>
            </div>
          </div>
        </div>

        {/* Table Fisik */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">3A New Gate</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">3A Vending TVM</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">3A Tiket Online</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-black bg-blue-100 text-blue-950">Subtotal 3A (Tiket)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-emerald-50 text-emerald-900">IWM Anak</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-emerald-50 text-emerald-900">IWM Dewasa</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-purple-50 text-purple-900">IWM Kendaraan</th>
                <th className="px-4 py-2 border border-gray-300 text-right font-black bg-teal-100 text-teal-950">Total Fisik Tiket & Orang</th>
              </tr>
            </thead>
            <tbody>
              {cRows.map((r, i) => (
                <tr key={i} className="hover:bg-teal-50/30 transition-colors">
                  <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-center text-gray-600">{r.dayName}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.gateTiket > 0 ? r.gateTiket.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.tvmTiket > 0 ? r.tvmTiket.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.onlineTiket > 0 ? r.onlineTiket.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono font-bold bg-blue-100/50 text-blue-900">
                    {r.subtotal3aTiket > 0 ? r.subtotal3aTiket.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-emerald-50/30 text-emerald-900">
                    {r.oldGateAnak > 0 ? r.oldGateAnak.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-emerald-50/30 text-emerald-900">
                    {r.oldGateDewasa > 0 ? r.oldGateDewasa.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-purple-50/30 text-purple-900">
                    {r.oldGateKendaraan > 0 ? r.oldGateKendaraan.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-1.5 border border-gray-300 text-right font-black bg-teal-100/50 text-teal-950 font-mono">
                    {r.totalTiket > 0 ? r.totalTiket.toLocaleString('id-ID') : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.gateTiket > 0 ? cTotals.gateTiket.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.tvmTiket > 0 ? cTotals.tvmTiket.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.onlineTiket > 0 ? cTotals.onlineTiket.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-black text-blue-950 bg-blue-200/60">
                  {cTotals.subtotal3aTiket > 0 ? cTotals.subtotal3aTiket.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-emerald-900 bg-emerald-200/40">
                  {cRows.reduce((s, r) => s + (r.oldGateAnak || 0), 0).toLocaleString('id-ID')}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-emerald-900 bg-emerald-200/40">
                  {cRows.reduce((s, r) => s + (r.oldGateDewasa || 0), 0).toLocaleString('id-ID')}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-purple-900 bg-purple-200/40">
                  {cTotals.oldGateKendaraan > 0 ? cTotals.oldGateKendaraan.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-4 py-2 border border-gray-300 text-right text-teal-950 font-mono font-black text-xs bg-teal-300/60">
                  {cTotals.totalTiket > 0 ? cTotals.totalTiket.toLocaleString('id-ID') : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE B2: REKAP NOMINAL RUPIAH PER CHANNEL (KHUSUS REKAP_TRANSAKSI_CHANNEL)
  // =========================================================================
  if (isChannelReport && viewMode === 'nominal') {
    return (
      <div className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-emerald-50/70 border-b border-emerald-200">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-700" />
            <span className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
              Rekapitulasi Nilai Rupiah (Omset) Setiap Channel (3A & Old Gate IWM)
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-emerald-200 bg-white p-0.5 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setViewMode('transactions')}
              className="px-3 py-1 rounded-md transition-all text-gray-600 hover:text-indigo-600"
            >
              📊 Jumlah Transaksi (Trx)
            </button>
            <button
              onClick={() => setViewMode('tickets')}
              className="px-3 py-1 rounded-md transition-all text-gray-600 hover:text-teal-600"
            >
              🎫 Fisik Karcis / Pengunjung
            </button>
            <button
              onClick={() => setViewMode('nominal')}
              className="px-3 py-1 rounded-md transition-all bg-emerald-600 text-white shadow-xs"
            >
              💰 Nilai Rupiah (Rp)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">New Gate 3A (Rp)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">Vending TVM (Rp)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">Tiket Online (Rp)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-black bg-blue-100 text-blue-950">Subtotal 3A (Rp)</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-purple-50 text-purple-900">Old Gate IWM (Rp)</th>
                <th className="px-4 py-2 border border-gray-300 text-right font-black bg-emerald-100 text-emerald-950">Total Omset (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {cRows.map((r, i) => (
                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-center text-gray-600">{r.dayName}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.gateNominal > 0 ? formatRp(r.gateNominal) : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.tvmNominal > 0 ? formatRp(r.tvmNominal) : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">
                    {r.onlineNominal > 0 ? formatRp(r.onlineNominal) : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono font-bold bg-blue-100/50 text-blue-900">
                    {r.subtotal3aNominal > 0 ? formatRp(r.subtotal3aNominal) : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono font-bold bg-purple-50/40 text-purple-900">
                    {r.oldGateNominal > 0 ? formatRp(r.oldGateNominal) : '-'}
                  </td>
                  <td className="px-4 py-1.5 border border-gray-300 text-right font-black bg-emerald-100/50 text-emerald-950 font-mono">
                    {r.totalNominal > 0 ? formatRp(r.totalNominal) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.gateNominal > 0 ? formatRp(cTotals.gateNominal) : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.tvmNominal > 0 ? formatRp(cTotals.tvmNominal) : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-blue-900">
                  {cTotals.onlineNominal > 0 ? formatRp(cTotals.onlineNominal) : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-black text-blue-950 bg-blue-200/60">
                  {cTotals.subtotal3aNominal > 0 ? formatRp(cTotals.subtotal3aNominal) : '-'}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono font-bold text-purple-900 bg-purple-200/40">
                  {cTotals.oldGateNominal > 0 ? formatRp(cTotals.oldGateNominal) : '-'}
                </td>
                <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                  {formatRp(cTotals.grandTotalNominal || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE C: E-TICKETING (NILAI NOMINAL RUPIAH)
  // =========================================================================
  if (reportType === 'eticketing') {
    return (
      <div className="w-full">
        {/* Toggle Mode */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-bold text-gray-700">Laporan Rekapitulasi E-Ticketing & Asuransi (Rupiah)</div>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setViewMode('nominal')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'nominal' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              💰 Nilai Rupiah (Rp)
            </button>
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'transactions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              📊 Jumlah Transaksi (Trx)
            </button>
            <button
              onClick={() => setViewMode('tickets')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'tickets' ? 'bg-teal-600 text-white shadow-xs' : 'text-gray-600 hover:text-teal-600'
              }`}
            >
              🎫 Fisik Karcis / Pengunjung
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total E-Ticketing</div>
              <div className="text-sm font-black text-gray-800">{formatRp(totals.grandTotal)}</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Asuransi Terbit</div>
              <div className="text-sm font-black text-blue-700">{(totals.asuransiLembar || 0).toLocaleString('id-ID')} Lembar</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Karcis Masuk (Dewasa+Anak)</div>
              <div className="text-sm font-black text-amber-700">{formatRp((totals.dewasa || 0) + (totals.anak || 0))}</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Wahana & Parkir</div>
              <div className="text-sm font-black text-purple-700">
                {formatRp((totals.pps || 0) + (totals.tsa || 0) + (totals.wahana || 0) + (totals.kendaraan || 0))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">Dewasa</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">Anak</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">Rombongan</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">PPS Schmutzer</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">TSA Satwa Anak</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">Wahana Tunggang</th>
                <th className="px-3 py-2 border border-gray-300 text-right font-bold">Kendaraan</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold bg-blue-50 text-blue-900">Asuransi (Lbr)</th>
                <th className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Total Pendapatan (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-center text-gray-600">{r.dayName}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.dewasa > 0 ? formatRp(r.dewasa) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.anak > 0 ? formatRp(r.anak) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.rombongan > 0 ? formatRp(r.rombongan) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.pps > 0 ? formatRp(r.pps) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.tsa > 0 ? formatRp(r.tsa) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.wahana > 0 ? formatRp(r.wahana) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.kendaraan > 0 ? formatRp(r.kendaraan) : '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-center font-bold bg-blue-50/30 font-mono text-blue-800">
                    {r.asuransiLembar > 0 ? r.asuransiLembar.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-1.5 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                    {r.total > 0 ? formatRp(r.total) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.dewasa)}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.anak)}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.rombongan)}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.pps)}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.tsa)}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.wahana)}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.kendaraan)}</td>
                <td className="px-3 py-2 border border-gray-300 text-center font-bold text-blue-900 font-mono bg-blue-200/50">
                  {(totals.asuransiLembar || 0).toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                  {formatRp(totals.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE D: PENDAPATAN PER PINTU / GATE (NILAI NOMINAL RUPIAH)
  // =========================================================================
  return (
    <div className="w-full">
      {/* Toggle Mode */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
        <div className="text-xs font-bold text-gray-700">Laporan Pendapatan per Pintu Masuk / Gate (Rupiah)</div>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-2xs text-xs font-bold">
          <button
            onClick={() => setViewMode('nominal')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewMode === 'nominal' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            💰 Nilai Rupiah (Rp)
          </button>
          <button
            onClick={() => setViewMode('transactions')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewMode === 'transactions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            📊 Jumlah Transaksi (Trx)
          </button>
          <button
            onClick={() => setViewMode('tickets')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewMode === 'tickets' ? 'bg-teal-600 text-white shadow-xs' : 'text-gray-600 hover:text-teal-600'
            }`}
          >
            🎫 Fisik Karcis / Pengunjung
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Pendapatan Gate</div>
            <div className="text-sm font-black text-gray-800">{formatRp(totals.grandTotal)}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Building size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Gate Utama & Timur</div>
            <div className="text-sm font-black text-emerald-700">{formatRp((totals.pintuUtama || 0) + (totals.pintuTimur || 0))}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Gate Barat & Utara</div>
            <div className="text-sm font-black text-blue-700">{formatRp((totals.pintuBarat || 0) + (totals.pintuUtara || 0))}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Online & TVM</div>
            <div className="text-sm font-black text-indigo-700">{formatRp((totals.online || 0) + (totals.tvm || 0))}</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
              <th className="px-3 py-2 border border-gray-300 text-right font-bold">Gate Utama</th>
              <th className="px-3 py-2 border border-gray-300 text-right font-bold">Pintu Barat</th>
              <th className="px-3 py-2 border border-gray-300 text-right font-bold">Pintu Timur</th>
              <th className="px-3 py-2 border border-gray-300 text-right font-bold">Pintu Utara</th>
              <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">Ticket Online</th>
              <th className="px-3 py-2 border border-gray-300 text-right font-bold bg-indigo-50 text-indigo-900">Vending TVM</th>
              <th className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-center text-gray-600">{r.dayName}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.pintuUtama > 0 ? formatRp(r.pintuUtama) : '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.pintuBarat > 0 ? formatRp(r.pintuBarat) : '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.pintuTimur > 0 ? formatRp(r.pintuTimur) : '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.pintuUtara > 0 ? formatRp(r.pintuUtara) : '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-blue-50/20">{r.online > 0 ? formatRp(r.online) : '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono bg-indigo-50/20">{r.tvm > 0 ? formatRp(r.tvm) : '-'}</td>
                <td className="px-4 py-1.5 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                  {r.total > 0 ? formatRp(r.total) : '-'}
                </td>
              </tr>
            ))}
            <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
              <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.pintuUtama)}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.pintuBarat)}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.pintuTimur)}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatRp(totals.pintuUtara)}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono text-blue-900 bg-blue-200/50">{formatRp(totals.online)}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono text-indigo-900 bg-indigo-200/50">{formatRp(totals.tvm)}</td>
              <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                {formatRp(totals.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
