import React, { useMemo } from 'react';
import { safeString, formatRp, terbilang, formatTanggalTtd, getActiveItemKey } from '../../utils/formatters';
import { resolveStsuTemplate } from '../../utils/stsuTemplates';

const capitalizeFirst = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Cetak STSU Format Dinas (mengikuti contoh di folder "format cetak").
 * Satu kategori/grup transaksi = satu lembar STSU dengan judul, kode rekening,
 * uraian, terbilang, dan tanda tangan sesuai template resmi.
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
    return activeGroups
      .map((group) => {
        const subtotal = Number(subtotals[group.groupId] || 0);
        if (subtotal <= 0) return null;

        const items = (group.activeItems || [])
          .map((item) => {
            const amount = Number(
              formData[
                getActiveItemKey(group.catId, item.id, group.isSusulan, group.validDate, group.itemDate, item.itemNote)
              ] || 0
            );
            return {
              name: item.id === 'direct' ? '' : safeString(item.name),
              note: item.itemNote || group.itemNote || '',
              amount
            };
          })
          .filter((i) => i.amount > 0);

        const template = resolveStsuTemplate(
          group.name,
          items.map((i) => i.name).filter(Boolean),
          items.map((i) => i.note).filter(Boolean)
        );

        const dateText = formatTanggalTtd(group.itemDate || group.validDate || reportDate);
        const itemDateText = group.itemDate ? formatTanggalTtd(group.itemDate) : '';
        const ctx = { items, subtotal, catName: group.name, dateText, itemDateText };

        return {
          key: group.groupId,
          template,
          rows: template.rows(ctx),
          footerLines: template.footerLines(ctx),
          subtotal
        };
      })
      .filter(Boolean);
  }, [activeGroups, subtotals, currentReport.formData, reportDate]);

  const signatureText = signatureDateStr ? formatTanggalTtd(signatureDateStr) : '';

  return (
    <div className="w-full">
      <style>{`
        .dinas-page {
          width: 210mm; max-width: 100%; min-height: 148mm;
          padding: 14mm 16mm 10mm 16mm; box-sizing: border-box;
          background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif;
          font-size: 10.5pt; line-height: 1.35; margin: 0 auto 16px auto;
        }
        .dinas-page * { font-family: Arial, Helvetica, sans-serif !important; box-sizing: border-box; }
        @media print {
          @page { size: A4 portrait; margin: 12mm 15mm 10mm 15mm !important; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .dinas-page {
            width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 10mm 0 !important;
            min-height: 0 !important; box-shadow: none !important; border: none !important;
            page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;
          }
          .dinas-page:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 p-3 sm:p-4 rounded-xl shadow-xs mb-6 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="text-xs text-amber-900">
          <div className="font-bold uppercase tracking-wider">Format Dinas STSU ({activeType === 'utama' ? 'SU' : 'SU/L'})</div>
          <div className="text-amber-800 mt-0.5">
            {pages.length} lembar STSU: {pages.map((p) => p.template.label).join(' • ') || '—'}
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
              className="w-14 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs text-blue-700 outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-600">Tanggal TTD Bawah:</span>
            <input
              type="date"
              value={signatureDateStr}
              onChange={onUpdateSignatureDate}
              disabled={isMonthClosed}
              className="px-2 py-1 bg-white border border-gray-300 rounded-lg font-bold text-xs text-blue-700 outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      <div id="printable-area" className="print-container">
        {pages.length === 0 && (
          <div className="dinas-page border border-gray-300 shadow-xl text-center text-gray-500 py-20">
            Belum ada transaksi bernominal pada dokumen ini untuk dicetak.
          </div>
        )}
        {pages.map((page) => {
          const t = page.template;
          return (
            <div key={page.key} className="dinas-page border border-gray-300 shadow-xl print:border-none print:shadow-none">
              <div className="font-bold leading-tight">
                <div>PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA</div>
                <div>UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</div>
              </div>
              <div className="mt-2 mb-3">No. &nbsp; {safeString(computedStsuNo)}</div>

              <div className="text-center font-bold leading-snug">
                <div>SURAT TANDA SETOR UANG</div>
                {t.title.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
              <div className="mt-3 mb-1">dengan rincian sebagai berikut :</div>

              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '38px' }} />
                  <col style={{ width: '150px' }} />
                  <col />
                  <col style={{ width: '34px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
                <thead>
                  <tr className="border-t border-b border-dashed border-black font-bold text-center">
                    <th className="py-1">NO.</th>
                    <th className="py-1">KODE REKENING</th>
                    <th className="py-1 text-left pl-1">U R A I A N</th>
                    <th colSpan={2} className="py-1 text-right pr-1">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td></td>
                    <td className="align-top pt-2">{t.kode}</td>
                    <td colSpan={3} className="pt-2 pl-1 font-bold">
                      {t.heading.map((l, i) => (
                        <div key={i} className={i >= 2 ? 'font-normal' : ''}>{l}</div>
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
                      <td className="align-top pt-1 text-right pr-1">{formatRp(row.amount)}</td>
                    </tr>
                  ))}
                  {page.footerLines.map((l, i) => (
                    <tr key={`f${i}`}>
                      <td></td>
                      <td></td>
                      <td colSpan={3} className="pl-1">{l}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="h-2"></td>
                  </tr>
                  <tr className="border-t border-b border-dashed border-black font-bold">
                    <td></td>
                    <td></td>
                    <td className="py-1 pl-1">T o t a l</td>
                    <td className="py-1">Rp.</td>
                    <td className="py-1 text-right pr-1">{formatRp(page.subtotal)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-2 mb-6">
                <span className="font-bold">Terbilang : </span>
                <span className="italic">{capitalizeFirst(terbilang(page.subtotal))} rupiah.-</span>
              </div>

              <div className="grid grid-cols-2 text-center break-inside-avoid">
                <div>
                  <div>&nbsp;</div>
                  <div>{safeString(signatures.leftRole || 'Kepala Seksi Pelayanan dan Informasi')}</div>
                  <div className="h-16"></div>
                  <div className="font-bold underline">{safeString(signatures.leftName || 'Afriana Pulungan, S.Si., M.AP.')}</div>
                  <div>NIP {safeString(signatures.leftNip || '197304212007012021')}</div>
                </div>
                <div>
                  <div>{safeString(signatures.location || 'Jakarta')}, {signatureText}</div>
                  <div>{safeString(signatures.rightRole || 'Bendahara Penerimaan')}</div>
                  <div className="h-16"></div>
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
