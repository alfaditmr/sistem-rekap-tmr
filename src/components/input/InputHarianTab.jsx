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
  FileText
} from 'lucide-react';
import {
  safeString,
  formatRp,
  terbilang,
  formatTanggalTtd,
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
  onViewDraftCetak
}) {
  if (activeTab !== 'input') return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 no-print">
      {/* 1. Tipe STSU Switcher & Bot Trigger Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1.5 flex flex-col sm:flex-row w-full sm:w-auto">
          <button
            onClick={() => handleTypeSwitch('utama')}
            className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all ${
              activeType === 'utama'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-transparent text-gray-500 hover:bg-green-50 hover:text-green-600'
            }`}
          >
            STSU Pendapatan
          </button>
          <button
            onClick={() => handleTypeSwitch('lain')}
            className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all ${
              activeType === 'lain'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-transparent text-gray-500 hover:bg-purple-50 hover:text-purple-600'
            }`}
          >
            STSU Lain-lain
          </button>
        </div>

        {/* PANEL DUA TOMBOL ROBOT (3A & IWM) */}
        {activeType === 'utama' && (
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
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all border ${
                  activeLainIndex === num
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105'
                    : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                }`}
              >
                Dokumen Ke-{num}
              </button>
              {num > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLainDoc(num);
                  }}
                  className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md z-10 hover:bg-red-600 border border-white transition-opacity ${
                    activeLainIndex === num ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Hapus Dokumen"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddLainDoc}
            className="px-3 py-2 ml-1 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100 flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> Tambah Dokumen
          </button>
        </div>
      )}

      {/* 3. Header Info Dokumen STSU */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${
            activeType === 'utama' ? 'bg-green-500' : 'bg-purple-500'
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
              value={currentReport.signatureDate || ''}
              onChange={handleSignatureDateChange}
              onBlur={() => {
                if (triggerSaveToFirebase) triggerSaveToFirebase();
              }}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-blue-50 font-bold text-blue-700"
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
                value={currentReport.sequence || ''}
                onChange={handleSequenceChange}
                onBlur={() => {
                  if (triggerSaveToFirebase) triggerSaveToFirebase();
                }}
                className="w-16 border border-gray-300 rounded-lg p-2.5 text-center font-bold outline-none focus:border-blue-500 bg-white shadow-inner text-lg"
              />
              <div className="flex-1 border border-dashed border-gray-300 rounded-lg bg-gray-50 p-2 flex items-center overflow-x-auto min-w-0">
                <span className="font-mono font-bold text-gray-600 text-xs sm:text-sm whitespace-nowrap truncate">
                  {safeString(computedStsuNo || 'Preview...')}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`p-3 rounded-xl border flex flex-col justify-center shadow-inner items-end ${
              activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                activeType === 'utama' ? 'text-green-600' : 'text-purple-600'
              }`}
            >
              Total {activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'}
            </span>
            <span
              className={`text-lg sm:text-xl font-black truncate max-w-full ${
                activeType === 'utama' ? 'text-green-800' : 'text-purple-800'
              }`}
              title={`Rp ${formatRp(grandTotal)}`}
            >
              Rp {formatRp(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Form Tambah Transaksi Manual */}
      <div
        id="form-tambah-transaksi"
        className={`${
          activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'
        } rounded-xl shadow-sm border p-4 mb-6 transition-colors`}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <h2
            className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wide ${
              activeType === 'utama' ? 'text-green-800' : 'text-purple-800'
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
                className={`block text-xs font-semibold mb-1 ${
                  activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
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
                className={`block text-xs font-semibold mb-1 ${
                  activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
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
                className={`block text-xs font-semibold mb-1 ${
                  activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
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
            className={`w-full mt-2 text-white p-3 rounded-lg font-bold flex justify-center items-center transition-colors shadow-sm disabled:bg-gray-300 ${
              activeType === 'utama'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            Add Transaksi
          </button>
        </div>
      </div>

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
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                group.isSusulan ? 'border-yellow-300' : 'border-gray-200'
              }`}
            >
              <div
                className={`px-4 py-3 border-b flex justify-between items-center ${
                  group.isSusulan
                    ? 'bg-yellow-50 border-yellow-200'
                    : activeType === 'utama'
                    ? 'bg-green-50/50 border-green-100'
                    : 'bg-purple-50/50 border-purple-100'
                }`}
              >
                <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      group.isSusulan
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
                        <button
                          onClick={() => handleRemoveActiveItem(item, inputKey)}
                          className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm mt-0.5 shrink-0"
                        >
                          <Trash size={18} />
                        </button>
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
                                <button
                                  onClick={() => openEditNote(group, item)}
                                  className="text-gray-400 hover:text-blue-600 opacity-50 group-hover/note:opacity-100 transition-opacity bg-gray-50 p-1 rounded-md shrink-0"
                                  title="Edit Keterangan"
                                >
                                  <Edit size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => openEditNote(group, item)}
                                className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                              >
                                <Edit size={12} /> Tambah Keterangan
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="relative w-full sm:w-1/2 md:w-2/5 shrink-0 mt-2 sm:mt-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                          Rp
                        </span>
                        <input
                          id={`input_${inputKey}`}
                          type="text"
                          inputMode="numeric"
                          value={
                            currentReport.formData && currentReport.formData[inputKey]
                              ? formatRp(currentReport.formData[inputKey])
                              : ''
                          }
                          onChange={(e) => handleInputChange(inputKey, e.target.value)}
                          onBlur={() => {
                            if (triggerSaveToFirebase) triggerSaveToFirebase();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                              if (triggerSaveToFirebase) triggerSaveToFirebase();
                            }
                          }}
                          className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-right font-bold focus:ring-2 outline-none ${
                            group.isSusulan
                              ? 'border-yellow-300 focus:ring-yellow-500'
                              : 'border-gray-300 focus:ring-green-500'
                          }`}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 mt-2 border-t border-dashed border-gray-300 flex justify-between items-end text-sm font-bold text-gray-600">
                  <div className="flex flex-col gap-1.5">
                    <span>Sub Total:</span>
                    {group.activeItems.some((i) => i.bankMatched) && (
                      <span className="text-[11px] font-bold text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-full w-max flex items-center gap-1 shadow-sm">
                        <CheckCircle size={12} /> Masuk Bank:{' '}
                        {group.activeItems.find((i) => i.bankMatched)?.bankMatchDate}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-800 text-base leading-none pb-1">
                    Rp {formatRp(subtotals[group.groupId] || 0)}
                  </span>
                </div>
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
                className={`text-2xl font-black leading-none mb-1 ${
                  activeType === 'utama' ? 'text-green-700' : 'text-purple-700'
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
              className="px-4 py-3 text-red-500 hover:bg-red-50 font-bold rounded-xl transition-colors text-sm border border-transparent hover:border-red-200"
            >
              Reset
            </button>
            <button
              onClick={handleForceSave}
              className="px-4 py-3 text-blue-600 hover:bg-blue-50 font-bold rounded-xl transition-colors text-sm border border-blue-200 hover:border-blue-300 flex items-center gap-1.5 bg-white shadow-sm"
            >
              <Save size={18} /> <span className="hidden sm:inline">Simpan</span>
            </button>
            <button
              onClick={onViewDraftCetak}
              disabled={activeGroups.length === 0}
              className={`flex-1 sm:flex-none text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-sm disabled:bg-gray-300 ${
                activeType === 'utama'
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
