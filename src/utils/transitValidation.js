// =======================================================================
// PARAMETER PENGECEKAN NOMINAL & TARIF RUANG TRANSIT (3A & IWM)
// UP TAMAN MARGASATWA RAGUNAN (SEKSI PELAYANAN & INFORMASI)
// =======================================================================

/**
 * Daftar Tarif Resmi Perda DKI Jakarta untuk Taman Margasatwa Ragunan:
 * - Dewasa: Rp 4.000 / orang (Rombongan 25%: Rp 3.000 / orang)
 * - Anak-anak: Rp 3.000 / orang (Rombongan 25%: Rp 2.250 / orang)
 * - Kendaraan / Parkir:
 *   - Bus besar, truk besar, mobil box besar (Gol I): Rp 15.000 / hari
 *   - Bus kecil, truk kecil, pick up besar (Gol II): Rp 12.500 / hari
 *   - Mobil sedan, minibus, pickup kecil (Gol III): Rp 6.000 / hari
 *   - Sepeda motor, kendaraan roda tiga: Rp 3.000 / hari
 *   - Sepeda: Rp 1.000 / hari
 * - Wahana:
 *   - Taman satwa anak / Children Zoo: Rp 2.500 / orang
 *   - Perahu Angsa: Rp 40.000 / keliling
 *   - Kereta keliling: Rp 20.000 / keliling
 *   - Sepeda tunggal: Rp 15.000 / orang
 *   - Sepeda ganda: Rp 20.000 / orang
 * - Pusat Primata Schmutzer:
 *   - Hari Selasa - Jumat (Hari Biasa): Rp 6.000 / orang (Rombongan 25%: Rp 4.500 / orang)
 *   - Hari Sabtu - Minggu / Libur Nasional (Hari Besar): Rp 7.500 / orang (Rombongan 25%: Rp 5.625 / orang)
 */

export const TARIF_STANDAR = {
  PINTU_DEWASA: 4000,
  PINTU_ANAK: 3000,
  ROMB_DEWASA: 3000,     // 4.000 - 25%
  ROMB_ANAK: 2250,       // 3.000 - 25%
  PRIMATA_WD: 6000,
  PRIMATA_WE: 7500,
  ROMB_PRIMATA_WD: 4500, // 6.000 - 25%
  ROMB_PRIMATA_WE: 5625, // 7.500 - 25%
  TSA: 2500,
  GOL_1: 15000,          // Bus besar, truk besar
  GOL_2: 12500,          // Bus kecil, truk kecil
  GOL_3: 6000,           // Mobil sedan, minibus
  MOTOR: 3000,
  SEPEDA: 1000,
  PERAHU_ANGSA: 40000,
  KERETA_KELILING: 20000,
  SEPEDA_TUNGGAL: 15000,
  SEPEDA_GANDA: 20000
};

/**
 * Mengecek keabsahan nominal rupiah terhadap tarif resmi untuk baris item di Ruang Transit (3A / IWM).
 * Menghasilkan status valid (Hijau) jika nominal habis dibagi tarif (nilai bulat / tidak berkoma).
 * Menghasilkan status invalid (Merah) jika nominal berkoma atau ada sisa pembagian.
 */
