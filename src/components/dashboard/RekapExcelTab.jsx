import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  Sparkles,
  Users,
  CreditCard,
  Building2,
  Scale,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  safeString,
  formatRp,
  getLocalYMD,
  formatTanggalTtd,
  formatDetailsTooltip,
  getActiveItemKey,
  parseYmd
} from '../../utils/formatters';
import {
  getPengunjungTmrData,
  getPusatPrimataData,
  getTamanSatwaAnakData,
  getEticketingData,
  getGateRevenueData,
  getStsuKasDaerahData,
  getPemakaianTempatData,
  getPromoMediaData
} from '../../utils/reportDataHelper';
import {
  exportPengunjungTmrExcel,
  exportPusatPrimataExcel,
  exportTamanSatwaAnakExcel,
  exportEticketingExcel,
  exportGateRevenueExcel,
  exportStsuKasDaerahExcel,
  exportPemakaianTempatExcel,
  exportPromoMediaExcel
} from '../../utils/reportExcelExporter';

import PengunjungReportTable from './reports/PengunjungReportTable';
import TicketingReportTable from './reports/TicketingReportTable';
import FasilitasPromoTable from './reports/FasilitasPromoTable';
import StsuKasDaerahTable from './reports/StsuKasDaerahTable';

// Konfigurasi urutan baku baris Excel (Rekapitulasi Master Ragunan)
const excelStandardRows = [
  { id: 'dewasa', name: 'Dewasa', match: (str) => /dewasa/i.test(str) && !/rombongan/i.test(str) && !/primata|schmutzer/i.test(str) },
  { id: 'anak', name: 'Anak', match: (str) => /anak/i.test(str) && !/rombongan/i.test(str) && !/primata|schmutzer/i.test(str) && !/satwa/i.test(str) },
  { id: 'romb_dewasa', name: 'Rombongan Dewasa Reduksi 25 %', match: (str) => /rombongan/i.test(str) && /dewasa/i.test(str) && !/primata|schmutzer/i.test(str) },
  { id: 'romb_anak', name: 'Rombongan Anak Reduksi 25 %', match: (str) => /rombongan/i.test(str) && /anak/i.test(str) && !/primata|schmutzer/i.test(str) },
  { id: 'kuda', name: 'Kuda Tunggang', match: (str) => /kuda/i.test(str) },
  { id: 'unta', name: 'Unta Tunggang', match: (str) => /unta/i.test(str) },
  { id: 'gajah', name: 'Gajah Tunggang', match: (str) => /gajah/i.test(str) },
  { id: 'tsa', name: 'Taman Satwa Anak', match: (str) => /taman satwa|tsa/i.test(str) },
  { id: 'prm_dws_wd', name: 'Pusat Primata Dewasa (Hari Biasa)', match: (str) => /primata|schmutzer/i.test(str) && /dewasa/i.test(str) && /biasa/i.test(str) && !/rombongan/i.test(str) },
  { id: 'prm_ank_wd', name: 'Pusat Primata Anak (Hari Biasa)', match: (str) => /primata|schmutzer/i.test(str) && /anak/i.test(str) && /biasa/i.test(str) && !/rombongan/i.test(str) },
  { id: 'prm_romb_dws_wd', name: 'Schmutzer Rombongan Dewasa (Hari Biasa)', match: (str) => /primata|schmutzer/i.test(str) && /rombongan/i.test(str) && /dewasa/i.test(str) && /biasa/i.test(str) },
  { id: 'prm_romb_ank_wd', name: 'Schmutzer Rombongan Anak (Hari Biasa)', match: (str) => /primata|schmutzer/i.test(str) && /rombongan/i.test(str) && /anak/i.test(str) && /biasa/i.test(str) },
  { id: 'prm_dws_we', name: 'Pusat Primata Dewasa (Weekend / Holiday)', match: (str) => /primata|schmutzer/i.test(str) && /dewasa/i.test(str) && /weekend|besar|libur/i.test(str) && !/rombongan/i.test(str) },
  { id: 'prm_ank_we', name: 'Pusat Primata Anak (Weekend / Holiday)', match: (str) => /primata|schmutzer/i.test(str) && /anak/i.test(str) && /weekend|besar|libur/i.test(str) && !/rombongan/i.test(str) },
  { id: 'prm_romb_ank_we', name: 'Schmutzer Rombongan Anak (Weekend)', match: (str) => /primata|schmutzer/i.test(str) && /rombongan/i.test(str) && /anak/i.test(str) && /weekend|besar|libur/i.test(str) },
  { id: 'prm_romb_dws_we', name: 'Schmutzer Rombongan Dewasa (Weekend)', match: (str) => /primata|schmutzer/i.test(str) && /rombongan/i.test(str) && /dewasa/i.test(str) && /weekend|besar|libur/i.test(str) },
  { id: 'gol_1', name: 'Kendaraan Golongan I', match: (str) => /gol 1|gol i\b/i.test(str) },
  { id: 'gol_2', name: 'Kendaraan Golongan II', match: (str) => /gol 2|gol ii\b/i.test(str) && !/mobil/i.test(str) },
  { id: 'gol_3', name: 'Kendaraan Golongan III', match: (str) => /gol 3|gol iii|mobil/i.test(str) },
  { id: 'motor', name: 'Sepeda Motor', match: (str) => /motor/i.test(str) },
  { id: 'sepeda', name: 'Sepeda', match: (str) => /sepeda/i.test(str) && !/motor/i.test(str) },
];

