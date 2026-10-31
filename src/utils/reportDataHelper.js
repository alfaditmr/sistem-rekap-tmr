/**
 * Helper modul agregasi dan kalkulasi data laporan TMR
 * Menghitung data dinamis dari allReports berdasarkan format template di folder 'format laporan'
 * TANPA merubah data atau struktur asli allReports.
 */
import { formatRp, safeString, getDayName, getActiveItemKey } from './formatters';

// In-Memory Global Cache untuk API data (Fasilitas & Promo) agar sinkron instan di semua komponen
let _inMemoryApiData = null;

export const setGlobalApiDataCache = (data) => {
  if (Array.isArray(data)) {
    _inMemoryApiData = data;
  }
};

export const isPaidApiItem = (d) => {
  if (!d) return false;
  const status = (d.status_pembayaran || d.status || '').toLowerCase().trim();
  const isUnpaid = status === 'belum transfer' || status === 'belum bayar' || status === 'batal' || status === 'ditutup';
  const hasProof = Boolean(d.buktiTransferUrl || d.buktiTransferDocUrl || d.bukti_transfer || d.bukti_transfer_listrik || d.pksDriveUrl || d.fileUrl || d.url);
  if (isUnpaid && !hasProof) return false;
  if (!hasProof && !['sudah transfer', 'lunas', 'sudah lunas', 'menunggu verifikasi'].includes(status)) return false;
  return true;
};

export const getGlobalApiDataCache = () => {
  if (Array.isArray(_inMemoryApiData) && _inMemoryApiData.length > 0) {
    return _inMemoryApiData.filter(isPaidApiItem);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('tmr_apiData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(isPaidApiItem);
          _inMemoryApiData = valid;
          return valid;
        }
      }
    } catch (e) {}
  }
  return [];
};