export const checkTransitItemTarif = (item, categories = [], targetDate = '') => {
  if (!item) return { isValid: true, label: '', message: '' };

  const amount = Number(item.amount) || 0;
  if (amount <= 0) {
    return {
      isValid: false,
      unitPrice: null,
      label: 'Nominal Kosong',
      message: 'Nominal Rp 0 / belum terisi'
    };
  }

  // Jika angka input awal sudah memiliki nilai desimal
  if (amount % 1 !== 0) {
    return {
      isValid: false,
      unitPrice: null,
      label: 'Nominal Berkoma',
      message: `Nominal tidak bulat (${amount})`
    };
  }

  const cat = Array.isArray(categories) ? categories.find(c => c.id === item.mappedCat) : null;
  const sub = cat?.items?.find(i => i.id === item.mappedItem);
  const subName = (sub?.name || '').toLowerCase();
  const apiName = (item.nameAPI || '').toLowerCase();

  // 1. Deteksi Identitas Item
  const isRombongan = apiName.includes('rombongan') || apiName.includes('romb') || subName.includes('rombongan') || subName.includes('reduksi 25%');
  const isPrimata = apiName.includes('primata') || apiName.includes('schmutzer') || subName.includes('primata') || subName.includes('schmutzer');
  const isTSA = apiName.includes('taman satwa') || apiName.includes('children') || apiName.includes('tsa') || subName.includes('taman satwa') || subName.includes('satwa anak');
  
  const isGol1 = /gol\s*(1|i\b)|bus\s*besar|truk\s*besar/i.test(apiName) || /gol\s*(1|i\b)|bus\s*besar/i.test(subName);
  const isGol2 = /gol\s*(2|ii\b)|bus\s*kecil|truk\s*kecil/i.test(apiName) || /gol\s*(2|ii\b)|bus\s*kecil/i.test(subName);
  const isGol3 = /gol\s*(3|iii\b)|mobil|sedan|minibus/i.test(apiName) || /gol\s*(3|iii\b)|mobil|sedan/i.test(subName);
  const isMotor = /motor/i.test(apiName) || /motor/i.test(subName);
  const isSepeda = /sepeda/i.test(apiName) || /sepeda/i.test(subName);

  const isPerahu = apiName.includes('perahu') || subName.includes('perahu');
  const isKereta = apiName.includes('kereta') || subName.includes('kereta');
  const isSepedaTunggal = apiName.includes('sepeda tunggal') || subName.includes('sepeda tunggal');
  const isSepedaGanda = apiName.includes('sepeda ganda') || subName.includes('sepeda ganda');

  const isDewasa = apiName.includes('dewasa') || subName.includes('dewasa');
  const isAnak = apiName.includes('anak') || apiName.includes('3-12') || subName.includes('anak');

  // 2. Tentukan Tarif Satuan Berdasarkan Aturan Resmi
  let unitPrice = null;
  let unitLabel = '';

  if (isRombongan) {
    if (isPrimata) {
      const isWeekend = /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(apiName) || /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(subName);
      const isWeekday = /wd|weekday|biasa|selasa|rabu|kamis|jumat/i.test(apiName) || /wd|weekday|biasa|selasa|rabu|kamis|jumat/i.test(subName);
      if (isWeekend) {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WE;
        unitLabel = 'Romb. Primata Weekend (Diskon 25%)';
      } else if (isWeekday) {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WD;
        unitLabel = 'Romb. Primata Hari Biasa (Diskon 25%)';
      } else {
        if (amount % TARIF_STANDAR.ROMB_PRIMATA_WD === 0 && amount % TARIF_STANDAR.ROMB_PRIMATA_WE !== 0) {
          unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WD;
          unitLabel = 'Romb. Primata Hari Biasa (Diskon 25%)';
        } else if (amount % TARIF_STANDAR.ROMB_PRIMATA_WE === 0 && amount % TARIF_STANDAR.ROMB_PRIMATA_WD !== 0) {
          unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WE;
          unitLabel = 'Romb. Primata Weekend (Diskon 25%)';
        } else {
          const tgl = targetDate ? new Date(targetDate) : null;
          const isCalWeekend = tgl ? (tgl.getDay() === 0 || tgl.getDay() === 6) : false;
          unitPrice = isCalWeekend ? TARIF_STANDAR.ROMB_PRIMATA_WE : TARIF_STANDAR.ROMB_PRIMATA_WD;
          unitLabel = `Romb. Primata ${isCalWeekend ? 'Weekend' : 'Hari Biasa'} (Diskon 25%)`;
        }
      }
    } else if (isDewasa) {
      unitPrice = TARIF_STANDAR.ROMB_DEWASA;
      unitLabel = 'Romb. Dewasa (Diskon 25%)';
    } else if (isAnak) {
      unitPrice = TARIF_STANDAR.ROMB_ANAK;
      unitLabel = 'Romb. Anak (Diskon 25%)';
    } else {
      if (amount % TARIF_STANDAR.ROMB_ANAK === 0 && amount % TARIF_STANDAR.ROMB_DEWASA !== 0) {
        unitPrice = TARIF_STANDAR.ROMB_ANAK;
        unitLabel = 'Romb. Anak (Diskon 25%)';
      } else if (amount % TARIF_STANDAR.ROMB_DEWASA === 0 && amount % TARIF_STANDAR.ROMB_ANAK !== 0) {
        unitPrice = TARIF_STANDAR.ROMB_DEWASA;
        unitLabel = 'Romb. Dewasa (Diskon 25%)';
      } else {
        unitPrice = TARIF_STANDAR.ROMB_ANAK;
        unitLabel = 'Rombongan (Diskon 25%)';
      }
    }
  } else if (isPrimata) {
    const isWeekend = /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(apiName) || /we|weekend|holiday|libur|besar|sabtu|minggu/i.test(subName);
    const isWeekday = /wd|weekday|biasa|selasa|rabu|kamis|jumat/i.test(apiName) || /wd|weekday|biasa|selasa|rabu|kamis|jumat/i.test(subName);
    if (isWeekend) {
      unitPrice = TARIF_STANDAR.PRIMATA_WE;
      unitLabel = 'Primata Weekend/Libur';
    } else if (isWeekday) {
      unitPrice = TARIF_STANDAR.PRIMATA_WD;
      unitLabel = 'Primata Hari Biasa';
    } else {
      if (amount % TARIF_STANDAR.PRIMATA_WD === 0 && amount % TARIF_STANDAR.PRIMATA_WE !== 0) {
        unitPrice = TARIF_STANDAR.PRIMATA_WD;
        unitLabel = 'Primata Hari Biasa';
      } else if (amount % TARIF_STANDAR.PRIMATA_WE === 0 && amount % TARIF_STANDAR.PRIMATA_WD !== 0) {
        unitPrice = TARIF_STANDAR.PRIMATA_WE;
        unitLabel = 'Primata Weekend/Libur';
      } else {
        const tgl = targetDate ? new Date(targetDate) : null;
        const isCalWeekend = tgl ? (tgl.getDay() === 0 || tgl.getDay() === 6) : false;
        unitPrice = isCalWeekend ? TARIF_STANDAR.PRIMATA_WE : TARIF_STANDAR.PRIMATA_WD;
        unitLabel = isCalWeekend ? 'Primata Weekend/Libur' : 'Primata Hari Biasa';
      }
    }
  } else if (isTSA) {
    unitPrice = TARIF_STANDAR.TSA;
    unitLabel = 'Taman Satwa Anak';
  } else if (isPerahu) {
    unitPrice = TARIF_STANDAR.PERAHU_ANGSA;
    unitLabel = 'Perahu Angsa';
  } else if (isKereta) {
    unitPrice = TARIF_STANDAR.KERETA_KELILING;
    unitLabel = 'Kereta Keliling';
  } else if (isSepedaGanda) {
    unitPrice = TARIF_STANDAR.SEPEDA_GANDA;
    unitLabel = 'Sepeda Ganda';
  } else if (isSepedaTunggal) {
    unitPrice = TARIF_STANDAR.SEPEDA_TUNGGAL;
    unitLabel = 'Sepeda Tunggal';
  } else if (isGol1) {
    unitPrice = TARIF_STANDAR.GOL_1;
    unitLabel = 'Kendaraan Gol I (Bus/Truk Besar)';
  } else if (isGol2) {
    unitPrice = TARIF_STANDAR.GOL_2;
    unitLabel = 'Kendaraan Gol II (Bus Kecil/Truk Kecil)';
  } else if (isGol3) {
    unitPrice = TARIF_STANDAR.GOL_3;
    unitLabel = 'Kendaraan Gol III / Mobil';
  } else if (isMotor) {
    unitPrice = TARIF_STANDAR.MOTOR;
    unitLabel = 'Sepeda Motor';
  } else if (isSepeda) {
    unitPrice = TARIF_STANDAR.SEPEDA;
    unitLabel = 'Sepeda';
  } else if (isDewasa) {
    unitPrice = TARIF_STANDAR.PINTU_DEWASA;
    unitLabel = 'Tiket Dewasa';
  } else if (isAnak) {
    unitPrice = TARIF_STANDAR.PINTU_ANAK;
    unitLabel = 'Tiket Anak';
  }

  // Jika belum cocok dengan tarif spesifik di atas
  if (!unitPrice) {
    return {
      isValid: true,
      unitPrice: null,
      label: 'Tarif Umum',
      message: 'Belum dipetakan ke tarif khusus'
    };
  }

  const qty = amount / unitPrice;
  const isInteger = Math.abs(qty - Math.round(qty)) < 1e-4;
  const roundedQty = Math.round(qty);
  const remainder = amount % unitPrice;

  // Cek apakah ada Qty bawaan API pada nameAPI (contoh: `(Qty: 1276)`)
  const qtyMatch = apiName.match(/\(qty:\s*(\d+)\)/i);
  if (qtyMatch && isInteger) {
    const apiQty = parseInt(qtyMatch[1], 10);
    if (!isNaN(apiQty) && apiQty !== roundedQty) {
      return {
        isValid: false,
        unitPrice,
        qty: roundedQty,
        unitLabel,
        message: `Selisih Qty API (${apiQty}) vs Hitungan (${roundedQty} @ Rp ${unitPrice.toLocaleString('id-ID')})`
      };
    }
  }

  if (isInteger && roundedQty > 0) {
    const unitText = (isMotor || isSepeda || isGol1 || isGol2 || isGol3)
      ? 'kendaraan'
      : (isPerahu || isKereta ? 'keliling' : (isRombongan ? 'org (Diskon 25%)' : 'orang'));
    return {
      isValid: true,
      unitPrice,
      qty: roundedQty,
      unitLabel,
      label: `${roundedQty.toLocaleString('id-ID')} ${unitText} @ Rp ${unitPrice.toLocaleString('id-ID')}`
    };
  } else {
    const formattedQty = (amount / unitPrice).toFixed(2).replace('.', ',');
    return {
      isValid: false,
      unitPrice,
      qty,
      unitLabel,
      message: `Tidak Bulat: Rp ${amount.toLocaleString('id-ID')} / Rp ${unitPrice.toLocaleString('id-ID')} = ${formattedQty} (Sisa Rp ${remainder.toLocaleString('id-ID')})`
    };
  }
};

