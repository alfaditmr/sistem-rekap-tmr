import React from 'react';
import { Users, Car, Award, Calendar, DollarSign } from 'lucide-react';
import { formatRp } from '../../../utils/formatters';

export default function PengunjungReportTable({ reportType, data }) {
  if (!data) return null;
  const { rows, totals } = data;

  if (reportType === 'pengunjung_tmr') {
    return (
      <div className="w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Pendapatan</div>
              <div className="text-sm font-black text-gray-800">{formatRp(totals.grandTotalRp)}</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Pengunjung</div>
              <div className="text-sm font-black text-blue-700">{totals.grandPengunjung.toLocaleString('id-ID')} Orang</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Car size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Kendaraan</div>
              <div className="text-sm font-black text-amber-700">{totals.grandKendaraan.toLocaleString('id-ID')} Unit</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Motor : Mobil</div>
              <div className="text-sm font-black text-purple-700">
                {totals.motorQty.toLocaleString('id-ID')} : {totals.mobilQty.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th rowSpan={2} className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
                <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
                <th colSpan={3} className="px-3 py-1.5 border border-gray-300 text-center font-bold bg-green-50 text-green-800">Pengunjung (Orang)</th>
                <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-black bg-green-100 text-green-900">Total Orang</th>
                <th colSpan={5} className="px-3 py-1.5 border border-gray-300 text-center font-bold bg-blue-50 text-blue-800">Kendaraan (Unit)</th>
                <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-black bg-blue-100 text-blue-900">Total Kendaraan</th>
                <th rowSpan={2} className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Total Pendapatan (Rp)</th>
              </tr>
              <tr className="bg-gray-50 text-gray-600 text-[10px]">
                <th className="px-2 py-1 border border-gray-300 text-right bg-green-50/50">Dewasa</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-green-50/50">Anak</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-green-50/50">Rombongan</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-blue-50/50">Motor</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-blue-50/50">Mobil (Gol III)</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-blue-50/50">Gol II (Bus Sedang)</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-blue-50/50">Gol I (Bus Besar)</th>
                <th className="px-2 py-1 border border-gray-300 text-right bg-blue-50/50">Sepeda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isLibur = r.isMonday && r.totalRp === 0;
                return (
                  <tr
                    key={i}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isLibur ? 'bg-red-50/40 text-red-900' : r.isWeekend ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                    <td className="px-3 py-1.5 border border-gray-300 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.isWeekend ? 'bg-amber-100 font-bold text-amber-800' : isLibur ? 'bg-red-100 font-bold text-red-700' : 'text-gray-600'
                      }`}>
                        {r.dayName}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.dewasaQty || '-'}</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.anakQty || '-'}</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.rombQty || '-'}</td>
                    <td className="px-3 py-1.5 border border-gray-300 text-right font-bold text-green-700 bg-green-50/30 font-mono">
                      {r.totalPengunjung > 0 ? r.totalPengunjung.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.motorQty || '-'}</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.mobilQty || '-'}</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.gol2Qty || '-'}</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.gol1Qty || '-'}</td>
                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{r.sepedaQty || '-'}</td>
                    <td className="px-3 py-1.5 border border-gray-300 text-right font-bold text-blue-700 bg-blue-50/30 font-mono">
                      {r.totalKendaraan > 0 ? r.totalKendaraan.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-1.5 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                      {r.totalRp > 0 ? formatRp(r.totalRp) : <span className="text-gray-400 italic text-[10px]">{r.keterangan || '-'}</span>}
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL BULAN INI</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.dewasaQty.toLocaleString('id-ID')}</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.anakQty.toLocaleString('id-ID')}</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.rombQty.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 border border-gray-300 text-right text-green-900 font-mono font-bold bg-emerald-200/60">
                  {totals.grandPengunjung.toLocaleString('id-ID')}
                </td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.motorQty.toLocaleString('id-ID')}</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.mobilQty.toLocaleString('id-ID')}</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.gol2Qty.toLocaleString('id-ID')}</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.gol1Qty.toLocaleString('id-ID')}</td>
                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{totals.sepedaQty.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 border border-gray-300 text-right text-blue-900 font-mono font-bold bg-emerald-200/60">
                  {totals.grandKendaraan.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                  {formatRp(totals.grandTotalRp)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportType === 'pengunjung_pps') {
    return (
      <div className="w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Realisasi Pendapatan</div>
              <div className="text-sm font-black text-gray-800">{formatRp(totals.grandTotalRp)}</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Pengunjung PPS</div>
              <div className="text-sm font-black text-emerald-700">{totals.grandTotalQty.toLocaleString('id-ID')} Orang</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Dewasa / Anak</div>
              <div className="text-sm font-black text-blue-700">
                {totals.dewasaQty.toLocaleString('id-ID')} / {totals.anakQty.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Rombongan</div>
              <div className="text-sm font-black text-purple-700">{totals.rombQty.toLocaleString('id-ID')} Orang</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th rowSpan={2} className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
                <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
                <th colSpan={3} className="px-3 py-1.5 border border-gray-300 text-center font-bold bg-green-50 text-green-800">Jumlah Pengunjung (Orang)</th>
                <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-black bg-green-100 text-green-900">Total Pengunjung</th>
                <th rowSpan={2} className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Realisasi Pendapatan (Rp)</th>
                <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-left font-medium text-gray-600">Keterangan</th>
              </tr>
              <tr className="bg-gray-50 text-gray-600 text-[10px]">
                <th className="px-3 py-1 border border-gray-300 text-right">Dewasa</th>
                <th className="px-3 py-1 border border-gray-300 text-right">Anak</th>
                <th className="px-3 py-1 border border-gray-300 text-right">Rombongan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`hover:bg-green-50/40 transition-colors ${r.isWeekend ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.isWeekend ? 'bg-amber-100 font-bold text-amber-800' : 'text-gray-600'}`}>
                      {r.dayName}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.dewasaQty || '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.anakQty || '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.rombQty || '-'}</td>
                  <td className="px-3 py-1.5 border border-gray-300 text-right font-bold text-green-800 bg-green-50/30 font-mono">
                    {r.totalQty > 0 ? r.totalQty.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-1.5 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                    {r.totalRp > 0 ? formatRp(r.totalRp) : '-'}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-300 text-left text-gray-500 italic text-[10px]">{r.keterangan}</td>
                </tr>
              ))}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.dewasaQty.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.anakQty.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.rombQty.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 border border-gray-300 text-right text-green-950 font-mono font-bold bg-emerald-200/60">
                  {totals.grandTotalQty.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                  {formatRp(totals.grandTotalRp)}
                </td>
                <td className="px-3 py-2 border border-gray-300"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Taman Satwa Anak
  return (
    <div className="w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Pendapatan TSA</div>
            <div className="text-sm font-black text-gray-800">{formatRp(totals.grandTotalRp)}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Pengunjung Masuk TSA</div>
            <div className="text-sm font-black text-blue-700">{totals.tsaQty.toLocaleString('id-ID')} Orang</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Kuda Tunggang</div>
            <div className="text-sm font-black text-amber-700">{totals.kudaQty.toLocaleString('id-ID')} Kali</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Unta & Gajah</div>
            <div className="text-sm font-black text-purple-700">{(totals.untaQty + totals.gajahQty).toLocaleString('id-ID')} Kali</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th rowSpan={2} className="px-2 py-2 border border-gray-300 text-center font-bold">Tgl</th>
              <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
              <th colSpan={4} className="px-3 py-1.5 border border-gray-300 text-center font-bold bg-green-50 text-green-800">Rincian Pengunjung & Wahana (Orang)</th>
              <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-center font-black bg-green-100 text-green-900">Total Pengunjung</th>
              <th rowSpan={2} className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Total Pendapatan (Rp)</th>
              <th rowSpan={2} className="px-3 py-2 border border-gray-300 text-left font-medium text-gray-600">Keterangan</th>
            </tr>
            <tr className="bg-gray-50 text-gray-600 text-[10px]">
              <th className="px-3 py-1 border border-gray-300 text-right">Tiket Masuk TSA</th>
              <th className="px-3 py-1 border border-gray-300 text-right">Kuda Tunggang</th>
              <th className="px-3 py-1 border border-gray-300 text-right">Unta Tunggang</th>
              <th className="px-3 py-1 border border-gray-300 text-right">Gajah Tunggang</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`hover:bg-blue-50/40 transition-colors ${r.isWeekend ? 'bg-amber-50/30' : ''}`}>
                <td className="px-2 py-1.5 border border-gray-300 text-center font-semibold">{r.day}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.isWeekend ? 'bg-amber-100 font-bold text-amber-800' : 'text-gray-600'}`}>
                    {r.dayName}
                  </span>
                </td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.tsaQty || '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.kudaQty || '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.untaQty || '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-mono">{r.gajahQty || '-'}</td>
                <td className="px-3 py-1.5 border border-gray-300 text-right font-bold text-green-800 bg-green-50/30 font-mono">
                  {r.totalQty > 0 ? r.totalQty.toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-4 py-1.5 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                  {r.totalRp > 0 ? formatRp(r.totalRp) : '-'}
                </td>
                <td className="px-3 py-1.5 border border-gray-300 text-left text-gray-500 italic text-[10px]">{r.keterangan}</td>
              </tr>
            ))}
            <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
              <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center font-bold">TOTAL</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.tsaQty.toLocaleString('id-ID')}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.kudaQty.toLocaleString('id-ID')}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.untaQty.toLocaleString('id-ID')}</td>
              <td className="px-3 py-2 border border-gray-300 text-right font-mono">{totals.gajahQty.toLocaleString('id-ID')}</td>
              <td className="px-3 py-2 border border-gray-300 text-right text-green-950 font-mono font-bold bg-emerald-200/60">
                {totals.grandTotalQty.toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-2 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                {formatRp(totals.grandTotalRp)}
              </td>
              <td className="px-3 py-2 border border-gray-300"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
