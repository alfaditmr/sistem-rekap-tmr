import React from 'react';
import {
  ChevronLeft,
  Cloud,
  Database,
  Edit,
  Plus,
  Settings,
  Trash,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Tag,
  RefreshCw,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { safeString } from '../../utils/formatters';

/**
 * Komponen Tab Pengaturan Master Menu Admin
 * Mencakup Database Kategori, Pejabat TTD, Koneksi Server Bot Integrasi, serta Pusat Cadangan & Pemulihan (Backup & Restore)
 */
export default function MasterSettingsTab({
  activeTab,
  activeMasterMenu,
  setActiveMasterMenu,
  apiIpAddress,
  setApiIpAddress,
  signatures,
  setSignatures,
  categories = [],
  moveCategory,
  updateCategory,
  deleteCategory,
  moveItem,
  updateItemName,
  deleteItem,
  addItem,
  addCategory,
  handleForceSave,
  allReports = {},
  bankRows = [],
  onDownloadBackup,
  onRestoreBackup
}) {
  if (activeTab !== 'settings') return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 no-print space-y-6">
      {activeMasterMenu === 'menu' && (
        <div className="flex flex-col items-center mt-10">
          <h1 className="text-3xl font-black text-gray-800 mb-2">Master Menu Admin</h1>
          <p className="text-gray-500 mb-10">
            Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-4xl">
            <button
              onClick={() => setActiveMasterMenu('kategori')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Database Kategori</h3>
                <p className="text-xs text-gray-500">Kelola master data pos STSU utama & lain-lain.</p>
              </div>
            </button>

            <button
              onClick={() => setActiveMasterMenu('pejabat')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Edit size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Pejabat TTD</h3>
                <p className="text-xs text-gray-500">Atur pejabat pencetak resi NCR dan laporan.</p>
              </div>
            </button>

            <button
              onClick={() => setActiveMasterMenu('koneksi')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Cloud size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Bot Integrasi</h3>
                <p className="text-xs text-gray-500">Konfigurasi IP Address Bot Integrasi (3A & IWM).</p>
              </div>
            </button>

            <button
              onClick={() => setActiveMasterMenu('backup')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Pusat Cadangan</h3>
                <p className="text-xs text-gray-500">Download & pulihkan file cadangan database offline (.json).</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {activeMasterMenu !== 'menu' && (
        <div>
          <button
            onClick={() => setActiveMasterMenu('menu')}
            className="mb-6 text-gray-600 hover:text-gray-900 font-bold flex items-center gap-2 text-sm bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-colors hover:bg-gray-50 w-max"
          >
            <ChevronLeft size={16} /> Kembali ke Menu Master
          </button>

          {activeMasterMenu === 'backup' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2.5">
                      <ShieldCheck size={26} className="text-emerald-600" /> Pusat Cadangan & Pemulihan Database
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Unduh salinan data lengkap ke komputer / flashdisk Anda, atau pulihkan database kapan pun dibutuhkan.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-800">
                    <CheckCircle size={15} className="text-emerald-600" /> Arsitektur Cloud Aktif & Aman
                  </div>
                </div>

                {/* Ringkasan Data Saat Ini */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Laporan STSU</span>
                    <span className="text-xl font-extrabold text-gray-800">{Object.keys(allReports || {}).length} <span className="text-xs font-normal text-gray-500">hari</span></span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Mutasi Bank</span>
                    <span className="text-xl font-extrabold text-gray-800">{(bankRows || []).length} <span className="text-xs font-normal text-gray-500">baris</span></span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Master Kategori</span>
                    <span className="text-xl font-extrabold text-gray-800">{(categories || []).length} <span className="text-xs font-normal text-gray-500">pos</span></span>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Pejabat TTD</span>
                    <span className="text-xl font-extrabold text-emerald-700">Terkonfigurasi</span>
                  </div>
                </div>
              </div>

              {/* Action Cards: Download & Restore */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Download Backup */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:border-emerald-300 transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 shadow-sm">
                      <Download size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1.5">Unduh Cadangan (.json)</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-6">
                      Menyimpan seluruh data (STSU harian, seluruh mutasi bank, tanda tangan, kategori, target) ke dalam 1 file fisik JSON di komputer Anda. Simpan file ini di flashdisk atau Google Drive dinas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDownloadBackup}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-[0.99]"
                  >
                    <Download size={18} /> Download Backup Sekarang
                  </button>
                </div>

                {/* Card 2: Restore Backup */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:border-amber-300 transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
                      <Upload size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1.5">Pulihkan Database (.json)</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      Pilih file cadangan JSON yang pernah diunduh sebelumnya untuk mengembalikan seluruh database seperti saat file cadangan tersebut dibuat.
                    </p>
                    <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 mb-6 flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>Seluruh data di Cloud saat ini akan diselaraskan dengan data file cadangan.</span>
                    </div>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      id="restore-file-input"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onRestoreBackup) {
                          onRestoreBackup(file);
                          e.target.value = '';
                        }
                      }}
                    />
                    <label
                      htmlFor="restore-file-input"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-[0.99] cursor-pointer text-center"
                    >
                      <Upload size={18} /> Pilih File Cadangan Untuk Restore
                    </label>
                  </div>
                </div>
              </div>

              {/* Panduan Praktis */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 text-xs text-slate-700 space-y-2.5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <HardDrive size={16} className="text-slate-600" /> Panduan Praktis Ketahanan Data TMR Ragunan:
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Rekomendasi Waktu Backup:</strong> Lakukan pengunduhan cadangan minimal <strong>1 kali setiap akhir bulan</strong> setelah penutupan buku kas / pelaporan STSU bulanan selesai.</li>
                  <li><strong>Penyimpanan Ganda:</strong> Simpan file <code>.json</code> hasil unduhan di minimal 2 tempat (contoh: Harddisk PC Kantor & Flashdisk Bendahara atau Google Drive dinas).</li>
                  <li><strong>Keamanan Data:</strong> File cadangan berisi data nominal dan tanggal transaksi murni, tanpa kata sandi atau data sensitif sistem.</li>
                </ul>
              </div>
            </div>
          )}

          {activeMasterMenu === 'koneksi' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                <Cloud size={20} className="text-blue-500" /> Koneksi Server Bot Integrasi
              </h2>
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">
                  IP Address / Hostname Komputer Server
                </label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={apiIpAddress}
                      onChange={(e) => setApiIpAddress(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-mono font-bold text-blue-700"
                      placeholder="Contoh: localhost atau 192.168.1.5"
                    />
                  </div>
                  <Database className="text-gray-400 shrink-0 hidden sm:block" size={24} />
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Isi dengan <strong className="text-gray-700">localhost</strong> jika Bot Python berjalan di PC yang
                  sama dengan Web App ini. Atau isi dengan <strong className="text-gray-700">demo</strong> untuk mode
                  simulasi data sesungguhnya.
                </p>
                <div className="mt-3 text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-200 inline-block font-mono">
                  Sistem otomatis menembak Port <strong className="text-blue-600">5000 (3A)</strong> dan Port{' '}
                  <strong className="text-purple-600">5001 (IWM)</strong> berdasarkan port standar Bot.
                </div>
              </div>
            </div>
          )}

          {activeMasterMenu === 'pejabat' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Edit size={20} className="text-blue-500" /> Pejabat Penandatangan
                </h2>
                {handleForceSave && (
                  <button
                    type="button"
                    onClick={handleForceSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Cloud size={14} /> Simpan ke Cloud
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">Pihak Kiri (Penyetor)</h3>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Jabatan</label>
                    <input
                      type="text"
                      value={signatures.leftRole || ''}
                      onChange={(e) => setSignatures({ ...signatures, leftRole: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Nama</label>
                    <input
                      type="text"
                      value={signatures.leftName || ''}
                      onChange={(e) => setSignatures({ ...signatures, leftName: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none font-bold focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">NIP (Khusus Print NCR)</label>
                    <input
                      type="text"
                      value={signatures.leftNip || ''}
                      onChange={(e) => setSignatures({ ...signatures, leftNip: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">Pihak Kanan (Bendahara)</h3>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Lokasi</label>
                    <input
                      type="text"
                      value={signatures.location || ''}
                      onChange={(e) => setSignatures({ ...signatures, location: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Jabatan</label>
                    <input
                      type="text"
                      value={signatures.rightRole || ''}
                      onChange={(e) => setSignatures({ ...signatures, rightRole: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Nama</label>
                    <input
                      type="text"
                      value={signatures.rightName || ''}
                      onChange={(e) => setSignatures({ ...signatures, rightName: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none font-bold focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">NIP (Khusus Print NCR)</label>
                    <input
                      type="text"
                      value={signatures.rightNip || ''}
                      onChange={(e) => setSignatures({ ...signatures, rightNip: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMasterMenu === 'kategori' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Settings size={20} className="text-blue-500" /> Database Kategori
                </h2>
                {handleForceSave && (
                  <button
                    type="button"
                    onClick={handleForceSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Cloud size={14} /> Simpan ke Cloud
                  </button>
                )}
              </div>
              <div className="space-y-6">
                {categories.map((cat, index) => (
                  <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div
                      className={`p-3 flex flex-col md:flex-row justify-between md:items-center gap-3 border-b ${
                        cat.type === 'utama' ? 'bg-green-50 border-green-100' : 'bg-purple-50 border-purple-100'
                      }`}
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button
                            onClick={() => moveCategory(index, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveCategory(index, 'down')}
                            disabled={index === categories.length - 1}
                            className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        <span
                          className={`font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs text-white shrink-0 ${
                            cat.type === 'utama' ? 'bg-green-600' : 'bg-purple-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={cat.name || ''}
                          onChange={(e) => updateCategory(cat.id, 'name', e.target.value)}
                          className="bg-white border border-gray-300 rounded px-2 py-1.5 w-full max-w-md font-bold text-sm outline-none"
                          placeholder="Nama Kategori..."
                        />
                      </div>
                      <div className="flex items-center gap-2 pl-10 md:pl-0">
                        <select
                          value={cat.type || 'utama'}
                          onChange={(e) => updateCategory(cat.id, 'type', e.target.value)}
                          className={`text-xs font-bold px-2 py-1.5 rounded border outline-none ${
                            cat.type === 'utama'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-purple-100 text-purple-800 border-purple-300'
                          }`}
                        >
                          <option value="utama">STSU Utama (SU)</option>
                          <option value="lain">STSU Lain-lain (SU/L)</option>
                        </select>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="text-red-500 p-2 hover:bg-red-100 rounded-lg bg-white border border-red-100 shadow-sm"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-white space-y-2 pl-12 border-t border-gray-50">
                      {Array.isArray(cat.items) && cat.items.length === 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 mb-2 font-medium flex items-center gap-1">
                          <CheckCircle size={14} /> Mode Langsung Input Nominal.
                        </div>
                      )}
                      {Array.isArray(cat.items) &&
                        cat.items.map((item, itemIdx) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => moveItem(cat.id, itemIdx, 'up')}
                                disabled={itemIdx === 0}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => moveItem(cat.id, itemIdx, 'down')}
                                disabled={itemIdx === cat.items.length - 1}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                            <Tag size={14} className="text-gray-400 hidden sm:block" />
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => updateItemName(cat.id, item.id, e.target.value)}
                              className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 flex-1 text-sm outline-none focus:border-blue-400 focus:bg-white"
                              placeholder="Nama Tiket..."
                            />
                            <button
                              onClick={() => deleteItem(cat.id, item.id)}
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        ))}
                      <button
                        onClick={() => addItem(cat.id)}
                        className="text-sm text-blue-600 font-bold flex items-center gap-1 mt-3 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                      >
                        <Plus size={16} /> Tambah Sub-Kategori
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addCategory}
                  className="w-full py-4 border-2 border-dashed border-gray-300 text-gray-600 bg-gray-50 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <Plus size={20} /> Buat Kategori Baru
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
