import React, { useMemo } from 'react';
import { Trash, Database, AlertCircle, RefreshCw, Tag, Save, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { checkTransitItemTarif, validateIwmDiskonRow } from '../../utils/transitValidation';

/**
 * Komponen Modal Ruang Transit 3A & IWM
 * Mengelola dialog konfirmasi tanggal, overwrite, status loading, dan mapping kategori/sub-kategori.
 */
export default function TransitModal({
  transitModal,
  closeTransitModal,
  executeFetchData,
  confirmTransitInjection,
  updateTransitMapping,
  setTransitModal,
  currentReport = {},
  categories = [],
  activeType = 'utama',
  formatTanggalPopUp,
  formatRp,
  safeString
}) {
  const itemChecks = useMemo(() => {
    return (transitModal?.data || []).map(item => ({
      item,
      check: checkTransitItemTarif(item, categories, transitModal?.targetDate)
    }));
  }, [transitModal?.data, categories, transitModal?.targetDate]);

  const invalidCount = useMemo(() => {
    return itemChecks.filter(ic => !ic.check.isValid).length;
  }, [itemChecks]);

  const validCount = useMemo(() => {
    return itemChecks.filter(ic => ic.check.isValid).length;
  }, [itemChecks]);

  if (!transitModal || !transitModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ${transitModal.step === 'mapping' ? 'max-w-5xl max-h-[90vh]' : 'max-w-md'}`}>
        
        {/* TAHAP 1: KONFIRMASI TANGGAL */}
        {transitModal.step === 'confirm_date' && (
          <div className="p-8 text-center relative">
            <button onClick={closeTransitModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <Trash size={20} className="opacity-0" /> 
              <span className="absolute top-0 right-0 p-1">✕</span>
            </button>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner ${transitModal.source === 'iwm' ? 'bg-purple-50' : 'bg-blue-50'}`}>
              <Database size={36} className={transitModal.source === 'iwm' ? 'text-purple-500' : 'text-blue-500'} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-3">Tarik Data {transitModal.source === '3a' ? '3A' : 'IWM'}</h3>
            <p className="text-gray-600 mb-8 font-medium">
              Apakah Anda akan mengambil data dari sistem <strong>{transitModal.source === '3a' ? '3A' : 'IWM'}</strong> untuk hari <strong className={transitModal.source === 'iwm' ? 'text-purple-700' : 'text-blue-700'}>{formatTanggalPopUp(transitModal.targetDate)}</strong>?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={closeTransitModal} className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors order-2 sm:order-1">
                Batal
              </button>
              <button 
                onClick={() => {
                  if (currentReport.activeItems && currentReport.activeItems.length > 0) {
                    setTransitModal(prev => ({...prev, step: 'confirm_overwrite'}));
                  } else {
                    executeFetchData(false);
                  }
                }} 
                className={`px-5 py-3 text-white font-bold rounded-xl shadow-md transition-colors order-1 sm:order-2 flex items-center justify-center gap-2 ${transitModal.source === 'iwm' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Ya, Tarik Data
              </button>
            </div>
          </div>
        )}

        {/* TAHAP 2: KONFIRMASI OVERWRITE */}
        {transitModal.step === 'confirm_overwrite' && (
          <div className="p-8 text-center relative">
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertCircle size={36} className="text-yellow-600" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-3">Data Sudah Terisi</h3>
            <p className="text-gray-600 mb-8 text-sm">
              Sudah ada data STSU yang tersimpan pada tanggal ini. Apakah data sebelumnya akan <strong>ditimpa</strong> dengan data baru dari {transitModal.source === '3a' ? '3A' : 'IWM'}?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={closeTransitModal} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors order-3 sm:order-1 text-sm">
                Batal
              </button>
              <button onClick={() => executeFetchData(false)} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-colors order-2 text-sm">
                Gabungkan
              </button>
              <button onClick={() => executeFetchData(true)} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors order-1 sm:order-3 text-sm">
                Ya, Timpa Data
              </button>
            </div>
          </div>
        )}

        {/* TAHAP 3: LOADING API */}
        {transitModal.step === 'loading' && (
          <div className="p-10 text-center flex flex-col items-center">
            <RefreshCw size={48} className={`animate-spin mb-6 ${transitModal.source === 'iwm' ? 'text-purple-500' : 'text-blue-500'}`} />
            <h3 className="text-xl font-black text-gray-800 mb-2">Menghubungi Server Bot...</h3>
            <p className="text-sm text-gray-500 font-medium">Sedang mengekstrak data dari portal {transitModal.source === '3a' ? '3A' : 'IWM'}. Silakan tunggu beberapa detik.</p>
          </div>
        )}

        {/* TAHAP 4: ERROR */}
        {transitModal.step === 'error' && (
          <div className="p-8 text-center relative">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertCircle size={36} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-3">Gagal Menarik Data</h3>
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 text-sm mb-8 text-left max-h-32 overflow-y-auto">
              {safeString(transitModal.error)}
            </div>
            <button onClick={closeTransitModal} className="px-6 py-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors shadow-sm">
              Tutup & Periksa Bot
            </button>
          </div>
        )}

        {/* TAHAP 5: MAPPING (Ruang Transit) */}
        {transitModal.step === 'mapping' && (
          <>
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Database size={24} className={transitModal.source === 'iwm' ? 'text-purple-600' : 'text-blue-600'} />
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-gray-800">Ruang Transit {transitModal.source === '3a' ? '3A' : 'IWM'}</h3>
                  <p className="text-xs text-gray-500 font-medium">Validasi & sesuaikan kategori item sebelum disuntikkan ke formulir input STSU</p>
                </div>
              </div>
              <button onClick={closeTransitModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">✕</button>
            </div>
            
            <div className="p-4 sm:p-5 bg-gray-50 flex-1 overflow-y-auto min-h-0">
              <div className="space-y-3">
                {/* 🛡️ BANNER PARAMETER PENGECEKAN TARIF & NOMINAL */}
                {transitModal.data.length > 0 && (
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs mb-3 ${
                    invalidCount > 0 ? 'bg-amber-50/90 border-amber-300 text-amber-950' : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {invalidCount > 0 ? (
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                      ) : (
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-extrabold text-xs flex items-center gap-1.5">
                          <span>{invalidCount > 0 ? `Perhatian: Ada ${invalidCount} nominal yang perlu dicek kembali!` : 'Parameter Pengecekan Tarif: Semua Nominal Valid & Bulat'}</span>
                        </div>
                        <div className="text-gray-600 text-[11px] mt-0.5">
                          Setiap nominal rupiah dibagi tarif resmi wajib bulat / tidak berkoma (Dewasa: Rp 4rb, Anak: Rp 3rb, Gol I: Rp 15rb, Gol II: Rp 12.5rb, Gol III: Rp 6rb, Motor: Rp 3rb, Sepeda: Rp 1rb, Primata: Rp 6rb/7.5rb, Diskon Rombongan: 25%).
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-bold self-end sm:self-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" /> {validCount} OK
                      </span>
                      {invalidCount > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={12} className="text-red-600" /> {invalidCount} Cek Kembali
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {itemChecks.map(({ item, check }) => (
                  <div 
                    key={item.id} 
                    className={`bg-white border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm hover:shadow-md transition-all ${
                      !check.isValid ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm truncate" title={safeString(item.nameAPI)}>
                        {safeString(item.nameAPI)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`${transitModal.source === 'iwm' ? 'text-purple-600' : 'text-blue-600'} font-black text-sm`}>
                          Rp {formatRp(item.amount)}
                        </span>
                        
                        {/* 🟢 PARAMETER HIJAU (OK) / 🔴 MERAH (CEK KEMBALI) */}
                        {check.isValid ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                            title={`Nominal bulat habis dibagi tarif ${check.unitLabel || ''}`}
                          >
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            <span>OK: {check.label}</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-300 shadow-2xs"
                            title={check.message}
                          >
                            <AlertTriangle size={12} className="text-red-600 shrink-0" />
                            <span>⚠️ {check.message || 'Cek Kembali'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0 items-center">
                      <select 
                        value={item.mappedCat || ''} 
                        onChange={(e) => updateTransitMapping(item.id, 'mappedCat', e.target.value)}
                        className={`w-full sm:w-44 border rounded-lg p-2 text-xs outline-none focus:ring-2 font-medium ${item.mappedCat ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'} ${transitModal.source === 'iwm' ? 'focus:ring-purple-500' : 'focus:ring-blue-500'}`}
                      >
                        <option value="">-- Kategori --</option>
                        {categories.filter(c => c.type === activeType).map(cat => <option key={cat.id} value={cat.id}>{safeString(cat.name)}</option>)}
                      </select>
                      
                      <select 
                        value={item.mappedItem || ''} 
                        onChange={(e) => updateTransitMapping(item.id, 'mappedItem', e.target.value)}
                        disabled={!item.mappedCat}
                        className={`w-full sm:w-48 border rounded-lg p-2 text-xs outline-none focus:ring-2 font-medium ${!item.mappedCat ? 'bg-gray-100 text-gray-400' : item.mappedItem ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'} ${transitModal.source === 'iwm' ? 'focus:ring-purple-500' : 'focus:ring-blue-500'}`}
                      >
                        {!item.mappedCat ? <option value="">Pilih Kategori Dulu</option> : <option value="">-- Sub Kategori --</option>}
                        {item.mappedCat && categories.find(c => c.id === item.mappedCat)?.items?.length === 0 && <option value="direct">Isi Nominal</option>}
                        {item.mappedCat && categories.find(c => c.id === item.mappedCat)?.items?.map(sub => <option key={sub.id} value={sub.id}>{safeString(sub.name)}</option>)}
                      </select>
                      
                      <button 
                        onClick={() => setTransitModal(prev => ({...prev, data: prev.data.filter(d => d.id !== item.id)}))}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Jangan Import Data Ini"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {transitModal.data.length === 0 && <div className="p-6 text-center text-gray-500 font-medium">Semua data telah dihapus/dibatalkan dari daftar import.</div>}

                {transitModal.source === 'iwm' && transitModal.iwmDiskon && transitModal.iwmDiskon.length > 0 && (
                  <div className="mt-4 border border-yellow-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="bg-yellow-50 px-3 py-2 border-b border-yellow-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-yellow-700" />
                        <span className="font-bold text-xs text-yellow-800 uppercase">Daftar Mentah Rombongan IWM</span>
                      </div>
                      <span className="text-[11px] font-semibold text-yellow-800 bg-yellow-100/70 border border-yellow-300 px-2 py-0.5 rounded-full">
                        Diskon Rombongan Resmi: 25%
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                          <tr>
                            <th className="p-2 pl-3">Lokasi</th>
                            <th className="p-2">Nama Rombongan</th>
                            <th className="p-2 text-right">Anak</th>
                            <th className="p-2 text-right">Dewasa</th>
                            <th className="p-2 text-right">Total Nominal (Rp)</th>
                            <th className="p-2 text-center pr-3">Pengecekan Diskon 25%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {transitModal.iwmDiskon.map((d, i) => {
                            const diskonCheck = validateIwmDiskonRow(d, transitModal.targetDate);
                            return (
                              <tr key={i} className={`hover:bg-gray-50 ${!diskonCheck.isValid ? 'bg-red-50/30' : ''}`}>
                                <td className="p-2 pl-3 font-medium text-gray-800">{safeString(d.lokasi)}</td>
                                <td className="p-2 text-gray-600 truncate max-w-[150px]" title={safeString(d.nama_rombongan)}>{safeString(d.nama_rombongan)}</td>
                                <td className="p-2 text-right text-gray-600">{d.masuk_anak}</td>
                                <td className="p-2 text-right text-gray-600">{d.masuk_dewasa}</td>
                                <td className="p-2 text-right font-bold text-green-600">Rp {formatRp(d.pendapatan_rp)}</td>
                                <td className="p-2 text-center pr-3">
                                  {diskonCheck.isValid ? (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      title={diskonCheck.label}
                                    >
                                      <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                                      <span>OK ({diskonCheck.label})</span>
                                    </span>
                                  ) : (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-300"
                                      title={diskonCheck.message}
                                    >
                                      <AlertTriangle size={11} className="text-red-600 shrink-0" />
                                      <span>Cek Kembali ({diskonCheck.message})</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center shrink-0">
              <button onClick={closeTransitModal} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                Batal / Kembali
              </button>
              <button 
                onClick={() => {
                  if (invalidCount > 0) {
                    if (!window.confirm(`Perhatian: Ditemukan ${invalidCount} item dengan nominal yang tidak bulat / perlu dicek kembali (tanda merah).\n\nApakah Anda yakin ingin tetap melanjutkan import data ini ke formulir input?`)) {
                      return;
                    }
                  }
                  confirmTransitInjection();
                }}
                disabled={transitModal.data.length === 0 || transitModal.data.some(d => d.mappedCat && !d.mappedItem)}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <Save size={16} /> Import ke Form
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
