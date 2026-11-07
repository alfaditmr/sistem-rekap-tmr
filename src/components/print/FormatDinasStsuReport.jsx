import React, { useMemo } from 'react';
import { safeString, formatRp, terbilang, formatTanggalTtd, parseYmd, getActiveItemKey } from '../../utils/formatters';
import { resolveStsuTemplate, isTicketCategory, isExcludedFromFormatDinas } from '../../utils/stsuTemplates';

const capitalizeFirst = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Cetak STSU Format Dinas (mengikuti contoh resmi di folder "format cetak").
 * Satu kategori transaksi resmi = satu lembar STSU dengan kop surat resmi (Logo DKI & Logo Ragunan),
 * nomor STSU, kode rekening, uraian baku, terbilang, dan tanda tangan kedinasan.
 *
 * Ketentuan pengecualian:
 * 1. Seluruh transaksi tiket masuk/gerbang (New Gate, Old Gate, Online, TVM) tidak dicetak di sini.
 * 2. Promo / Penjualan Produk dan Pemakaian Fasilitas TMR (lahan, gedung, panggung, sound, shooting, dll.)
 *    tidak dicetak di sini karena sudah dimuat secara khusus pada Format Baru Pemasaran (23 nomor pos baku).
 * 3. Transaksi Foto Satwa dan Juru Foto tetap dicetak sesuai file resmi masing-masing.
 */
