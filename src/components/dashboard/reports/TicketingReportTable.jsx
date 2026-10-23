import React from 'react';
import { CreditCard, ShieldCheck, DollarSign, Building } from 'lucide-react';
import { formatRp } from '../../../utils/formatters';

export default function TicketingReportTable({ reportType, data }) {
  if (!data) return null;
  const { rows, totals } = data;

  if (reportType === 'eticketing') {
    return (
      <div className="w-full">
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
              <div className="text-sm font-black text-blue-700">{totals.asuransiLembar.toLocaleString('id-ID')} Lembar</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Karcis Masuk (Dewasa+Anak)</div>
              <div className="text-sm font-black text-amber-700">{formatRp(totals.dewasa + totals.anak)}</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Wahana & Parkir</div>
              <div className="text-sm font-black text-purple-700">
                {formatRp(totals.pps + totals.tsa + totals.wahana + totals.kendaraan)}
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
                  {totals.asuransiLembar.toLocaleString('id-ID')}
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

  // Gate Revenue Report
  return (
    <div className="w-full">
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
            <div className="text-sm font-black text-emerald-700">{formatRp(totals.pintuUtama + totals.pintuTimur)}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Gate Barat & Utara</div>
            <div className="text-sm font-black text-blue-700">{formatRp(totals.pintuBarat + totals.pintuUtara)}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Online & TVM</div>
            <div className="text-sm font-black text-indigo-700">{formatRp(totals.online + totals.tvm)}</div>
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