// 5 Kategori Laporan Utama (Mengacu Folder 'format laporan')
const REPORT_CATEGORIES = [
  {
    id: 'stsu_rekap',
    name: 'STSU & Rekapitulasi',
    icon: FileSpreadsheet,
    color: 'from-blue-600 to-blue-800',
    tagColor: 'bg-blue-100 text-blue-800',
    reports: [
      { id: 'rekapitulasi', name: 'Master Rekapitulasi Harian', subtitle: 'Format INPUT 2026.xls (Harian 1-31 & Mingguan)', formatCode: 'INPUT 2026.xls' },
      { id: 'rekap_stsu', name: 'STSU Kas Daerah (Jagir)', subtitle: 'Format REKAP STSU PENDAPATAN 2026.xls', formatCode: 'REKAP STSU PENDAPATAN 2026.xls' }
    ]
  },
  {
    id: 'pengunjung_wahana',
    name: 'Pengunjung & Wahana',
    icon: Users,
    color: 'from-emerald-600 to-teal-800',
    tagColor: 'bg-emerald-100 text-emerald-800',
    reports: [
      { id: 'pengunjung_tmr', name: 'Pengunjung & Kendaraan TMR', subtitle: 'Format DATA PENGUNJUNG 2026.xls', formatCode: 'DATA PENGUNJUNG 2026.xls' },
      { id: 'pengunjung_pps', name: 'Pusat Primata Schmutzer (PPS)', subtitle: 'Format DATA PENGUNJUNG PPS 2026.xls', formatCode: 'DATA PENGUNJUNG PPS 2026.xls' },
      { id: 'pengunjung_tsa', name: 'Taman Satwa Anak (TSA)', subtitle: 'Format DATA PENGUNJUNG TSA 2026.xls', formatCode: 'DATA PENGUNJUNG TSA 2026.xls' }
    ]
  },
  {
    id: 'ticketing_gate',
    name: 'Ticketing & Gate',
    icon: CreditCard,
    color: 'from-cyan-600 to-blue-800',
    tagColor: 'bg-cyan-100 text-cyan-800',
    reports: [
      { id: 'eticketing', name: 'Rekap E-Ticketing & Asuransi', subtitle: 'Format INPUT E-TICKETING 2026.xls', formatCode: 'INPUT E-TICKETING 2026.xls' },
      { id: 'gate_report', name: 'Pendapatan per Pintu / Gate', subtitle: 'Format INPUT NEW GATE 2026.xlsx', formatCode: 'INPUT NEW GATE 2026.xlsx' }
    ]
  },
  {
    id: 'fasilitas_promo',
    name: 'Sewa Tempat & Promosi',
    icon: Building2,
    color: 'from-amber-600 to-orange-800',
    tagColor: 'bg-amber-100 text-amber-800',
    reports: [
      { id: 'pemakaian_tempat', name: 'Pemakaian Tempat & Fasilitas', subtitle: 'Format REKAP PEMAKAIAN TEMPAT 2026.xlsx', formatCode: 'REKAP PEMAKAIAN TEMPAT 2026.xlsx' },
      { id: 'rekap_promo', name: 'Promosi Produk & Media Banner', subtitle: 'Format REKAP PROMO 2026.xlsx', formatCode: 'REKAP PROMO 2026.xlsx' }
    ]
  },
  {
    id: 'rekon_mitra',
    name: 'Rekonsiliasi Mitra',
    icon: Scale,
    color: 'from-indigo-600 to-purple-800',
    tagColor: 'bg-indigo-100 text-indigo-800',
    reports: [
      { id: 'rekon_ecar', name: 'Rekon: E-Car (Mobil Listrik)', subtitle: 'Format REKON E-CAR 2026.xls', formatCode: 'REKON E-CAR 2026.xls' },
      { id: 'rekon_foto', name: 'Rekon: Jasa Foto Satwa', subtitle: 'Format REKON Foto Satwa 2026.xls', formatCode: 'REKON Foto Satwa 2026.xls' }
    ]
  }
];

/**
 * Komponen Tab Pusat Laporan Terintegrasi (5 Kategori Lengkap)
 */
