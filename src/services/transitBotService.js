// =======================================================================
// SERVICE ISOLASI LOGIKA BOT 3A & IWM
// UP TAMAN MARGASATWA RAGUNAN (SEKSI PELAYANAN & INFORMASI)
// Logika ini terkunci dan tidak boleh diubah tanpa pengujian menyeluruh.
// =======================================================================

/**
 * Deteksi label Hari Biasa / Weekend untuk tiket Pusat Primata Schmutzer
 */
export const getPrimataLabel = (amount) => {
  if (!amount || amount <= 0) return "";
  const isHariBiasa = amount % 6000 === 0;
  const isWeekend = amount % 7500 === 0;
  if (isHariBiasa && !isWeekend) return " (Hari Biasa)";
  if (isWeekend && !isHariBiasa) return " (Weekend / Hari Besar)";
  if (isHariBiasa && isWeekend) return " (Hari Biasa / Weekend)";
  return "";
};

/**
 * Logika AI Smart Matcher: Menentukan Kategori dan Sub-Kategori otomatis
 * berdasarkan kata kunci dan algoritma scoring terbobot.
 */
export const smartMappingAI = (nameAPI, apiSource, targetDate, categories = []) => {
  let guessCat = '';
  let guessItem = '';
  const lowerName = (nameAPI || '').toLowerCase();
  
  if (apiSource === 'iwm') {
    const cat = categories.find(c => c.name.toLowerCase().includes('old gate') || c.name.toLowerCase().includes('iwm'));
    if (cat) guessCat = cat.id;
  } else {
    if (lowerName.includes('gate')) {
      const cat = categories.find(c => c.name.toLowerCase().includes('new gate'));
      if (cat) guessCat = cat.id;
    } else if (lowerName.includes('merchant_page') || lowerName.includes('online')) {
      const cat = categories.find(c => c.name.toLowerCase().includes('online'));
      if (cat) guessCat = cat.id;
    } else if (lowerName.includes('tvm') || lowerName.includes('vending')) {
      const cat = categories.find(c => c.name.toLowerCase().includes('tvm') || c.name.toLowerCase().includes('vending'));
      if (cat) guessCat = cat.id;
    }
  }

  if (guessCat) {
    const targetCat = categories.find(c => c.id === guessCat);
    if (targetCat && targetCat.items && targetCat.items.length > 0) {
      let bestScore = 0;
      
      targetCat.items.forEach(sub => {
        const subName = sub.name.toLowerCase();
        let score = 0;
        
        const normApiName = lowerName
          .replace(/sepededa/g, 'sepeda')
          .replace(/gol iii/g, 'gol 3')
          .replace(/gol ii/g, 'gol 2')
          .replace(/gol i\b/g, 'gol 1');
          
        const normSubName = subName
          .replace(/sepededa/g, 'sepeda')
          .replace(/gol iii/g, 'gol 3')
          .replace(/gol ii/g, 'gol 2')
          .replace(/gol i\b/g, 'gol 1');
        
        const isDewasa = normApiName.includes('dewasa');
        const isAnak = normApiName.includes('anak') || normApiName.includes('3-12');
        const isTSA = normApiName.includes('satwa') || normApiName.includes('tsa') || normApiName.includes('children');
        const isRombongan = normApiName.includes('rombongan') || normApiName.includes('romb');
        
        if (isDewasa && normSubName.includes('dewasa')) score += 10;
        if (isAnak && normSubName.includes('anak') && !isTSA && !normSubName.includes('satwa')) score += 10; 
        if (isTSA && (normSubName.includes('satwa') || normSubName.includes('children'))) score += 15;
        if (isRombongan && normSubName.includes('rombongan')) score += 15;
        
        if (normApiName.includes('primata') || normApiName.includes('schmutzer')) {
           if (normSubName.includes('primata') || normSubName.includes('schmutzer')) score += 10;
           
           const isApiLibur = /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(normApiName);
           const isSubLibur = /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(normSubName);
           const isApiWd = /wd|weekday|biasa|selasa|rabu|kamis|jumat|jum'at/i.test(normApiName);
           const isSubWd = /wd|weekday|biasa|selasa|rabu|kamis|jumat|jum'at/i.test(normSubName);
           
           if (isApiLibur && isSubLibur) score += 100;
           else if (isApiWd && isSubWd) score += 100;
           else if (isApiLibur && isSubWd) score -= 100;
           else if (isApiWd && isSubLibur) score -= 100;
        }

        if (normApiName.includes('sepeda') && normSubName.includes('sepeda')) score += 30;
        if (normApiName.includes('motor') && normSubName.includes('motor')) score += 30;
        if (normApiName.includes('gol 1') && normSubName.includes('gol 1')) score += 30;
        if (normApiName.includes('gol 2') && normSubName.includes('gol 2')) score += 30;
        
        const isApiMobilOrGol3 = normApiName.includes('gol 3') || normApiName.includes('mobil');
        const isSubMobilOrGol3 = normSubName.includes('gol 3') || normSubName.includes('mobil');
        if (isApiMobilOrGol3 && isSubMobilOrGol3) score += 30;

        if (score > bestScore) {
          bestScore = score;
          guessItem = sub.id;
        }
      });
    }
  }

  return { mappedCat: guessCat, mappedItem: guessItem };
};

