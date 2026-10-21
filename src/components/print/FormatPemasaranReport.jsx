import React, { useMemo, useState } from 'react';
import {
  safeString,
  formatRp,
  terbilang,
  getActiveItemKey
} from '../../utils/formatters';

/**
 * Konfigurasi 28 Baris Baku Laporan Hasil Retribusi (Pemasaran & Pemanfaatan Aset)
 * Sesuai dokumen resmi template: format-new-pemasaran (1).docx
 */
export const PEMASARAN_STANDARD_ITEMS = [
  // ==========================================
  // GRUP 1: 4.1.02.02.12.0001 Pasar Grosir / Toko / Tempat Usaha
  // ==========================================
  {
    no: 18,
    groupId: '4.1.02.02.12.0001',
    name: 'Pedagang Hari Selasa-Sabtu',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return (
        (/pedagang/i.test(full) || /cat_2/i.test(full)) &&
        (/selasa/i.test(full) || /biasa/i.test(full) || /weekday/i.test(full)) &&
        !/minggu|libur|besar|weekend/i.test(full)
      );
    }
  },
  {
    no: 19,
    groupId: '4.1.02.02.12.0001',
    name: 'Pedagang Hari Minggu/Libur Nasional',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return (
        (/pedagang/i.test(full) || /cat_2/i.test(full)) &&
        (/minggu/i.test(full) || /libur/i.test(full) || /besar/i.test(full) || /weekend/i.test(full))
      );
    }
  },
  {
    no: 20,
    groupId: '4.1.02.02.12.0001',
    name: 'Pemakaian Lokasi/Tempat Untuk Promo/Penjualan Produk',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return /promo|penjualan produk|bazar|booth|stand produk/i.test(full);
    }
  },

  // ==========================================
  // GRUP 2: 4.1.02.02.14.0001 Parkir Di Luar Badan Jalan
  // ==========================================
  {
    no: 21,
    groupId: '4.1.02.02.14.0001',
    name: 'Golongan I (Bus Besar, Truk Besar, dan Mobil Box Besar)',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return (
        (/gol.*1\b|golongan.*1\b|gol.*i\b|golongan.*i\b/i.test(full) || /bus besar|truk besar|box besar/i.test(full)) &&
        !/gol.*2|gol.*3|motor|sepeda/i.test(full)
      );
    }
  },
  {
    no: 22,
    groupId: '4.1.02.02.14.0001',
    name: 'Golongan II (Bus Kecil,Truk Kecil,Mobil Box Kecil dan Pick Up Besar)',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return (
        (/gol.*2\b|golongan.*2\b|gol.*ii\b|golongan.*ii\b/i.test(full) || /bus kecil|truk kecil|pick up besar/i.test(full)) &&
        !/gol.*1|gol.*3|motor|sepeda/i.test(full)
      );
    }
  },
  {
    no: 23,
    groupId: '4.1.02.02.14.0001',
    name: 'Golongan III (Mobil Sedan, Minibus/Sejenis,Pick Up Kecil)',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return (
        (/gol.*3\b|golongan.*3\b|gol.*iii\b|golongan.*iii\b|mobil/i.test(full)) &&
        !/gol.*1|gol.*2|motor|sepeda|box besar|truk/i.test(full)
      );
    }
  },
  {
    no: 24,
    groupId: '4.1.02.02.14.0001',
    name: 'Sepeda Motor dan Kendaraan Roda Tiga',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return /motor|roda tiga|roda 3/i.test(full);
    }
  },
  {
    no: 25,
    groupId: '4.1.02.02.14.0001',
    name: 'Sepeda',
    match: (name = '', catName = '', note = '') => {
      const full = `${name} ${catName} ${note}`.toLowerCase();
      return /sepeda/i.test(full) && !/motor/i.test(full);
    }
  },

  // ==========================================
  // GRUP 3: 4.1.02.02.20.0001 Pemanfaatan Aset Daerah
  // ==========================================
  {
    no: 26,
    groupId: '4.1.02.02.20.0001',
    name: 'Film Cerita',
    match: (name = '', catName = '', note = '') => /film cerita|shooting film cerita/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 27,
    groupId: '4.1.02.02.20.0001',
    name: 'Film Iklan',
    match: (name = '', catName = '', note = '') => /film iklan|shooting iklan|iklan/i.test(`${name} ${catName} ${note}`) && !/spanduk|banner/i.test(`${name} ${note}`)
  },
  {
    no: 28,
    groupId: '4.1.02.02.20.0001',
    name: 'Film Dokumentasi/Dokumenter',
    match: (name = '', catName = '', note = '') => /dokumenter|dokumentasi/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 29,
    groupId: '4.1.02.02.20.0001',
    name: 'Film Keluarga',
    match: (name = '', catName = '', note = '') => /film keluarga|video keluarga/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 30,
    groupId: '4.1.02.02.20.0001',
    name: 'Program Televisi',
    match: (name = '', catName = '', note = '') => /program televisi|acara tv|shooting tv|televisi/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 31,
    groupId: '4.1.02.02.20.0001',
    name: 'Video Clip',
    match: (name = '', catName = '', note = '') => /video clip|videoclip|klip video/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 32,
    groupId: '4.1.02.02.20.0001',
    name: 'Pre-Wedding/Sejenisnya',
    match: (name = '', catName = '', note = '') => /pre-wedding|prewedding|pre wed|foto nikah/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 33,
    groupId: '4.1.02.02.20.0001',
    name: 'Pemakaian Lokasi/Tempat Lahan Terbuka',
    match: (name = '', catName = '', note = '') => /lahan terbuka|tempat terbuka|lokasi terbuka/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 34,
    groupId: '4.1.02.02.20.0001',
    name: 'Penempatan Spanduk Promosi',
    match: (name = '', catName = '', note = '') => /spanduk/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 35,
    groupId: '4.1.02.02.20.0001',
    name: 'Penempatan Banner/Umbul Promosi',
    match: (name = '', catName = '', note = '') => /banner|umbul/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 36,
    groupId: '4.1.02.02.20.0001',
    name: 'Fasilitas Panggung',
    match: (name = '', catName = '', note = '') => /panggung/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 37,
    groupId: '4.1.02.02.20.0001',
    name: 'Fasilitas Gedung Informasi',
    match: (name = '', catName = '', note = '') => /gedung informasi|ruang informasi/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 38,
    groupId: '4.1.02.02.20.0001',
    name: 'Fasilitas Gedung Auditorium',
    match: (name = '', catName = '', note = '') => /auditorium|gedung auditorium/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 39,
    groupId: '4.1.02.02.20.0001',
    name: 'Pemakaian Sound System',
    match: (name = '', catName = '', note = '') => /sound system|sound/i.test(`${name} ${catName} ${note}`) && !/wireles/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 40,
    groupId: '4.1.02.02.20.0001',
    name: 'Pemakaian Wireles',
    match: (name = '', catName = '', note = '') => /wireles|wireless|mic wireless/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 41,
    groupId: '4.1.02.02.20.0001',
    name: 'Pelayanan Pengambilan Foto',
    match: (name = '', catName = '', note = '') => (/pengambilan foto|foto/i.test(`${name} ${catName} ${note}`)) && !/pre-wedding|prewedding|satwa/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 42,
    groupId: '4.1.02.02.20.0001',
    name: 'Penyediaan Satwa Jinak untuk Berfoto',
    match: (name = '', catName = '', note = '') => /satwa jinak|foto satwa|berfoto satwa/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 43,
    groupId: '4.1.02.02.20.0001',
    name: 'Pemutaran Film Satwa (di Luar jadwal pemutaran)',
    match: (name = '', catName = '', note = '') => /pemutaran film|film satwa/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 44,
    groupId: '4.1.02.02.20.0001',
    name: 'Pelayanan Pemandu Wisata Berbahasa Indonesia',
    match: (name = '', catName = '', note = '') => /pemandu.*indo|guide.*indo|tour guide.*indo/i.test(`${name} ${catName} ${note}`)
  },
  {
    no: 45,
    groupId: '4.1.02.02.20.0001',
    name: 'Pelayanan Pemandu Wisata Berbahasa Inggris',
    match: (name = '', catName = '', note = '') => /pemandu.*inggris|guide.*inggris|tour guide.*eng/i.test(`${name} ${catName} ${note}`)
  }
];