/**
 * Validasi akurasi perhitungan diskon 25% pada tabel Daftar Mentah Rombongan IWM.
 * Menghasilkan status valid (Hijau) jika nominal pendapatan sesuai persis dengan (Anak × 2.250 + Dewasa × 3.000)
 * atau (Primata Hari Biasa × 4.500 / Weekend × 5.625).
 */
export const validateIwmDiskonRow = (d, targetDate = '') => {
  const anak = Number(d.masuk_anak) || 0;
  const dewasa = Number(d.masuk_dewasa) || 0;
  const totalRp = Number(d.pendapatan_rp) || 0;
  const isPrimata = /primata|schmutzer/i.test(d.lokasi || '') || /primata|schmutzer/i.test(d.nama_rombongan || '') || Boolean(d._isPrimata);

  if (isPrimata) {
    const totalOrg = anak + dewasa;
    const expectedWd = totalOrg * TARIF_STANDAR.ROMB_PRIMATA_WD; // 4.500
    const expectedWe = totalOrg * TARIF_STANDAR.ROMB_PRIMATA_WE; // 5.625

    if (totalRp === expectedWd) {
      return {
        isValid: true,
        label: `${totalOrg} org × Rp 4.500 (Hari Biasa)`,
        rate: TARIF_STANDAR.ROMB_PRIMATA_WD,
        expected: expectedWd,
        diff: 0
      };
    }
    if (totalRp === expectedWe) {
      return {
        isValid: true,
        label: `${totalOrg} org × Rp 5.625 (Weekend/Libur)`,
        rate: TARIF_STANDAR.ROMB_PRIMATA_WE,
        expected: expectedWe,
        diff: 0
      };
    }

    const tgl = targetDate ? new Date(targetDate) : null;
    const isCalWeekend = tgl ? (tgl.getDay() === 0 || tgl.getDay() === 6) : false;
    const expected = isCalWeekend ? expectedWe : expectedWd;
    const rate = isCalWeekend ? TARIF_STANDAR.ROMB_PRIMATA_WE : TARIF_STANDAR.ROMB_PRIMATA_WD;
    const diff = totalRp - expected;

    return {
      isValid: false,
      label: `Primata ${isCalWeekend ? 'Weekend' : 'Hari Biasa'}`,
      rate,
      expected,
      diff,
      message: `Seharusnya Rp ${expected.toLocaleString('id-ID')} (Selisih ${diff > 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')})`
    };
  } else {
    // Pintu Masuk reguler diskon 25%:
    // Dewasa: 4.000 * 0.75 = 3.000
    // Anak: 3.000 * 0.75 = 2.250
    const expected = (anak * TARIF_STANDAR.ROMB_ANAK) + (dewasa * TARIF_STANDAR.ROMB_DEWASA);
    const diff = totalRp - expected;

    if (totalRp === expected) {
      const parts = [];
      if (anak > 0) parts.push(`${anak} anak @ Rp 2.250`);
      if (dewasa > 0) parts.push(`${dewasa} dws @ Rp 3.000`);
      return {
        isValid: true,
        label: parts.join(' + ') || 'Diskon 25% Pas',
        expected,
        diff: 0
      };
    }

    return {
      isValid: false,
      label: 'Pintu Masuk (Diskon 25%)',
      expected,
      diff,
      message: `Seharusnya Rp ${expected.toLocaleString('id-ID')} (Selisih ${diff > 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')})`
    };
  }
};

