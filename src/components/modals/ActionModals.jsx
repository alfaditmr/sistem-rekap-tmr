import React from 'react';
import { AlertCircle, Edit, RefreshCw, Sparkles } from 'lucide-react';
import { safeString } from '../../utils/formatters';

/**
 * Komponen modal dialog aksi (Konfirmasi, Reset, dan Edit Uraian Catatan)
 */
export default function ActionModals({
  confirmDialog,
  setConfirmDialog,
  editNoteModal,
  setEditNoteModal,
  isGeneratingUraian,
  setIsGeneratingUraian,
  callGeminiAPI,
  saveEditedNote,
  resetDialog,
  setResetDialog,
  handleConfirmReset,
  activeType
}) {
  return (
    <>
      {/* DIALOG KONFIRMASI UMUM */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="font-bold text-xl">Konfirmasi</h3>
            </div>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">
              {safeString(confirmDialog.message)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT URAIAN CATATAN DINAMIS */}
      {editNoteModal?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <Edit size={28} />
              <h3 className="font-bold text-xl">Edit Uraian Dinamis</h3>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">
                  Keterangan / Uraian:
                </label>
                <button
                  onClick={async () => {
                    if (!editNoteModal.newNote) return;
                    setIsGeneratingUraian(true);
                    try {
                      const prompt = `Rapikan catatan singkat berikut menjadi satu frasa atau kalimat resmi yang baku, sopan, dan formal untuk keperluan dokumen Surat Tanda Setoran Uang (STSU) bagian keterangan. Jangan tambahkan kata pengantar atau penutup, langsung berikan hasilnya. Catatan asli: "${editNoteModal.newNote}"`;
                      const result = await callGeminiAPI(
                        prompt,
                        "Anda adalah asisten admin keuangan Sistem Rekap STSU."
                      );
                      setEditNoteModal((prev) => ({ ...prev, newNote: result.trim() }));
                    } catch (e) {
                    } finally {
                      setIsGeneratingUraian(false);
                    }
                  }}
                  disabled={!editNoteModal.newNote || isGeneratingUraian}
                  className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded border border-purple-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingUraian ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}{' '}
                  ✨ AI Rapikan
                </button>
              </div>
              <textarea
                value={editNoteModal.newNote}
                onChange={(e) =>
                  setEditNoteModal((prev) => ({ ...prev, newNote: e.target.value }))
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 bg-gray-50 font-medium resize-none"
                placeholder="Masukkan keterangan baru..."
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setEditNoteModal({ isOpen: false, group: null, item: null, newNote: '' })
                }
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={saveEditedNote}
                disabled={!editNoteModal.newNote.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm disabled:opacity-50"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG RESET FORM STSU DENGAN PASSWORD ADMIN */}
      {resetDialog?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="font-bold text-xl">Konfirmasi Reset</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm font-medium">
              Apakah Anda yakin ingin <strong className="text-red-600">MENGHAPUS SEMUA DATA</strong> di form STSU{' '}
              {activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'} untuk tanggal ini? Data tidak dapat dikembalikan.
            </p>
            {resetDialog.error && (
              <div className="bg-red-50 text-red-600 p-2 rounded text-xs mb-4 border border-red-100 font-semibold">
                {safeString(resetDialog.error)}
              </div>
            )}
            <form onSubmit={handleConfirmReset}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Masukkan Password ADMIN
                </label>
                <input
                  type="password"
                  value={resetDialog.password}
                  onChange={(e) =>
                    setResetDialog((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-red-500 bg-gray-50 font-bold"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false })
                  }
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetDialog.isVerifying}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm disabled:opacity-50"
                >
                  {resetDialog.isVerifying ? 'Memeriksa...' : 'Ya, Hapus Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