export default function FormatPemasaranReport({
  reportDate,
  currentReport = {},
  categories = [],
  allReports = {},
  activeType = 'utama',
  activeLainIndex = 1,
  signatures = {},
  onUpdateSequence,
  onUpdateSignatureDate,
  isMonthClosed = false
}) {
  // Pilihan sumber data: 'active' (hanya dokumen yang sedang aktif) atau 'all' (gabungan seluruh transaksi hari ini)
  const [dataSource, setDataSource] = useState('all');

  // Format nomor STSU: [nomor urut]/[tgl]/[bulan]/SU/[tahun]
  const formattedStsuNo = useMemo(() => {
    if (!reportDate) return '';
    const [y, m, d] = reportDate.split('-');
    const seq = currentReport.sequence ? `${currentReport.sequence}/` : '/';
    return `${seq}${d}/${m}/SU/${y}`;
  }, [reportDate, currentReport.sequence]);

  // Format tanggal tanda tangan di bawah: Jakarta, DD/MM/YYYY
  const signatureDateStr = currentReport.signatureDate || reportDate || '';
  const formattedSignatureDate = useMemo(() => {
    if (!signatureDateStr) return '';
    const [y, m, d] = signatureDateStr.split('-');
    return `${d}/${m}/${y}`;
  }, [signatureDateStr]);

  // Hitung agregasi nominal dari data input ke dalam 28 baris standar
  const { rowAmounts, grandTotal } = useMemo(() => {
    const amounts = {};
    PEMASARAN_STANDARD_ITEMS.forEach((item) => {
      amounts[item.no] = 0;
    });

    // Helper untuk memproses satu dokumen STSU (formData + activeItems)
    const processDoc = (docData) => {
      if (!docData || !docData.formData) return;
      const fData = docData.formData;
      const activeItems = Array.isArray(docData.activeItems) ? docData.activeItems : [];

      activeItems.forEach((ai) => {
        const cat = categories.find((c) => c.id === ai.catId);
        const catItem = cat?.items?.find((i) => i.id === (ai.itemId || ai.id));
        const itemName = catItem ? catItem.name : ai.id === 'direct' ? (cat?.name || '') : (ai.name || '');
        const catName = cat?.name || '';
        const itemNote = ai.itemNote || '';

        const itemKey = getActiveItemKey(
          ai.catId,
          ai.itemId || ai.id,
          ai.isSusulan,
          ai.validDate,
          ai.itemDate,
          ai.itemNote
        );

        const nominal = Number(fData[itemKey] || fData[ai.catId + '_' + (ai.itemId || ai.id)] || 0);
        if (nominal <= 0) return;

        // Cari baris standar yang cocok (18 s/d 45)
        let matchedNo = null;

        // 1. Coba exact name match terlebih dahulu
        const exactMatch = PEMASARAN_STANDARD_ITEMS.find(
          (std) => std.name.trim().toLowerCase() === itemName.trim().toLowerCase()
        );
        if (exactMatch) {
          matchedNo = exactMatch.no;
        } else {
          // 2. Coba rule regex matcher
          const regexMatch = PEMASARAN_STANDARD_ITEMS.find((std) =>
            std.match(itemName, catName, itemNote)
          );
          if (regexMatch) {
            matchedNo = regexMatch.no;
          }
        }

        if (matchedNo) {
          amounts[matchedNo] = (amounts[matchedNo] || 0) + nominal;
        }
      });
    };

    if (dataSource === 'all') {
      // Gabungkan semua data hari ini (utama + seluruh dokumen lain-lain)
      const dayData = allReports[reportDate] || {};
      Object.keys(dayData).forEach((key) => {
        processDoc(dayData[key]);
      });
    } else {
      // Hanya dokumen aktif saat ini
      processDoc(currentReport);
    }

    const total = Object.values(amounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
    return { rowAmounts: amounts, grandTotal: total };
  }, [dataSource, reportDate, currentReport, allReports, categories]);

  // Render baris rincian
  const renderRow = (item) => {
    const val = rowAmounts[item.no] || 0;
    return (
      <tr key={item.no} className="hover:bg-blue-50/30 transition-colors">
        <td className="w-[45px] text-right pr-2 py-[1.5px] align-bottom select-none">{item.no}.</td>
        <td className="py-[1.5px] pr-2 align-bottom font-normal text-left">{item.name}</td>
        <td className="w-[35px] py-[1.5px] align-bottom text-left select-none">Rp.</td>
        <td className="w-[120px] py-[1.5px] align-bottom text-right font-medium">
          {val > 0 ? formatRp(val) : '0'}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full">
      {/* TOOLBAR KONTROL DI ATAS LEMBAR CETAK (TIDAK IKUT TERCETAK) */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 p-3 sm:p-4 rounded-xl shadow-xs mb-6 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Sumber Data Input:
          </span>
          <div className="inline-flex rounded-lg border border-blue-300 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setDataSource('all')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                dataSource === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Semua Data Hari Ini (Utama + Lain)
            </button>
            <button
              type="button"
              onClick={() => setDataSource('active')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                dataSource === 'active'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Dokumen Ini Saja ({activeType === 'utama' ? 'STSU Utama' : `Dokumen Ke-${activeLainIndex}`})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-600">Nomor Urut STSU:</span>
            <input
              type="text"
              placeholder="01"
              value={currentReport.sequence || ''}
              onChange={onUpdateSequence}
              disabled={isMonthClosed}
              className="w-14 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs text-blue-700 outline-none focus:border-blue-500 shadow-2xs disabled:bg-gray-100"
              title="Ketik nomor urut untuk melengkapi nomor STSU di atas"
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
              title="Ubah tanggal tanda tangan di bagian bawah"
            />
          </div>
        </div>
      </div>

      {/* LEMBAR FISIK DOKUMEN (PERSIS WORD FORMAT-NEW-PEMASARAN) */}
      <div
        id="printable-area"
        className="print-container bg-white text-black mx-auto shadow-xl border border-gray-300 relative print:border-none print:shadow-none font-sans"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '16mm 18mm 14mm 18mm',
          boxSizing: 'border-box',
          fontSize: '9pt',
          lineHeight: '1.25'
        }}
      >
        {/* HEADER DOKUMEN: KIRI & KANAN */}
        <div className="flex justify-between items-start mb-2">
          <div className="text-left font-normal leading-tight">
            <div>BLUD TAMAN MARGASATWA</div>
            <div>RAGUNAN PROV. DKI JAKARTA</div>
          </div>
          <div className="text-right font-normal leading-tight">
            <div>SURAT TANDA SETOR UANG</div>
            <div>DASAR HASIL RETRIBUSI</div>
          </div>
        </div>

        {/* NOMOR SURAT STSU (SESUAI CIRI MERAH USER) */}
        <div className="mb-2 flex items-center font-normal">
          <span className="mr-2">NO :</span>
          <span className="font-medium tracking-wide">{formattedStsuNo}</span>
        </div>

        {/* TABEL RINCIAN RETRIBUSI */}
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '45px' }} />
            <col />
            <col style={{ width: '35px' }} />
            <col style={{ width: '120px' }} />
          </colgroup>

          {/* HEADER TABEL: GARIS PUTUS-PUTUS ATAS DAN BAWAH */}
          <thead>
            <tr className="border-t border-b border-dashed border-gray-800 font-bold select-none">
              <th className="py-1 text-center font-bold">NO</th>
              <th className="py-1 text-left font-bold pl-1">URAIAN</th>
              <th className="py-1 text-left"></th>
              <th className="py-1 text-right font-bold pr-1">JUMLAH</th>
            </tr>
          </thead>

          <tbody>
            {/* SUBHEADER UTAMA: 4.1.02 */}
            <tr>
              <td colSpan={4} className="pt-2 pb-0.5 font-bold text-left">
                4.1.02 &nbsp;Pendapatan Retribusi Daerah :
              </td>
            </tr>

            {/* GRUP 1: PASAR GROSIR & TEMPAT USAHA LAINNYA */}
            <tr>
              <td colSpan={4} className="pt-1 pb-0.5 font-bold text-left leading-snug">
                4.1.02.02.12.0001 &nbsp;Retribusi Penyediaan Tempat Kegiatan Usaha Berupa Pasar Grosir, Pertokoan dan Tempat Kegiatan Usaha Lainnya
              </td>
            </tr>
            {PEMASARAN_STANDARD_ITEMS.slice(0, 3).map(renderRow)}

            {/* GRUP 2: PARKIR LUAR BADAN JALAN */}
            <tr>
              <td colSpan={4} className="pt-2 pb-0.5 font-bold text-left leading-snug">
                4.1.02.02.14.0001 &nbsp;Retribusi Penyediaan Tempat Khusus Parkir Di Luar Badan Jalan
              </td>
            </tr>
            {PEMASARAN_STANDARD_ITEMS.slice(3, 8).map(renderRow)}

            {/* GRUP 3: PEMANFAATAN ASET DAERAH */}
            <tr>
              <td colSpan={4} className="pt-2 pb-0.5 font-bold text-left leading-snug">
                4.1.02.02.20.0001 &nbsp;Retribusi Pemanfaatan Aset Daerah yang Tidak Menganggu Penyelengaraan Tugas dan fungsi Organisasi Perangkat Daerah dan/atau Optimalisasi Aset Daerah dengan Tidak Mengubah Status Kepemilikan Sesuai dengan Ketentuan Peraturan Perundang-undangan
              </td>
            </tr>
            {PEMASARAN_STANDARD_ITEMS.slice(8, 28).map(renderRow)}

            {/* BARIS KOSONG PEMISAH SEBELUM TOTAL */}
            <tr>
              <td colSpan={4} className="h-2"></td>
            </tr>

            {/* BARIS TOTAL / JUMLAH: GARIS PUTUS-PUTUS ATAS DAN BAWAH */}
            <tr className="border-t border-b border-dashed border-gray-800 font-bold">
              <td className="py-1"></td>
              <td className="py-1 text-left font-bold pl-1">JUMLAH</td>
              <td className="py-1 text-left">Rp.</td>
              <td className="py-1 text-right font-bold pr-1">
                {grandTotal > 0 ? formatRp(grandTotal) : '0'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* TERBILANG RUPIAH */}
        <div className="mt-3 flex items-start font-normal">
          <span className="font-bold mr-2 whitespace-nowrap">Terbilang :</span>
          <span className="font-normal capitalize italic">
            {grandTotal > 0 ? `${terbilang(grandTotal)} rupiah` : 'Rupiah'}
          </span>
        </div>

        {/* TANGGAL DAN TANDA TANGAN (SESUAI DOKUMEN WORD RESMI) */}
        <div className="mt-4 break-inside-avoid">
          {/* TANGGAL KANAN ATAS TTD: Jakarta, DD/MM/YYYY */}
          <div className="flex justify-end mb-2 pr-6">
            <div>
              {safeString(signatures.location || 'Jakarta')}, {formattedSignatureDate}
            </div>
          </div>

          {/* DUA KOLOM PENANDA TANGAN */}
          <div className="grid grid-cols-2 gap-4 text-center mt-1">
            {/* KIRI: KEPALA SEKSI */}
            <div className="flex flex-col justify-between items-center min-h-[95px]">
              <div>{safeString(signatures.leftRole || 'Kepala Seksi Pelayanan dan Informasi')}</div>
              <div className="mt-auto">
                <div className="font-normal">
                  {safeString(signatures.leftName || 'Afriana Pulungan, S.Si., M.AP.')}
                </div>
                <div>
                  NIP {safeString(signatures.leftNip || '197304212007012021')}
                </div>
              </div>
            </div>

            {/* KANAN: BENDAHARA PENERIMAAN */}
            <div className="flex flex-col justify-between items-center min-h-[95px]">
              <div>{safeString(signatures.rightRole || 'Bendahara Penerimaan')}</div>
              <div className="mt-auto">
                <div className="font-normal">
                  {safeString(signatures.rightName || 'Evi Irmawati')}
                </div>
                <div>
                  NIP {safeString(signatures.rightNip || '198101082009042006')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