/**
 * Mengecek keabsahan nominal rupiah terhadap tarif resmi tiket untuk form input operasional harian (InputHarianTab).
 * Mendukung tiket reguler pintu masuk, rombongan (diskon 25%), pusat primata hari biasa & hari besar,
 * rombongan primata (diskon 25%), Taman Satwa Anak (TSA), wahana rekreasi, dan parkir kendaraan.
 *
 * @param {Object} item - Objek item dari group.activeItems ({ id, name, itemNote, ... })
 * @param {Object} group - Objek group ({ catId, name, validDate, itemDate, ... })
 * @param {number|string} rawAmount - Nominal input rupiah
 * @param {string} targetDate - Tanggal laporan / transaksi (YYYY-MM-DD)
 * @returns {Object} {
 *   hasCheck: boolean,
 *   isValid: boolean,
 *   unitPrice: number|null,
 *   qty: number,
 *   unitLabel: string,
 *   unitText: string,
 *   label: string,
 *   message: string,
 *   remainder: number
 * }
 */
export const checkTicketItemTarif = (item, group = {}, rawAmount = 0, targetDate = '') => {
  const amount = Number(rawAmount) || 0;
  if (!item || amount <= 0) {
    return { hasCheck: false };
  }

  const itemName = (item.name || '').toLowerCase();
  const groupName = (group.name || '').toLowerCase();
  const itemNote = (item.itemNote || '').toLowerCase();
  const combined = `${groupName} ${itemName} ${itemNote}`;

  // Filter out non-ticket categories/items (sewa lahan, listrik, shooting, kantin, dsb.)
  if (
    /sewa|lahan|listrik|shooting|syuting|pemasaran|reklame|banner|kantin|kios|toilet|sampah|gedung|aula/i.test(itemName) &&
    !/tiket|rombongan/i.test(itemName)
  ) {
    return { hasCheck: false };
  }

  // Identifikasi kategori tiket
  const isTicketingGroup = /tiket|ticket|gate|tvm|vending|online|merchant|wahana|schmutzer|primata/i.test(groupName);
  const isTicketItem = /dewasa|anak|rombongan|romb\b|primata|schmutzer|satwa\s*anak|children|tsa\b|motor|mobil|gol\s*(1|2|3|i\b|ii\b|iii\b)|sepeda|perahu|kereta|kuda|unta|gajah/i.test(itemName);

  if (!isTicketingGroup && !isTicketItem) {
    return { hasCheck: false };
  }

  // Jika input memiliki nilai desimal sejak awal
  if (amount % 1 !== 0) {
    return {
      hasCheck: true,
      isValid: false,
      unitPrice: null,
      qty: amount,
      unitLabel: 'Nominal Berkoma',
      unitText: '',
      label: '',
      message: `Nominal tidak bulat (${amount})`,
      remainder: 0
    };
  }

  // Deteksi Tipe Tiket
  const isRombongan = /rombongan|romb\b|reduksi\s*25%|diskon\s*25%/i.test(combined);
  const isPrimata = /primata|schmutzer/i.test(combined);
  const isTSA = /taman\s*satwa|satwa\s*anak|children|tsa\b/i.test(combined);

  const isGol1 = /gol\s*(1|i\b)|bus\s*besar|truk\s*besar/i.test(combined);
  const isGol2 = /gol\s*(2|ii\b)|bus\s*kecil|truk\s*kecil/i.test(combined);
  const isGol3 = /gol\s*(3|iii\b)|mobil|sedan|minibus/i.test(combined);
  const isMotor = /motor/i.test(combined);
  const isSepeda = /sepeda\b/i.test(combined) && !/sepeda\s*(tunggal|ganda)/i.test(combined);

  const isPerahu = /perahu/i.test(combined);
  const isKereta = /kereta/i.test(combined);
  const isSepedaTunggal = /sepeda\s*tunggal/i.test(combined);
  const isSepedaGanda = /sepeda\s*ganda/i.test(combined);
  const isKuda = /kuda\b/i.test(combined);
  const isUntaGajah = /unta|gajah/i.test(combined);

  const isDewasa = /dewasa/i.test(combined);
  const isAnak = /anak|3-12/i.test(combined) && !isTSA;

  let unitPrice = null;
  let unitLabel = '';

  if (isRombongan) {
    if (isPrimata) {
      const isWeekend = /we\b|weekend|holiday|libur|besar|sabtu|minggu/i.test(combined);
      const isWeekday = /wd\b|weekday|biasa|selasa|rabu|kamis|jumat/i.test(combined);
      if (isWeekend) {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WE; // 5.625
        unitLabel = 'Romb. Primata Weekend (Diskon 25%)';
      } else if (isWeekday) {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WD; // 4.500
        unitLabel = 'Romb. Primata Hari Biasa (Diskon 25%)';
      } else {
        if (amount % TARIF_STANDAR.ROMB_PRIMATA_WD === 0 && amount % TARIF_STANDAR.ROMB_PRIMATA_WE !== 0) {
          unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WD;
          unitLabel = 'Romb. Primata Hari Biasa (Diskon 25%)';
        } else if (amount % TARIF_STANDAR.ROMB_PRIMATA_WE === 0 && amount % TARIF_STANDAR.ROMB_PRIMATA_WD !== 0) {
          unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WE;
          unitLabel = 'Romb. Primata Weekend (Diskon 25%)';
        } else {
          const tgl = targetDate || group.validDate || group.itemDate ? new Date(targetDate || group.validDate || group.itemDate) : null;
          const isCalWeekend = tgl && !isNaN(tgl) ? (tgl.getDay() === 0 || tgl.getDay() === 6) : false;
          unitPrice = isCalWeekend ? TARIF_STANDAR.ROMB_PRIMATA_WE : TARIF_STANDAR.ROMB_PRIMATA_WD;
          unitLabel = `Romb. Primata ${isCalWeekend ? 'Weekend' : 'Hari Biasa'} (Diskon 25%)`;
        }
      }
    } else if (isDewasa && !isAnak) {
      unitPrice = TARIF_STANDAR.ROMB_DEWASA; // 3.000
      unitLabel = 'Romb. Dewasa (Diskon 25%)';
    } else if (isAnak && !isDewasa) {
      unitPrice = TARIF_STANDAR.ROMB_ANAK; // 2.250
      unitLabel = 'Romb. Anak (Diskon 25%)';
    } else {
      // Jika nama hanya 'Rombongan'
      if (amount % TARIF_STANDAR.ROMB_ANAK === 0 && amount % TARIF_STANDAR.ROMB_DEWASA !== 0) {
        unitPrice = TARIF_STANDAR.ROMB_ANAK;
        unitLabel = 'Romb. Anak (Diskon 25%)';
      } else if (amount % TARIF_STANDAR.ROMB_DEWASA === 0 && amount % TARIF_STANDAR.ROMB_ANAK !== 0) {
        unitPrice = TARIF_STANDAR.ROMB_DEWASA;
        unitLabel = 'Romb. Dewasa (Diskon 25%)';
      } else {
        unitPrice = TARIF_STANDAR.ROMB_ANAK;
        unitLabel = 'Rombongan (Diskon 25%)';
      }
    }
  } else if (isPrimata) {
    const isWeekend = /we\b|weekend|holiday|libur|besar|sabtu|minggu/i.test(combined);
    const isWeekday = /wd\b|weekday|biasa|selasa|rabu|kamis|jumat/i.test(combined);
    if (isWeekend) {
      unitPrice = TARIF_STANDAR.PRIMATA_WE; // 7.500
      unitLabel = 'Primata Weekend/Libur';
    } else if (isWeekday) {
      unitPrice = TARIF_STANDAR.PRIMATA_WD; // 6.000
      unitLabel = 'Primata Hari Biasa';
    } else {
      if (amount % TARIF_STANDAR.PRIMATA_WD === 0 && amount % TARIF_STANDAR.PRIMATA_WE !== 0) {
        unitPrice = TARIF_STANDAR.PRIMATA_WD;
        unitLabel = 'Primata Hari Biasa';
      } else if (amount % TARIF_STANDAR.PRIMATA_WE === 0 && amount % TARIF_STANDAR.PRIMATA_WD !== 0) {
        unitPrice = TARIF_STANDAR.PRIMATA_WE;
        unitLabel = 'Primata Weekend/Libur';
      } else {
        const tgl = targetDate || group.validDate || group.itemDate ? new Date(targetDate || group.validDate || group.itemDate) : null;
        const isCalWeekend = tgl && !isNaN(tgl) ? (tgl.getDay() === 0 || tgl.getDay() === 6) : false;
        unitPrice = isCalWeekend ? TARIF_STANDAR.PRIMATA_WE : TARIF_STANDAR.PRIMATA_WD;
        unitLabel = isCalWeekend ? 'Primata Weekend/Libur' : 'Primata Hari Biasa';
      }
    }
  } else if (isTSA) {
    unitPrice = TARIF_STANDAR.TSA; // 2.500
    unitLabel = 'Taman Satwa Anak';
  } else if (isPerahu) {
    unitPrice = TARIF_STANDAR.PERAHU_ANGSA; // 40.000
    unitLabel = 'Perahu Angsa';
  } else if (isKereta) {
    unitPrice = TARIF_STANDAR.KERETA_KELILING; // 20.000
    unitLabel = 'Kereta Keliling';
  } else if (isSepedaGanda) {
    unitPrice = TARIF_STANDAR.SEPEDA_GANDA; // 20.000
    unitLabel = 'Sepeda Ganda';
  } else if (isSepedaTunggal) {
    unitPrice = TARIF_STANDAR.SEPEDA_TUNGGAL; // 15.000
    unitLabel = 'Sepeda Tunggal';
  } else if (isKuda) {
    unitPrice = 5000;
    unitLabel = 'Wahana Kuda Tunggang';
  } else if (isUntaGajah) {
    unitPrice = 7500;
    unitLabel = 'Wahana Gajah / Unta';
  } else if (isGol1) {
    unitPrice = TARIF_STANDAR.GOL_1; // 15.000
    unitLabel = 'Gol I (Bus/Truk Besar)';
  } else if (isGol2) {
    unitPrice = TARIF_STANDAR.GOL_2; // 12.500
    unitLabel = 'Gol II (Bus/Truk Kecil)';
  } else if (isGol3) {
    unitPrice = TARIF_STANDAR.GOL_3; // 6.000
    unitLabel = 'Gol III (Mobil/Sedan)';
  } else if (isMotor) {
    unitPrice = TARIF_STANDAR.MOTOR; // 3.000
    unitLabel = 'Sepeda Motor';
  } else if (isSepeda) {
    unitPrice = TARIF_STANDAR.SEPEDA; // 1.000
    unitLabel = 'Sepeda';
  } else if (isDewasa) {
    unitPrice = TARIF_STANDAR.PINTU_DEWASA; // 4.000
    unitLabel = 'Tiket Masuk Dewasa';
  } else if (isAnak) {
    unitPrice = TARIF_STANDAR.PINTU_ANAK; // 3.000
    unitLabel = 'Tiket Masuk Anak';
  }

  // Jika item tidak cocok dengan tarif resmi manapun
  if (!unitPrice) {
    return { hasCheck: false };
  }

  const qty = amount / unitPrice;
  const isInteger = Math.abs(qty - Math.round(qty)) < 1e-4;
  const roundedQty = Math.round(qty);
  const remainder = amount % unitPrice;

  const unitText = (isMotor || isSepeda || isGol1 || isGol2 || isGol3)
    ? 'kendaraan'
    : (isPerahu || isKereta ? 'keliling' : (isRombongan ? 'org (Diskon 25%)' : 'orang'));

  if (isInteger && roundedQty > 0) {
    return {
      hasCheck: true,
      isValid: true,
      unitPrice,
      qty: roundedQty,
      unitLabel,
      unitText,
      label: `${roundedQty.toLocaleString('id-ID')} ${unitText} @ Rp ${unitPrice.toLocaleString('id-ID')}`,
      message: '',
      remainder: 0
    };
  } else {
    const formattedQty = (amount / unitPrice).toFixed(2).replace('.', ',');
    return {
      hasCheck: true,
      isValid: false,
      unitPrice,
      qty,
      unitLabel,
      unitText,
      label: '',
      message: `Pecahan: Rp ${amount.toLocaleString('id-ID')} / Rp ${unitPrice.toLocaleString('id-ID')} = ${formattedQty} (Sisa Rp ${remainder.toLocaleString('id-ID')})`,
      remainder
    };
  }
};


