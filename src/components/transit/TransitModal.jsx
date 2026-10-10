import React from 'react';
import { Trash, Database, AlertCircle, RefreshCw, Tag, Save } from 'lucide-react';

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
                <h3 className="font-bold text-lg sm:text-xl text-gray-800">Ruang Transit {transitModal.source === '3a' ? '3A' : 'IWM'}</h3>
              </div>
              <button onClick={closeTransitModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">✕</button>
            </div>
            
            <div className="p-4 sm:p-5 bg-gray-50 flex-1 overflow-y-auto min-h-0">
              <div className="space-y-3">
                {transitModal.data.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm truncate" title={safeString(item.nameAPI)}>{safeString(item.nameAPI)}</div>
                      <div className={`${transitModal.source === 'iwm' ? 'text-purple-600' : 'text-blue-600'} font-black text-sm`}>Rp {formatRp(item.amount)}</div>
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
                    <div className="bg-yellow-50 px-3 py-2 border-b border-yellow-200 flex items-center gap-2">
                      <Tag size={16} className="text-yellow-700" />
                      <span className="font-bold text-xs text-yellow-800 uppercase">Daftar Mentah Rombongan IWM</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                          <tr>
                            <th className="p-2 pl-3">Lokasi</th>
                            <th className="p-2">Nama Rombongan</th>
                            <th className="p-2 text-right">Anak</th>
                            <th className="p-2 text-right">Dewasa</th>
                            <th className="p-2 text-right pr-3">Total Nominal (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {transitModal.iwmDiskon.map((d, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2 pl-3 font-medium text-gray-800">{safeString(d.lokasi)}</td>
                              <td className="p-2 text-gray-600 truncate max-w-[150px]" title={safeString(d.nama_rombongan)}>{safeString(d.nama_rombongan)}</td>
                              <td className="p-2 text-right text-gray-600">{d.masuk_anak}</td>
                              <td className="p-2 text-right text-gray-600">{d.masuk_dewasa}</td>
                              <td className="p-2 text-right pr-3 font-bold text-green-600">{formatRp(d.pendapatan_rp)}</td>
                            </tr>
                          ))}
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
                onClick={confirmTransitInjection}
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