export default function FormatDinasStsuReport({
  reportDate,
  currentReport = {},
  activeGroups = [],
  subtotals = {},
  computedStsuNo = '',
  signatures = {},
  activeType = 'utama',
  onUpdateSequence,
  onUpdateSignatureDate,
  isMonthClosed = false
}) {
  const signatureDateStr = currentReport.signatureDate || reportDate || '';

  const pages = useMemo(() => {
    const formData = currentReport.formData || {};
    const generatedPages = [];

    activeGroups.forEach((group) => {
      // 1. Abaikan kategori tiket gerbang / wahana
      if (isTicketCategory(group.name, group.catId)) return;

      // 2. Kumpulkan item transaksi aktif dengan nominal > 0
      const rawItems = (group.activeItems || [])
        .map((item) => {
          const itemId = item.id || item.itemId || 'direct';
          let note = item.itemNote || group.itemNote || '';
          if (!note && Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0) {
            note = item.bankAllocations
              .map((ba) => ba.tenant || ba.desc)
              .filter(Boolean)
              .join(', ');
          }

          // Pencarian nominal transaksi komprehensif
          const itemKey = getActiveItemKey(
            group.catId,
            itemId,
            group.isSusulan,
            group.validDate,
            group.itemDate,
            item.itemNote
          );
          const keyWithoutNote = getActiveItemKey(
            group.catId,
            itemId,
            group.isSusulan,
            group.validDate,
            group.itemDate,
            ''
          );
          const baseKey = `${group.catId}_${itemId}`;
          const directKey = `${group.catId}_direct`;

          let matchingFormKeyVal = 0;
          if (formData[itemKey] !== undefined) matchingFormKeyVal = Number(formData[itemKey] || 0);
          else if (formData[keyWithoutNote] !== undefined) matchingFormKeyVal = Number(formData[keyWithoutNote] || 0);
          else if (formData[baseKey] !== undefined) matchingFormKeyVal = Number(formData[baseKey] || 0);
          else if (formData[directKey] !== undefined) matchingFormKeyVal = Number(formData[directKey] || 0);
          else if (formData[group.catId] !== undefined) matchingFormKeyVal = Number(formData[group.catId] || 0);
          else if (itemId && formData[itemId] !== undefined) matchingFormKeyVal = Number(formData[itemId] || 0);
          else {
            const prefix = `${group.catId}_${itemId}`;
            const foundKey = Object.keys(formData).find(k => k === prefix || k.startsWith(`${prefix}_`));
            if (foundKey) matchingFormKeyVal = Number(formData[foundKey] || 0);
          }

          let amount = matchingFormKeyVal || Number(item.amount || 0);

          // Fallback mutasi bank
          if (amount <= 0 && Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0) {
            amount = item.bankAllocations.reduce((sum, ba) => sum + Number(ba?.amount || 0), 0);
          }
          if (amount <= 0 && Number(item.originBankAllocAmount || 0) > 0) {
            amount = Number(item.originBankAllocAmount);
          }

          // Fallback jika grup hanya 1 item dan subtotals memiliki nilai
          if (
            amount <= 0 &&
            (group.activeItems || []).length === 1 &&
            subtotals &&
            Number(subtotals[group.groupId] || 0) > 0
          ) {
            amount = Number(subtotals[group.groupId]);
          }

          const displayName = safeString(item.name || (itemId === 'direct' ? group.name : ''));

          // Ambil tanggal transaksi secara presisi
          let itemDateVal = item.itemDate || group.itemDate || '';
          if (!itemDateVal && Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0) {
            const allocWithDate = item.bankAllocations.find(
              (ba) => ba.itemDate || ba.date || ba.bankDate || ba.tanggal || ba.tgl
            );
            if (allocWithDate) {
              itemDateVal =
                allocWithDate.itemDate ||
                allocWithDate.date ||
                allocWithDate.bankDate ||
                allocWithDate.tanggal ||
                allocWithDate.tgl ||
                '';
            }
          }
          if (!itemDateVal) {
            itemDateVal = item.validDate || group.validDate || item.bankMatchDate || item.originBankDate || '';
          }
          if (!itemDateVal) {
            itemDateVal = reportDate || '';
          }

          const ymd = parseYmd ? (parseYmd(itemDateVal) || itemDateVal) : itemDateVal;
          const itemDateText = ymd ? formatTanggalTtd(ymd) : '';

          return {
            id: itemId,
            name: displayName,
            note: note ? note.replace(/\r?\n+/g, ' ') : '',
            amount,
            itemDate: itemDateVal,
            itemDateText
          };
        })
        .filter((i) => i.amount > 0);

      if (rawItems.length === 0) {
        // Fallback cadangan khusus grup yang memiliki subtotal di subtotals
        const groupSub = Number(subtotals?.[group.groupId] || 0);
        if (groupSub > 0 && !isExcludedFromFormatDinas(group.name, group.catId, '')) {
          const template = resolveStsuTemplate(group.name, [], [group.itemNote || ''], group.catId);
          if (template) {
            const rawDate = group.itemDate || group.validDate || reportDate;
            const ymd = parseYmd ? (parseYmd(rawDate) || rawDate) : rawDate;
            const dateText = formatTanggalTtd(ymd);
            const itemDateText = group.itemDate
              ? formatTanggalTtd(parseYmd ? (parseYmd(group.itemDate) || group.itemDate) : group.itemDate)
              : dateText;
            const ctx = {
              items: [{ id: 'direct', name: group.name, note: group.itemNote || '', amount: groupSub, itemDateText }],
              subtotal: groupSub,
              catName: group.name,
              dateText,
              itemDateText
            };
            generatedPages.push({
              key: `${group.groupId}_${template.id}`,
              template,
              rows: template.rows(ctx),
              footerLines: template.footerLines(ctx),
              subtotal: groupSub
            });
          }
        }
        return;
      }

      // 3. Saring item: kecualikan tiket, promo, dan fasilitas umum yang tidak memiliki lembar di format cetak
      const validItems = rawItems.filter(
        (item) => !isExcludedFromFormatDinas(group.name, group.catId, item.name)
      );

      if (validItems.length === 0) return;

      // 4. Kelompokkan item berdasarkan template resmi STSU
      const itemsByTemplate = new Map();
      validItems.forEach((item) => {
        const template = resolveStsuTemplate(group.name, [item.name], [item.note], group.catId);
        if (!template) return;
        if (!itemsByTemplate.has(template.id)) {
          itemsByTemplate.set(template.id, { template, items: [] });
        }
        itemsByTemplate.get(template.id).items.push(item);
      });

      // 5. Susun halaman per template
      itemsByTemplate.forEach(({ template, items }, templateId) => {
        const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
        if (subtotal <= 0) return;

        const rawDate = group.itemDate || group.validDate || reportDate;
        const ymd = parseYmd ? (parseYmd(rawDate) || rawDate) : rawDate;
        const dateText = formatTanggalTtd(ymd);
        const effectiveItemDateText =
          items.find((it) => it.itemDateText)?.itemDateText ||
          (group.itemDate ? formatTanggalTtd(parseYmd ? (parseYmd(group.itemDate) || group.itemDate) : group.itemDate) : '') ||
          (group.validDate ? formatTanggalTtd(parseYmd ? (parseYmd(group.validDate) || group.validDate) : group.validDate) : '') ||
          dateText;
        const ctx = { items, subtotal, catName: group.name, dateText, itemDateText: effectiveItemDateText };

        generatedPages.push({
          key: `${group.groupId}_${templateId}`,
          template,
          rows: template.rows(ctx),
          footerLines: template.footerLines(ctx),
          subtotal
        });
      });
    });

    return generatedPages;
  }, [activeGroups, currentReport.formData, subtotals, reportDate]);

  const signatureText = signatureDateStr ? formatTanggalTtd(signatureDateStr) : '';

  return (
    <div className="w-full">
      <style>{`
        .dinas-page {
          width: 210mm;
          max-width: 100%;
          min-height: 148mm;
          padding: 20mm 16mm 12mm 16mm;
          box-sizing: border-box;
          background: #ffffff;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          line-height: 1.35;
          margin: 0 auto 20px auto;
        }
        .dinas-page * {
          font-family: Arial, Helvetica, sans-serif !important;
          box-sizing: border-box;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 20mm 15mm 10mm 15mm !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .dinas-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 0 10mm 0 !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .dinas-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* TOOLBAR KONTROL DI ATAS CETAKAN */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 p-3 sm:p-4 rounded-xl shadow-xs mb-6 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="text-xs text-amber-900">
          <div className="font-bold uppercase tracking-wider">
            Format Dinas STSU ({activeType === 'utama' ? 'SU' : 'SU/L'})
          </div>
          <div className="text-amber-800 mt-0.5">
            {pages.length > 0 ? (
              <>
                <span className="font-bold">{pages.length} lembar STSU aktif:</span>{' '}
                {pages.map((p) => p.template.label).join(' • ')}
              </>
            ) : (
              'Tidak ada lembar STSU aktif'
            )}
          </div>
          <div className="text-[11px] text-amber-700 italic mt-0.5">
            * Transaksi tiket (Gerbang/Online/TVM) serta Pemakaian Fasilitas & Promo dicetak melalui Format Pemasaran.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-600">Nomor Urut STSU:</span>
            <input
              type="text"
              placeholder="01"
              value={currentReport.sequence || ''}
              onChange={onUpdateSequence}
              disabled={isMonthClosed}
              className="w-14 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs text-blue-700 outline-none focus:border-blue-500 shadow-2xs disabled:bg-gray-100"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-600">Tanggal TTD Bawah:</span>
            <input
              type="date"
              value={signatureDateStr}
              onChange={onUpdateSignatureDate}
              disabled={isMonthClosed}
              className="px-2 py-1 bg-white border border-gray-300 rounded-lg font-bold text-xs text-blue-700 outline-none focus:border-blue-500 shadow-2xs disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* AREA CETAK SELURUH LEMBAR DINAS */}
      <div id="printable-area" className="print-container">
        {pages.length === 0 && (
          <div className="dinas-page border border-gray-300 shadow-xl text-center text-gray-500 py-20 rounded-xl">
            <div className="font-bold text-base text-gray-700 mb-1">
              Tidak ada transaksi kategori dinas untuk dicetak pada dokumen ini.
            </div>
            <div className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Sesuai ketentuan kedinasan:
              <br />• Transaksi tiket masuk/gerbang (New Gate, Old Gate, Online, TVM) tidak dibuatkan STSU dinas.
              <br />• Pemakaian Fasilitas TMR dan Promo Produk dicetak melalui tab <strong>Format Baru Pemasaran</strong>.
            </div>
          </div>
        )}

        {pages.map((page) => {
          const t = page.template;
          return (
            <div
              key={page.key}
              className="dinas-page border border-gray-300 shadow-xl print:border-none print:shadow-none mb-6 print:mb-0"
            >
              {/* KOP SURAT RESMI KEDINASAN */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b-[2.5px] border-black">
                <div className="w-24 h-16 flex items-center justify-start shrink-0">
                  <img
                    src="/assets/jaya-raya.png"
                    alt="Logo Jaya Raya"
                    className="max-h-16 w-auto object-contain"
                  />
                </div>
                <div className="text-center font-bold flex-1 px-1 leading-tight select-none">
                  <div className="text-[10.5pt] sm:text-[11pt] uppercase font-bold tracking-tight whitespace-nowrap">
                    PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA
                  </div>
                  <div className="text-[10pt] sm:text-[10.5pt] uppercase font-bold tracking-normal whitespace-nowrap mt-0.5">
                    UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN
                  </div>
                </div>
                <div className="w-24 h-16 flex items-center justify-end shrink-0">
                  <img
                    src="/assets/logo-tmr.png"
                    alt="Logo TMR"
                    className="max-h-16 w-auto object-contain"
                  />
                </div>
              </div>

              {/* NOMOR SURAT STSU */}
              <div className="mt-1 mb-3 text-[10pt]">No. &nbsp; {safeString(computedStsuNo)}</div>

              {/* JUDUL DOKUMEN & SUBTITLE */}
              <div className="text-center font-bold leading-snug">
                <div className="text-[11pt] tracking-wide">SURAT TANDA SETOR UANG</div>
                {t.title.map((l, i) => (
                  <div key={i} className="text-[10.5pt]">
                    {l}
                  </div>
                ))}
              </div>
              <div className="mt-3 mb-1 text-[10pt]">dengan rincian sebagai berikut :</div>

              {/* TABEL RINCIAN STSU KEDINASAN */}
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '150px' }} />
                  <col />
                  <col style={{ width: '36px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
                <thead>
                  <tr className="border-t border-b border-dashed border-black font-bold text-center text-[10pt]">
                    <th className="py-1">NO.</th>
                    <th className="py-1">KODE REKENING</th>
                    <th className="py-1 text-left pl-1">U R A I A N</th>
                    <th colSpan={2} className="py-1 text-right pr-1">
                      JUMLAH
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[10pt]">
                  <tr>
                    <td></td>
                    <td className="align-top pt-2 font-normal">{t.kode}</td>
                    <td colSpan={3} className="pt-2 pl-1 font-bold">
                      {t.heading.map((l, i) => (
                        <div key={i} className={i >= 2 ? 'font-normal' : ''}>
                          {l}
                        </div>
                      ))}
                    </td>
                  </tr>
                  {page.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="align-top text-center pt-1">{idx + 1}</td>
                      <td></td>
                      <td className="pt-1 pl-1 align-top">
                        {row.lines.map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </td>
                      <td className="align-top pt-1">Rp.</td>
                      <td className="align-top pt-1 text-right pr-1 font-normal">{formatRp(row.amount)}</td>
                    </tr>
                  ))}
                  {page.footerLines.map((l, i) => (
                    <tr key={`f${i}`}>
                      <td></td>
                      <td></td>
                      <td colSpan={3} className="pl-1 pt-0.5">
                        {l}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="h-2"></td>
                  </tr>
                  <tr className="border-t border-b border-dashed border-black font-bold text-[10pt]">
                    <td></td>
                    <td></td>
                    <td className="py-1 pl-1">T o t a l</td>
                    <td className="py-1">Rp.</td>
                    <td className="py-1 text-right pr-1">{formatRp(page.subtotal)}</td>
                  </tr>
                </tbody>
              </table>

              {/* TERBILANG NOMINAL */}
              <div className="mt-3 mb-6 text-[10pt]">
                <span className="font-bold">Terbilang : </span>
                <span className="italic">{capitalizeFirst(terbilang(page.subtotal))} rupiah.-</span>
              </div>

              {/* TANDA TANGAN KEDINASAN (2 KOLOM) */}
              <div className="grid grid-cols-2 text-center break-inside-avoid text-[10pt]">
                <div>
                  <div>&nbsp;</div>
                  <div>{safeString(signatures.leftRole || 'Kepala Seksi Pelayanan dan Informasi')}</div>
                  <div className="h-20"></div>
                  <div className="font-bold underline">
                    {safeString(signatures.leftName || 'Afriana Pulungan, S.Si., M.AP.')}
                  </div>
                  <div>NIP {safeString(signatures.leftNip || '197304212007012021')}</div>
                </div>
                <div>
                  <div>
                    {safeString(signatures.location || 'Jakarta')}, {signatureText}
                  </div>
                  <div>{safeString(signatures.rightRole || 'Bendahara Penerimaan')}</div>
                  <div className="h-20"></div>
                  <div className="font-bold underline">{safeString(signatures.rightName || 'Evi Irmawati')}</div>
                  <div>NIP {safeString(signatures.rightNip || '198101082009042006')}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
