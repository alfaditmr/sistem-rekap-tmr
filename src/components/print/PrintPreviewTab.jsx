import React from 'react';
import { FileText, Printer, RefreshCw, Download } from 'lucide-react';
import DraggableElement from './DraggableElement';
import {
  safeString,
  terbilang,
  formatRp,
  getDayName,
  formatTanggalCetak,
  formatTanggalTtd,
  getActiveItemKey
} from '../../utils/formatters';

/**
 * Komponen Tab Print & Download Laporan STSU
 * Mendukung 2 mode cetak:
 * 1. Mode PDF / Preview Laporan Gabungan Standar
 * 2. Mode Cetak NCR Dot Matrix A5 Kertas Rangkap 3 (dengan Draggable Element)
 */
export default function PrintPreviewTab({
  activeTab,
  printMode,
  setPrintMode,
  selectedNcrGroup,
  setSelectedNcrGroup,
  activeType,
  activeGroups = [],
  setActiveTab,
  handleDownloadPDF,
  pdfLoading,
  handlePrint,
  reportDate,
  computedStsuNo,
  subtotals = {},
  grandTotal = 0,
  currentReport = {},
  signatures = {}
}) {
  if (activeTab !== 'print') return null;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            {printMode === 'pdf' ? (
              <>
                <FileText size={20} className={activeType === 'utama' ? 'text-green-600' : 'text-purple-600'} />
                Preview & Download Laporan Gabungan
              </>
            ) : (
              <>
                <Printer size={20} className="text-purple-600" />
                Mode Cetak NCR: {safeString(selectedNcrGroup?.name)}
              </>
            )}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {printMode === 'pdf' ? (
            <>
              <button
                onClick={() => setActiveTab('input')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex-1 sm:flex-none hover:bg-gray-200 transition-colors"
              >
                Kembali Edit
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className={`px-4 py-2 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md ${
                  activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'
                } disabled:opacity-50 transition-colors`}
              >
                {pdfLoading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                {pdfLoading ? 'Memproses...' : 'Unduh PDF'}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md transition-colors"
              >
                <Printer size={18} /> Cetak Printer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setPrintMode('pdf');
                  setSelectedNcrGroup(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex-1 sm:flex-none hover:bg-gray-200 transition-colors"
              >
                Kembali ke PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-purple-700 hover:bg-purple-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md transition-colors"
              >
                <Printer size={18} /> Print Kertas NCR
              </button>
            </>
          )}
        </div>
      </div>

      {printMode === 'pdf' && activeGroups.length > 0 && (
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6 no-print">
          <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2 text-sm">
            <Printer size={16} /> Cetak NCR Kertas Rangkap 3 (Per Kategori)
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeGroups.map((group) => (
              <button
                key={group.groupId}
                onClick={() => {
                  setSelectedNcrGroup(group);
                  setPrintMode('ncr');
                }}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-transform hover:scale-105"
              >
                🖨️ Kategori: {safeString(group.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      {printMode === 'pdf' ? (
        <div
          id="printable-area"
          className="print-container bg-white p-6 sm:p-10 shadow-lg min-h-[297mm] mx-auto border border-gray-200 text-black relative print:border-none print:shadow-none print:p-0"
        >
          <div className="absolute top-10 right-10 text-gray-200 font-bold text-3xl opacity-50 uppercase tracking-widest print:opacity-0 pointer-events-none">
            DRAFT {activeType === 'utama' ? 'SU' : 'SU/L'}
          </div>
          <div className="font-bold underline mb-8 text-[11pt]">No. {safeString(computedStsuNo)}</div>
          <div className="mb-6 text-[11pt]">
            Diterima uang hasil pendapatan {formatTanggalCetak(reportDate)} sebagai berikut;
          </div>
          <div className="space-y-2">
            {activeGroups.map((group, index) => {
              if (subtotals[group.groupId] === 0) return null;
              const isDirect =
                Array.isArray(group.activeItems) &&
                group.activeItems.length === 1 &&
                group.activeItems[0].id === 'direct';
              let groupTitle = group.name;
              if (activeType === 'utama' && group.isSusulan) {
                groupTitle = `${group.name} susulan (validasi ${formatTanggalTtd(group.validDate)})`;
              } else if (activeType === 'lain') {
                let parts = [group.name];
                if (group.itemNote) parts.push(`dari ${group.itemNote.replace(/\n/g, ' ')}`);
                if (group.itemDate) parts.push(`tanggal ${formatTanggalTtd(group.itemDate)}`);
                groupTitle = parts.join(' ');
              }
              return (
                <div key={group.groupId} className="text-[11pt] pb-3">
                  <div className="font-bold mb-1 leading-relaxed">
                    {index + 1}. Diterima uang hasil pendapatan {safeString(groupTitle)}, sebagai berikut :
                  </div>
                  <div className="w-full">
                    {!isDirect &&
                      group.activeItems.map((item) => {
                        const val =
                          currentReport.formData?.[
                            getActiveItemKey(
                              group.catId,
                              item.id,
                              group.isSusulan,
                              group.validDate,
                              group.itemDate,
                              item.itemNote
                            )
                          ] || 0;
                        if (val === 0) return null;
                        return (
                          <div key={item.id} className="flex w-full max-w-[450px] mb-0.5 pl-4 sm:pl-6">
                            <div className="flex-1 pr-2 font-normal">
                              {safeString(item.name)}
                              {item.itemNote ? ` (${safeString(item.itemNote)})` : ''}
                            </div>
                            <span className="w-[40px] text-left">Rp.</span>
                            <span className="w-[100px] text-right">{formatRp(val)}</span>
                          </div>
                        );
                      })}
                    <div className={`flex w-full font-bold ${isDirect ? '' : 'mt-1 pt-1'}`}>
                      <span className="flex-1 text-right pr-6">{isDirect ? 'Nominal' : 'Sub Total'}</span>
                      <span className="w-[40px] text-left">Rp.</span>
                      <span className="w-[120px] text-right">{formatRp(subtotals[group.groupId])}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex w-full mt-6 border-t border-b-2 border-black py-2 mb-6 font-bold text-[11pt]">
            <span className="flex-1 text-right pr-6">Jumlah Total</span>
            <span className="w-[40px] text-left">Rp.</span>
            <span className="w-[120px] text-right">{formatRp(grandTotal)}</span>
          </div>
          <div className="mt-8 text-[11pt]">
            <p className="mb-4">
              <strong>Terbilang : </strong>{' '}
              <i className="capitalize">{terbilang(grandTotal)} rupiah</i>
            </p>
            <p className="text-justify leading-relaxed">
              Disetor uang kebendahara penerimaan hasil retribusi layanan masuk tempat rekreasi dan pemakaian fasilitas
              Pada hari {formatTanggalCetak(reportDate)} dengan STSU No. {safeString(computedStsuNo)} dengan uang sebesar
              Rp. {formatRp(grandTotal)}
            </p>
          </div>
          <div className="flex justify-between mt-16 text-center text-[11pt]">
            <div className="w-[45%] flex flex-col justify-between">
              <div>
                Mengetahui,
                <br />
                {safeString(signatures.leftRole)}
              </div>
              <div className="mt-28 font-bold underline">({safeString(signatures.leftName)})</div>
            </div>
            <div className="w-[45%] flex flex-col justify-between">
              <div>
                {safeString(signatures.location)}, {formatTanggalTtd(currentReport.signatureDate)}
                <br />
                {safeString(signatures.rightRole)}
              </div>
              <div className="mt-24 font-bold underline">({safeString(signatures.rightName)})</div>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="printable-area-ncr"
          className="print-container bg-white mx-auto relative overflow-hidden shadow-lg border border-gray-300 print:border-none print:shadow-none"
          style={{ minHeight: '148mm', width: '210mm' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-100 font-black text-6xl opacity-30 uppercase tracking-widest print:opacity-0 pointer-events-none -rotate-12 whitespace-nowrap">
            PREVIEW DOT MATRIX A5
          </div>
          {selectedNcrGroup &&
            (() => {
              const ncrTotal = subtotals[selectedNcrGroup.groupId] || 0;
              const isDirect =
                Array.isArray(selectedNcrGroup.activeItems) &&
                selectedNcrGroup.activeItems.length === 1 &&
                selectedNcrGroup.activeItems[0].id === 'direct';
              let itemsToPrint = selectedNcrGroup.activeItems.filter(
                (i) =>
                  (currentReport.formData?.[
                    getActiveItemKey(
                      selectedNcrGroup.catId,
                      i.id,
                      selectedNcrGroup.isSusulan,
                      selectedNcrGroup.validDate,
                      selectedNcrGroup.itemDate,
                      i.itemNote
                    )
                  ] || 0) > 0
              );
              let ncrItemsString = isDirect
                ? selectedNcrGroup.activeItems[0].itemNote
                  ? selectedNcrGroup.activeItems[0].itemNote.replace(/\n/g, ', ')
                  : ''
                : itemsToPrint
                    .map((i) => i.name + (i.itemNote ? ` (${i.itemNote.replace(/\n/g, ' ')})` : ''))
                    .join(', ');
              return (
                <>
                  <DraggableElement defaultTop="33mm" defaultLeft="125mm" className="font-bold text-sm tracking-wide">
                    {getDayName(reportDate)}
                  </DraggableElement>
                  <DraggableElement defaultTop="33mm" defaultLeft="160mm" className="font-bold text-sm tracking-wide">
                    {reportDate}
                  </DraggableElement>

                  <DraggableElement
                    defaultTop="50mm"
                    defaultLeft="20mm"
                    className="w-[170mm] leading-8 font-bold text-sm"
                  >
                    {safeString(selectedNcrGroup.name)}: {safeString(ncrItemsString)}
                  </DraggableElement>

                  <DraggableElement defaultTop="71mm" defaultLeft="45mm" className="font-bold text-sm">
                    Seksi Pelayanan dan Informasi
                  </DraggableElement>

                  <DraggableElement
                    defaultTop="83mm"
                    defaultLeft="65mm"
                    className="font-bold text-lg tracking-widest"
                  >
                    {formatRp(ncrTotal)}
                  </DraggableElement>

                  <DraggableElement
                    defaultTop="93mm"
                    defaultLeft="25mm"
                    className="w-[160mm] italic font-bold capitalize leading-relaxed text-sm"
                  >
                    # {terbilang(ncrTotal)} rupiah #
                  </DraggableElement>

                  <DraggableElement defaultTop="103mm" defaultLeft="145mm" className="font-bold text-sm">
                    {currentReport.signatureDate?.split('-')[2]}{' '}
                    {new Date(currentReport.signatureDate).toLocaleDateString('id-ID', { month: 'long' })}{' '}
                    {currentReport.signatureDate?.split('-')[0]}
                  </DraggableElement>

                  <DraggableElement
                    defaultTop="111mm"
                    defaultLeft="165mm"
                    className="font-bold text-base tracking-wider"
                  >
                    {formatRp(ncrTotal)}
                  </DraggableElement>

                  <DraggableElement defaultTop="130mm" defaultLeft="20mm" className="text-center w-[70mm]">
                    <div className="font-bold underline text-sm tracking-wide">{safeString(signatures.leftName)}</div>
                    <div className="text-xs mt-1">
                      NIP. {signatures.leftNip ? safeString(signatures.leftNip) : '..............................'}
                    </div>
                  </DraggableElement>

                  <DraggableElement defaultTop="130mm" defaultLeft="125mm" className="text-center w-[70mm]">
                    <div className="font-bold underline text-sm tracking-wide">{safeString(signatures.rightName)}</div>
                    <div className="text-xs mt-1">
                      NIP. {signatures.rightNip ? safeString(signatures.rightNip) : '..............................'}
                    </div>
                  </DraggableElement>
                </>
              );
            })()}
        </div>
      )}
    </div>
  );
}
