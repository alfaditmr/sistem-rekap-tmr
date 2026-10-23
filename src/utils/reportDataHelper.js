/**
 * Helper modul agregasi dan kalkulasi data laporan TMR
 * Menghitung data dinamis dari allReports berdasarkan format template di folder 'format laporan'
 * TANPA merubah data atau struktur asli allReports.
 */
import { formatRp, safeString, getDayName } from './formatters';

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
  const [yearStr, mStr] = monthStr.split('-');
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

/**
 * 7. Data Pemakaian Tempat & Fasilitas (format REKAP PEMAKAIAN TEMPAT 2026.xlsx)
 */
export const getPemakaianTempatData = (allReports, categories, monthStr) => {
  const { year, month, monthName } = getMonthDaysMetadata(monthStr);
  const rows = [];
  let totalNominal = 0;
  let no = 1;

  Object.keys(allReports).sort().forEach(dateStr => {
    if (dateStr.startsWith(monthStr)) {
      const dayAll = allReports[dateStr];
      Object.keys(dayAll).forEach(tKey => {
        // Ambil dari dokumen lain-lain atau kategori fasilitas
        const typeData = dayAll[tKey];
        if (typeData?.formData) {
          Object.keys(typeData.formData).forEach(fKey => {
            const val = Number(typeData.formData[fKey]) || 0;
            if (val > 0) {
              let itemName = '';
              let catName = '';
              const parts = fKey.split('_');
              if (parts.length >= 3 && parts[0] === 'cat') {
                const catId = `${parts[0]}_${parts[1]}`;
                const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
                const cat = categories.find(c => c.id === catId);
                const it = cat?.items?.find(i => i.id === itemId);
                catName = cat?.name || '';
                itemName = it?.name || '';
              }

              const target = `${catName} ${itemName} ${fKey}`.toLowerCase();
              if (
                /fasilitas|panggung|lahan|tempat|sound|wireless|auditorium|gazebo|lapangan|gedung/i.test(target) &&
                !/banner|spanduk|promo produk/i.test(target)
              ) {
                // Ekstrak note penyewa jika ada di fKey
                const itemNote = parts[5] || '';
                rows.push({
                  no: no++,
                  tglBayar: dateStr,
                  penyewa: itemNote || 'Penyewa Tempat/Fasilitas',
                  tglPakai: dateStr,
                  jenisFasilitas: itemName || 'Pemakaian Tempat / Lahan',
                  nominal: val,
                  keterangan: catName || 'Sewa Fasilitas'
                });
                totalNominal += val;
              }
            }
          });
        }
      });
    }
  });

  return { year, month, monthName, rows, totalNominal };
};

/**
 * 8. Data Rekap Promosi & Media (format REKAP PROMO 2026.xlsx)
 */
export const getPromoMediaData = (allReports, categories, monthStr) => {
  const { year, month, monthName } = getMonthDaysMetadata(monthStr);
  const rows = [];
  let totalNominal = 0;
  let no = 1;

  Object.keys(allReports).sort().forEach(dateStr => {
    if (dateStr.startsWith(monthStr)) {
      const dayAll = allReports[dateStr];
      Object.keys(dayAll).forEach(tKey => {
        const typeData = dayAll[tKey];
        if (typeData?.formData) {
          Object.keys(typeData.formData).forEach(fKey => {
            const val = Number(typeData.formData[fKey]) || 0;
            if (val > 0) {
              let itemName = '';
              let catName = '';
              const parts = fKey.split('_');
              if (parts.length >= 3 && parts[0] === 'cat') {
                const catId = `${parts[0]}_${parts[1]}`;
                const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
                const cat = categories.find(c => c.id === catId);
                const it = cat?.items?.find(i => i.id === itemId);
                catName = cat?.name || '';
                itemName = it?.name || '';
              }

              const target = `${catName} ${itemName} ${fKey}`.toLowerCase();
              if (/promo|promosi|banner|spanduk|umbul|booth|sponsor/i.test(target)) {
                const itemNote = parts[5] || '';
                rows.push({
                  no: no++,
                  tglTransfer: dateStr,
                  perusahaan: itemNote || 'Mitra Promosi',
                  produk: itemName || 'Promosi Produk & Media',
                  tglEvent: dateStr,
                  durasi: '1 Hari',
                  media: /banner/i.test(target) ? 'Banner Promosi' : /spanduk/i.test(target) ? 'Spanduk' : 'Booth Promosi Produk',
                  nominal: val,
                  keterangan: catName || 'Promosi Penjualan'
                });
                totalNominal += val;
              }
            }
          });
        }
      });
    }
  });

  return { year, month, monthName, rows, totalNominal };
};
