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
  RefreshCw
} from 'lucide-react';
import { safeString } from '../../utils/formatters';

/**
 * Komponen Tab Pengaturan Master Menu Admin
 * Mencakup Database Kategori, Pejabat TTD, dan Alamat Koneksi Server Integrasi Bot
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
  handleForcePushToCloud,
  handleManualSync,
  syncStatus,
  currentUser
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
            <button
              onClick={() => setActiveMasterMenu('cloud')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Cloud size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Database Cloud</h3>
                <p className="text-xs text-gray-500">Koneksi real-time terpusat antar PC admin.</p>
              </div>
            </button>

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

          {activeMasterMenu === 'cloud' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <Cloud size={24} className="text-emerald-600" /> Database Cloud Terpusat (Firebase)
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Arsitektur Terpusat: Seluruh input, rekonsiliasi, dan pencatatan tersimpan langsung di Cloud Firestore.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-800' :
                    syncStatus === 'syncing' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-600' : syncStatus === 'syncing' ? 'bg-blue-600' : 'bg-rose-600'}`}></span>
                    {syncStatus === 'synced' ? 'Terhubung Real-Time' : syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dokumen Database Pusat</div>
                  <div className="font-mono text-sm font-bold text-indigo-700 bg-white px-3 py-1.5 rounded border border-slate-200 inline-block">
                    tmr_data / tmr_rekapitulasi_pusat
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Semua PC admin menggunakan dokumen tunggal ini sehingga tidak ada lagi perbedaan data antar PC.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Akun Login Saat Ini</div>
                  <div className="text-sm font-bold text-gray-800">
                    {currentUser?.email || 'Admin Terautentikasi'}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    UID: <span className="font-mono text-[11px] text-gray-600">{currentUser?.uid || '-'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Aksi Sinkronisasi Data</h3>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw size={16} /> Tarik & Samakan dari Server Pusat
                  </button>

                  <button
                    type="button"
                    onClick={handleForcePushToCloud}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                  >
                    <Cloud size={16} /> Jadikan PC Ini Master di Server Pusat
                  </button>
                </div>
                <p className="text-xs text-gray-500 italic">
                  💡 Gunakan tombol <strong>"Jadikan PC Ini Master"</strong> jika Anda telah menyelesaikan penginputan/rekonsiliasi di PC ini dan ingin memastikan data di server pusat persis sama dengan yang ada di PC ini.
                </p>
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