/**
 * Memproses data mentah rekon 3A menjadi baris-baris grup STSU
 */
export const process3aData = (rekonData, targetDate) => {
  const stsuNames3A = {
    "1": "Tiket Dewasa",
    "2": "Tiket Anak (Usia 3-12 tahun)",
    "3": "Rombongan Dewasa Reduksi 25%",
    "4": "Rombongan Anak Reduksi 25%",
    "5": "Kuda Tunggang",
    "6": "Unta Tunggang",
    "7": "Gajah Tunggang",
    "8": "Taman Satwa Anak",
    "8_2": "Taman Satwa Anak (Anak Usia 3-12 tahun)",
    "9": "Pusat Primata Dewasa (Hari Biasa)",
    "10": "Pusat Primata Anak (Hari Biasa)",
    "11": "Schmutzer Rombongan Dewasa (Hari Biasa)",
    "12": "Schmutzer Rombongan Anak (Hari Biasa)",
    "13": "Pusat Primata Dewasa (Weekend / Holiday)",
    "13_2": "Pusat Primata Dewasa (Weekend)",
    "14": "Pusat Primata Anak (Weekend / Holiday)",
    "14_2": "Pusat Primata Anak (Weekend)",
    "15": "Schmutzer Rombongan Anak (Weekend)",
    "16": "Schmutzer Rombongan Dewasa (Weekend)",
    "17": "Kendaraan Gol I",
    "18": "Kendaraan Gol II",
    "19": "Kendaraan Gol III / Mobil",
    "20": "Sepeda Motor",
    "21": "Sepeda"
  };

  const grouped3A = {};
  const fetchedData = [];
  
  // CEK TANGGAL KALENDER
  const tgl = new Date(targetDate);
  const isCalendarWeekend = tgl.getDay() === 0 || tgl.getDay() === 6;

  Object.keys(rekonData).forEach(channel => {
    const channelData = rekonData[channel];
    Object.keys(channelData).forEach(idx => {
      const itemData = channelData[idx];
      const nominal = Number(itemData.nominal) || 0;
      const qty = Number(itemData.qty) || 0;
      
      if (nominal > 0) {
        let apiRawName = itemData.nama || itemData.name || '';
        
        if (!apiRawName || /^item\s*\d+/i.test(apiRawName.trim())) {
          apiRawName = stsuNames3A[idx] || `Item ${idx}`;
        }
        
        let groupKey = `${channel}_${idx}`;
        let groupName = `[${channel}] ${apiRawName}`;
        
        const lowerName = apiRawName.toLowerCase();
        const idStr = String(idx);

        // IDENTIFIKASI VARIABEL
        const isPrimata = /schmutzer|primata/i.test(lowerName) || ['9', '10', '11', '12', '13', '13_2', '14', '14_2', '15', '16'].includes(idStr);
        const isRombongan = /romb/i.test(lowerName) || ['3', '4', '11', '12', '15', '16'].includes(idStr);
        const isTsa = /taman satwa|tsa/i.test(lowerName) || ['8', '8_2'].includes(idStr);
        const isPintuMasuk = /tiket masuk|pintu masuk/i.test(lowerName) || ['1', '2'].includes(idStr);
        
        const isDewasa = /dewasa/i.test(lowerName) || ['1', '3', '9', '11', '13', '13_2', '16'].includes(idStr);
        const isAnak = /anak/i.test(lowerName) || lowerName.includes('3-12') || ['2', '4', '10', '12', '14', '14_2', '15'].includes(idStr);

        const isMotor = /motor/i.test(lowerName) || ['20'].includes(idStr);
        const isMobil = /mobil|gol 3|gol iii/i.test(lowerName) || ['19'].includes(idStr);
        const isGol2 = /gol 2|gol ii\b/i.test(lowerName) && !isMobil || ['18'].includes(idStr);
        const isGol1 = /gol 1|gol i\b/i.test(lowerName) && !isMobil && !isGol2 || ['17'].includes(idStr);
        const isSepeda = /sepeda/i.test(lowerName) && !isMotor || ['21'].includes(idStr);

        // PENGELOMPOKAN PAKSA & PENGGABUNGAN AGRESIF (MERGE)
        if (isTsa) {
          groupKey = `${channel}_tsa_all`;
          groupName = `[${channel}] Taman Satwa Anak (Total)`;
        } 
        else if (isPrimata && !isRombongan) {
          const isExplicitHoliday = /holiday|libur|besar/i.test(lowerName);
          const isExplicitWeekend = /we|weekend|sabtu|minggu/i.test(lowerName);
          const isExplicitWeekday = /wd|weekday|biasa|selasa|rabu|kamis|jumat|jum'at/i.test(lowerName);
          const isIdWeekend = ['13', '13_2', '14', '14_2'].includes(idStr);
          const isIdWeekday = ['9', '10'].includes(idStr);

          let libur = false;
          if (isIdWeekend || isExplicitHoliday || isExplicitWeekend) {
            libur = true;
          } else if (isIdWeekday || isExplicitWeekday) {
            libur = false;
          } else {
            libur = isCalendarWeekend; 
          }

          if (libur) {
            groupKey = `${channel}_prm_we_${isDewasa ? 'dws' : 'ank'}`;
            groupName = `[${channel}] Pusat Primata ${isDewasa ? 'Dewasa' : 'Anak'} (Weekend / Hari Besar)`;
          } else {
            groupKey = `${channel}_prm_wd_${isDewasa ? 'dws' : 'ank'}`;
            groupName = `[${channel}] Pusat Primata ${isDewasa ? 'Dewasa' : 'Anak'} (Hari Biasa)`;
          }
        }
        else if (isPintuMasuk && !isRombongan) {
          groupKey = `${channel}_gate_${isDewasa ? 'dws' : 'ank'}`;
          groupName = `[${channel}] Tiket Masuk ${isDewasa ? 'Dewasa' : 'Anak'} (Total)`;
        }
        else if (isMotor) {
          groupKey = `${channel}_kend_motor`;
          groupName = `[${channel}] Kendaraan Motor (Total)`;
        } else if (isMobil) {
          groupKey = `${channel}_kend_mobil`;
          groupName = `[${channel}] Kendaraan Gol 3 / Mobil (Total)`;
        } else if (isGol2) {
          groupKey = `${channel}_kend_gol2`;
          groupName = `[${channel}] Kendaraan Gol 2 (Total)`;
        } else if (isGol1) {
          groupKey = `${channel}_kend_gol1`;
          groupName = `[${channel}] Kendaraan Gol 1 (Total)`;
        } else if (isSepeda) {
          groupKey = `${channel}_kend_sepeda`;
          groupName = `[${channel}] Kendaraan Sepeda (Total)`;
        }

        // SIMPAN & GABUNGKAN NOMINAL JIKA KUNCINYA SAMA
        if (!grouped3A[groupKey]) {
          grouped3A[groupKey] = { id: groupKey, nameAPI: groupName, amount: 0, qty: 0 };
        }
        grouped3A[groupKey].amount += nominal;
        grouped3A[groupKey].qty += qty;
      }
    });
  });

  Object.values(grouped3A).forEach(g => {
    fetchedData.push({
      id: g.id,
      nameAPI: g.nameAPI.includes('(Qty:') || g.qty === 0 ? g.nameAPI : `${g.nameAPI} (Qty: ${g.qty})`,
      amount: g.amount
    });
  });

  return fetchedData;
};

