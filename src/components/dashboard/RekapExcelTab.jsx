import React from 'react';
import { Calendar, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import {
  safeString,
  formatRp,
  getLocalYMD,
  formatTanggalTtd,
  formatDetailsTooltip
} from '../../utils/formatters';

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

/**
 * Komponen Tab Laporan & Rekonsiliasi Excel Bulanan
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
  rekonOfficerName = '',
  currentReport = {},
  signatures = {},
  handleUpdateRekonRow
}) {
  if (dashboardTab !== 'rekap') return null;

  // Generate data matriks Rekapitulasi Excel
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
    excelStandardRows.forEach(sr => {
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
          Object.keys(dayAllTypes).forEach(typeKey => {
              const typeData = dayAllTypes[typeKey];
              if (typeData && typeData.formData) {
                  Object.keys(typeData.formData).forEach(formKey => {
                      const val = Number(typeData.formData[formKey]) || 0;
                      if (val > 0) {
                          const parts = formKey.split('_');
                          if (parts.length >= 3 && parts[0] === 'cat') {
                              const catId = `${parts[0]}_${parts[1]}`;
                              let itemId = '';
                              if (parts[2] === 'item' && parts[3]) itemId = `${parts[2]}_${parts[3]}`;
                              else if (parts[2] === 'direct') itemId = 'direct';

                              if (catId && itemId) {
                                  const cat = categories.find(c => c.id === catId);
                                  const catName = cat ? cat.name : 'Sumber Lain';
                                  
                                  let itemName = '';
                                  if (itemId === 'direct') itemName = catName;
                                  else {
                                      const itemInfo = cat?.items?.find(i => i.id === itemId);
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
                                              dailyTotals: Array.from({length: daysInMonth}, () => ({ total: 0, details: {} }))
                                          });
                                      }
                                  }

                                  const dayIndex = day - 1;
                                  const rowObj = reportRowsMap.get(matchedRowId);
                                  
                                  rowObj.dailyTotals[dayIndex].total += val;
                                  rowObj.dailyTotals[dayIndex].details[catName] = (rowObj.dailyTotals[dayIndex].details[catName] || 0) + val;

                                  grandTotalPerDay[dayIndex].total += val;
                                  grandTotalPerDay[dayIndex].details[catName] = (grandTotalPerDay[dayIndex].details[catName] || 0) + val;
                              }
                          }
                      }
                  });
              }
          });
      }
    }

    const finalRows = Array.from(reportRowsMap.values()).filter(r => 
      r.dailyTotals.some(d => d.total > 0) || excelStandardRows.find(sr => sr.name === r.name)
    );

    return { columnStructure, reportRows: finalRows, grandTotalPerDay };
  };

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
    columnStructure.forEach(col => {
        if (col.type === 'date') {
            html += `<th class="header" style="text-align:center;">${col.day}<br><span style="font-size:9px;font-weight:normal;">${col.dayName}</span></th>`;
        } else {
            html += `<th class="header" style="text-align:center;">${col.name}</th>`;
        }
    });
    html += `<th class="header" style="text-align:right;">jumlah</th></tr>`;

    html += `<tr><th class="header" style="text-align:left; color:#6b7280;">PENDAPATAN RETRIBUSI DAERAH</th>`;
    columnStructure.forEach(() => { html += `<th class="header"></th>`; });
    html += `<th class="header"></th></tr>`;

    reportRows.forEach(row => {
        let weekSum = 0;
        let monthSum = 0;
        html += `<tr><td>${safeString(row.name)}</td>`;
        
        columnStructure.forEach(col => {
            if (col.type === 'date') {
                let val = row.dailyTotals[col.day - 1].total;
                weekSum += val;
                monthSum += val;
                html += `<td class="num">${val > 0 ? formatRp(val) : ""}</td>`;
            } else {
                html += `<td class="week-col">${weekSum > 0 ? formatRp(weekSum) : ""}</td>`;
                weekSum = 0;
            }
        });
        html += `<td class="gt-month">${monthSum > 0 ? formatRp(monthSum) : ""}</td></tr>`;
    });

    let gtWeekSum = 0;
    let gtMonthSum = 0;
    html += `<tr><td class="grand-total">JUMLAH Rp</td>`;
    columnStructure.forEach(col => {
        if (col.type === 'date') {
            let val = grandTotalPerDay[col.day - 1].total;
            gtWeekSum += val;
            gtMonthSum += val;
            html += `<td class="num grand-total">${val > 0 ? formatRp(val) : ""}</td>`;
        } else {
            html += `<td class="gt-week">${gtWeekSum > 0 ? formatRp(gtWeekSum) : ""}</td>`;
            gtWeekSum = 0; 
        }
    });
    html += `<td class="gt-month">${gtMonthSum > 0 ? formatRp(gtMonthSum) : ""}</td></tr>`;

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const [y, m] = excelReportMonth.split('-');
    const monthNames = ["", "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `INPUT ${y}.xls - ${monthNames[parseInt(m, 10)]} ${y.substring(2)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate data laporan rekonsiliasi harian
  const generateRekonData = (catName) => {
    const [yearStr, monthStr] = excelReportMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const shortDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Pencocokan kategori cerdas (Toleransi perbedaan nama di database user)
    let catId = null;
    const lowerTarget = catName.toLowerCase();
    const cat = categories.find(c => {
        const cName = (c.name || '').toLowerCase();
        if (lowerTarget.includes('old gate') && cName.includes('old gate')) return true;
        if (lowerTarget.includes('online') && cName.includes('online')) return true;
        if ((lowerTarget.includes('tvm') || lowerTarget.includes('vending') || lowerTarget.includes('vinding')) && 
            (cName.includes('tvm') || cName.includes('vending') || cName.includes('vinding'))) return true;
        if (lowerTarget.includes('new gate') && cName.includes('new gate')) return true;
        return cName === lowerTarget;
    });
    if (cat) catId = cat.id;

    const rows = [];
    let grandTotal = 0;
    let rowNum = 1;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const dayAllTypes = allReports[dateStr];
        
        let dailyNominal = 0;
        let susulanList = [];
        let signatureDate = '';
        let rekonOfficer = '';

        if (dayAllTypes && dayAllTypes['utama']) {
            const typeData = dayAllTypes['utama'];
            if (typeData && typeData.formData) {
                signatureDate = typeData.signatureDate || '';
                rekonOfficer = typeData.rekonOfficer || '';
                
                Object.keys(typeData.formData).forEach(key => {
                    if (catId && key.startsWith(`${catId}_`)) {
                        const val = Number(typeData.formData[key]) || 0;
                        if (val > 0) {
                            if (key.includes('_susulan_')) {
                                const match = key.match(/_susulan_(\d{4}-\d{2}-\d{2})/);
                                const validDate = match ? match[1] : '';
                                
                                const susulanMeta = typeData.susulanMeta?.[key] || {};
                                const susSigDate = susulanMeta.signatureDate || validDate || getLocalYMD();
                                const susOfficer = susulanMeta.rekonOfficer || rekonOfficerName;

                                const existingSus = susulanList.find(s => s.validDate === validDate);
                                if (existingSus) {
                                    existingSus.val += val;
                                    existingSus.keys.push(key);
                                }
                                else {
                                    susulanList.push({ keys: [key], val, validDate, susSigDate, susOfficer });
                                }
                            } else {
                                dailyNominal += val;
                            }
                        }
                    }
                });
            }
        }

        let rawPelimpahan = '';
        let rawOfficer = '';
        let formattedPelimpahan = '';
        let keterangan = "";
        
        if (dailyNominal > 0) {
            rawPelimpahan = signatureDate || getLocalYMD();
            rawOfficer = rekonOfficer || rekonOfficerName;
            
            const parts = rawPelimpahan.split('-');
            if (parts.length === 3) {
                formattedPelimpahan = `${parts[2]}-${parts[1]}-${parts[0]}`;
                
                // Cek dilimpahkan di bulan berikutnya
                const sigYear = parseInt(parts[0], 10);
                const sigMonth = parseInt(parts[1], 10);
                if (sigYear > year || (sigYear === year && sigMonth > month)) {
                    keterangan = "Dilimpahkan di bulan berikutnya";
                }
            }
        }

        if (dateObj.getDay() === 1 && dailyNominal === 0 && susulanList.length === 0) {
            keterangan = "TMR Tutup ( Libur satwa )";
        }

        rows.push({
            no: rowNum++,
            hari: shortDays[dateObj.getDay()],
            tanggal: `${String(d).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
            dateStr: dateStr,
            isSusulan: false,
            susulanKeys: null,
            uraian: '',
            nominal: dailyNominal,
            rawPelimpahan: rawPelimpahan,
            rawOfficer: rawOfficer,
            pelimpahan: formattedPelimpahan,
            keterangan: keterangan
        });
        grandTotal += dailyNominal;

        susulanList.forEach(sus => {
            let susPelimpahan = '';
            let susKet = '';
            let sRawPelimpahan = sus.susSigDate || getLocalYMD();
            let sRawOfficer = sus.susOfficer || rekonOfficerName;

            const p = sRawPelimpahan.split('-');
            if (p.length === 3) {
                susPelimpahan = `${p[2]}-${p[1]}-${p[0]}`;
                const sigYear = parseInt(p[0], 10);
                const sigMonth = parseInt(p[1], 10);
                if (sigYear > year || (sigYear === year && sigMonth > month)) {
                    susKet = "Dilimpahkan di bulan berikutnya";
                }
            }

            rows.push({
                no: rowNum++,
                hari: '',
                tanggal: '',
                dateStr: dateStr,
                isSusulan: true,
                susulanKeys: sus.keys,
                uraian: 'Susulan',
                nominal: sus.val,
                rawPelimpahan: sRawPelimpahan,
                rawOfficer: sRawOfficer,
                pelimpahan: susPelimpahan,
                keterangan: susKet
            });
            grandTotal += sus.val;
        });
    }

    return { rows, grandTotal, year, month };
  };

  const handleDownloadRekonExcel = () => {
    const { rows, grandTotal, year, month } = generateRekonData(selectedReportType);
    const monthNames = ["", "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
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
    
    html += `<tr><th colspan="7" class="header-title">REKONSILIASI PENDAPATAN ${selectedReportType.toUpperCase()}</th></tr>`;
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

    rows.forEach(r => {
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
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `REKON ${selectedReportType.toUpperCase()} - ${monthName} ${year.toString().slice(-2)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-4">
      {/* NAVIGASI LAPORAN REKONSILIASI / MASTER */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-4 p-1.5 bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setSelectedReportType('rekapitulasi')}
          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
            selectedReportType === 'rekapitulasi' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Laporan Rekapitulasi
        </button>
        {reportCategories.map((catName) => (
          <button
            key={catName}
            onClick={() => setSelectedReportType(catName)}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              selectedReportType === catName ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Rekon: {catName}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div
          className={`bg-gradient-to-r ${
            selectedReportType === 'rekapitulasi' ? 'from-blue-600 to-blue-800' : 'from-indigo-600 to-indigo-800'
          } p-6 text-center text-white flex flex-col md:flex-row items-center justify-between gap-4 transition-colors`}
        >
          <div className="text-left">
            <h2 className="text-2xl font-black mb-1 drop-shadow-sm flex items-center gap-2">
              <FileSpreadsheet size={28} />{' '}
              {selectedReportType === 'rekapitulasi'
                ? 'Laporan Rekapitulasi (Master)'
                : `Rekonsiliasi: ${selectedReportType}`}
            </h2>
            <p
              className={`${
                selectedReportType === 'rekapitulasi' ? 'text-blue-100' : 'text-indigo-100'
              } text-sm opacity-90`}
            >
              {selectedReportType === 'rekapitulasi'
                ? 'Sistem otomatis mengelompokkan data ke format baku Excel.'
                : 'Laporan Rekonsiliasi harian per sumber kategori (format Excel).'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="bg-white/20 p-1.5 rounded-lg flex items-center gap-2">
              <Calendar size={18} className="ml-2 text-white" />
              <input
                type="month"
                value={excelReportMonth}
                onChange={(e) => setExcelReportMonth(e.target.value)}
                className="bg-transparent border-none text-white font-bold outline-none cursor-pointer focus:ring-0 text-sm"
              />
            </div>
            <button
              onClick={selectedReportType === 'rekapitulasi' ? handleDownloadExcel : handleDownloadRekonExcel}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <Download size={18} /> Download Excel (.xls)
            </button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto">
          {(() => {
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
                                    className={`px-2 py-1.5 border border-gray-300 text-right ${
                                      val > 0
                                        ? 'text-gray-800 font-medium cursor-help hover:bg-blue-100 transition-colors'
                                        : 'text-gray-400'
                                    }`}
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

                      {/* BARIS GRAND TOTAL */}
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
            } else {
              // PREVIEW TABEL REKONSILIASI
              const { rows, grandTotal } = generateRekonData(selectedReportType);

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
                                      handleUpdateRekonRow(r.dateStr, r.isSusulan, r.susulanKeys, 'signatureDate', e.target.value)
                                    }
                                    className="bg-transparent border border-transparent hover:border-gray-200 text-center outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5 text-xs text-gray-800 font-mono w-[115px] m-0"
                                  />
                                  <input
                                    type="text"
                                    value={r.rawOfficer}
                                    onChange={(e) =>
                                      handleUpdateRekonRow(r.dateStr, r.isSusulan, r.susulanKeys, 'rekonOfficer', e.target.value)
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
            }
          })()}
        </div>

        <div
          className={`p-4 ${
            selectedReportType === 'rekapitulasi'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          } border-t text-xs font-medium flex items-center justify-center gap-2 transition-colors`}
        >
          <Sparkles size={16} />
          {selectedReportType === 'rekapitulasi'
            ? 'Kolom (SATU, DUA) otomatis ditambahkan mengikuti Hari Minggu pada kalender bulan tersebut.'
            : `Tabel di atas merekap pendapatan khusus dari sumber ${selectedReportType} pada bulan terpilih.`}
        </div>
      </div>
    </div>
  );
}