export const fetchApiDataBackground = async () => {
  try {
    const [fasRes, proRes] = await Promise.all([
      fetch('https://sistem-informasi-ragunan.vercel.app/api/fasilitas?date=semua').then(r => r.json()).catch(() => null),
      fetch('https://sistem-informasi-ragunan.vercel.app/api/promo?date=semua').then(r => r.json()).catch(() => null)
    ]);
    const newFas = (fasRes?.data || []).map(d => ({ ...d, source: 'Fasilitas' })).filter(isPaidApiItem);
    const newPro = (proRes?.data || []).map(d => ({ ...d, source: 'Promo' })).filter(isPaidApiItem);
    if (newFas.length > 0 || newPro.length > 0) {
      const existing = getGlobalApiDataCache();
      const merged = [
        ...existing.filter(d => d.source !== 'Fasilitas' && d.source !== 'Promo'),
        ...newFas,
        ...newPro
      ].filter(isPaidApiItem);
      _inMemoryApiData = merged;
      try {
        localStorage.setItem('tmr_apiData', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (e) {
    console.warn('fetchApiDataBackground error:', e);
  }
  return getGlobalApiDataCache();
};

// Tarif standar resmi TMR (untuk estimasi jumlah pengunjung jika hanya tersimpan nominal)
export const TARIF_TMR = {
  dewasa: 4000,
  anak: 3000,
  romb_dewasa: 3000, // diskon 25% dari 4.000
  romb_anak: 2250,   // diskon 25% dari 3.000
  pps_wd: 6000,
  pps_we: 7500,
  tsa: 2500,
  kuda: 5000,
  unta: 7500,
  gajah: 10000,
  motor: 5000,
  mobil: 15000,
  gol2: 12500,
  gol1: 15000,
  sepeda: 1000
};

/**
 * Mendapatkan jumlah hari dan metadata kalender untuk bulan tertentu
 */
export const getMonthDaysMetadata = (monthStr) => {
  const safeMonth = (monthStr && typeof monthStr === 'string' && monthStr.includes('-'))
    ? monthStr.trim()
    : '2026-09';
  const [yearStr, mStr] = safeMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      dateStr,
      dayName: dayNamesIndo[dayOfWeek],
      isMonday: dayOfWeek === 1,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }

  return { year, month, monthName: monthNames[month], daysInMonth, days };
};

/**
 * 1. Data Pengunjung & Kendaraan TMR (format DATA PENGUNJUNG 2026.xls)
 */
export const getPengunjungTmrData = (allReports, categories, monthStr) => {
  const { year, month, monthName, daysInMonth, days } = getMonthDaysMetadata(monthStr);

  let totalDewasaQty = 0, totalDewasaRp = 0;
  let totalAnakQty = 0, totalAnakRp = 0;
  let totalRombQty = 0, totalRombRp = 0;
  let totalMotorQty = 0, totalMotorRp = 0;
  let totalMobilQty = 0, totalMobilRp = 0;
  let totalGol2Qty = 0, totalGol2Rp = 0;
  let totalGol1Qty = 0, totalGol1Rp = 0;
  let totalSepedaQty = 0, totalSepedaRp = 0;
  let grandTotalPengunjung = 0;
  let grandTotalKendaraan = 0;
  let grandTotalRp = 0;

  const rows = days.map(dInfo => {
    const dayAll = allReports[dInfo.dateStr] || {};
    let dDewasaRp = 0, dAnakRp = 0, dRombRp = 0;
    let dMotorRp = 0, dMobilRp = 0, dGol2Rp = 0, dGol1Rp = 0, dSepedaRp = 0;
    let dTotalDayRp = 0;

    Object.keys(dayAll).forEach(tKey => {
      const typeData = dayAll[tKey];
      if (typeData?.formData) {
        Object.keys(typeData.formData).forEach(fKey => {
          const val = Number(typeData.formData[fKey]) || 0;
          if (val > 0) {
            dTotalDayRp += val;
            const lowerKey = fKey.toLowerCase();
            
            // Cari nama item dari categories jika ada
            let itemName = '';
            const parts = fKey.split('_');
            if (parts.length >= 3 && parts[0] === 'cat') {
              const catId = `${parts[0]}_${parts[1]}`;
              const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
              const cat = categories.find(c => c.id === catId);
              const it = cat?.items?.find(i => i.id === itemId);
              itemName = (it?.name || '').toLowerCase();
            }

            const targetStr = `${itemName} ${lowerKey}`;

            if (/rombongan/i.test(targetStr)) {
              dRombRp += val;
            } else if (/dewasa/i.test(targetStr) && !/primata|schmutzer/i.test(targetStr)) {
              dDewasaRp += val;
            } else if (/anak/i.test(targetStr) && !/primata|schmutzer|satwa/i.test(targetStr)) {
              dAnakRp += val;
            } else if (/motor/i.test(targetStr)) {
              dMotorRp += val;
            } else if (/gol 3|gol iii|mobil/i.test(targetStr)) {
              dMobilRp += val;
            } else if (/gol 2|gol ii/i.test(targetStr)) {
              dGol2Rp += val;
            } else if (/gol 1|gol i\b/i.test(targetStr)) {
              dGol1Rp += val;
            } else if (/sepeda/i.test(targetStr) && !/motor/i.test(targetStr)) {
              dSepedaRp += val;
            }
          }
        });
      }
    });

    const dDewasaQty = Math.round(dDewasaRp / TARIF_TMR.dewasa);
    const dAnakQty = Math.round(dAnakRp / TARIF_TMR.anak);
    const dRombQty = Math.round(dRombRp / TARIF_TMR.romb_dewasa);
    const dMotorQty = Math.round(dMotorRp / TARIF_TMR.motor);
    const dMobilQty = Math.round(dMobilRp / TARIF_TMR.mobil);
    const dGol2Qty = Math.round(dGol2Rp / TARIF_TMR.gol2);
    const dGol1Qty = Math.round(dGol1Rp / TARIF_TMR.gol1);
    const dSepedaQty = Math.round(dSepedaRp / TARIF_TMR.sepeda);

    const dPengunjungQty = dDewasaQty + dAnakQty + dRombQty;
    const dKendaraanQty = dMotorQty + dMobilQty + dGol2Qty + dGol1Qty + dSepedaQty;

    totalDewasaQty += dDewasaQty; totalDewasaRp += dDewasaRp;
    totalAnakQty += dAnakQty; totalAnakRp += dAnakRp;
    totalRombQty += dRombQty; totalRombRp += dRombRp;
    totalMotorQty += dMotorQty; totalMotorRp += dMotorRp;
    totalMobilQty += dMobilQty; totalMobilRp += dMobilRp;
    totalGol2Qty += dGol2Qty; totalGol2Rp += dGol2Rp;
    totalGol1Qty += dGol1Qty; totalGol1Rp += dGol1Rp;
    totalSepedaQty += dSepedaQty; totalSepedaRp += dSepedaRp;

    grandTotalPengunjung += dPengunjungQty;
    grandTotalKendaraan += dKendaraanQty;
    grandTotalRp += dTotalDayRp;

    let keterangan = '';
    if (dInfo.isMonday && dTotalDayRp === 0) keterangan = 'Libur Satwa (TMR Tutup)';

    return {
      day: dInfo.day,
      dateStr: dInfo.dateStr,
      dayName: dInfo.dayName,
      isMonday: dInfo.isMonday,
      isWeekend: dInfo.isWeekend,
      dewasaQty: dDewasaQty, dewasaRp: dDewasaRp,
      anakQty: dAnakQty, anakRp: dAnakRp,
      rombQty: dRombQty, rombRp: dRombRp,
      totalPengunjung: dPengunjungQty,
      motorQty: dMotorQty, motorRp: dMotorRp,
      mobilQty: dMobilQty, mobilRp: dMobilRp,
      gol2Qty: dGol2Qty, gol2Rp: dGol2Rp,
      gol1Qty: dGol1Qty, gol1Rp: dGol1Rp,
      sepedaQty: dSepedaQty, sepedaRp: dSepedaRp,
      totalKendaraan: dKendaraanQty,
      totalRp: dTotalDayRp,
      keterangan
    };
  });

  return {
    year, month, monthName, daysInMonth, rows,
    totals: {
      dewasaQty: totalDewasaQty, dewasaRp: totalDewasaRp,
      anakQty: totalAnakQty, anakRp: totalAnakRp,
      rombQty: totalRombQty, rombRp: totalRombRp,
      grandPengunjung: grandTotalPengunjung,
      motorQty: totalMotorQty, motorRp: totalMotorRp,
      mobilQty: totalMobilQty, mobilRp: totalMobilRp,
      gol2Qty: totalGol2Qty, gol2Rp: totalGol2Rp,
      gol1Qty: totalGol1Qty, gol1Rp: totalGol1Rp,
      sepedaQty: totalSepedaQty, sepedaRp: totalSepedaRp,
      grandKendaraan: grandTotalKendaraan,
      grandTotalRp
    }
  };
};

/**
 * 2. Data Pengunjung & Pendapatan Pusat Primata Schmutzer (format DATA PENGUNJUNG PPS 2026.xls)
 */
export const getPusatPrimataData = (allReports, categories, monthStr) => {
  const { year, month, monthName, daysInMonth, days } = getMonthDaysMetadata(monthStr);

  let grandDewasaQty = 0, grandDewasaRp = 0;
  let grandAnakQty = 0, grandAnakRp = 0;
  let grandRombQty = 0, grandRombRp = 0;
  let grandTotalQty = 0, grandTotalRp = 0;

  const rows = days.map(dInfo => {
    const dayAll = allReports[dInfo.dateStr] || {};
    let dDewasaRp = 0, dAnakRp = 0, dRombRp = 0;

    Object.keys(dayAll).forEach(tKey => {
      const typeData = dayAll[tKey];
      if (typeData?.formData) {
        Object.keys(typeData.formData).forEach(fKey => {
          const val = Number(typeData.formData[fKey]) || 0;
          if (val > 0) {
            let itemName = '';
            const parts = fKey.split('_');
            if (parts.length >= 3 && parts[0] === 'cat') {
              const catId = `${parts[0]}_${parts[1]}`;
              const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
              const cat = categories.find(c => c.id === catId);
              const it = cat?.items?.find(i => i.id === itemId);
              itemName = (it?.name || '').toLowerCase();
            }

            const targetStr = `${itemName} ${fKey.toLowerCase()}`;
            if (/primata|schmutzer/i.test(targetStr)) {
              if (/rombongan/i.test(targetStr)) {
                dRombRp += val;
              } else if (/anak/i.test(targetStr)) {
                dAnakRp += val;
              } else {
                dDewasaRp += val;
              }
            }
          }
        });
      }
    });

    const tarif = dInfo.isWeekend ? TARIF_TMR.pps_we : TARIF_TMR.pps_wd;
    const dDewasaQty = Math.round(dDewasaRp / tarif);
    const dAnakQty = Math.round(dAnakRp / tarif);
    const dRombQty = Math.round(dRombRp / (tarif * 0.75));
    const dTotalQty = dDewasaQty + dAnakQty + dRombQty;
    const dTotalRp = dDewasaRp + dAnakRp + dRombRp;

    grandDewasaQty += dDewasaQty; grandDewasaRp += dDewasaRp;
    grandAnakQty += dAnakQty; grandAnakRp += dAnakRp;
    grandRombQty += dRombQty; grandRombRp += dRombRp;
    grandTotalQty += dTotalQty; grandTotalRp += dTotalRp;

    let keterangan = dInfo.isWeekend ? 'Tarif Weekend/Libur (Rp 7.500)' : 'Tarif Weekday (Rp 6.000)';
    if (dInfo.isMonday && dTotalRp === 0) keterangan = 'Libur Satwa (TMR Tutup)';

    return {
      day: dInfo.day,
      dateStr: dInfo.dateStr,
      dayName: dInfo.dayName,
      isMonday: dInfo.isMonday,
      isWeekend: dInfo.isWeekend,
      dewasaQty: dDewasaQty, dewasaRp: dDewasaRp,
      anakQty: dAnakQty, anakRp: dAnakRp,
      rombQty: dRombQty, rombRp: dRombRp,
      totalQty: dTotalQty,
      totalRp: dTotalRp,
      keterangan
    };
  });

  return {
    year, month, monthName, daysInMonth, rows,
    totals: {
      dewasaQty: grandDewasaQty, dewasaRp: grandDewasaRp,
      anakQty: grandAnakQty, anakRp: grandAnakRp,
      rombQty: grandRombQty, rombRp: grandRombRp,
      grandTotalQty, grandTotalRp
    }
  };
};

/**
 * 3. Data Pengunjung & Pendapatan Taman Satwa Anak (format DATA PENGUNJUNG TSA 2026.xls)
 */
export const getTamanSatwaAnakData = (allReports, categories, monthStr) => {
  const { year, month, monthName, daysInMonth, days } = getMonthDaysMetadata(monthStr);

  let grandTsaQty = 0, grandTsaRp = 0;
  let grandKudaQty = 0, grandKudaRp = 0;
  let grandUntaQty = 0, grandUntaRp = 0;
  let grandGajahQty = 0, grandGajahRp = 0;
  let grandTotalQty = 0, grandTotalRp = 0;

  const rows = days.map(dInfo => {
    const dayAll = allReports[dInfo.dateStr] || {};
    let dTsaRp = 0, dKudaRp = 0, dUntaRp = 0, dGajahRp = 0;

    Object.keys(dayAll).forEach(tKey => {
      const typeData = dayAll[tKey];
      if (typeData?.formData) {
        Object.keys(typeData.formData).forEach(fKey => {
          const val = Number(typeData.formData[fKey]) || 0;
          if (val > 0) {
            let itemName = '';
            const parts = fKey.split('_');
            if (parts.length >= 3 && parts[0] === 'cat') {
              const catId = `${parts[0]}_${parts[1]}`;
              const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
              const cat = categories.find(c => c.id === catId);
              const it = cat?.items?.find(i => i.id === itemId);
              itemName = (it?.name || '').toLowerCase();
            }

            const targetStr = `${itemName} ${fKey.toLowerCase()}`;
            if (/taman satwa|tsa\b/i.test(targetStr)) {
              dTsaRp += val;
            } else if (/kuda/i.test(targetStr)) {
              dKudaRp += val;
            } else if (/unta/i.test(targetStr)) {
              dUntaRp += val;
            } else if (/gajah/i.test(targetStr)) {
              dGajahRp += val;
            }
          }
        });
      }
    });

    const dTsaQty = Math.round(dTsaRp / TARIF_TMR.tsa);
    const dKudaQty = Math.round(dKudaRp / TARIF_TMR.kuda);
    const dUntaQty = Math.round(dUntaRp / TARIF_TMR.unta);
    const dGajahQty = Math.round(dGajahRp / TARIF_TMR.gajah);
    const dTotalQty = dTsaQty + dKudaQty + dUntaQty + dGajahQty;
    const dTotalRp = dTsaRp + dKudaRp + dUntaRp + dGajahRp;

    grandTsaQty += dTsaQty; grandTsaRp += dTsaRp;
    grandKudaQty += dKudaQty; grandKudaRp += dKudaRp;
    grandUntaQty += dUntaQty; grandUntaRp += dUntaRp;
    grandGajahQty += dGajahQty; grandGajahRp += dGajahRp;
    grandTotalQty += dTotalQty; grandTotalRp += dTotalRp;

    let keterangan = '';
    if (dInfo.isMonday && dTotalRp === 0) keterangan = 'Libur Satwa (TMR Tutup)';

    return {
      day: dInfo.day,
      dateStr: dInfo.dateStr,
      dayName: dInfo.dayName,
      isMonday: dInfo.isMonday,
      isWeekend: dInfo.isWeekend,
      tsaQty: dTsaQty, tsaRp: dTsaRp,
      kudaQty: dKudaQty, kudaRp: dKudaRp,
      untaQty: dUntaQty, untaRp: dUntaRp,
      gajahQty: dGajahQty, gajahRp: dGajahRp,
      totalQty: dTotalQty,
      totalRp: dTotalRp,
      keterangan
    };
  });

  return {
    year, month, monthName, daysInMonth, rows,
    totals: {
      tsaQty: grandTsaQty, tsaRp: grandTsaRp,
      kudaQty: grandKudaQty, kudaRp: grandKudaRp,
      untaQty: grandUntaQty, untaRp: grandUntaRp,
      gajahQty: grandGajahQty, gajahRp: grandGajahRp,
      grandTotalQty, grandTotalRp
    }
  };
};

/**
 * 4. Data Rekapitulasi E-Ticketing (format INPUT E-TICKETING 2026.xls)
 */
export const getEticketingData = (allReports, categories, monthStr) => {
  const { year, month, monthName, daysInMonth, days } = getMonthDaysMetadata(monthStr);

  let gDewasa = 0, gAnak = 0, gRomb = 0, gPps = 0, gTsa = 0, gWahana = 0, gKendaraan = 0, gAsuransiLembar = 0, gGrandTotal = 0;

  const rows = days.map(dInfo => {
    const dayAll = allReports[dInfo.dateStr] || {};
    let dDewasa = 0, dAnak = 0, dRomb = 0, dPps = 0, dTsa = 0, dWahana = 0, dKendaraan = 0;

    Object.keys(dayAll).forEach(tKey => {
      const typeData = dayAll[tKey];
      if (typeData?.formData) {
        Object.keys(typeData.formData).forEach(fKey => {
          const val = Number(typeData.formData[fKey]) || 0;
          if (val > 0) {
            let itemName = '';
            const parts = fKey.split('_');
            if (parts.length >= 3 && parts[0] === 'cat') {
              const catId = `${parts[0]}_${parts[1]}`;
              const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
              const cat = categories.find(c => c.id === catId);
              const it = cat?.items?.find(i => i.id === itemId);
              itemName = (it?.name || '').toLowerCase();
            }

            const targetStr = `${itemName} ${fKey.toLowerCase()}`;
            if (/rombongan/i.test(targetStr)) {
              dRomb += val;
            } else if (/primata|schmutzer/i.test(targetStr)) {
              dPps += val;
            } else if (/taman satwa|tsa\b/i.test(targetStr)) {
              dTsa += val;
            } else if (/kuda|unta|gajah/i.test(targetStr)) {
              dWahana += val;
            } else if (/motor|mobil|gol 1|gol 2|gol 3|sepeda/i.test(targetStr)) {
              dKendaraan += val;
            } else if (/anak/i.test(targetStr)) {
              dAnak += val;
            } else if (/dewasa/i.test(targetStr)) {
              dDewasa += val;
            }
          }
        });
      }
    });

    const dTotal = dDewasa + dAnak + dRomb + dPps + dTsa + dWahana + dKendaraan;
    // Estimasi lembar asuransi = karcis orang masuk (Dewasa + Anak + Rombongan)
    const dAsuransi = Math.round(dDewasa / TARIF_TMR.dewasa) + Math.round(dAnak / TARIF_TMR.anak) + Math.round(dRomb / TARIF_TMR.romb_dewasa);

    gDewasa += dDewasa; gAnak += dAnak; gRomb += dRomb; gPps += dPps;
    gTsa += dTsa; gWahana += dWahana; gKendaraan += dKendaraan;
    gAsuransiLembar += dAsuransi; gGrandTotal += dTotal;

    return {
      day: dInfo.day,
      dateStr: dInfo.dateStr,
      dayName: dInfo.dayName,
      isMonday: dInfo.isMonday,
      dewasa: dDewasa,
      anak: dAnak,
      rombongan: dRomb,
      pps: dPps,
      tsa: dTsa,
      wahana: dWahana,
      kendaraan: dKendaraan,
      asuransiLembar: dAsuransi,
      total: dTotal
    };
  });

  return {
    year, month, monthName, daysInMonth, rows,
    totals: {
      dewasa: gDewasa, anak: gAnak, rombongan: gRomb, pps: gPps,
      tsa: gTsa, wahana: gWahana, kendaraan: gKendaraan,
      asuransiLembar: gAsuransiLembar, grandTotal: gGrandTotal
    }
  };
};

/**
 * 5. Data Pendapatan per Pintu Masuk / Gate (format INPUT NEW GATE 2026.xlsx)
 */
export const getGateRevenueData = (allReports, categories, monthStr) => {
  const { year, month, monthName, daysInMonth, days } = getMonthDaysMetadata(monthStr);

  let gBarat = 0, gTimur = 0, gUtara = 0, gUtama = 0, gOnline = 0, gTvm = 0, gGrandTotal = 0;

  const rows = days.map(dInfo => {
    const dayAll = allReports[dInfo.dateStr] || {};
    let dBarat = 0, dTimur = 0, dUtara = 0, dUtama = 0, dOnline = 0, dTvm = 0;

    Object.keys(dayAll).forEach(tKey => {
      const typeData = dayAll[tKey];
      if (typeData?.formData) {
        Object.keys(typeData.formData).forEach(fKey => {
          const val = Number(typeData.formData[fKey]) || 0;
          if (val > 0) {
            let catName = '';
            const parts = fKey.split('_');
            if (parts.length >= 2 && parts[0] === 'cat') {
              const catId = `${parts[0]}_${parts[1]}`;
              const cat = categories.find(c => c.id === catId);
              catName = (cat?.name || '').toLowerCase();
            }

            const lower = `${catName} ${fKey.toLowerCase()}`;
            if (/barat/i.test(lower)) {
              dBarat += val;
            } else if (/timur/i.test(lower)) {
              dTimur += val;
            } else if (/utara/i.test(lower)) {
              dUtara += val;
            } else if (/online/i.test(lower)) {
              dOnline += val;
            } else if (/tvm|vending/i.test(lower)) {
              dTvm += val;
            } else {
              // Default Pintu Utama / New Gate
              dUtama += val;
            }
          }
        });
      }
    });

    const dTotal = dBarat + dTimur + dUtara + dUtama + dOnline + dTvm;
    gBarat += dBarat; gTimur += dTimur; gUtara += dUtara; gUtama += dUtama;
    gOnline += dOnline; gTvm += dTvm; gGrandTotal += dTotal;

    return {
      day: dInfo.day,
      dateStr: dInfo.dateStr,
      dayName: dInfo.dayName,
      isMonday: dInfo.isMonday,
      pintuBarat: dBarat,
      pintuTimur: dTimur,
      pintuUtara: dUtara,
      pintuUtama: dUtama,
      online: dOnline,
      tvm: dTvm,
      total: dTotal
    };
  });

  return {
    year, month, monthName, daysInMonth, rows,
    totals: {
      pintuBarat: gBarat, pintuTimur: gTimur, pintuUtara: gUtara,
      pintuUtama: gUtama, online: gOnline, tvm: gTvm, grandTotal: gGrandTotal
    }
  };
};

/**
 * 6. Data Rekap STSU Pendapatan Kas Daerah (format REKAP STSU PENDAPATAN 2026.xls)
 */
export const getStsuKasDaerahData = (allReports, categories, monthStr) => {
  const { year, month, monthName, daysInMonth, days } = getMonthDaysMetadata(monthStr);

  let grandTotalJagir = 0;
  let cumulative = 0;

  const rows = days.map(dInfo => {
    const dayAll = allReports[dInfo.dateStr] || {};
    let dailyTotal = 0;
    let stsuNumbers = [];

    Object.keys(dayAll).forEach(tKey => {
      const typeData = dayAll[tKey];
      if (typeData?.sequence) {
        stsuNumbers.push(`${typeData.sequence}`);
      }
      if (typeData?.formData) {
        Object.keys(typeData.formData).forEach(fKey => {
          const val = Number(typeData.formData[fKey]) || 0;
          dailyTotal += val;
        });
      }
    });

    grandTotalJagir += dailyTotal;
    cumulative += dailyTotal;

    let keterangan = '';
    if (dInfo.isMonday && dailyTotal === 0) keterangan = 'Libur Satwa (TMR Tutup)';

    return {
      day: dInfo.day,
      dateStr: dInfo.dateStr,
      dayName: dInfo.dayName,
      isMonday: dInfo.isMonday,
      stsuNo: stsuNumbers.length > 0 ? stsuNumbers.join(', ') : '-',
      nominalJagir: dailyTotal,
      kumulatif: cumulative,
      keterangan
    };
  });

  return {
    year, month, monthName, daysInMonth, rows,
    totalJagir: grandTotalJagir
  };
};

// =========================================================================
// 7. Data Pemakaian Tempat & Fasilitas (Format REKAP PEMAKAIAN TEMPAT 2026.xlsx)
// Header Fasilitas khusus fasilitas fisik & tempat (Sesuai Gambar 1):
// Film Cerita, Film Iklan, Program Televisi, Pre-Wedding, Lahan M2, Panggung,
// Gedung Informasi, Gedung Auditorium, Sound System, Wireles, Pemutaran Film Satwa, Lain-Lain.
// (Promosi Produk, Spanduk & Banner dipisahkan khusus ke Tab Promosi Produk & Media Banner)
// =========================================================================

export const FASILITAS_COLUMNS = [
  { key: 'film_cerita', label: 'Film Cerita', shortLabel: 'Film Cerita' },
  { key: 'film_iklan', label: 'Film Iklan', shortLabel: 'Film Iklan' },
  { key: 'program_tv', label: 'Program Televisi', shortLabel: 'Program TV' },
  { key: 'prewedding', label: 'Pre-Wedding', shortLabel: 'Pre-Wed' },
  { key: 'lahan', label: 'Lahan M2', shortLabel: 'Lahan M2', isLahan: true },
  { key: 'panggung', label: 'Panggung', shortLabel: 'Panggung' },
  { key: 'gedung_info', label: 'Gedung Informasi', shortLabel: 'Gedung Info' },
  { key: 'auditorium', label: 'Gedung Auditorium', shortLabel: 'Auditorium' },
  { key: 'sound', label: 'Sound System', shortLabel: 'Sound Sys' },
  { key: 'wireles', label: 'Wireles', shortLabel: 'Wireles' },
  { key: 'film_satwa', label: 'Film Satwa', shortLabel: 'Film Satwa' },
  { key: 'lain_lain', label: 'Lain - Lain', shortLabel: 'Lain-lain' }
];

export const parseToYmd = (dateStr) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  // Match YYYY-MM-DD
  const mYmd = str.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (mYmd) {
    return `${mYmd[1]}-${String(mYmd[2]).padStart(2, '0')}-${String(mYmd[3]).padStart(2, '0')}`;
  }
  // Match DD/MM/YYYY or DD-MM-YYYY
  const mDmy = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mDmy) {
    return `${mDmy[3]}-${String(mDmy[2]).padStart(2, '0')}-${String(mDmy[1]).padStart(2, '0')}`;
  }
  // Try Date object for GMT / localized strings
  try {
    const d = new Date(str.replace(/WIB|WITA|WIT/i, '').trim());
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  return str.split(' ')[0].split('T')[0];
};

export const formatDmy = (dateStr) => {
  if (!dateStr) return '';
  const ymd = parseToYmd(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }
  return String(dateStr).trim();
};

export const classifyFacilityItem = (info) => {
  const cat = (info.catName || info.kategori || '').toLowerCase();
  const sub = (info.itemName || info.subKategori || info.tipe_transaksi || '').toLowerCase();
  const loc = (info.lokasi || info.lokasi_sewa || '').toLowerCase();
  const note = (info.note || info.keterangan || info.catatan || info.keterangan_transaksi || '').toLowerCase();
  const target = `${cat} ${sub} ${loc} ${note}`;

  const nominal = Number(info.nominal || info.jumlahTransferNumeric || info.jumlahTransfer || info.amount || 0);
  const luasParam = Number(info.luas_lahan || info.luasLahan || 0);

  // 1. Film Cerita
  if (/film cerita/i.test(target)) return { key: 'film_cerita', value: 1 };

  // 2. Film Iklan
  if (/film iklan|iklan/i.test(target) && !/cerita/i.test(target)) return { key: 'film_iklan', value: 1 };

  // 3. Program TV
  if (/program televisi|televisi|acara tv|shooting tv/i.test(target)) return { key: 'program_tv', value: 1 };

  // 4. Prewedding
  if (/pre-wedding|prewedding|pre wed|foto nikah/i.test(target)) return { key: 'prewedding', value: 1 };

  // 5. Spanduk Promosi
  if (/spanduk/i.test(target) && !/banner/i.test(target)) return { key: 'spanduk', value: 1 };

  // 6. Banner Promosi
  if (/banner|umbul/i.test(target)) return { key: 'banner', value: 1 };

  // 7. Gedung Auditorium
  if (/auditorium|gedung auditorium|aula serbaguna/i.test(target)) return { key: 'auditorium', value: 1 };

  // 8. Gedung Informasi
  if (/gedung informasi|ruang informasi/i.test(target)) return { key: 'gedung_info', value: 1 };

  // 9. Sound System
  if (/sound system|sound/i.test(target) && !/wireles|wireless/i.test(target)) return { key: 'sound', value: 1 };

  // 10. Wireles
  if (/wireles|wireless/i.test(target)) {
    const qty = nominal >= 100000 ? Math.round(nominal / 100000) : 1;
    return { key: 'wireles', value: qty };
  }

  // 11. Film Satwa
  if (/film satwa|pemutaran film/i.test(target)) return { key: 'film_satwa', value: 1 };

  // 12. Lahan Terbuka / Lahan M2
  if (
    /lahan|lapangan|lap\s|lap\.|lap\b|lap atm|lap tsik|lap beringin|lap sebrang|lap timur/i.test(target) ||
    luasParam > 0
  ) {
    let luasan = luasParam;
    if (!luasan) {
      const match = target.match(/(\d+)\s*(?:m2|m²|m\b|meter)/i);
      if (match) {
        luasan = parseInt(match[1], 10);
      } else if (nominal > 0) {
        luasan = Math.round(nominal / 2000);
      }
    }
    return { key: 'lahan', value: luasan || 50, luasan: luasan || 50 };
  }

  // 13. Panggung / Pendopo (TSA 1, TSA 2, TSA 3, TSA 4, Teras Informasi, Gazebo)
  if (
    /panggung|pendopo|tsa 1|tsa 2|tsa 3|tsa 4|teras informasi|gazebo/i.test(target)
  ) {
    let qty = 1;
    if (/tsa 1 dan 4/i.test(target) || nominal === 750000) {
      qty = 3;
    } else if (/tsa 1/i.test(target) && !/sebrang/i.test(target) && nominal >= 500000) {
      qty = Math.round(nominal / 250000);
    } else if (nominal >= 250000) {
      qty = Math.max(1, Math.round(nominal / 250000));
    }
    return { key: 'panggung', value: qty };
  }

  return { key: 'lain_lain', value: 1 };
};

export const getPemakaianTempatData = (
  allReports = {},
  categories = [],
  monthStr = '',
  bankRows = [],
  optionalApiData = null
) => {
  const { year, month, monthName } = getMonthDaysMetadata(monthStr);

  // Ambil data API Fasilitas dari parameter, in-memory cache, atau localStorage
  let apiList = optionalApiData || getGlobalApiDataCache();
  if (!Array.isArray(apiList)) apiList = [];

  // Filter hanya data fasilitas
  const apiFasilitas = apiList.filter(
    (a) =>
      a.source === 'Fasilitas' ||
      a.tipe_transaksi === 'Sewa Fasilitas' ||
      a.kategori === 'Pemakaian Fasilitas' ||
      !a.source
  );

  const rawRows = [];
  const processedApiIds = new Set();
  const processedBankRowIds = new Set();

  // Helper untuk mencari API match secara cerdas & bertingkat dengan presisi tanggal sewa nyata
  const findApiMatch = (apiRefId, amount, dateStr, tenantName) => {
    if (apiRefId) {
      const found = apiFasilitas.find(
        (a) =>
          String(a.id) === String(apiRefId) ||
          String(a.docId) === String(apiRefId) ||
          String(a.id_sewa) === String(apiRefId)
      );
      if (found) return found;
    }

    const ymd = dateStr ? parseToYmd(dateStr) : '';
    const month = ymd && ymd.length >= 7 ? ymd.substring(0, 7) : '';
    const cleanTenant = (tenantName || '').toLowerCase().replace(/^(pt|cv|bapak|ibu|bpk|rombonan|rombongan)\.?\s+/i, '').trim();
    const words = cleanTenant.split(/\s+/).filter(w => w.length >= 3 && !/^(dan|yang|atau|untuk|ex|ke)$/i.test(w));

    const isNameMatch = (aName) => {
      if (!aName) return false;
      const aLow = aName.toLowerCase().replace(/^(pt|cv|bapak|ibu|bpk|rombonan|rombongan)\.?\s+/i, '').trim();
      if (aLow === cleanTenant) return true;
      if (cleanTenant.length >= 4 && aLow.includes(cleanTenant)) return true;
      if (aLow.length >= 4 && cleanTenant.includes(aLow)) return true;
      
      const aWords = aLow.split(/\s+/).filter(w => w.length >= 3);
      let matchCount = 0;
      for (const w of words) {
        if (aWords.includes(w) || (aLow.includes(w) && w.length >= 4)) {
          matchCount++;
        }
      }
      return matchCount >= 2 || (matchCount >= 1 && words.length <= 2);
    };

    // 1. Name Match + Exact Amount + Exact Date (Transfer or Sewa)
    if (cleanTenant.length >= 3 && amount && ymd) {
      const found = apiFasilitas.find((a) => {
        const aNom = Number(a.jumlahTransferNumeric || a.jumlahTransfer || a.total_biaya || 0);
        const aTglTf = parseToYmd(a.tanggal_transfer || a.tanggalTransfer);
        const aTglSw = parseToYmd(a.tanggal_sewa || a.tanggalPemakaian);
        return isNameMatch(a.nama_penyewa) && Math.abs(aNom - amount) < 1 && (aTglTf === ymd || aTglSw === ymd);
      });
      if (found) return found;
    }

    // 2. Name Match + Exact Date
    if (cleanTenant.length >= 3 && ymd) {
      const found = apiFasilitas.find((a) => {
        const aTglTf = parseToYmd(a.tanggal_transfer || a.tanggalTransfer);
        const aTglSw = parseToYmd(a.tanggal_sewa || a.tanggalPemakaian);
        return isNameMatch(a.nama_penyewa) && (aTglTf === ymd || aTglSw === ymd);
      });
      if (found) return found;
    }

    // 3. Name Match + Same Month + Exact Amount
    if (cleanTenant.length >= 3 && amount && month) {
      const found = apiFasilitas.find((a) => {
        const aNom = Number(a.jumlahTransferNumeric || a.jumlahTransfer || a.total_biaya || 0);
        const aTglTf = parseToYmd(a.tanggal_transfer || a.tanggalTransfer);
        return isNameMatch(a.nama_penyewa) && Math.abs(aNom - amount) < 1 && aTglTf.startsWith(month);
      });
      if (found) return found;
    }

    // 4. Name Match + Same Month
    if (cleanTenant.length >= 3 && month) {
      const found = apiFasilitas.find((a) => {
        const aTglTf = parseToYmd(a.tanggal_transfer || a.tanggalTransfer);
        return isNameMatch(a.nama_penyewa) && aTglTf.startsWith(month);
      });
      if (found) return found;
    }

    // 5. Name Match alone (highest confidence)
    if (cleanTenant.length >= 4) {
      const found = apiFasilitas.find((a) => isNameMatch(a.nama_penyewa));
      if (found) return found;
    }

    // 6. Amount + Date alone (fallback for generic rows like "Penyewa Fasilitas")
    if (amount && ymd) {
      const found = apiFasilitas.find((a) => {
        const aTglTf = parseToYmd(a.tanggal_transfer || a.tanggalTransfer);
        const aNom = Number(a.jumlahTransferNumeric || a.jumlahTransfer || a.total_biaya || 0);
        return aTglTf === ymd && Math.abs(aNom - amount) < 1;
      });
      if (found) return found;
    }

    return null;
  };

  // 1. Ekstrak dari allReports (Data yang sudah diinput resmi ke STSU Harian)
  Object.keys(allReports || {})
    .sort()
    .forEach((dateStr) => {
      if (dateStr.startsWith(monthStr)) {
        const dayAll = allReports[dateStr] || {};
        Object.keys(dayAll).forEach((tKey) => {
          const typeData = dayAll[tKey];
          if (typeData?.formData) {
            const activeItems = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];

            Object.keys(typeData.formData).forEach((fKey) => {
              const val = Number(typeData.formData[fKey]) || 0;
              if (val > 0) {
                let itemName = '';
                let catName = '';
                const parts = fKey.split('_');
                let activeItem = null;
                if (parts.length >= 3 && parts[0] === 'cat') {
                  const catId = `${parts[0]}_${parts[1]}`;
                  const cat = categories.find((c) => c.id === catId);
                  catName = cat?.name || '';

                  // Cari activeItem secara presisi menggunakan getActiveItemKey
                  activeItem = activeItems.find(
                    (ai) => getActiveItemKey(ai.catId, ai.itemId || ai.id, ai.isSusulan, ai.validDate, ai.itemDate, ai.itemNote) === fKey
                  );
                  if (!activeItem) {
                    const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
                    activeItem = activeItems.find(
                      (ai) => ai.catId === catId && (ai.itemId === itemId || ai.id === itemId)
                    );
                  }

                  const theItId = activeItem?.itemId || activeItem?.id || (parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2]);
                  const it = cat?.items?.find((i) => i.id === theItId);
                  itemName = it?.name || activeItem?.itemName || '';
                }

                const target = `${catName} ${itemName} ${fKey}`.toLowerCase();
                if (
                  /fasilitas|panggung|lahan|tempat|sound|wireless|auditorium|gazebo|lapangan|gedung|sewa/i.test(
                    target
                  ) &&
                  !/promo produk|banner|spanduk|sampling|selling/i.test(target)
                ) {
                  // Periksa apakah item memiliki rincian alokasi mutasi bank
                  if (
                    activeItem &&
                    Array.isArray(activeItem.bankAllocations) &&
                    activeItem.bankAllocations.length > 0
                  ) {
                    activeItem.bankAllocations.forEach((ba, bIdx) => {
                      const baAmt = Number(ba.amount || 0);
                      if (baAmt <= 0) return;
                      if (ba.bankRowId) processedBankRowIds.add(ba.bankRowId);

                      const apiMatch = findApiMatch(ba.apiRefId, baAmt, ba.bankDate || dateStr, ba.tenant || ba.desc || activeItem?.itemNote);
                      if (apiMatch) processedApiIds.add(String(apiMatch.id || apiMatch.docId || apiMatch.id_sewa));

                      const penyewa = (apiMatch?.nama_penyewa || ba.tenant || activeItem.itemNote || 'Penyewa Fasilitas').trim();
                      const rawTglBayar = parseToYmd(
                        apiMatch?.tanggal_transfer || apiMatch?.tanggalTransfer || ba.bankDate || dateStr
                      );
                      const rawTglPakai = parseToYmd(
                        apiMatch?.tanggal_sewa || apiMatch?.tanggalPemakaian || ba.tglEvent || ba.tanggal_sewa || (activeItem?.itemDate !== dateStr ? activeItem?.itemDate : null) || rawTglBayar
                      );
                      const lokasi = (apiMatch?.lokasi_sewa || ba.location || activeItem.itemNote || '').trim();
                      const luas = Number(apiMatch?.luas_lahan || ba.luas_lahan || 0);

                      const classification = classifyFacilityItem({
                        catName,
                        itemName,
                        lokasi,
                        note: `${ba.desc || ''} ${penyewa}`,
                        nominal: baAmt,
                        luas_lahan: luas
                      });

                      const facilities = {};
                      facilities[classification.key] = classification.value;

                      rawRows.push({
                        id: `${dateStr}_${fKey}_ba_${bIdx}`,
                        apiRefId: ba.apiRefId || apiMatch?.id || '',
                        rawTglBayar,
                        rawTglPakai,
                        penyewa: penyewa || 'Penyewa Fasilitas',
                        lokasi,
                        keterangan: lokasi || catName || 'Sewa Fasilitas',
                        facilities,
                        nominal: baAmt
                      });
                    });
                  } else {
                    // Single item input
                    const itemNote = activeItem?.itemNote || parts[5] || '';
                    const apiMatch = findApiMatch(activeItem?.apiRefId, val, dateStr, activeItem?.tenant || itemNote);
                    if (apiMatch) processedApiIds.add(String(apiMatch.id || apiMatch.docId || apiMatch.id_sewa));
                    if (activeItem?.bankMatchRowId) processedBankRowIds.add(activeItem.bankMatchRowId);

                    const penyewa = (apiMatch?.nama_penyewa || activeItem?.tenant || itemNote || 'Penyewa Fasilitas').trim();
                    const rawTglBayar = parseToYmd(
                      apiMatch?.tanggal_transfer || apiMatch?.tanggalTransfer || dateStr
                    );
                    const rawTglPakai = parseToYmd(
                      apiMatch?.tanggal_sewa || apiMatch?.tanggalPemakaian || (activeItem?.itemDate !== dateStr ? activeItem?.itemDate : null) || rawTglBayar
                    );
                    const lokasi = (apiMatch?.lokasi_sewa || activeItem?.location || itemNote || '').trim();
                    const luas = Number(apiMatch?.luas_lahan || 0);

                    const classification = classifyFacilityItem({
                      catName,
                      itemName,
                      lokasi,
                      note: `${itemNote} ${penyewa}`,
                      nominal: val,
                      luas_lahan: luas
                    });

                    const facilities = {};
                    facilities[classification.key] = classification.value;

                    rawRows.push({
                      id: `${dateStr}_${fKey}`,
                      apiRefId: activeItem?.apiRefId || apiMatch?.id || '',
                      rawTglBayar,
                      rawTglPakai,
                      penyewa: penyewa || 'Penyewa Fasilitas',
                      lokasi,
                      keterangan: lokasi || catName || 'Sewa Fasilitas',
                      facilities,
                      nominal: val
                    });
                  }
                }
              }
            });
          }
        });
      }
    });

  // 2. Gabungkan dengan Bank Rows yang SUDAH DIPASANGKAN dan belum masuk allReports
  if (Array.isArray(bankRows)) {
    bankRows.forEach((row) => {
      if (processedBankRowIds.has(row.id)) return;
      if (row.apiRefId && processedApiIds.has(String(row.apiRefId))) return;

      const rowYmd = parseToYmd(row.date);
      if (!rowYmd.startsWith(monthStr)) return;

      // Hanya data yang SUDAH DIPASANGKAN (matched atau linked)
      const isPaired = row.status === 'matched' || row.status === 'linked' || Boolean(row.matchedTo);
      if (!isPaired) return;

      const matchedTo = (row.matchedTo || row.category || '').toLowerCase();
      if (/fasilitas|lahan|tempat|panggung|auditorium|wireles|gazebo/i.test(matchedTo) && !/promo produk|banner|spanduk|sampling|selling/i.test(matchedTo)) {
        const amt = Number(row.amount || 0);
        if (amt <= 0) return;

        const apiMatch = findApiMatch(row.apiRefId, amt, rowYmd, row.tenant || row.description);
        if (apiMatch) processedApiIds.add(String(apiMatch.id || apiMatch.docId || apiMatch.id_sewa));

        const penyewa = (apiMatch?.nama_penyewa || row.tenant || row.description || 'Penyewa Fasilitas').trim();
        const rawTglBayar = parseToYmd(apiMatch?.tanggal_transfer || apiMatch?.tanggalTransfer || rowYmd);
        const rawTglPakai = parseToYmd(apiMatch?.tanggal_sewa || apiMatch?.tanggalPemakaian || row.tglEvent || (row.itemDate !== rowYmd ? row.itemDate : null) || rawTglBayar);
        const lokasi = (apiMatch?.lokasi_sewa || row.location || '').trim();
        const luas = Number(apiMatch?.luas_lahan || 0);

        const classification = classifyFacilityItem({
          catName: 'Pemakaian Fasilitas',
          itemName: row.matchedTo || 'Sewa Fasilitas',
          lokasi,
          note: `${row.description || ''} ${penyewa}`,
          nominal: amt,
          luas_lahan: luas
        });

        const facilities = {};
        facilities[classification.key] = classification.value;

        rawRows.push({
          id: `bank_${row.id}`,
          apiRefId: row.apiRefId || apiMatch?.id || '',
          rawTglBayar,
          rawTglPakai,
          penyewa: penyewa || 'Penyewa Fasilitas',
          lokasi,
          keterangan: lokasi || 'Sewa Fasilitas',
          facilities,
          nominal: amt
        });
      }
    });
  }

  // 4. Urutkan berdasarkan tanggal bayar (rawTglBayar ASC), lalu nama penyewa
  rawRows.sort((a, b) => {
    if (a.rawTglBayar !== b.rawTglBayar) {
      return a.rawTglBayar.localeCompare(b.rawTglBayar);
    }
    return (a.penyewa || '').localeCompare(b.penyewa || '');
  });

  // 5. Format tampilan dan hitung total per kolom fasilitas
  const facilityTotals = {};
  FASILITAS_COLUMNS.forEach((col) => {
    facilityTotals[col.key] = 0;
  });
  let totalNominal = 0;

  const rows = rawRows.map((r, idx) => {
    const tglBayarFormatted = formatDmy(r.rawTglBayar);
    const tglPakaiFormatted = formatDmy(r.rawTglPakai);

    // Grouping tanggal bayar (kosong jika tanggal sama dengan baris sebelumnya, persis Gambar 1)
    const isFirstOfDate = idx === 0 || formatDmy(rawRows[idx - 1].rawTglBayar) !== tglBayarFormatted;
    const tglBayarDisplay = isFirstOfDate ? tglBayarFormatted : '';

    // Akumulasi total kolom
    FASILITAS_COLUMNS.forEach((col) => {
      const val = Number(r.facilities[col.key] || 0);
      if (val > 0) {
        facilityTotals[col.key] += val;
      }
    });
    totalNominal += r.nominal;

    return {
      ...r,
      no: idx + 1,
      tglBayarFormatted,
      tglPakaiFormatted,
      tglBayarDisplay,
      isFirstOfDate
    };
  });

  return {
    year,
    month,
    monthName,
    rows,
    columns: FASILITAS_COLUMNS,
    facilityTotals,
    totalNominal,
    totalKegiatan: rows.length
  };
};

