import React, { useState } from 'react';
import { MapPin, Megaphone, DollarSign, Search, Calendar, FileText } from 'lucide-react';
import { formatRp, safeString } from '../../../utils/formatters';

export default function FasilitasPromoTable({ reportType, data }) {
  const [searchTerm, setSearchTerm] = useState('');
  if (!data) return null;
  const { rows, totalNominal } = data;

  const filteredRows = rows.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const instansi = (r.penyewa || r.perusahaan || '').toLowerCase();
    const produk = (r.produk || r.jenisFasilitas || '').toLowerCase();
    const ket = (r.keterangan || '').toLowerCase();
    return instansi.includes(term) || produk.includes(term) || ket.includes(term);
  });

  if (reportType === 'pemakaian_tempat') {
    return (
      <div className="w-full">
        {/* KPI Cards & Search */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
                <DollarSign size={20} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Retribusi Sewa</div>
                <div className="text-sm font-black text-gray-800">{formatRp(totalNominal)}</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <MapPin size={20} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Agenda Acara</div>
                <div className="text-sm font-black text-blue-700">{rows.length} Kegiatan</div>
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari instansi, lokasi, atau fasilitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">No</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">Tgl Bayar / STSU</th>
                <th className="px-4 py-2 border border-gray-300 text-left font-bold">Nama / Instansi Penyewa</th>
                <th className="px-3 py-2 border border-gray-300 text-center font-bold">Tgl Pemakaian</th>
                <th className="px-4 py-2 border border-gray-300 text-left font-bold">Fasilitas / Lokasi</th>
                <th className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Pendapatan (Rp)</th>
                <th className="px-4 py-2 border border-gray-300 text-left font-medium text-gray-600">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                    {rows.length === 0 ? 'Belum ada transaksi pemakaian tempat pada bulan ini.' : 'Tidak ada data yang cocok dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{r.no}</td>
                    <td className="px-3 py-2 border border-gray-300 text-center font-mono">{r.tglBayar}</td>
                    <td className="px-4 py-2 border border-gray-300 font-semibold text-gray-800">{safeString(r.penyewa)}</td>
                    <td className="px-3 py-2 border border-gray-300 text-center font-mono">{r.tglPakai}</td>
                    <td className="px-4 py-2 border border-gray-300 text-gray-700">{safeString(r.jenisFasilitas)}</td>
                    <td className="px-4 py-2 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                      {formatRp(r.nominal)}
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-gray-600 italic text-xs">{safeString(r.keterangan)}</td>
                  </tr>
                ))
              )}
              <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
                <td colSpan={5} className="px-4 py-3 border border-gray-300 text-right font-bold">TOTAL PENDAPATAN SEWA TEMPAT</td>
                <td className="px-4 py-3 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                  {formatRp(totalNominal)}
                </td>
                <td className="px-4 py-3 border border-gray-300"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Rekap Promosi & Media Luar Ruang
  return (
    <div className="w-full">
      {/* KPI Cards & Search */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Retribusi Promosi</div>
              <div className="text-sm font-black text-gray-800">{formatRp(totalNominal)}</div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Megaphone size={20} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Titik Promosi</div>
              <div className="text-sm font-black text-amber-700">{rows.length} Event / Brand</div>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari perusahaan, brand, media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">No</th>
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Tgl Transfer / STSU</th>
              <th className="px-4 py-2 border border-gray-300 text-left font-bold">Nama Perusahaan / Mitra</th>
              <th className="px-4 py-2 border border-gray-300 text-left font-bold">Nama Produk / Brand</th>
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Tgl Event</th>
              <th className="px-3 py-2 border border-gray-300 text-center font-bold">Bentuk Media</th>
              <th className="px-4 py-2 border border-gray-300 text-right font-black bg-amber-100 text-amber-900">Harga / Retribusi (Rp)</th>
              <th className="px-4 py-2 border border-gray-300 text-left font-medium text-gray-600">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                  {rows.length === 0 ? 'Belum ada data promosi & banner pada bulan ini.' : 'Tidak ada data yang cocok dengan pencarian.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => (
                <tr key={i} className="hover:bg-amber-50/40 transition-colors">
                  <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{r.no}</td>
                  <td className="px-3 py-2 border border-gray-300 text-center font-mono">{r.tglTransfer}</td>
                  <td className="px-4 py-2 border border-gray-300 font-semibold text-gray-800">{safeString(r.perusahaan)}</td>
                  <td className="px-4 py-2 border border-gray-300 text-gray-700">{safeString(r.produk)}</td>
                  <td className="px-3 py-2 border border-gray-300 text-center font-mono">{r.tglEvent}</td>
                  <td className="px-3 py-2 border border-gray-300 text-center font-medium text-amber-800 bg-amber-50/40">{safeString(r.media)}</td>
                  <td className="px-4 py-2 border border-gray-300 text-right font-bold text-gray-900 font-mono">
                    {formatRp(r.nominal)}
                  </td>
                  <td className="px-4 py-2 border border-gray-300 text-gray-600 italic text-xs">{safeString(r.keterangan)}</td>
                </tr>
              ))
            )}
            <tr className="bg-emerald-100 font-black text-gray-900 border-t-2 border-emerald-400">
              <td colSpan={6} className="px-4 py-3 border border-gray-300 text-right font-bold">TOTAL PENDAPATAN PROMOSI & BANNER</td>
              <td className="px-4 py-3 border border-gray-300 text-right text-emerald-950 font-mono font-black text-xs bg-emerald-300/60">
                {formatRp(totalNominal)}
              </td>
              <td className="px-4 py-3 border border-gray-300"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
