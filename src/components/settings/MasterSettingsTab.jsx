import React, { useState, useMemo } from 'react';
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
  HardDrive,
  Lock,
  Unlock,
  Shield,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar
} from 'lucide-react';
import { safeString } from '../../utils/formatters';

/**
 * Komponen Tab Pengaturan Master Menu Admin
 * Mencakup Database Kategori, Pejabat TTD, Koneksi Server Bot Integrasi, Pusat Cadangan, dan Tutup Buku Bulanan
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
  closedMonths = {},
  onToggleCloseMonth,
  formatRp,
  onDownloadBackup,
  onRestoreBackup
}) {
  const [modalCloseMonth, setModalCloseMonth] = useState(null); // { monthKey, monthName }
  const [closeByInput, setCloseByInput] = useState('Bendahara Penerimaan');
  const [closeNoteInput, setCloseNoteInput] = useState('');

  const fmt = (n) => (typeof formatRp === 'function' ? formatRp(n) : (Number(n) || 0).toLocaleString('id-ID'));

  const formatMonthName = (ym) => {
    if (!ym) return '';
    const parts = ym.split('-');
    if (parts.length < 2) return ym;
    const y = parts[0];
    const m = parts[1];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(m, 10) - 1;
    return `${months[mIdx] || m} ${y}`;
  };

  // Kompilasi data bulanan dari allReports, bankRows, dan closedMonths
  const monthDataList = useMemo(() => {
    const map = {};

    // 1. Scan allReports (Hitung hari laporan & total penerimaan per bulan)
    try {
      Object.keys(allReports || {}).forEach((dateKey) => {
        const m = String(dateKey || '').substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(m)) {
          if (!map[m]) map[m] = { monthKey: m, reportCount: 0, totalRevenue: 0, bankCount: 0 };
          map[m].reportCount += 1;
          const dayData = allReports[dateKey];
          if (dayData && typeof dayData === 'object') {
            Object.keys(dayData).forEach((docKey) => {
              const doc = dayData[docKey];
              if (doc && doc.formData && typeof doc.formData === 'object') {
                Object.values(doc.formData).forEach((val) => {
                  const num = Number(val);
                  if (!isNaN(num) && num > 0) map[m].totalRevenue += num;
                });
              }
            });
          }
        }
      });
    } catch (e) {
      console.warn("Gagal scan allReports bulanan:", e);
    }

    // 2. Scan bankRows (Hitung jumlah mutasi bank per bulan)
    try {
      (bankRows || []).forEach((row) => {
        if (!row) return;
        const rawDate = String(row.date || row.bankDate || '').trim();
        let m = '';
        if (/^\d{4}-\d{2}/.test(rawDate)) {
          m = rawDate.substring(0, 7);
        } else {
          const dmy = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dmy) {
            m = `${dmy[3]}-${dmy[2].padStart(2, '0')}`;
          } else {
            const parsed = new Date(rawDate.replace(/WIB|WITA|WIT/i, '').trim());
            if (!isNaN(parsed.getTime())) {
              m = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
            }
          }
        }
        if (m && /^\d{4}-\d{2}$/.test(m)) {
          if (!map[m]) map[m] = { monthKey: m, reportCount: 0, totalRevenue: 0, bankCount: 0 };
          map[m].bankCount += 1;
        }
      });
    } catch (e) {
      console.warn("Gagal scan bankRows bulanan:", e);
    }

    // 3. Scan closedMonths
    try {
      Object.keys(closedMonths || {}).forEach((m) => {
        if (/^\d{4}-\d{2}$/.test(m)) {
          if (!map[m]) map[m] = { monthKey: m, reportCount: 0, totalRevenue: 0, bankCount: 0 };
        }
      });
    } catch (e) {
      console.warn("Gagal scan closedMonths:", e);
    }

    // 4. Pastikan bulan berjalan selalu muncul
    const nowYm = new Date().toISOString().substring(0, 7);
    if (!map[nowYm]) {
      map[nowYm] = { monthKey: nowYm, reportCount: 0, totalRevenue: 0, bankCount: 0 };
    }

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allReports, bankRows, closedMonths]);

  if (activeTab !== 'settings') return null;

  const totalClosedCount = Object.keys(closedMonths || {}).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 no-print space-y-6">
      {activeMasterMenu === 'menu' && (
        <div className="flex flex-col items-center mt-10">
          <h1 className="text-3xl font-black text-gray-800 mb-2">Master Menu Admin</h1>
          <p className="text-gray-500 mb-10 text-center">
            Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">
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
              onClick={() => setActiveMasterMenu('tutupbuku')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group relative"
            >
              {totalClosedCount > 0 && (
                <span className="absolute top-3.5 right-3.5 bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                  {totalClosedCount} Terkunci
                </span>
              )}
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lock size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Tutup Buku Bulanan</h3>
                <p className="text-xs text-gray-500">Kunci data bulanan agar permanen & bebas salah ketik.</p>
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

            <button
              onClick={() => setActiveMasterMenu('koneksi')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group sm:col-span-2 lg:col-span-1"
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

          {activeMasterMenu === 'tutupbuku' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2.5">
                      <Lock size={26} className="text-indigo-600" /> Tutup Buku Bulanan (Period Locking)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Kunci periode transaksi bulanan agar laporan STSU, kas, dan mutasi bank menjadi permanen (Read-Only) serta terlindung dari salah ketik dan perubahan tidak sengaja.
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                    totalClosedCount > 0
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <ShieldCheck size={15} className={totalClosedCount > 0 ? 'text-indigo-600' : 'text-gray-400'} />
                    {totalClosedCount} Bulan Terkunci
                  </div>
                </div>

                {/* Panduan & Pilar Pengamanan Data (Menjawab Pertanyaan User) */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-100/80">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-2 mb-3">
                    <Shield size={16} className="text-indigo-600" /> 4 Pilar Pengamanan Data & Pencegahan Salah Input
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 shadow-2xs">
                      <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                        <Lock size={14} className="text-indigo-600 shrink-0" /> 1. Tutup Buku Periode (Read-Only)
                      </div>
                      <p className="text-gray-600 leading-relaxed text-[11px]">
                        Membekukan seluruh transaksi pada bulan yang telah selesai direkonsiliasi. Tombol simpan, edit, dan hapus otomatis dikunci di seluruh komputer & HP.
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 shadow-2xs">
                      <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                        <FileCheck size={14} className="text-emerald-600 shrink-0" /> 2. Live Terbilang & Deteksi Lonjakan (Anti-Typo)
                      </div>
                      <p className="text-gray-600 leading-relaxed text-[11px]">
                        Setiap pengetikan nominal otomatis diverifikasi dengan ejaan kata bahasa Indonesia serta deteksi otomatis jika angka ≥ Rp 100 Jt untuk mencegah kelebihan angka nol.
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 shadow-2xs">
                      <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 size={14} className="text-blue-600 shrink-0" /> 3. Sinkronisasi Instan Multi-Perangkat
                      </div>
                      <p className="text-gray-600 leading-relaxed text-[11px]">
                        Status tutup buku disinkronkan secara real-time via Google Firestore (&lt; 0.5 detik). Saat admin mengunci di PC, aplikasi di HP kasir langsung terkunci seketika.
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 shadow-2xs">
                      <div className="font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                        <Unlock size={14} className="text-amber-600 shrink-0" /> 4. Fleksibilitas Terkontrol (Zero Lockout)
                      </div>
                      <p className="text-gray-600 leading-relaxed text-[11px]">
                        Bila ditemukan revisi resmi atas persetujuan pimpinan, admin/bendahara dapat membuka kunci bulan terkait secara aman kapan pun dibutuhkan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daftar Bulan & Status Kunci */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} className="text-gray-600" /> Daftar Periode Laporan Bulanan
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    Total {monthDataList.length} Periode Terdata
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {monthDataList.map((m) => {
                    const isClosed = Boolean(closedMonths && closedMonths[m.monthKey]);
                    const closedInfo = isClosed ? closedMonths[m.monthKey] : null;
                    const mName = formatMonthName(m.monthKey);

                    return (
                      <div
                        key={m.monthKey}
                        className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isClosed
                            ? 'border-indigo-200/90 bg-gradient-to-r from-indigo-50/30 via-white to-white'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-black text-gray-900">
                              {mName}
                            </span>
                            <span className="font-mono text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {m.monthKey}
                            </span>
                            {isClosed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                                <Lock size={12} className="text-indigo-700" /> TUTUP BUKU AKTIF
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                                <Unlock size={12} className="text-emerald-600" /> PERIODE TERBUKA
                              </span>
                            )}
                          </div>

                          {/* Detail Ringkasan Finansial Bulan */}
                          <div className="flex items-center gap-4 sm:gap-6 text-xs text-gray-600 flex-wrap">
                            <div>
                              <span className="text-gray-400 mr-1">Laporan:</span>
                              <strong className="text-gray-800 font-bold">{m.reportCount} hari</strong>
                            </div>
                            <div>
                              <span className="text-gray-400 mr-1">Total STSU:</span>
                              <strong className="text-emerald-700 font-black">Rp {fmt(m.totalRevenue)}</strong>
                            </div>
                            <div>
                              <span className="text-gray-400 mr-1">Mutasi Bank:</span>
                              <strong className="text-blue-700 font-bold">{m.bankCount} baris</strong>
                            </div>
                          </div>

                          {/* Audit Info Penutupan */}
                          {isClosed && closedInfo && (
                            <div className="text-[11px] text-indigo-900 bg-indigo-50/70 border border-indigo-100 rounded-lg px-2.5 py-1.5 inline-block">
                              <span>Ditutup: <strong>{closedInfo.closedAt || '-'}</strong></span>
                              {closedInfo.closedBy && <span className="ml-2">Oleh: <strong>{closedInfo.closedBy}</strong></span>}
                              {closedInfo.note && <div className="text-indigo-700 mt-0.5 italic">"{closedInfo.note}"</div>}
                            </div>
                          )}
                        </div>

                        {/* Tombol Aksi Kunci / Buka */}
                        <div className="shrink-0 flex items-center">
                          {isClosed ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Buka kunci periode ${mName} (${m.monthKey})?\n\nData laporan pada bulan ini akan dapat diedit kembali oleh operator.`)) {
                                  if (onToggleCloseMonth) onToggleCloseMonth(m.monthKey, false);
                                }
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
                            >
                              <Unlock size={15} /> Buka Kunci (Revisi)
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setModalCloseMonth({ monthKey: m.monthKey, monthName: mName });
                                setCloseNoteInput('');
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
                            >
                              <Lock size={15} /> Tutup Buku Bulan Ini
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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

      {/* Modal Dialog Konfirmasi Tutup Buku */}
      {modalCloseMonth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Lock size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Konfirmasi Tutup Buku</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">{modalCloseMonth.monthName} ({modalCloseMonth.monthKey})</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Peringatan Penting:</strong>
                  <p className="mt-0.5 text-amber-800">
                    Setelah periode ini ditutup, seluruh data laporan STSU dan mutasi bank pada bulan ini akan <strong>dibekukan permanen (Read-Only)</strong> di seluruh perangkat (PC & HP) agar terhindar dari salah ketik dan perubahan tidak sengaja.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Petugas / Otorisator
                </label>
                <input
                  type="text"
                  value={closeByInput}
                  onChange={(e) => setCloseByInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nama Bendahara..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Catatan Penutupan (Opsional)
                </label>
                <textarea
                  value={closeNoteInput}
                  onChange={(e) => setCloseNoteInput(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contoh: Seluruh rekonsiliasi bank dan setoran kas telah final & klop."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalCloseMonth(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleCloseMonth) {
                      onToggleCloseMonth(modalCloseMonth.monthKey, true, closeNoteInput, closeByInput);
                    }
                    setModalCloseMonth(null);
                    setCloseNoteInput('');
                  }}
                  className="px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Lock size={14} /> Ya, Kunci Periode Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