export default function RekapExcelTab({
  dashboardTab,
  excelReportMonth,
  setExcelReportMonth,
  selectedReportType,
  setSelectedReportType,
  reportCategories = [],
  allReports = {},
  categories = [],
  bankRows = [],
  rekonOfficerName = '',
  currentReport = {},
  signatures = {},
  handleUpdateRekonRow
}) {
  if (dashboardTab !== 'rekap') return null;

  // Active Main Category
  const [activeMainCategory, setActiveMainCategory] = useState(() => {
    if (selectedReportType === 'rekapitulasi' || selectedReportType === 'rekap_stsu') return 'stsu_rekap';
    if (['pengunjung_tmr', 'pengunjung_pps', 'pengunjung_tsa'].includes(selectedReportType)) return 'pengunjung_wahana';
    if (['eticketing', 'gate_report'].includes(selectedReportType)) return 'ticketing_gate';
    if (['pemakaian_tempat', 'rekap_promo'].includes(selectedReportType)) return 'fasilitas_promo';
    return 'rekon_mitra';
  });

  // 1. Data Generator: Rekapitulasi Master
  const generateExcelData = () => {
    const [yearStr, monthStr] = excelReportMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const weekNames = ['SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM'];
    const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sat'];
    let weekIndex = 0;
    const columnStructure = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      columnStructure.push({ type: 'date', day: d, dayName: shortDays[dateObj.getDay()] });
      if (dateObj.getDay() === 0) {
        columnStructure.push({ type: 'week', name: weekNames[weekIndex] });
        weekIndex++;
      }
    }

    const reportRowsMap = new Map();
    excelStandardRows.forEach((sr) => {
      reportRowsMap.set(sr.id, {
        name: sr.name,
        dailyTotals: Array.from({ length: daysInMonth }, () => ({ total: 0, details: {} }))
      });
    });

    const grandTotalPerDay = Array.from({ length: daysInMonth }, () => ({ total: 0, details: {} }));

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAllTypes = allReports[dateStr];

      if (dayAllTypes) {
        Object.keys(dayAllTypes).forEach((typeKey) => {
          const typeData = dayAllTypes[typeKey];
          if (typeData && typeData.formData) {
            Object.keys(typeData.formData).forEach((formKey) => {
              const val = Number(typeData.formData[formKey]) || 0;
              if (val > 0) {
                const parts = formKey.split('_');
                if (parts.length >= 3 && parts[0] === 'cat') {
                  const catId = `${parts[0]}_${parts[1]}`;
                  let itemId = '';
                  if (parts[2] === 'item' && parts[3]) itemId = `${parts[2]}_${parts[3]}`;
                  else if (parts[2] === 'direct') itemId = 'direct';

                  if (catId && itemId) {
                    const cat = categories.find((c) => c.id === catId);
                    const catName = cat ? cat.name : 'Sumber Lain';

                    let itemName = '';
                    if (itemId === 'direct') itemName = catName;
                    else {
                      const itemInfo = cat?.items?.find((i) => i.id === itemId);
                      itemName = itemInfo ? itemInfo.name : 'Item Tidak Dikenal';
                    }

                    let matchedRowId = null;
                    for (const sr of excelStandardRows) {
                      if (sr.match(itemName)) {
                        matchedRowId = sr.id;
                        break;
                      }
                    }

                    if (!matchedRowId) {
                      matchedRowId = `dyn_${itemName}`;
                      if (!reportRowsMap.has(matchedRowId)) {
                        reportRowsMap.set(matchedRowId, {
                          name: itemName,
                          dailyTotals: Array.from({ length: daysInMonth }, () => ({ total: 0, details: {} }))
                        });
                      }
                    }

                    const dayIndex = day - 1;
                    const rowObj = reportRowsMap.get(matchedRowId);

                    rowObj.dailyTotals[dayIndex].total += val;
                    rowObj.dailyTotals[dayIndex].details[catName] =
                      (rowObj.dailyTotals[dayIndex].details[catName] || 0) + val;

                    grandTotalPerDay[dayIndex].total += val;
                    grandTotalPerDay[dayIndex].details[catName] =
                      (grandTotalPerDay[dayIndex].details[catName] || 0) + val;
                  }
                }
              }
            });
          }
        });
      }
    }

    const finalRows = Array.from(reportRowsMap.values()).filter(
      (r) => r.dailyTotals.some((d) => d.total > 0) || excelStandardRows.find((sr) => sr.name === r.name)
    );

    return { columnStructure, reportRows: finalRows, grandTotalPerDay };
  };

  // 2. Data Generator: Rekonsiliasi Harian (E-Car, Foto Satwa, & Kategori Lain)
  const generateRekonData = (catName) => {
    const [yearStr, monthStr] = excelReportMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const shortDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const lowerTarget = (catName || '').toLowerCase().trim();
    const isEcarTarget =
      lowerTarget.includes('ecar') ||
      lowerTarget.includes('e-car') ||
      lowerTarget.includes('mobil listrik');
    const isFotoTarget = lowerTarget.includes('foto');

    // 1. Identifikasi ID kategori yang cocok dari master categories
    const matchingCatIds = new Set();
    categories.forEach((c) => {
      const cName = (c.name || '').toLowerCase();
      let match = false;
      if (isEcarTarget) {
        match = cName.includes('ecar') || cName.includes('e-car') || cName.includes('mobil listrik');
      } else if (isFotoTarget) {
        match = cName.includes('foto');
      } else if (lowerTarget.includes('old gate') && cName.includes('old gate')) {
        match = true;
      } else if (lowerTarget.includes('online') && cName.includes('online')) {
        match = true;
      } else if (
        (lowerTarget.includes('tvm') || lowerTarget.includes('vending') || lowerTarget.includes('vinding')) &&
        (cName.includes('tvm') || cName.includes('vending') || cName.includes('vinding'))
      ) {
        match = true;
      } else if (lowerTarget.includes('new gate') && cName.includes('new gate')) {
        match = true;
      } else if (cName === lowerTarget) {
        match = true;
      }
      if (match) matchingCatIds.add(c.id);
    });

    // Helper pencocokan item atau key
    const isItemMatch = (item, key = '', catNameStr = '') => {
      if (item && item.catId && matchingCatIds.has(item.catId)) return true;
      const combined = `${catNameStr} ${item?.name || ''} ${item?.itemNote || ''} ${key}`.toLowerCase();
      if (isEcarTarget) {
        return combined.includes('e-car') || combined.includes('ecar') || combined.includes('mobil listrik');
      }
      if (isFotoTarget) {
        return combined.includes('foto');
      }
      if (matchingCatIds.size > 0 && item?.catId && matchingCatIds.has(item.catId)) return true;
      return combined.includes(lowerTarget);
    };

    // 2. Siapkan slot harian untuk seluruh hari di bulan terpilih (1..daysInMonth)
    const dayMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dayMap[dateStr] = {
        day: d,
        dayOfWeek: dateObj.getDay(),
        dateStr,
        dailyNominal: 0,
        rawPelimpahan: '',
        rawOfficer: '',
        uraian: '',
        docTypeKey: 'utama',
        docDateStr: dateStr,
        susulanList: []
      };
    }

    // 3. Pindai SEMUA laporan di allReports (agar transaksi di dokumen 'lain', 'lain_1', 'lain_2', maupun 'utama' terbaca)
    Object.keys(allReports || {}).forEach((docDateStr) => {
      const dayAll = allReports[docDateStr];
      if (!dayAll || typeof dayAll !== 'object') return;

      Object.keys(dayAll).forEach((docTypeKey) => {
        const typeData = dayAll[docTypeKey];
        if (!typeData || !typeData.formData) return;

        const docSigDate = typeData.signatureDate || docDateStr;
        const docOfficer = typeData.rekonOfficer || rekonOfficerName;
        const processedKeys = new Set();

        // A. Cek activeItems (data terstruktur di dokumen)
        if (Array.isArray(typeData.activeItems) && typeData.activeItems.length > 0) {
          typeData.activeItems.forEach((item) => {
            if (!item) return;
            const cat = categories.find((c) => c.id === item.catId);
            const catNameStr = cat?.name || '';

            const inputKey = getActiveItemKey(
              item.catId,
              item.id || item.itemId || 'direct',
              item.isSusulan,
              item.validDate,
              item.itemDate,
              item.itemNote
            );

            if (!isItemMatch(item, inputKey, catNameStr)) return;

            processedKeys.add(inputKey);
            const val = Number(typeData.formData[inputKey]) || 0;
            if (val <= 0) return;

            // Tanggal transaksi operasional (utamakan itemDate jika ada)
            let transDate = item.itemDate || (item.isSusulan && item.validDate ? item.validDate : docDateStr);

            // Tanggal pelimpahan / masuk bank
            let rawPelimpahan = '';
            if (Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0 && item.bankAllocations[0].bankDate) {
              rawPelimpahan = parseYmd ? parseYmd(item.bankAllocations[0].bankDate) : item.bankAllocations[0].bankDate.split(' ')[0];
            } else if (item.bankMatchDate) {
              rawPelimpahan = parseYmd ? parseYmd(item.bankMatchDate) : item.bankMatchDate.split(' ')[0];
            } else if (item.isSusulan && typeData.susulanMeta?.[inputKey]?.signatureDate) {
              rawPelimpahan = typeData.susulanMeta[inputKey].signatureDate;
            } else {
              rawPelimpahan = docSigDate;
            }

            const rawOfficer =
              (item.isSusulan && typeData.susulanMeta?.[inputKey]?.rekonOfficer) ||
              typeData.rekonOfficer ||
              rekonOfficerName;

            // Masukkan ke slot hari yang sesuai dengan tanggal transaksinya
            if (dayMap[transDate]) {
              const slot = dayMap[transDate];
              slot.docTypeKey = docTypeKey;
              slot.docDateStr = docDateStr;

              if (item.isSusulan) {
                slot.susulanList.push({
                  keys: [inputKey],
                  val,
                  validDate: item.validDate || transDate,
                  susSigDate: rawPelimpahan,
                  susOfficer: rawOfficer
                });
              } else {
                slot.dailyNominal += val;
                if (!slot.rawPelimpahan) slot.rawPelimpahan = rawPelimpahan;
                if (!slot.rawOfficer) slot.rawOfficer = rawOfficer;
                if (item.itemNote && !slot.uraian) slot.uraian = item.itemNote;
              }
            }
          });
        }

        // B. Cek sisa kunci di formData (jika activeItems kosong atau key belum tercover)
        Object.keys(typeData.formData).forEach((key) => {
          if (processedKeys.has(key)) return;
          const val = Number(typeData.formData[key]) || 0;
          if (val <= 0) return;

          let catNameStr = '';
          const parts = key.split('_');
          if (parts.length >= 2 && parts[0] === 'cat') {
            const cat = categories.find((c) => c.id === `${parts[0]}_${parts[1]}`);
            if (cat) catNameStr = cat.name;
          }

          if (!isItemMatch(null, key, catNameStr)) return;

          let transDate = docDateStr;
          const dateMatch = key.match(/_date_(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) transDate = dateMatch[1];

          const isSus = key.includes('_susulan_');
          const susMatch = key.match(/_susulan_(\d{4}-\d{2}-\d{2})/);
          if (isSus && susMatch) transDate = susMatch[1];

          if (dayMap[transDate]) {
            const slot = dayMap[transDate];
            slot.docTypeKey = docTypeKey;
            slot.docDateStr = docDateStr;

            if (isSus) {
              const susMeta = typeData.susulanMeta?.[key] || {};
              slot.susulanList.push({
                keys: [key],
                val,
                validDate: susMatch ? susMatch[1] : transDate,
                susSigDate: susMeta.signatureDate || docSigDate,
                susOfficer: susMeta.rekonOfficer || docOfficer
              });
            } else {
              slot.dailyNominal += val;
              if (!slot.rawPelimpahan) slot.rawPelimpahan = docSigDate;
              if (!slot.rawOfficer) slot.rawOfficer = docOfficer;
            }
          }
        });
      });
    });

    // 4. Susun baris output tabel rekon
    const rows = [];
    let grandTotal = 0;
    let rowNum = 1;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const slot = dayMap[dateStr];

      let formattedPelimpahan = '';
      let keterangan = '';

      if (slot.dailyNominal > 0) {
        if (!slot.rawPelimpahan) slot.rawPelimpahan = dateStr;
        if (!slot.rawOfficer) slot.rawOfficer = rekonOfficerName;

        const parts = slot.rawPelimpahan.split('-');
        if (parts.length === 3) {
          formattedPelimpahan = `${parts[2]}-${parts[1]}-${parts[0]}`;
          const sigYear = parseInt(parts[0], 10);
          const sigMonth = parseInt(parts[1], 10);
          if (sigYear > year || (sigYear === year && sigMonth > month)) {
            keterangan = 'Dilimpahkan di bulan berikutnya';
          }
        }
      }

      if (slot.dayOfWeek === 1 && slot.dailyNominal === 0 && slot.susulanList.length === 0) {
        keterangan = 'TMR Tutup ( Libur satwa )';
      }

      rows.push({
        no: rowNum++,
        hari: shortDays[slot.dayOfWeek],
        tanggal: `${String(d).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
        dateStr: dateStr,
        docDateStr: slot.docDateStr,
        docTypeKey: slot.docTypeKey,
        isSusulan: false,
        susulanKeys: null,
        uraian: slot.uraian,
        nominal: slot.dailyNominal,
        rawPelimpahan: slot.rawPelimpahan,
        rawOfficer: slot.rawOfficer,
        pelimpahan: formattedPelimpahan,
        keterangan: keterangan
      });
      grandTotal += slot.dailyNominal;

      // Sisipkan baris susulan jika ada
      slot.susulanList.forEach((sus) => {
        let susPelimpahan = '';
        let susKet = '';
        const sRaw = sus.susSigDate || dateStr;
        const p = sRaw.split('-');
        if (p.length === 3) {
          susPelimpahan = `${p[2]}-${p[1]}-${p[0]}`;
          const sigYear = parseInt(p[0], 10);
          const sigMonth = parseInt(p[1], 10);
          if (sigYear > year || (sigYear === year && sigMonth > month)) {
            susKet = 'Dilimpahkan di bulan berikutnya';
          }
        }

        rows.push({
          no: rowNum++,
          hari: '',
          tanggal: '',
          dateStr: dateStr,
          docDateStr: slot.docDateStr,
          docTypeKey: slot.docTypeKey,
          isSusulan: true,
          susulanKeys: sus.keys,
          uraian: 'Susulan',
          nominal: sus.val,
          rawPelimpahan: sRaw,
          rawOfficer: sus.susOfficer || rekonOfficerName,
          pelimpahan: susPelimpahan,
          keterangan: susKet
        });
        grandTotal += sus.val;
      });
    }

    return { rows, grandTotal, year, month };
  };

  // Download Handler Master Excel
  const handleDownloadExcel = () => {
    const { columnStructure, reportRows, grandTotalPerDay } = generateExcelData();

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8">
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 4px; vertical-align: middle; }
      .num { text-align: right; }
      .header { font-weight: bold; background-color: #f3f4f6; }
      .week-col { font-weight: bold; background-color: #fef08a; text-align: right; }
      .grand-total { font-weight: bold; background-color: #bfdbfe; }
      .gt-week { font-weight: bold; background-color: #93c5fd; text-align: right; }
      .gt-month { font-weight: bold; background-color: #bbf7d0; text-align: right; }
    </style>
    </head>
    <body>
    <table>`;

    html += `<tr><th class="header" style="text-align:left;">UP TAMAN MARGASATWA RAGUNAN</th>`;
    columnStructure.forEach((col) => {
      if (col.type === 'date') {
        html += `<th class="header" style="text-align:center;">${col.day}<br><span style="font-size:9px;font-weight:normal;">${col.dayName}</span></th>`;
      } else {
        html += `<th class="header" style="text-align:center;">${col.name}</th>`;
      }
    });
    html += `<th class="header" style="text-align:right;">jumlah</th></tr>`;

    html += `<tr><th class="header" style="text-align:left; color:#6b7280;">PENDAPATAN RETRIBUSI DAERAH</th>`;
    columnStructure.forEach(() => {
      html += `<th class="header"></th>`;
    });
    html += `<th class="header"></th></tr>`;

    reportRows.forEach((row) => {
      let weekSum = 0;
      let monthSum = 0;
      html += `<tr><td>${safeString(row.name)}</td>`;

      columnStructure.forEach((col) => {
        if (col.type === 'date') {
          let val = row.dailyTotals[col.day - 1].total;
          weekSum += val;
          monthSum += val;
          html += `<td class="num">${val > 0 ? formatRp(val) : ''}</td>`;
        } else {
          html += `<td class="week-col">${weekSum > 0 ? formatRp(weekSum) : ''}</td>`;
          weekSum = 0;
        }
      });
      html += `<td class="gt-month">${monthSum > 0 ? formatRp(monthSum) : ''}</td></tr>`;
    });

    let gtWeekSum = 0;
    let gtMonthSum = 0;
    html += `<tr><td class="grand-total">JUMLAH Rp</td>`;
    columnStructure.forEach((col) => {
      if (col.type === 'date') {
        let val = grandTotalPerDay[col.day - 1].total;
        gtWeekSum += val;
        gtMonthSum += val;
        html += `<td class="num grand-total">${val > 0 ? formatRp(val) : ''}</td>`;
      } else {
        html += `<td class="gt-week">${gtWeekSum > 0 ? formatRp(gtWeekSum) : ''}</td>`;
        gtWeekSum = 0;
      }
    });
    html += `<td class="gt-month">${gtMonthSum > 0 ? formatRp(gtMonthSum) : ''}</td></tr>`;

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const [y, m] = excelReportMonth.split('-');
    const monthNames = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

    link.setAttribute('href', url);
    link.setAttribute('download', `INPUT ${y}.xls - ${monthNames[parseInt(m, 10)]} ${y.substring(2)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Handler Rekon Excel
  const handleDownloadRekonExcel = (targetCatName) => {
    const reportCat = targetCatName || selectedReportType;
    const { rows, grandTotal, year, month } = generateRekonData(reportCat);
    const monthNames = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const monthName = monthNames[month];
    const signatureDateStr = currentReport.signatureDate || getLocalYMD();

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8">
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
      th, td { border: 1px solid #000000; padding: 4px; vertical-align: middle; }
      .header-title { font-weight: bold; font-size: 14px; text-align: left; border: none; }
      .header-sub { font-weight: bold; text-align: left; border: none; }
      .table-header { font-weight: bold; background-color: #f3f4f6; text-align: center; }
      .num { text-align: right; }
    </style>
    </head>
    <body>
    <table>`;

    html += `<tr><th colspan="7" class="header-title">REKONSILIASI PENDAPATAN ${reportCat.toUpperCase()}</th></tr>`;
    html += `<tr><th colspan="7" class="header-sub">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</th></tr>`;
    html += `<tr><th colspan="7" class="header-sub">DINAS PERTAMANAN DAN HUTAN KOTA PROVINSI DKI JAKARTA</th></tr>`;
    html += `<tr><th colspan="7" class="header-sub">BULAN ${monthName} ${year}</th></tr>`;
    html += `<tr><th colspan="7" style="border:none;"></th></tr>`;

    html += `<tr>
        <th rowspan="2" class="table-header">No</th>
        <th colspan="2" class="table-header">Transaksi</th>
        <th rowspan="2" class="table-header">Uraian</th>
        <th colspan="2" class="table-header">Pelimpahan</th>
        <th rowspan="2" class="table-header">Keterangan</th>
    </tr>`;
    html += `<tr>
        <th class="table-header">Hari</th>
        <th class="table-header">Tanggal</th>
        <th class="table-header">Nominal ( RP )</th>
        <th class="table-header">Tanggal</th>
    </tr>`;

    rows.forEach((r) => {
      html += `<tr>
          <td style="text-align:center;">${r.no}</td>
          <td style="text-align:center;">${safeString(r.hari)}</td>
          <td style="text-align:center;">${safeString(r.tanggal)}</td>
          <td style="text-align:center;">${safeString(r.uraian)}</td>
          <td class="num">${r.nominal > 0 ? formatRp(r.nominal) : ''}</td>
          <td style="text-align:center;">${r.nominal > 0 || r.uraian === 'Susulan' ? safeString(r.pelimpahan) : ''}</td>
          <td>${safeString(r.keterangan)}</td>
      </tr>`;
    });

    html += `<tr>
        <td colspan="4" style="text-align:right; font-weight:bold;">TOTAL</td>
        <td class="num" style="font-weight:bold;">${formatRp(grandTotal)}</td>
        <td colspan="2"></td>
    </tr>`;

    html += `<tr><td colspan="7" style="border:none; height: 20px;"></td></tr>`;
    html += `<tr>
        <td colspan="4" style="border:none;"></td>
        <td colspan="3" style="text-align:center; border:none; font-size: 12px;">Jakarta, ${formatTanggalTtd(signatureDateStr)}</td>
    </tr>`;
    html += `<tr>
        <td colspan="4" style="border:none;"></td>
        <td colspan="3" style="text-align:center; border:none; font-weight:bold; font-size: 12px;">${safeString(signatures.leftRole)}</td>
    </tr>`;
    html += `<tr><td colspan="7" style="border:none; height: 60px;"></td></tr>`;
    html += `<tr>
        <td colspan="4" style="border:none;"></td>
        <td colspan="3" style="text-align:center; border:none; font-weight:bold; font-size: 12px; text-decoration:underline;">${safeString(signatures.leftName)}</td>
    </tr>`;
    html += `<tr>
        <td colspan="4" style="border:none;"></td>
        <td colspan="3" style="text-align:center; border:none; font-size: 12px;">NIP. ${safeString(signatures.leftNip)}</td>
    </tr>`;

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `REKON ${reportCat.toUpperCase()} - ${monthName} ${year.toString().slice(-2)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler Download Universal berdasarkan tipe laporan yang aktif
  const handleUniversalDownload = () => {
    switch (selectedReportType) {
      case 'rekapitulasi':
        handleDownloadExcel();
        break;
      case 'rekap_stsu':
        exportStsuKasDaerahExcel(getStsuKasDaerahData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'pengunjung_tmr':
        exportPengunjungTmrExcel(getPengunjungTmrData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'pengunjung_pps':
        exportPusatPrimataExcel(getPusatPrimataData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'pengunjung_tsa':
        exportTamanSatwaAnakExcel(getTamanSatwaAnakData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'eticketing':
        exportEticketingExcel(getEticketingData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'gate_report':
        exportGateRevenueExcel(getGateRevenueData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'pemakaian_tempat':
        exportPemakaianTempatExcel(getPemakaianTempatData(allReports, categories, excelReportMonth, bankRows), signatures);
        break;
      case 'rekap_promo':
        exportPromoMediaExcel(getPromoMediaData(allReports, categories, excelReportMonth), signatures);
        break;
      case 'rekon_ecar':
        handleDownloadRekonExcel('E-Car');
        break;
      case 'rekon_foto':
        handleDownloadRekonExcel('Foto Satwa');
        break;
      default:
        handleDownloadRekonExcel(selectedReportType);
        break;
    }
  };

  // Data terhitung dinamis untuk view aktif
  const activeReportObj = useMemo(() => {
    for (const cat of REPORT_CATEGORIES) {
      const found = cat.reports.find((r) => r.id === selectedReportType);
      if (found) return { ...found, category: cat };
    }
    return {
      id: selectedReportType,
      name: `Rekonsiliasi: ${selectedReportType}`,
      subtitle: `Laporan Rekonsiliasi format Excel`,
      category: REPORT_CATEGORIES[4]
    };
  }, [selectedReportType]);

  return (
    <div className="mt-2">
      {/* 1. BARIS KATEGORI UTAMA (5 KATEGORI LAPORAN RAGUNAN) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
        {REPORT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeMainCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveMainCategory(cat.id);
                // Pilih laporan pertama di kategori tersebut
                if (cat.reports && cat.reports.length > 0) {
                  setSelectedReportType(cat.reports[0].id);
                }
              }}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2 shadow-xs group ${
                isActive
                  ? 'bg-gray-900 border-gray-900 text-white shadow-md scale-[1.02]'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {cat.reports.length} Format
                </span>
              </div>
              <div>
                <div className="text-xs font-black tracking-tight">{cat.name}</div>
                <div className={`text-[10px] truncate ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                  {cat.reports.map((r) => r.name.split(' ')[0]).join(', ')}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. SUB-NAVIGASI LAPORAN DALAM KATEGORI TERPILIH */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-4 p-1.5 bg-white rounded-xl shadow-xs border border-gray-200 items-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-2 pr-1 flex items-center gap-1 shrink-0">
          <Layers size={14} /> Format:
        </span>
        {(() => {
          const currentCat = REPORT_CATEGORIES.find((c) => c.id === activeMainCategory) || REPORT_CATEGORIES[0];
          return (
            <>
              {currentCat.reports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReportType(rep.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedReportType === rep.id
                      ? 'bg-blue-600 text-white shadow-xs scale-102'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <span>{rep.name}</span>
                </button>
              ))}

              {/* Tambahan Tombol Kategori Rekon Dinamis jika berada di Kategori Rekonsiliasi */}
              {activeMainCategory === 'rekon_mitra' &&
                reportCategories.map((catName) => (
                  <button
                    key={catName}
                    onClick={() => setSelectedReportType(catName)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedReportType === catName
                        ? 'bg-indigo-600 text-white shadow-xs scale-102'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    <span>Rekon: {catName}</span>
                  </button>
                ))}
            </>
          );
        })()}
      </div>

      {/* 3. CARD UTAMA LAPORAN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Banner Header Laporan */}
        <div
          className={`bg-gradient-to-r ${
            activeReportObj.category?.color || 'from-blue-600 to-blue-800'
          } p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 transition-all`}
        >
          <div className="text-left w-full md:w-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>{activeReportObj.category?.name || 'Laporan TMR'}</span>
              <span>•</span>
              <span className="font-mono">{activeReportObj.formatCode || 'Excel Template'}</span>
            </div>
            <h2 className="text-2xl font-black drop-shadow-xs flex items-center gap-2">
              <FileSpreadsheet size={26} /> {activeReportObj.name}
            </h2>
            <p className="text-white/80 text-xs mt-0.5 max-w-xl">
              {activeReportObj.subtitle} • Data otomatis teragregasi dari input STSU harian.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full md:w-auto">
            {/* Filter Bulan */}
            <div className="bg-white/15 backdrop-blur-md p-1 rounded-xl flex items-center gap-2 border border-white/20 w-full sm:w-auto justify-between">
              <div className="flex items-center gap-1.5 pl-2 text-white/90">
                <Calendar size={16} />
                <span className="text-xs font-semibold">Bulan:</span>
              </div>
              <input
                type="month"
                value={excelReportMonth}
                onChange={(e) => setExcelReportMonth(e.target.value)}
                className="bg-transparent border-none text-white font-bold outline-none cursor-pointer focus:ring-0 text-xs pr-2"
              />
            </div>

            {/* Tombol Download Excel */}
            <button
              onClick={handleUniversalDownload}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs w-full sm:w-auto shrink-0 border border-emerald-400"
            >
              <Download size={16} /> Download Excel (.xls)
            </button>
          </div>
        </div>

        {/* 4. CONTENT VIEW TABEL SESUAI TIPE LAPORAN */}
        <div className="p-0 overflow-x-auto">
          {(() => {
            // A. Laporan Rekapitulasi Master
            if (selectedReportType === 'rekapitulasi') {
              const { columnStructure, reportRows, grandTotalPerDay } = generateExcelData();
              return (
                <div className="w-full relative">
                  <table className="w-full border-collapse text-[11px] whitespace-nowrap">
                    <thead>
                      <tr>
                        <th className="sticky-col px-4 py-2 border border-gray-300 bg-gray-200 text-left min-w-[200px] z-20 top-0 font-bold text-gray-700">
                          UP TAMAN MARGASATWA RAGUNAN
                        </th>
                        {columnStructure.map((col) =>
                          col.type === 'date' ? (
                            <th
                              key={`h-${col.day}`}
                              className="min-w-[60px] px-2 py-2 border border-gray-300 bg-gray-100 text-center font-bold text-gray-600 text-xs"
                            >
                              <div>{col.day}</div>
                              <div className="text-[9px] font-normal mt-0.5 text-gray-500">{col.dayName}</div>
                            </th>
                          ) : (
                            <th
                              key={`h-${col.name}`}
                              className="min-w-[80px] px-2 py-2 border border-gray-300 bg-yellow-100 text-center font-bold text-yellow-800 text-xs"
                            >
                              {col.name}
                            </th>
                          )
                        )}
                        <th className="px-3 py-2 border border-gray-300 bg-green-100 text-right font-black text-green-800 text-xs min-w-[100px]">
                          jumlah
                        </th>
                      </tr>
                      <tr>
                        <th className="sticky-col px-4 py-2 border border-gray-300 bg-gray-50 text-left font-bold text-gray-500 z-20">
                          PENDAPATAN RETRIBUSI DAERAH
                        </th>
                        <th colSpan={columnStructure.length + 1} className="border border-gray-300 bg-gray-50"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row, idx) => {
                        let weekSum = 0;
                        let monthSum = 0;
                        return (
                          <tr key={`row-${idx}`} className="hover:bg-blue-50/50">
                            <td
                              className="sticky-col px-4 py-1.5 border border-gray-300 text-left font-medium text-gray-800"
                              title={row.name}
                            >
                              {row.name}
                            </td>
                            {columnStructure.map((col) => {
                              if (col.type === 'date') {
                                let val = row.dailyTotals[col.day - 1].total;
                                let details = row.dailyTotals[col.day - 1].details;
                                weekSum += val;
                                monthSum += val;
                                return (
                                  <td
                                    key={`c-${idx}-${col.day}`}
                                    className="px-2 py-1.5 border border-gray-300 text-right cursor-help hover:bg-yellow-50"
                                    title={formatDetailsTooltip(val, details)}
                                  >
                                    {val > 0 ? formatRp(val) : ''}
                                  </td>
                                );
                              } else {
                                let currentWeekSum = weekSum;
                                weekSum = 0;
                                return (
                                  <td
                                    key={`cw-${idx}-${col.name}`}
                                    className="px-2 py-1.5 border border-gray-300 text-right font-bold bg-yellow-50 text-yellow-800"
                                  >
                                    {currentWeekSum > 0 ? formatRp(currentWeekSum) : ''}
                                  </td>
                                );
                              }
                            })}
                            <td className="px-3 py-1.5 border border-gray-300 text-right font-black text-green-700 bg-green-50">
                              {monthSum > 0 ? formatRp(monthSum) : ''}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Baris Grand Total */}
                      <tr className="bg-blue-100">
                        <td className="sticky-col px-4 py-3 border border-blue-300 text-left font-black text-blue-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                          JUMLAH Rp
                        </td>
                        {(() => {
                          let weekSum = 0;
                          let monthSum = 0;
                          return columnStructure.map((col) => {
                            if (col.type === 'date') {
                              let val = grandTotalPerDay[col.day - 1].total;
                              let details = grandTotalPerDay[col.day - 1].details;
                              weekSum += val;
                              monthSum += val;
                              return (
                                <td
                                  key={`gt-${col.day}`}
                                  className="px-2 py-3 border border-blue-300 text-right font-bold text-blue-900 cursor-help hover:bg-blue-200 transition-colors"
                                  title={formatDetailsTooltip(val, details)}
                                >
                                  {val > 0 ? formatRp(val) : ''}
                                </td>
                              );
                            } else {
                              let currentWeekSum = weekSum;
                              weekSum = 0;
                              return (
                                <td
                                  key={`gtw-${col.name}`}
                                  className="px-2 py-3 border border-blue-300 text-right font-black bg-blue-200 text-blue-900"
                                >
                                  {currentWeekSum > 0 ? formatRp(currentWeekSum) : ''}
                                </td>
                              );
                            }
                          });
                        })()}
                        <td className="px-3 py-3 border border-blue-300 text-right font-black bg-green-200 text-green-900 text-xs">
                          {(() => {
                            let finalTotal = grandTotalPerDay.reduce((acc, curr) => acc + curr.total, 0);
                            return finalTotal > 0 ? formatRp(finalTotal) : '';
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            // B. Laporan STSU Kas Daerah (Jagir)
            if (selectedReportType === 'rekap_stsu') {
              const stsuData = getStsuKasDaerahData(allReports, categories, excelReportMonth);
              return <StsuKasDaerahTable data={stsuData} />;
            }

            // C. Laporan Pengunjung & Wahana (TMR, PPS, TSA)
            if (selectedReportType === 'pengunjung_tmr') {
              const data = getPengunjungTmrData(allReports, categories, excelReportMonth);
              return <PengunjungReportTable reportType="pengunjung_tmr" data={data} />;
            }
            if (selectedReportType === 'pengunjung_pps') {
              const data = getPusatPrimataData(allReports, categories, excelReportMonth);
              return <PengunjungReportTable reportType="pengunjung_pps" data={data} />;
            }
            if (selectedReportType === 'pengunjung_tsa') {
              const data = getTamanSatwaAnakData(allReports, categories, excelReportMonth);
              return <PengunjungReportTable reportType="pengunjung_tsa" data={data} />;
            }

            // D. Laporan Ticketing & Gate
            if (selectedReportType === 'eticketing') {
              const data = getEticketingData(allReports, categories, excelReportMonth);
              return <TicketingReportTable reportType="eticketing" data={data} />;
            }
            if (selectedReportType === 'gate_report') {
              const data = getGateRevenueData(allReports, categories, excelReportMonth);
              return <TicketingReportTable reportType="gate_report" data={data} />;
            }

            // E. Laporan Sewa Tempat & Promosi
            if (selectedReportType === 'pemakaian_tempat') {
              const data = getPemakaianTempatData(allReports, categories, excelReportMonth, bankRows);
              return (
                <FasilitasPromoTable
                  reportType="pemakaian_tempat"
                  data={data}
                  monthStr={excelReportMonth}
                  allReports={allReports}
                  categories={categories}
                  bankRows={bankRows}
                />
              );
            }
            if (selectedReportType === 'rekap_promo') {
              const data = getPromoMediaData(allReports, categories, excelReportMonth);
              return <FasilitasPromoTable reportType="rekap_promo" data={data} />;
            }

            // F. Laporan Rekonsiliasi (E-Car, Foto Satwa, & Kategori Lain)
            const targetCat =
              selectedReportType === 'rekon_ecar'
                ? 'E-Car'
                : selectedReportType === 'rekon_foto'
                ? 'Foto Satwa'
                : selectedReportType;

            const { rows, grandTotal } = generateRekonData(targetCat);

            return (
              <div className="w-full relative overflow-x-auto">
                <table className="w-full border-collapse text-[12px] whitespace-nowrap">
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="sticky-col px-4 py-2 border border-gray-300 bg-gray-200 text-center font-bold text-gray-700 z-20 top-0"
                      >
                        No
                      </th>
                      <th colSpan={2} className="px-4 py-2 border border-gray-300 bg-gray-200 text-center font-bold text-gray-700">
                        Transaksi
                      </th>
                      <th rowSpan={2} className="px-4 py-2 border border-gray-300 bg-gray-200 text-center font-bold text-gray-700">
                        Uraian
                      </th>
                      <th colSpan={2} className="px-4 py-2 border border-gray-300 bg-gray-200 text-center font-bold text-gray-700">
                        Pelimpahan
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-2 border border-gray-300 bg-gray-200 text-center font-bold text-gray-700 min-w-[200px]"
                      >
                        Keterangan
                      </th>
                    </tr>
                    <tr>
                      <th className="px-4 py-2 border border-gray-300 bg-gray-100 text-center font-bold text-gray-600">Hari</th>
                      <th className="px-4 py-2 border border-gray-300 bg-gray-100 text-center font-bold text-gray-600">Tanggal</th>
                      <th className="px-4 py-2 border border-gray-300 bg-gray-100 text-center font-bold text-gray-600">Nominal ( RP )</th>
                      <th className="px-4 py-2 border border-gray-300 bg-gray-100 text-center font-bold text-gray-600">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-indigo-50/50">
                        <td className="sticky-col px-4 py-2 border border-gray-300 text-center font-medium text-gray-800 z-10 bg-white shadow-[inset_-1px_0_0_#e5e7eb]">
                          {r.no}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-center text-gray-700">{r.hari}</td>
                        <td className="px-4 py-2 border border-gray-300 text-center text-gray-700 font-mono">{r.tanggal}</td>
                        <td className="px-4 py-2 border border-gray-300 text-center text-gray-700">{r.uraian}</td>
                        <td className="px-4 py-2 border border-gray-300 text-right font-medium text-gray-800">
                          {r.nominal > 0 ? formatRp(r.nominal) : ''}
                        </td>
                        <td className="px-2 py-1 border border-gray-300 text-center font-mono align-middle h-full">
                          {r.nominal > 0 || r.uraian === 'Susulan' ? (
                            <div className="flex flex-col items-center justify-center gap-0.5 group">
                              <span className="hidden print:block">{r.pelimpahan}</span>
                              <div className="print:hidden flex flex-col items-center">
                                <input
                                  type="date"
                                  value={r.rawPelimpahan}
                                  onChange={(e) =>
                                    handleUpdateRekonRow(r.docDateStr || r.dateStr, r.isSusulan, r.susulanKeys, 'signatureDate', e.target.value, r.docTypeKey)
                                  }
                                  className="bg-transparent border border-transparent hover:border-gray-200 text-center outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5 text-xs text-gray-800 font-mono w-[115px] m-0"
                                />
                                <input
                                  type="text"
                                  value={r.rawOfficer}
                                  onChange={(e) =>
                                    handleUpdateRekonRow(r.docDateStr || r.dateStr, r.isSusulan, r.susulanKeys, 'rekonOfficer', e.target.value, r.docTypeKey)
                                  }
                                  placeholder="Petugas Rekon"
                                  className="bg-transparent border-b-2 border-yellow-400 outline-none focus:border-indigo-500 rounded-none px-1 text-[10px] font-bold text-indigo-700 text-center w-[100px] placeholder-indigo-300 m-0"
                                  title="Nama Petugas (Hanya di sistem)"
                                />
                              </div>
                            </div>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-left text-gray-600 italic">{r.keterangan}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-100">
                      <td
                        colSpan={4}
                        className="sticky-col px-4 py-3 border border-indigo-300 text-right font-black text-indigo-900 bg-indigo-100 z-10 shadow-[inset_-1px_0_0_#a5b4fc]"
                      >
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border border-indigo-300 text-right font-black text-indigo-900">
                        {formatRp(grandTotal)}
                      </td>
                      <td colSpan={2} className="border border-indigo-300"></td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-8 flex justify-end px-8 pb-8 text-sm text-gray-800">
                  <div className="text-center flex flex-col justify-between min-w-[250px]">
                    <div>
                      <p className="mb-1">Jakarta, {formatTanggalTtd(currentReport.signatureDate)}</p>
                      <p className="font-bold mt-2">{safeString(signatures.leftRole)}</p>
                    </div>
                    <div className="mt-20">
                      <p className="font-bold underline">{safeString(signatures.leftName)}</p>
                      <p>NIP. {safeString(signatures.leftNip)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer Info Box */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <span>
              Format laporan disesuaikan dengan standar dokumen resmi TMR di folder{' '}
              <strong className="text-gray-800 font-mono">format laporan</strong>.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
            <span>Periode: {excelReportMonth}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
