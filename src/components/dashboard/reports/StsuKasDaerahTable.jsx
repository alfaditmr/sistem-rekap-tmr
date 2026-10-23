import React from 'react';
import { Landmark, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatRp } from '../../../utils/formatters';

export default function StsuKasDaerahTable({ data }) {
  if (!data) return null;
  const { rows, totalJagir, monthName, year } = data;

  const validDays = rows.filter(r => r.nominalJagir > 0);
  const avgDaily = validDays.length > 0 ? Math.round(totalJagir / validDays.length) : 0;
  const maxDay = rows.reduce((max, r) => r.nominalJagir > max.nominalJagir ? r : max, { nominalJagir: 0, day: '-' });

  return (
    <div className="w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Setor Kas Daerah</div>
            <div className="text-sm font-black text-gray-800">{formatRp(totalJagir)}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Landmark size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Hari Operasional Efektif</div>
            <div className="text-sm font-black text-blue-700">{validDays.length} Hari Setor</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Rata-rata Setor Harian</div>
            <div className="text-sm font-black text-amber-700">{formatRp(avgDaily)}</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Setoran Tertinggi</div>
            <div className="text-sm font-black text-purple-700">
              Tgl {maxDay.day} ({formatRp(maxDay.nominalJagir)})
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Tgl</th>
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Hari</th>
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Tanggal</th>
              <th className="px-4 py-2 border border-gray-300 text-center font-bold">Nomor STSU</th>
              <th className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">
                Pendapatan Retribusi / Jagir (Rp)
              </th>
              <th className="px-4 py-2 border border-gray-300 text-right font-bold bg-blue-50 text-blue-900">
                Kumulatif Setoran (Rp)
              </th>
              <th className="px-4 py-2 border border-gray-300 text-left font-medium text-gray-600">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isLibur = r.isMonday && r.nominalJagir === 0;
              return (
                <tr
                  key={i}
                  className={`hover:bg-blue-50/40 transition-colors ${
                    isLibur ? 'bg-red-50/40 text-red-900' : ''
                  }`}
                >
                  <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{r.day}</td>
                  <td className="px-3 py-2 border border-gray-300 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      isLibur ? 'bg-red-100 font-bold text-red-700' : 'text-gray-600'
                    }`}>
                      {r.dayName}
                    </span>
                  </td>
                  <td className="px-3 py-2 border border-gray-300 text-center font-mono text-gray-600">{r.dateStr}</td>
                  <td className="px-4 py-2 border border-gray-300 text-center font-mono font-bold text-gray-800">
                    {r.stsuNo !== '-' ? (
                      <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                        STSU No. {r.stsuNo}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                    {r.nominalJagir > 0 ? formatRp(r.nominalJagir) : <span className="text-gray-400 font-normal italic text-[11px]">{r.keterangan || '-'}</span>}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-right font-bold text-blue-900 bg-blue-50/30 font-mono">
                    {r.kumulatif > 0 ? formatRp(r.kumulatif) : '-'}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-left text-gray-500 italic text-xs">
                    {r.keterangan || (r.nominalJagir > 0 ? 'Disetor ke Kas Daerah' : '')}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
              <td colSpan={4} className="px-4 py-3 border border-gray-300 text-right font-bold">
                TOTAL PENERIMAAN STSU BULAN {monthName.toUpperCase()}
              </td>
              <td className="px-4 py-3 border border-gray-300 text-right text-emerald-950 font-mono font-black text-sm bg-emerald-300/60">
                {formatRp(totalJagir)}
              </td>
              <td className="px-4 py-3 border border-gray-300 text-right text-emerald-950 font-mono font-black text-sm bg-emerald-300/60">
                {formatRp(totalJagir)}
              </td>
              <td className="px-4 py-3 border border-gray-300"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