// =========================================================================
// 8. Data Rekap Promosi & Media Banner (Format REKAPITULASI EVENT PROMO SAMPLING / SELLING)
// Format persis Image 2:
// No | Tanggal Transfer | Nama Perusahaan | Nama Produk | Tanggal Event | Jumlah hari | Jumlah titik | Banner/ Umbul2 | Spanduk | Harga (Rp) | Ket
// =========================================================================
export const getPromoMediaData = (
  allReports = {},
  categories = [],
  monthStr = '',
  bankRows = [],
  optionalApiData = null
) => {
  const { year, month, monthName } = getMonthDaysMetadata(monthStr);

  // Ambil data API Promo dari parameter, in-memory cache, atau localStorage
  let apiList = optionalApiData || getGlobalApiDataCache();
  if (!Array.isArray(apiList)) apiList = [];

  // Filter hanya data promo & banner
  const apiPromo = apiList.filter(
    (a) =>
      a.source === 'Promo' ||
      a.tipe_transaksi === 'Promo & Event' ||
      a.kategori === 'Promo Penjualan Produk' ||
      /promo|promosi|banner|spanduk|sampling|selling|sponsor|booth/i.test(a.kategori || '') ||
      /promo|promosi|banner|spanduk|sampling|selling|sponsor|booth/i.test(a.tipe_transaksi || '') ||
      (a.namaPerusahaan && a.namaProduk)
  );

  const rawRows = [];
  const processedApiIds = new Set();
  const processedBankRowIds = new Set();

  const findApiMatch = (apiRefId, amount, dateStr, tenantName) => {
    if (apiRefId) {
      const found = apiPromo.find(
        (a) =>
          String(a.id) === String(apiRefId) ||
          String(a.docId) === String(apiRefId) ||
          String(a.id_sewa) === String(apiRefId)
      );
      if (found) return found;
    }

    const ymd = dateStr ? parseToYmd(dateStr) : '';
    const month = ymd && ymd.length >= 7 ? ymd.substring(0, 7) : '';
    const cleanTenant = (tenantName || '').toLowerCase().replace(/^(pt|cv|bapak|ibu|bpk|rombonan|rombongan)\.?\s+/i, '').trim();
    const words = cleanTenant.split(/\s+/).filter(w => w.length >= 3 && !/^(dan|yang|atau|untuk|ex|ke)$/i.test(w));

    const isNameMatch = (aName) => {
      if (!aName) return false;
      const aLow = aName.toLowerCase().replace(/^(pt|cv|bapak|ibu|bpk|rombonan|rombongan)\.?\s+/i, '').trim();
      if (aLow === cleanTenant) return true;
      if (cleanTenant.length >= 4 && aLow.includes(cleanTenant)) return true;
      if (aLow.length >= 4 && cleanTenant.includes(aLow)) return true;
      
      const aWords = aLow.split(/\s+/).filter(w => w.length >= 3);
      let matchCount = 0;
      for (const w of words) {
        if (aWords.includes(w) || (aLow.includes(w) && w.length >= 4)) {
          matchCount++;
        }
      }
      return matchCount >= 2 || (matchCount >= 1 && words.length <= 2);
    };

    // 1. Name Match + Exact Amount + Exact Date
    if (cleanTenant.length >= 3 && amount && ymd) {
      const found = apiPromo.find((a) => {
        const aNom = Number(a.jumlahTransferNumeric || a.jumlahTransfer || a.totalBiaya || 0);
        const aTgl = parseToYmd(a.tanggalTransfer || a.tanggal_transfer || a.createdAt);
        return (isNameMatch(a.namaPerusahaan) || isNameMatch(a.nama_penyewa) || isNameMatch(a.namaPenandaTangan)) &&
          Math.abs(aNom - amount) < 1 && aTgl === ymd;
      });
      if (found) return found;
    }

    // 2. Name Match + Exact Date
    if (cleanTenant.length >= 3 && ymd) {
      const found = apiPromo.find((a) => {
        const aTgl = parseToYmd(a.tanggalTransfer || a.tanggal_transfer || a.createdAt);
        return (isNameMatch(a.namaPerusahaan) || isNameMatch(a.nama_penyewa) || isNameMatch(a.namaPenandaTangan)) &&
          aTgl === ymd;
      });
      if (found) return found;
    }

    // 3. Name Match + Same Month + Exact Amount
    if (cleanTenant.length >= 3 && amount && month) {
      const found = apiPromo.find((a) => {
        const aNom = Number(a.jumlahTransferNumeric || a.jumlahTransfer || a.totalBiaya || 0);
        const aTgl = parseToYmd(a.tanggalTransfer || a.tanggal_transfer || a.createdAt);
        return (isNameMatch(a.namaPerusahaan) || isNameMatch(a.nama_penyewa) || isNameMatch(a.namaPenandaTangan)) &&
          Math.abs(aNom - amount) < 1 && aTgl.startsWith(month);
      });
      if (found) return found;
    }

    // 4. Name Match + Same Month
    if (cleanTenant.length >= 3 && month) {
      const found = apiPromo.find((a) => {
        const aTgl = parseToYmd(a.tanggalTransfer || a.tanggal_transfer || a.createdAt);
        return (isNameMatch(a.namaPerusahaan) || isNameMatch(a.nama_penyewa) || isNameMatch(a.namaPenandaTangan)) &&
          aTgl.startsWith(month);
      });
      if (found) return found;
    }

    // 5. Name Match alone
    if (cleanTenant.length >= 4) {
      const found = apiPromo.find((a) =>
        isNameMatch(a.namaPerusahaan) || isNameMatch(a.nama_penyewa) || isNameMatch(a.namaPenandaTangan)
      );
      if (found) return found;
    }

    // 6. Amount + Date alone
    if (amount && ymd) {
      const found = apiPromo.find((a) => {
        const aTgl = parseToYmd(a.tanggalTransfer || a.tanggal_transfer || a.createdAt);
        const aNom = Number(a.jumlahTransferNumeric || a.jumlahTransfer || a.totalBiaya || 0);
        return aTgl === ymd && Math.abs(aNom - amount) < 1;
      });
      if (found) return found;
    }

    return null;
  };

  // Helper untuk parsing jumlah hari, titik, banner, spanduk dari teks/item jika tidak ada di API
  const parsePromoDetails = (targetStr, val) => {
    let jHari = 1;
    let jTitik = 1;
    let jBanner = 0;
    let jSpanduk = 0;

    const isBannerOnly = /banner|umbul/i.test(targetStr) && !/sampling|selling|booth/i.test(targetStr);
    const isSpandukOnly = /spanduk/i.test(targetStr) && !/sampling|selling|booth/i.test(targetStr);

    if (isBannerOnly) {
      jTitik = 0;
      jBanner = val >= 100000 ? Math.round(val / 100000) : 1;
    } else if (isSpandukOnly) {
      jTitik = 0;
      jSpanduk = val >= 100000 ? Math.round(val / 100000) : 1;
    } else {
      // Standar tarif booth promo sampling/selling adalah Rp 1.000.000 / hari per titik
      if (val >= 1000000) {
        jHari = Math.max(1, Math.round(val / 1000000));
      }
      if (/banner/i.test(targetStr)) {
        const matchB = targetStr.match(/(\d+)\s*banner/i);
        if (matchB) jBanner = parseInt(matchB[1], 10);
      }
      if (/spanduk/i.test(targetStr)) {
        const matchS = targetStr.match(/(\d+)\s*spanduk/i);
        if (matchS) jSpanduk = parseInt(matchS[1], 10);
      }
      const matchT = targetStr.match(/(\d+)\s*titik/i);
      if (matchT) jTitik = parseInt(matchT[1], 10);
      const matchH = targetStr.match(/(\d+)\s*hari/i);
      if (matchH) jHari = parseInt(matchH[1], 10);
    }

    return { jHari, jTitik, jBanner, jSpanduk };
  };

  // 1. Ekstrak dari allReports (Data yang sudah diinput resmi ke STSU Harian)
  Object.keys(allReports || {})
    .sort()
    .forEach((dateStr) => {
      if (dateStr.startsWith(monthStr)) {
        const dayAll = allReports[dateStr] || {};
        Object.keys(dayAll).forEach((tKey) => {
          const typeData = dayAll[tKey];
          if (typeData?.formData) {
            const activeItems = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];

            Object.keys(typeData.formData).forEach((fKey) => {
              const val = Number(typeData.formData[fKey]) || 0;
              if (val > 0) {
                let itemName = '';
                let catName = '';
                const parts = fKey.split('_');
                let activeItem = null;
                if (parts.length >= 3 && parts[0] === 'cat') {
                  const catId = `${parts[0]}_${parts[1]}`;
                  const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
                  const cat = categories.find((c) => c.id === catId);
                  const it = cat?.items?.find((i) => i.id === itemId);
                  catName = cat?.name || '';
                  itemName = it?.name || '';
                  activeItem = activeItems.find(
                    (ai) => ai.catId === catId && (ai.itemId === itemId || ai.id === itemId)
                  );
                }

                const target = `${catName} ${itemName} ${fKey}`.toLowerCase();
                if (/promo|promosi|banner|spanduk|umbul|booth|sponsor|sampling|selling/i.test(target)) {
                  if (activeItem && Array.isArray(activeItem.bankAllocations) && activeItem.bankAllocations.length > 0) {
                    activeItem.bankAllocations.forEach((ba, bIdx) => {
                      const baAmt = Number(ba.amount || 0);
                      if (baAmt <= 0) return;
                      if (ba.bankRowId) processedBankRowIds.add(ba.bankRowId);

                      const apiMatch = findApiMatch(ba.apiRefId, baAmt, ba.bankDate || dateStr, ba.tenant);
                      if (apiMatch) processedApiIds.add(String(apiMatch.id || apiMatch.docId || apiMatch.id_sewa));

                      const perusahaan = (apiMatch?.namaPerusahaan || apiMatch?.nama_penyewa || ba.tenant || activeItem.itemNote || 'Mitra Promosi').trim();
                      const produk = (apiMatch?.namaProduk || ba.desc || itemName || 'Promosi Produk').trim();
                      const rawTglTf = parseToYmd(apiMatch?.tanggalTransfer || apiMatch?.tanggal_transfer || ba.bankDate || dateStr);
                      
                      let tglEvent = apiMatch?.tanggalEvent || apiMatch?.tanggalPromo || apiMatch?.tanggal_sewa || apiMatch?.tanggalPemakaian || ba.tglEvent || '';
                      if (!tglEvent || tglEvent === '-') {
                        if (Array.isArray(apiMatch?.selectedDates) && apiMatch.selectedDates.length > 0) {
                          tglEvent = apiMatch.selectedDates.map(s => {
                            const dVal = typeof s === 'object' ? (s.date || s.tanggal) : s;
                            return formatDmy(parseToYmd(dVal)) || dVal;
                          }).join(', ');
                        } else {
                          tglEvent = formatDmy(rawTglTf);
                        }
                      } else if (/^\d{4}-\d{2}-\d{2}$/.test(tglEvent)) {
                        tglEvent = formatDmy(tglEvent);
                      }

                      const parsed = parsePromoDetails(`${target} ${ba.desc || ''} ${ba.location || ''}`, baAmt);

                      rawRows.push({
                        id: `${dateStr}_${fKey}_ba_${bIdx}`,
                        apiRefId: ba.apiRefId || apiMatch?.id || '',
                        rawTglTransfer: rawTglTf,
                        perusahaan,
                        produk,
                        tglEvent,
                        jumlahHari: apiMatch?.jumlahHari ? Number(apiMatch.jumlahHari) : parsed.jHari,
                        jumlahTitik: apiMatch?.jumlahTitik !== undefined ? Number(apiMatch.jumlahTitik) : parsed.jTitik,
                        banner: apiMatch?.jumlahBanner !== undefined ? Number(apiMatch.jumlahBanner) : parsed.jBanner,
                        spanduk: apiMatch?.jumlahSpanduk !== undefined ? Number(apiMatch.jumlahSpanduk) : parsed.jSpanduk,
                        nominal: baAmt,
                        keterangan: apiMatch?.keterangan || ba.location || ''
                      });
                    });
                  } else {
                    const itemNote = activeItem?.itemNote || parts[5] || '';
                    const apiMatch = findApiMatch(activeItem?.apiRefId, val, dateStr, itemNote);
                    if (apiMatch) processedApiIds.add(String(apiMatch.id || apiMatch.docId || apiMatch.id_sewa));
                    if (activeItem?.bankMatchRowId) processedBankRowIds.add(activeItem.bankMatchRowId);

                    const perusahaan = (apiMatch?.namaPerusahaan || apiMatch?.nama_penyewa || activeItem?.tenant || itemNote || 'Mitra Promosi').trim();
                    const produk = (apiMatch?.namaProduk || itemName || 'Promosi Produk').trim();
                    const rawTglTf = parseToYmd(apiMatch?.tanggalTransfer || apiMatch?.tanggal_transfer || dateStr);
                    
                    let tglEvent = apiMatch?.tanggalEvent || apiMatch?.tanggalPromo || apiMatch?.tanggal_sewa || apiMatch?.tanggalPemakaian || '';
                    if (!tglEvent || tglEvent === '-') {
                      if (Array.isArray(apiMatch?.selectedDates) && apiMatch.selectedDates.length > 0) {
                        tglEvent = apiMatch.selectedDates.map(s => {
                          const dVal = typeof s === 'object' ? (s.date || s.tanggal) : s;
                          return formatDmy(parseToYmd(dVal)) || dVal;
                        }).join(', ');
                      } else {
                        tglEvent = formatDmy(rawTglTf);
                      }
                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(tglEvent)) {
                      tglEvent = formatDmy(tglEvent);
                    }

                    const parsed = parsePromoDetails(`${target} ${itemNote}`, val);

                    rawRows.push({
                      id: `${dateStr}_${fKey}`,
                      apiRefId: activeItem?.apiRefId || apiMatch?.id || '',
                      rawTglTransfer: rawTglTf,
                      perusahaan,
                      produk,
                      tglEvent,
                      jumlahHari: apiMatch?.jumlahHari ? Number(apiMatch.jumlahHari) : parsed.jHari,
                      jumlahTitik: apiMatch?.jumlahTitik !== undefined ? Number(apiMatch.jumlahTitik) : parsed.jTitik,
                      banner: apiMatch?.jumlahBanner !== undefined ? Number(apiMatch.jumlahBanner) : parsed.jBanner,
                      spanduk: apiMatch?.jumlahSpanduk !== undefined ? Number(apiMatch.jumlahSpanduk) : parsed.jSpanduk,
                      nominal: val,
                      keterangan: apiMatch?.keterangan || itemNote || ''
                    });
                  }
                }
              }
            });
          }
        });
      }
    });

  // 2. Gabungkan dengan Bank Rows yang SUDAH DIPASANGKAN dan belum masuk allReports
  if (Array.isArray(bankRows)) {
    bankRows.forEach((row) => {
      if (processedBankRowIds.has(row.id)) return;
      if (row.apiRefId && processedApiIds.has(String(row.apiRefId))) return;

      const rowYmd = parseToYmd(row.date);
      if (!rowYmd.startsWith(monthStr)) return;

      // Hanya data mutasi yang SUDAH DIPASANGKAN (matched atau linked)
      const isPaired = row.status === 'matched' || row.status === 'linked' || Boolean(row.matchedTo);
      if (!isPaired) return;

      const matchedTo = (row.matchedTo || '').toLowerCase();
      if (/promo|promosi|banner|spanduk|sampling|selling/i.test(matchedTo)) {
        const amt = Number(row.amount || 0);
        if (amt <= 0) return;

        const apiMatch = findApiMatch(row.apiRefId, amt, rowYmd, row.tenant);
        if (apiMatch) processedApiIds.add(String(apiMatch.id || apiMatch.docId || apiMatch.id_sewa));

        const perusahaan = (apiMatch?.namaPerusahaan || apiMatch?.nama_penyewa || row.tenant || 'Mitra Promosi').trim();
        const produk = (apiMatch?.namaProduk || row.description || row.matchedTo || 'Promosi Produk').trim();
        const rawTglTf = parseToYmd(apiMatch?.tanggalTransfer || apiMatch?.tanggal_transfer || rowYmd);
        
        let tglEvent = apiMatch?.tanggalEvent || apiMatch?.tanggalPromo || apiMatch?.tanggal_sewa || apiMatch?.tanggalPemakaian || row.tglEvent || '';
        if (!tglEvent || tglEvent === '-') {
          if (Array.isArray(apiMatch?.selectedDates) && apiMatch.selectedDates.length > 0) {
            tglEvent = apiMatch.selectedDates.map(s => {
              const dVal = typeof s === 'object' ? (s.date || s.tanggal) : s;
              return formatDmy(parseToYmd(dVal)) || dVal;
            }).join(', ');
          } else {
            tglEvent = formatDmy(rawTglTf);
          }
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(tglEvent)) {
          tglEvent = formatDmy(tglEvent);
        }

        const parsed = parsePromoDetails(`${matchedTo} ${row.description || ''}`, amt);

        rawRows.push({
          id: `bank_${row.id}`,
          apiRefId: row.apiRefId || apiMatch?.id || '',
          rawTglTransfer: rawTglTf,
          perusahaan,
          produk,
          tglEvent,
          jumlahHari: apiMatch?.jumlahHari ? Number(apiMatch.jumlahHari) : parsed.jHari,
          jumlahTitik: apiMatch?.jumlahTitik !== undefined ? Number(apiMatch.jumlahTitik) : parsed.jTitik,
          banner: apiMatch?.jumlahBanner !== undefined ? Number(apiMatch.jumlahBanner) : parsed.jBanner,
          spanduk: apiMatch?.jumlahSpanduk !== undefined ? Number(apiMatch.jumlahSpanduk) : parsed.jSpanduk,
          nominal: amt,
          keterangan: apiMatch?.keterangan || row.location || ''
        });
      }
    });
  }

  // 4. Urutkan berdasarkan tanggal transfer (rawTglTransfer ASC), lalu nama perusahaan
  rawRows.sort((a, b) => {
    if (a.rawTglTransfer !== b.rawTglTransfer) {
      return a.rawTglTransfer.localeCompare(b.rawTglTransfer);
    }
    return (a.perusahaan || '').localeCompare(b.perusahaan || '');
  });

  // 5. Hitung total dan format baris tampilan
  let totalHari = 0;
  let totalTitik = 0;
  let totalBanner = 0;
  let totalSpanduk = 0;
  let totalNominal = 0;

  const rows = rawRows.map((r, idx) => {
    const tglTransferFormatted = formatDmy(r.rawTglTransfer);
    const isFirstOfDate = idx === 0 || formatDmy(rawRows[idx - 1].rawTglTransfer) !== tglTransferFormatted;
    const tglTransferDisplay = isFirstOfDate ? tglTransferFormatted : '';

    totalHari += Number(r.jumlahHari || 0);
    totalTitik += Number(r.jumlahTitik || 0);
    totalBanner += Number(r.banner || 0);
    totalSpanduk += Number(r.spanduk || 0);
    totalNominal += Number(r.nominal || 0);

    return {
      ...r,
      no: idx + 1,
      tglTransferFormatted,
      tglTransferDisplay,
      isFirstOfDate
    };
  });

  return {
    year,
    month,
    monthName,
    rows,
    totalHari,
    totalTitik,
    totalBanner,
    totalSpanduk,
    totalNominal,
    totalEvents: rows.length
  };
};
