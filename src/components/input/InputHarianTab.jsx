import React from 'react';
import {
  CloudDownload,
  Plus,
  Calendar,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Trash,
  Edit,
  CheckCircle,
  ArrowUp,
  Save,
  FileText,
  Layers,
  Lock
} from 'lucide-react';
import {
  safeString,
  formatRp,
  terbilang,
  formatTanggalTtd,
  parseYmd,
  getActiveItemKey
} from '../../utils/formatters';

/**
 * Komponen Tab Input Operasional Harian STSU
 * Menangani input nominal, form tambah transaksi manual, manajemen multi-dokumen lain-lain,
 * integrasi tombol Bot 3A & IWM, serta bottom floating bar aksi.
 */
export default function InputHarianTab({
  activeTab,
  activeType,
  handleTypeSwitch,
  handleOpenTransit3A,
  handleOpenTransitIWM,
  lainDocIndices = [1],
  activeLainIndex = 1,
  setActiveLainIndex,
  handleAddLainDoc,
  handleRemoveLainDoc,
  reportDate,
  handleDateChange,
  currentReport = {},
  handleSignatureDateChange,
  handleSequenceChange,
  computedStsuNo,
  grandTotal = 0,
  isAddingSusulan,
  setIsAddingSusulan,
  susulanValidDate,
  setSusulanValidDate,
  lainItemDate,
  setLainItemDate,
  selectedCatToAdd,
  setSelectedCatToAdd,
  handleCatChange,
  filteredCategories = [],
  selectedItemToAdd,
  setSelectedItemToAdd,
  availableItemsToAdd = [],
  manualNominalToAdd,
  setManualNominalToAdd,
  lainItemNote,
  setLainItemNote,
  handleGenerateUraian,
  isGeneratingUraian,
  handleAddActiveItem,
  activeGroups = [],
  handleRemoveActiveItem,
  openEditNote,
  handleInputChange,
  triggerSaveToFirebase,
  subtotals = {},
  clearCurrentReport,
  handleForceSave,
  onViewDraftCetak,
  isMonthClosed = false,
  closedInfo = null
}) {
  if (activeTab !== 'input') return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 no-print">
      {/* 🔒 BANNER PERIODE TUTUP BUKU */}
      {isMonthClosed && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm flex items-start gap-3.5 animate-in fade-in">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <Lock size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-amber-950 text-base">Periode Laporan Ini Telah Tutup Buku</span>
              <span className="bg-amber-200/90 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-black border border-amber-300 flex items-center gap-1 shadow-2xs">
                <Lock size={11} /> Data Terkunci (Read-Only)
              </span>
            </div>
            <p className="text-xs text-amber-900 mt-1 leading-relaxed">
              Seluruh data transaksi dan nominal laporan pada periode bulan ini sudah difinalisasi dan dikunci permanen untuk mencegah perubahan atau penghapusan yang tidak sengaja.
              {closedInfo?.closedBy && (
                <span className="block mt-1 font-semibold text-amber-950">
                  Ditutup oleh: <span className="underline">{closedInfo.closedBy}</span>
                  {closedInfo.closedAt ? ` (${new Date(closedInfo.closedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })})` : ''}
                </span>
              )}
            </p>
            <p className="text-[11px] text-amber-800 font-medium mt-1.5 pt-1.5 border-t border-amber-200/70">
              💡 Draft cetak (PDF / NCR Dot Matrix) dan rincian transaksi tetap 100% dapat diakses dan dicetak. Untuk revisi resmi, bendahara/admin dapat membuka kunci di menu Master &gt; Tutup Buku.
            </p>
          </div>
        </div>
      )}

      {/* 1. Tipe STSU Switcher & Bot Trigger Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1.5 flex flex-col sm:flex-row w-full sm:w-auto">
          <button
            onClick={() => handleTypeSwitch('utama')}
            className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all ${activeType === 'utama'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-transparent text-gray-500 hover:bg-green-50 hover:text-green-600'
              }`}
          >
            STSU Pendapatan
          </button>
          <button
            onClick={() => handleTypeSwitch('lain')}
            className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all ${activeType === 'lain'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-transparent text-gray-500 hover:bg-purple-50 hover:text-purple-600'
              }`}
          >
            STSU Lain-lain
          </button>
        </div>

        {/* PANEL DUA TOMBOL ROBOT (3A & IWM) */}
        {activeType === 'utama' && !isMonthClosed && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenTransit3A}
              className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm rounded-xl px-4 py-2.5 font-bold flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all group"
            >
              <CloudDownload size={20} className="group-hover:-translate-y-0.5 transition-transform" />
              <span>Tarik 3A</span>
            </button>
            <button
              onClick={handleOpenTransitIWM}
              className="bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 shadow-sm rounded-xl px-4 py-2.5 font-bold flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all group"
            >
              <CloudDownload size={20} className="group-hover:-translate-y-0.5 transition-transform" />
              <span>Tarik IWM</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Tabs Multi Dokumen Lain-Lain */}
      {activeType === 'lain' && (
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 items-center">
          {lainDocIndices.map((num) => (
            <div key={num} className="relative flex-shrink-0 group">
              <button
                onClick={() => {
                  if (triggerSaveToFirebase) triggerSaveToFirebase();
                  setActiveLainIndex(num);
                  if (setSelectedCatToAdd) setSelectedCatToAdd('');
                  if (setSelectedItemToAdd) setSelectedItemToAdd('');
                  if (setManualNominalToAdd) setManualNominalToAdd('');
                  if (setLainItemDate) setLainItemDate('');
                  if (setLainItemNote) setLainItemNote('');
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all border ${activeLainIndex === num
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105'
                  : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                  }`}
              >
                Dokumen Ke-{num}
              </button>
              {num > 1 && !isMonthClosed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLainDoc(num);
                  }}
                  className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md z-10 hover:bg-red-600 border border-white transition-opacity ${activeLainIndex === num ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  title="Hapus Dokumen"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {!isMonthClosed && (
            <button
              onClick={handleAddLainDoc}
              className="px-3 py-2 ml-1 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100 flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} /> Tambah Dokumen
            </button>
          )}
        </div>
      )}

      {/* 3. Header Info Dokumen STSU */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${activeType === 'utama' ? 'bg-green-500' : 'bg-purple-500'
            }`}
        >
          Dokumen {activeType === 'utama' ? 'STSU (SU)' : `Lain-lain (SU/L) - Ke ${activeLainIndex}`}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Tgl Laporan (Di Atas)
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 font-bold text-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Tgl Cetak (Bawah/TTD)
            </label>
            <input
              type="date"
              readOnly={isMonthClosed}
              value={currentReport.signatureDate || ''}
              onChange={handleSignatureDateChange}
              onBlur={() => {
                if (triggerSaveToFirebase) triggerSaveToFirebase();
              }}
              className={`w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 font-bold ${isMonthClosed ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-blue-50 text-blue-700'
                }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Nomor Urut STSU
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="07"
                readOnly={isMonthClosed}
                value={currentReport.sequence || ''}
                onChange={handleSequenceChange}
                onBlur={() => {
                  if (triggerSaveToFirebase) triggerSaveToFirebase();
                }}
                className={`w-16 border border-gray-300 rounded-lg p-2.5 text-center font-bold outline-none focus:border-blue-500 text-lg ${isMonthClosed ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white shadow-inner'
                  }`}
              />
              <div className="flex-1 border border-dashed border-gray-300 rounded-lg bg-gray-50 p-2 flex items-center overflow-x-auto min-w-0">
                <span className="font-mono font-bold text-gray-600 text-xs sm:text-sm whitespace-nowrap truncate">
                  {safeString(computedStsuNo || 'Preview...')}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`p-3 rounded-xl border flex flex-col justify-center shadow-inner items-end ${activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'
              }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${activeType === 'utama' ? 'text-green-600' : 'text-purple-600'
                }`}
            >
              Total {activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'}
            </span>
            <span
              className={`text-lg sm:text-xl font-black truncate max-w-full ${activeType === 'utama' ? 'text-green-800' : 'text-purple-800'
                }`}
              title={`Rp ${formatRp(grandTotal)}`}
            >
              Rp {formatRp(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Form Tambah Transaksi Manual */}
      {isMonthClosed ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 sm:p-5 mb-6 flex items-center justify-between text-gray-500 text-sm shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-gray-400 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-gray-600">
              Form penambahan transaksi dinonaktifkan karena periode laporan tanggal ini telah Tutup Buku.
            </span>
          </div>
          <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md font-bold shrink-0">
            🔒 Terkunci
          </span>
        </div>
      ) : (
        <div
          id="form-tambah-transaksi"
          className={`${activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'
            } rounded-xl shadow-sm border p-4 mb-6 transition-colors`}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2
              className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wide ${activeType === 'utama' ? 'text-green-800' : 'text-purple-800'
                }`}
            >
              <Plus size={18} /> Tambah Transaksi Manual
            </h2>
            {activeType === 'utama' && (
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-yellow-700 bg-yellow-100/80 px-3 py-1.5 rounded-lg border border-yellow-300 hover:bg-yellow-200 transition-colors shadow-sm w-fit">
                <input
                  type="checkbox"
                  checked={isAddingSusulan}
                  onChange={(e) => setIsAddingSusulan(e.target.checked)}
                  className="w-4 h-4 accent-yellow-600"
                />{' '}
                Mode Susulan
              </label>
            )}
          </div>

          {activeType === 'utama' && isAddingSusulan && (
            <div className="mb-4 p-3 bg-yellow-100/50 border border-yellow-200 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in duration-200">
              <AlertCircle size={18} className="text-yellow-600 shrink-0" />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-yellow-800 uppercase">
                  Tanggal Validasi Susulan:
                </span>
                <input
                  type="date"
                  value={susulanValidDate}
                  onChange={(e) => setSusulanValidDate(e.target.value)}
                  className="border border-yellow-300 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                />
              </div>
            </div>
          )}

          {activeType === 'lain' && (
            <div className="mb-4 p-3 bg-purple-100/50 border border-purple-200 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in duration-200">
              <Calendar size={18} className="text-purple-600 shrink-0" />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-purple-800 uppercase">
                  Pilih Tanggal Transaksi:
                </span>
                <input
                  type="date"
                  value={lainItemDate}
                  onChange={(e) => setLainItemDate(e.target.value)}
                  className="border border-purple-300 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
                    }`}
                >
                  Kategori
                </label>
                <select
                  value={selectedCatToAdd}
                  onChange={(e) => handleCatChange(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="capitalize">
                      {safeString(cat.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
                    }`}
                >
                  Sub-Kategori
                </label>
                <select
                  value={selectedItemToAdd}
                  onChange={(e) => setSelectedItemToAdd(e.target.value)}
                  disabled={
                    !selectedCatToAdd ||
                    availableItemsToAdd.length === 0 ||
                    (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct')
                  }
                  className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {!selectedCatToAdd ? (
                    <option value="">Pilih Kategori Dulu</option>
                  ) : availableItemsToAdd.length === 0 ? (
                    <option value="">Semua item ditambahkan</option>
                  ) : availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct' ? (
                    <option value="direct">Langsung isi nominal</option>
                  ) : (
                    <option value="">-- Pilih Item --</option>
                  )}
                  {availableItemsToAdd.map(
                    (item) =>
                      item.id !== 'direct' && (
                        <option key={item.id} value={item.id}>
                          {safeString(item.name)}
                        </option>
                      )
                  )}
                </select>
              </div>
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
                    }`}
                >
                  Nominal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={manualNominalToAdd ? formatRp(manualNominalToAdd) : ''}
                    onChange={(e) => setManualNominalToAdd(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-gray-300 bg-white rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 text-right shadow-inner"
                  />
                </div>
                {/* 🛡️ PENGAMAN SALAH KETIK: Live Terbilang & Peringatan Angka Ekstrem */}
                {manualNominalToAdd && (
                  <div className="mt-1 space-y-1">
                    <p className="text-[11px] text-gray-600 font-medium italic truncate" title={`${terbilang(manualNominalToAdd)} rupiah`}>
                      "{terbilang(manualNominalToAdd)} rupiah"
                    </p>
                    {Number(manualNominalToAdd) >= 100000000 && (
                      <div className="text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-300 px-2 py-1 rounded-md flex items-center gap-1.5 animate-in fade-in">
                        <span>⚠️</span> Nominal sangat besar (Rp {formatRp(manualNominalToAdd)}). Pastikan digit 0 (nol) sudah benar.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {activeType === 'lain' && (
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-xs font-semibold text-purple-700">
                    Keterangan Tambahan / Uraian Dinamis (Cetak di Judul)
                  </label>
                  <button
                    onClick={handleGenerateUraian}
                    disabled={!lainItemNote || isGeneratingUraian}
                    className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded border border-purple-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    {isGeneratingUraian ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}{' '}
                    ✨ Rapikan Bahasa
                  </button>
                </div>
                <textarea
                  value={lainItemNote}
                  onChange={(e) => setLainItemNote(e.target.value)}
                  rows={2}
                  className="w-full border border-purple-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  placeholder="Contoh: Rombongan anak tk bintang pakai bus 20 org"
                ></textarea>
              </div>
            )}
            <button
              onClick={handleAddActiveItem}
              disabled={!selectedCatToAdd || !selectedItemToAdd}
              className={`w-full mt-2 text-white p-3 rounded-lg font-bold flex justify-center items-center transition-colors shadow-sm disabled:bg-gray-300 ${activeType === 'utama'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
                }`}
            >
              Add Transaksi
            </button>
          </div>
        </div>
      )}

      {/* 5. Daftar Grup dan Kartu Item Transaksi */}
      <div className="space-y-5">
        {activeGroups.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
            <AlertCircle size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 font-medium">Belum ada pendapatan yang dimasukkan.</p>
          </div>
        ) : (
          activeGroups.map((group, idx) => (
            <div
              key={group.groupId}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${group.isSusulan ? 'border-yellow-300' : 'border-gray-200'
                }`}
            >
              <div
                className={`px-4 py-3 border-b flex justify-between items-center ${group.isSusulan
                  ? 'bg-yellow-50 border-yellow-200'
                  : activeType === 'utama'
                    ? 'bg-green-50/50 border-green-100'
                    : 'bg-purple-50/50 border-purple-100'
                  }`}
              >
                <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${group.isSusulan
                      ? 'bg-yellow-400 text-yellow-900'
                      : activeType === 'utama'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-purple-200 text-purple-800'
                      }`}
                  >
                    {idx + 1}
                  </span>
                  {safeString(group.name)}
                  {group.isSusulan && (
                    <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 shadow-sm">
                      Susulan: {formatTanggalTtd(group.validDate)}
                    </span>
                  )}
                  {activeType === 'lain' && group.itemDate && (
                    <span className="text-[10px] bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 shadow-sm">
                      Tanggal: {formatTanggalTtd(group.itemDate)}
                    </span>
                  )}
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {group.activeItems.map((item) => {
                  const inputKey = getActiveItemKey(
                    group.catId,
                    item.id,
                    group.isSusulan,
                    group.validDate,
                    group.itemDate,
                    item.itemNote
                  );
                  return (
                    <div
                      key={inputKey}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2 sm:w-1/2">
                        {!isMonthClosed && (
                          <button
                            onClick={() => handleRemoveActiveItem(item, inputKey)}
                            className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm mt-0.5 shrink-0"
                            title="Hapus baris"
                          >
                            <Trash size={18} />
                          </button>
                        )}
                        <div className="flex flex-col w-full">
                          <label className="text-gray-700 font-medium">
                            {item.id === 'direct' ? 'Nominal Pemasukan' : safeString(item.name)}
                          </label>
                          <div className="flex items-center gap-2 mt-1 group/note w-full">
                            {item.itemNote ? (
                              <>
                                <span className="text-xs text-purple-600 whitespace-pre-wrap font-medium flex-1">
                                  {safeString(item.itemNote)}
                                </span>
                                {!isMonthClosed && (
                                  <button
                                    onClick={() => openEditNote(group, item)}
                                    className="text-gray-400 hover:text-blue-600 opacity-50 group-hover/note:opacity-100 transition-opacity bg-gray-50 p-1 rounded-md shrink-0"
                                    title="Edit Keterangan"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                              </>
                            ) : !isMonthClosed ? (
                              <button
                                onClick={() => openEditNote(group, item)}
                                className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                              >
                                <Edit size={12} /> Tambah Keterangan
                              </button>
                            ) : null}
                          </div>

                          {/* DETAIL TRANSAKSI GABUNGAN (NON-PRINTED) */}
                          {Array.isArray(item.bankAllocations) && item.bankAllocations.length > 1 && (
                            <div className="mt-2.5 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl print:hidden text-xs space-y-1.5 shadow-2xs w-full">
                              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                                <Layers size={11} className="text-indigo-600" /> Rincian Transaksi ({item.bankAllocations.length} Mutasi):
                              </div>
                              <div className="space-y-1">
                                {item.bankAllocations.map((alloc, aIdx) => (
                                  <div key={aIdx} className="flex items-center justify-between text-slate-700 font-medium py-0.5 border-b border-indigo-100/60 last:border-0">
                                    <span className="truncate pr-2 text-[11px] font-semibold text-slate-800" title={alloc.desc || alloc.tenant || (alloc.bankDate ? `Mutasi ${alloc.bankDate}` : '')}>
                                      • {alloc.desc || alloc.tenant || (alloc.bankDate ? `Mutasi (${alloc.bankDate})` : `Transaksi ${aIdx + 1}`)}
                                    </span>
                                    <span className="font-black shrink-0 text-indigo-900 text-xs">
                                      Rp {formatRp(alloc.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="relative w-full sm:w-1/2 md:w-2/5 shrink-0 mt-2 sm:mt-0 flex flex-col items-end">
                        <div className="relative w-full">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-medium ${isMonthClosed ? 'text-gray-400' : 'text-gray-500'}`}>
                            Rp
                          </span>
                          <input
                            id={`input_${inputKey}`}
                            type="text"
                            inputMode="numeric"
                            readOnly={isMonthClosed}
                            disabled={isMonthClosed}
                            value={
                              currentReport.formData && currentReport.formData[inputKey]
                                ? formatRp(currentReport.formData[inputKey])
                                : ''
                            }
                            onChange={(e) => !isMonthClosed && handleInputChange(inputKey, e.target.value)}
                            onBlur={() => {
                              if (!isMonthClosed && triggerSaveToFirebase) triggerSaveToFirebase();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                                if (!isMonthClosed && triggerSaveToFirebase) triggerSaveToFirebase();
                              }
                            }}
                            className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-right font-bold outline-none transition-all ${isMonthClosed
                              ? 'bg-gray-100/80 border-gray-200 text-gray-500 cursor-not-allowed select-none'
                              : group.isSusulan
                                ? 'border-yellow-300 focus:ring-2 focus:ring-yellow-500'
                                : 'border-gray-300 focus:ring-2 focus:ring-green-500'
                              }`}
                            placeholder="0"
                          />
                        </div>
                        {/* Inline Warning for Abnormal Big Numbers (Anti-Typo safeguard) */}
                        {Number(currentReport?.formData?.[inputKey] || 0) >= 100000000 && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 font-semibold flex items-center gap-1 shadow-2xs">
                            <span>⚠️</span> Nominal ≥ Rp 100 Jt ({formatRp(currentReport?.formData?.[inputKey])})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* SUB TOTAL & KETERANGAN MUTASI BANK (RINGAN & TIDAK SALING MENDORONG) */}
                {(() => {
                  let bankCount = 0;
                  const rawDates = [];
                  const details = [];

                  group.activeItems.forEach(i => {
                    if (Array.isArray(i.bankAllocations) && i.bankAllocations.length > 0) {
                      i.bankAllocations.forEach(ba => {
                        bankCount++;
                        if (ba.bankDate) rawDates.push(ba.bankDate);
                        details.push(`• ${ba.desc || ba.tenant || 'Mutasi'}: Rp ${formatRp(ba.amount || 0)} (${ba.bankDate || ''})`);
                      });
                    } else if (i.bankMatchDate || i.bankMatched) {
                      bankCount++;
                      if (i.bankMatchDate) rawDates.push(i.bankMatchDate);
                      details.push(`• ${i.itemNote || i.name || 'Mutasi'}: (${i.bankMatchDate || ''})`);
                    }
                  });

                  const cleanDates = [];
                  rawDates.forEach(rd => {
                    const ymd = parseYmd ? parseYmd(rd) : '';
                    const formatted = ymd ? formatTanggalTtd(ymd) : rd.split(' ')[0];
                    if (formatted && !cleanDates.includes(formatted)) {
                      cleanDates.push(formatted);
                    }
                  });
                  const displayDateStr = cleanDates.length > 0 ? cleanDates.join(', ') : 'Terverifikasi';
                  const tooltipText = details.length > 0 ? `Rincian Mutasi Terhubung:\n${details.join('\n')}` : '';

                  return (
                    <div className="pt-3 mt-2 border-t border-dashed border-gray-300 flex flex-col gap-2">
                      {/* Baris Sub Total Utama - Selalu Kokoh & Angka Rapi di Kanan */}
                      <div className="flex justify-between items-center text-sm font-bold text-gray-700">
                        <span className="text-gray-600 font-semibold uppercase tracking-wider text-xs">Sub Total:</span>
                        <span className="text-gray-900 text-base font-extrabold shrink-0 text-right whitespace-nowrap pl-4">
                          Rp {formatRp(subtotals[group.groupId] || 0)}
                        </span>
                      </div>

                      {/* Baris Status Uang Masuk Bank - Ringan, 0 Beban Memori, Elegan */}
                      {bankCount > 0 && (
                        <div
                          className="flex items-center justify-between bg-emerald-50/80 hover:bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-800 transition-colors shadow-2xs"
                          title={tooltipText}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                            <span className="truncate font-medium text-[11px]">
                              Masuk Bank: <strong className="text-emerald-950 font-bold">{displayDateStr}</strong>
                            </span>
                          </div>
                          {bankCount > 1 && (
                            <span className="bg-emerald-200/70 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ml-2 shadow-2xs">
                              {bankCount} Mutasi
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        )}

        {activeGroups.length > 0 && (
          <div className="flex justify-center mt-6 mb-8 pb-4">
            <button
              onClick={() => {
                const el = document.getElementById('form-tambah-transaksi');
                if (el) {
                  window.scrollTo({
                    top: el.getBoundingClientRect().top + window.scrollY - 80,
                    behavior: 'smooth'
                  });
                }
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <ArrowUp size={20} /> Ke Atas (Tambah Data Lain)
            </button>
          </div>
        )}
      </div>

      {/* Floating Scroll to Top */}
      <button
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-28 right-4 sm:right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all z-40 group no-print border-2 border-white flex items-center justify-center"
      >
        <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
      </button>

      {/* 6. Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] p-4 z-40 no-print">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex-1 w-full flex items-center justify-between sm:justify-start gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">
                Grand Total ({activeType === 'utama' ? 'SU' : 'SU/L'})
              </p>
              <p
                className={`text-2xl font-black leading-none mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
                  }`}
              >
                Rp {formatRp(grandTotal)}
              </p>
              <p className="text-xs text-gray-500 italic hidden sm:block">
                "{terbilang(grandTotal)} rupiah"
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={clearCurrentReport}
              disabled={isMonthClosed}
              className={`px-4 py-3 font-bold rounded-xl transition-colors text-sm border ${isMonthClosed
                ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                : 'text-red-500 hover:bg-red-50 border-transparent hover:border-red-200'
                }`}
            >
              Reset
            </button>
            <button
              onClick={handleForceSave}
              disabled={isMonthClosed}
              className={`px-4 py-3 font-bold rounded-xl transition-colors text-sm border flex items-center gap-1.5 shadow-sm ${isMonthClosed
                ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed opacity-75'
                : 'text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300 bg-white'
                }`}
              title={isMonthClosed ? 'Bulan ini telah ditutup buku (Terkunci)' : 'Simpan Data'}
            >
              {isMonthClosed ? <Lock size={16} className="text-gray-400" /> : <Save size={18} />}
              <span className="hidden sm:inline">{isMonthClosed ? 'Terkunci' : 'Simpan'}</span>
            </button>
            <button
              onClick={onViewDraftCetak}
              className={`flex-1 sm:flex-none text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-sm ${activeType === 'utama'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
                }`}
            >
              <FileText size={20} /> Lihat Draft Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