/**
 * Menghubungi API Server Bot 3A (Port 5000) atau Mock Demo
 */
export const fetchBot3aData = async (ipAddress, targetDate) => {
  const ip = (ipAddress || '').trim().toLowerCase();

  if (ip === 'demo') {
    await new Promise(r => setTimeout(r, 1200)); 
    const mockRawData = {
      "MERCHANT_PAGE": {
        "1": {"nama": "Tiket Dewasa - Holiday", "qty": 600, "nominal": 2400000},
        "1_2": {"nama": "Tiket Dewasa - Weekend", "qty": 626, "nominal": 2504000},
        "2": {"nama": "Tiket Anak (Usia 3-12 tahun)", "qty": 244, "nominal": 732000},
        "13": {"nama": "Pusat Primata Schmutzer (Dewasa) - Holiday", "qty": 121, "nominal": 907500},
        "13_2": {"nama": "Pusat Primata Schmutzer (Dewasa) - Weekend", "qty": 55, "nominal": 412500},
        "14": {"nama": "Pusat Primata Schmutzer (Anak Usia 3-12 tahun) - Holiday", "qty": 23, "nominal": 172500},
        "14_2": {"nama": "Pusat Primata Schmutzer (Anak Usia 3-12 tahun) - Weekend", "qty": 15, "nominal": 112500},
        "8": {"nama": "Taman Satwa Anak", "qty": 229, "nominal": 572500},
        "8_2": {"nama": "Taman Satwa Anak", "qty": 83, "nominal": 207500},
        "17": {"nama": "Kendaraan Gol I", "qty": 4, "nominal": 60000},
        "18": {"nama": "Kendaraan Gol II", "qty": 1, "nominal": 12500},
        "19": {"nama": "Kendaraan Gol III", "qty": 118, "nominal": 708000},
        "20": {"nama": "Sepeda Motor", "qty": 201, "nominal": 603000},
        "21": {"nama": "Sepeda", "qty": 3, "nominal": 3000}
      }
    };
    return { fetchedData: process3aData(mockRawData, targetDate), diskonData: [] };
  }

  const baseUrl = ip.startsWith('http') ? ip : `http://${ip}:5000`;
  const endpoint = `${baseUrl}/api/tarik_rekon_3a?tanggal=${targetDate}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  const responseJson = await res.json();
  if (responseJson.status !== 'success') throw new Error(responseJson.message);
  
  if (responseJson.rekon_data) {
    return { fetchedData: process3aData(responseJson.rekon_data, targetDate), diskonData: [] };
  }
  return { fetchedData: [], diskonData: [] };
};

/**
 * Menghubungi API Server Bot IWM (Port 5001) atau Mock Demo
 */
export const fetchBotIwmData = async (ipAddress, targetDate) => {
  const ip = (ipAddress || '').trim().toLowerCase();
  let diskonData = [];
  let fetchedData = [];

  if (ip === 'demo') {
    await new Promise(r => setTimeout(r, 1200)); 
    diskonData = [
      { lokasi: 'Pintu Utara 3', nama_rombongan: 'SD SWASTA MARSUDIRINI', masuk_anak: 65, masuk_dewasa: 0, pendapatan_rp: 146250 },
      { lokasi: 'Pintu Masuk', nama_rombongan: 'GURU PENDAKIAN', masuk_anak: 0, masuk_dewasa: 10, pendapatan_rp: 30000 },
    ];
    fetchedData = [
      { id: 'i1', nameAPI: '[IWM] Pusat Primata - Dewasa (Reguler) (Hari Biasa)', amount: 582000 },
      { id: 'i2', nameAPI: '[IWM] Pusat Primata - Anak (Reguler) (Hari Biasa)', amount: 24000 },
      { id: 'i3', nameAPI: '[IWM] Pintu Masuk - Dewasa (Reguler)', amount: 2528000 },
      { id: 'i4', nameAPI: '[IWM] Kendaraan Gol III', amount: 35000 }, 
      { id: 'i5', nameAPI: '[IWM] Kendaraan - Sepeda', amount: 15000 },
      { id: 'i6_ank', nameAPI: '[IWM] Rombongan Anak - SD SWASTA MARSUDIRINI', amount: 146250, itemNote: 'SD SWASTA MARSUDIRINI' },
      { id: 'i7_dws', nameAPI: '[IWM] Rombongan Dewasa - GURU PENDAKIAN', amount: 30000, itemNote: 'GURU PENDAKIAN' }
    ];
    return { fetchedData, diskonData };
  }

  const baseUrl = ip.startsWith('http') ? ip : `http://${ip}:5001`;
  const endpoint = `${baseUrl}/api/tarik_rekon_iwm?tanggal=${targetDate}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  const responseJson = await res.json();
  if (responseJson.status !== 'success') throw new Error(responseJson.message);
  
  const iData = responseJson.data;
  diskonData = iData.laporan_diskon || [];
  
  let deductAlAnak = 0;
  let deductAlDewasa = 0;
  let deductPrmAnak = 0;
  let deductPrmDewasa = 0;
  
  diskonData.forEach(d => {
    const anak = Number(d.masuk_anak) || 0;
    const dewasa = Number(d.masuk_dewasa) || 0;
    const totalRp = Number(d.pendapatan_rp) || 0;
    
    const isPrimata = /primata|schmutzer/i.test(d.lokasi || '') || /primata|schmutzer/i.test(d.nama_rombongan || '');
    
    let calcAnak = 0;
    let calcDewasa = 0;

    if (anak > 0 && dewasa === 0) {
       calcAnak = totalRp;
       if (isPrimata) deductPrmAnak += totalRp; else deductAlAnak += totalRp;
    } else if (dewasa > 0 && anak === 0) {
       calcDewasa = totalRp;
       if (isPrimata) deductPrmDewasa += totalRp; else deductAlDewasa += totalRp;
    } else if (anak > 0 && dewasa > 0) {
       const porsiAnak = isPrimata ? anak * 1 : anak * 2250;
       const porsiDewasa = isPrimata ? dewasa * 1 : dewasa * 3000;
       const totalPorsi = porsiAnak + porsiDewasa;
       if (totalPorsi > 0) {
         calcAnak = Math.round((porsiAnak / totalPorsi) * totalRp);
         calcDewasa = totalRp - calcAnak; 
         if (isPrimata) {
             deductPrmAnak += calcAnak;
             deductPrmDewasa += calcDewasa;
         } else {
             deductAlAnak += calcAnak;
             deductAlDewasa += calcDewasa;
         }
       }
    }
    
    d._calcAnak = calcAnak;
    d._calcDewasa = calcDewasa;
    d._isPrimata = isPrimata;
  });

  if (iData.pusat_primata) {
    const netPrmDewasa = Math.max(0, (iData.pusat_primata.dewasa || 0) - deductPrmDewasa);
    const netPrmAnak = Math.max(0, (iData.pusat_primata.anak || 0) - deductPrmAnak);
    if (netPrmDewasa > 0) fetchedData.push({ id: 'prm_dws', nameAPI: `[IWM] Pusat Primata - Dewasa (Reguler)${getPrimataLabel(netPrmDewasa)}`, amount: netPrmDewasa });
    if (netPrmAnak > 0) fetchedData.push({ id: 'prm_ank', nameAPI: `[IWM] Pusat Primata - Anak (Reguler)${getPrimataLabel(netPrmAnak)}`, amount: netPrmAnak });
  }
  
  if (iData.children_zoo && iData.children_zoo.total > 0) {
    fetchedData.push({ id: 'cz_tot', nameAPI: '[IWM] Children Zoo (Total)', amount: iData.children_zoo.total });
  }

  if (iData.area_lainnya) {
    const al = iData.area_lainnya;
    const netDewasa = Math.max(0, (al.dewasa || 0) - deductAlDewasa);
    const netAnak = Math.max(0, (al.anak || 0) - deductAlAnak);

    if (netDewasa > 0) fetchedData.push({ id: 'al_dws', nameAPI: '[IWM] Pintu Masuk - Dewasa (Reguler)', amount: netDewasa });
    if (netAnak > 0) fetchedData.push({ id: 'al_ank', nameAPI: '[IWM] Pintu Masuk - Anak (Reguler)', amount: netAnak });
    if (al.gol_i > 0) fetchedData.push({ id: 'al_g1', nameAPI: '[IWM] Kendaraan Gol I', amount: al.gol_i });
    if (al.gol_ii > 0) fetchedData.push({ id: 'al_g2', nameAPI: '[IWM] Kendaraan Gol II', amount: al.gol_ii });
    if (al.gol_iii > 0) fetchedData.push({ id: 'al_g3', nameAPI: '[IWM] Kendaraan Gol III', amount: al.gol_iii });
    if (al.motor > 0) fetchedData.push({ id: 'al_mtr', nameAPI: '[IWM] Kendaraan - Motor', amount: al.motor });
    if (al.sepeda > 0) fetchedData.push({ id: 'al_spd', nameAPI: '[IWM] Kendaraan - Sepeda', amount: al.sepeda });
  }
  
  diskonData.forEach((d, idx) => {
    const isPrm = d._isPrimata;
    const rombName = d.nama_rombongan || d.lokasi || `Rombongan ${idx + 1}`;
    const prmLabel = isPrm ? ' (Primata)' : '';
    const finalNote = isPrm ? `${rombName} (Pusat Primata)` : rombName;
    
    if (d._calcDewasa > 0) {
      fetchedData.push({ 
        id: `iwm_romb_dws_${idx}`, 
        nameAPI: `[IWM] Rombongan Dewasa - ${rombName}${prmLabel}`, 
        amount: Math.abs(d._calcDewasa),
        itemNote: finalNote
      });
    }
    if (d._calcAnak > 0) {
      fetchedData.push({ 
        id: `iwm_romb_ank_${idx}`, 
        nameAPI: `[IWM] Rombongan Anak - ${rombName}${prmLabel}`, 
        amount: Math.abs(d._calcAnak),
        itemNote: finalNote
      });
    }
  });

  return { fetchedData, diskonData };
};
