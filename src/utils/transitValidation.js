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
 * Daftar Hari Libur Nasional (Tanggal Merah) & Cuti Bersama Resmi (SKB 3 Menteri)
 * Pada tanggal-tanggal ini (serta setiap hari Sabtu & Minggu), tarif Pusat Primata Schmutzer
 * menggunakan tarif Hari Libur / Besar yaitu Rp 7.500 / orang (Rombongan Diskon 25%: Rp 5.625).
 * Pada hari biasa / hari kerja (Selasa - Jumat di luar daftar ini), tarif adalah Rp 6.000 / orang.
 */
export const TANGGAL_MERAH_DAN_CUTI_BERSAMA = {
  // === 2025 ===
  '2025-01-01': 'Tahun Baru 2025 Masehi',
  '2025-01-27': 'Isra Mikraj Nabi Muhammad SAW',
  '2025-01-28': 'Cuti Bersama Tahun Baru Imlek',
  '2025-01-29': 'Tahun Baru Imlek 2576 Kongzili',
  '2025-03-28': 'Cuti Bersama Hari Suci Nyepi',
  '2025-03-29': 'Hari Suci Nyepi',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-01': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-02': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-03': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-04': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-07': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Kebangkitan Yesus Kristus (Paskah)',
  '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak 2569 BE',
  '2025-05-13': 'Cuti Bersama Hari Raya Waisak',
  '2025-05-29': 'Kenaikan Yesus Kristus',
  '2025-05-30': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-06': 'Hari Raya Idul Adha 1446 H',
  '2025-06-09': 'Cuti Bersama Idul Adha 1446 H',
  '2025-06-27': '1 Muharam Tahun Baru Islam 1447 H',
  '2025-08-17': 'Proklamasi Kemerdekaan RI',
  '2025-08-18': 'Cuti Bersama Kemerdekaan RI',
  '2025-09-05': 'Maulid Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',
  '2025-12-26': 'Cuti Bersama Hari Raya Natal',

  // === 2026 ===
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
  '2026-02-16': 'Cuti Bersama Tahun Baru Imlek',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-18': 'Cuti Bersama Hari Suci Nyepi',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-22': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-23': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-03-24': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Kebangkitan Yesus Kristus (Paskah)',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-15': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha 1447 H',
  '2026-05-28': 'Cuti Bersama Hari Raya Idul Adha 1447 H',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': '1 Muharam Tahun Baru Islam 1448 H',
  '2026-08-17': 'Proklamasi Kemerdekaan RI',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-24': 'Cuti Bersama Hari Raya Natal',
  '2026-12-25': 'Hari Raya Natal',

  // === 2027 ===
  '2027-01-01': 'Tahun Baru 2027 Masehi',
  '2027-01-06': 'Isra Mikraj Nabi Muhammad SAW',
  '2027-02-05': 'Cuti Bersama Tahun Baru Imlek',
  '2027-02-06': 'Tahun Baru Imlek 2578 Kongzili',
  '2027-03-08': 'Cuti Bersama Idul Fitri 1448 H',
  '2027-03-09': 'Cuti Bersama Idul Fitri 1448 H',
  '2027-03-10': 'Hari Raya Idul Fitri 1448 H',
  '2027-03-11': 'Hari Raya Idul Fitri 1448 H',
  '2027-03-12': 'Cuti Bersama Idul Fitri 1448 H',
  '2027-03-26': 'Wafat Yesus Kristus',
  '2027-03-28': 'Hari Suci Nyepi / Paskah',
  '2027-05-01': 'Hari Buruh Internasional',
  '2027-05-06': 'Kenaikan Yesus Kristus',
  '2027-05-07': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2027-05-16': 'Hari Raya Idul Adha 1448 H',
  '2027-05-17': 'Cuti Bersama Idul Adha 1448 H',
  '2027-05-20': 'Hari Raya Waisak 2571 BE',
  '2027-06-01': 'Hari Lahir Pancasila',
  '2027-06-06': '1 Muharam Tahun Baru Islam 1449 H',
  '2027-08-14': 'Maulid Nabi Muhammad SAW',
  '2027-08-17': 'Proklamasi Kemerdekaan RI',
  '2027-12-24': 'Cuti Bersama Hari Raya Natal',
  '2027-12-25': 'Hari Raya Natal'
};

/**
 * Mem-parsing string tanggal YYYY-MM-DD secara lokal tanpa pergeseran zona waktu UTC.
 */
export const parseLocalYMD = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Mengecek apakah suatu tanggal merupakan Sabtu, Minggu, Tanggal Merah (Libur Nasional), atau Cuti Bersama.
 * Jika true -> tarif Pusat Primata Schmutzer adalah Rp 7.500 (Rombongan 25%: Rp 5.625).
 * Jika false (Hari Biasa / Hari Kerja) -> tarif Pusat Primata Schmutzer adalah Rp 6.000 (Rombongan 25%: Rp 4.500).
 */
export const isHolidayOrWeekend = (dateStr) => {
  if (!dateStr) return false;
  const clean = String(dateStr).trim().slice(0, 10);
  if (TANGGAL_MERAH_DAN_CUTI_BERSAMA[clean]) return true;
  const dt = parseLocalYMD(clean);
  if (!dt) return false;
  const day = dt.getDay();
  return day === 0 || day === 6;
};

/**
 * Mengembalikan detail status hari (apakah Hari Kerja Rp 6.000 atau Sabtu/Minggu/Tanggal Merah/Cuti Bersama Rp 7.500).
 */
export const getHolidayOrWeekendInfo = (dateStr) => {
  if (!dateStr) return { isLibur: false, reason: 'Hari Biasa / Hari Kerja' };
  const clean = String(dateStr).trim().slice(0, 10);
  if (TANGGAL_MERAH_DAN_CUTI_BERSAMA[clean]) {
    return { isLibur: true, reason: TANGGAL_MERAH_DAN_CUTI_BERSAMA[clean] };
  }
  const dt = parseLocalYMD(clean);
  if (!dt) return { isLibur: false, reason: 'Hari Biasa / Hari Kerja' };
  const day = dt.getDay();
  if (day === 0) return { isLibur: true, reason: 'Hari Minggu (Weekend)' };
  if (day === 6) return { isLibur: true, reason: 'Hari Sabtu (Weekend)' };
  return { isLibur: false, reason: 'Hari Biasa / Hari Kerja' };
};

const PRIMATA_LIBUR_REGEX = /\bwe\b|weekend|holiday|libur|besar|sabtu|minggu|tanggal\s*merah|cuti\s*bersama/i;
const PRIMATA_KERJA_REGEX = /\bwd\b|weekday|biasa|hari\s*kerja|selasa|rabu|kamis|jumat|jum'at/i;

/**
 * Menentukan apakah item Pusat Primata menggunakan tarif Hari Libur/Weekend/Cuti Bersama (Rp 7.500 / Romb Rp 5.625)
 * atau tarif Hari Biasa/Kerja (Rp 6.000 / Romb Rp 4.500).
 */
const resolveIsPrimataLibur = ({ item, subName = '', apiName = '', targetDate = '', amount = 0, isRombongan = false }) => {
  const rateWd = isRombongan ? TARIF_STANDAR.ROMB_PRIMATA_WD : TARIF_STANDAR.PRIMATA_WD;
  const rateWe = isRombongan ? TARIF_STANDAR.ROMB_PRIMATA_WE : TARIF_STANDAR.PRIMATA_WE;

  // 1. Jika data berasal dari 3A yang memiliki Qty eksplisit (contoh: "(Qty: 6)" dengan Rp 36.000),
  //    gunakan kecocokan persis (amount === apiQty * tarif) sebagai penentu utama.
  //    Hal ini mendukung pembelian tiket online/3A H+1 s/d H+3 lintas hari (misal beli hari Minggu untuk kunjungan Selasa @ Rp 6.000).
  const qtyMatch = String(apiName || '').match(/\(qty:\s*(\d+)\)/i);
  const apiQty = Number(item?.qty) || (qtyMatch ? parseInt(qtyMatch[1], 10) : 0);
  if (apiQty > 0 && amount > 0) {
    if (amount === apiQty * rateWd) return false;
    if (amount === apiQty * rateWe) return true;
  }

  // 2. Cek apakah item memiliki id eksplisit dari 3A (prm_wd vs prm_we)
  const itemId = String(item?.id || '').toLowerCase();
  if (itemId.includes('_prm_wd_')) return false;
  if (itemId.includes('_prm_we_')) return true;

  if (item?.forcePrimataTarif === 'libur') return true;
  if (item?.forcePrimataTarif === 'kerja') return false;

  const subIsWe = PRIMATA_LIBUR_REGEX.test(subName);
  const subIsWd = PRIMATA_KERJA_REGEX.test(subName);
  const subOnlyWeekend = subIsWe && !subIsWd;
  const subOnlyWeekday = subIsWd && !subIsWe;

  const apiIsWe = PRIMATA_LIBUR_REGEX.test(apiName);
  const apiIsWd = PRIMATA_KERJA_REGEX.test(apiName);
  const apiOnlyWeekend = apiIsWe && !apiIsWd;
  const apiOnlyWeekday = apiIsWd && !apiIsWe;

  // 3. Prioritaskan sub-kategori yang dipilih pada dropdown (jika sudah terpetakan secara spesifik)
  if (subOnlyWeekend) return true;
  if (subOnlyWeekday) return false;

  // 4. Jika label API menyebutkan secara spesifik (bukan gabungan "(Hari Biasa / Weekend)")
  if (apiOnlyWeekend) return true;
  if (apiOnlyWeekday) return false;

  // 5. Jika ada tanggal transaksi/targetDate, cek apakah Sabtu/Minggu/Tanggal Merah/Cuti Bersama
  if (targetDate && String(targetDate).trim()) {
    return isHolidayOrWeekend(targetDate);
  }

  // 6. Fallback terakhir bila tidak ada tanggal maupun label spesifik
  if (amount > 0) {
    if (amount % rateWd === 0 && amount % rateWe !== 0) return false;
    if (amount % rateWe === 0 && amount % rateWd !== 0) return true;
  }
  return false;
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
  const rawApiName = (item.nameAPI || '').toLowerCase();
  // Bersihkan nama sekolah/instansi pada baris Rombongan IWM (misal "KB TKI AL KAUTSAR" yang memuat huruf "tsa")
  const rombHeaderMatch = rawApiName.match(/^(\[[^\]]+\]\s*rombongan\s+(?:anak|dewasa))\s*-\s*.+?(\s*\((?:primata|pusat\s*primata|schmutzer)[^)]*\))?$/i);
  const apiName = rombHeaderMatch ? `${rombHeaderMatch[1]}${rombHeaderMatch[2] || ''}` : rawApiName;

  // 1. Deteksi Identitas Item
  const isRombongan = /\brombongan\b|\bromb\b/i.test(apiName) || /\brombongan\b|\bromb\b|reduksi\s*25%/i.test(subName);
  const isPrimata = /primata|schmutzer/i.test(apiName) || /primata|schmutzer/i.test(subName);
  const isTSA = /taman\s*satwa|satwa\s*anak|\bchildren\b|\btsa\b/i.test(apiName) || /taman\s*satwa|satwa\s*anak|\bchildren\b|\btsa\b/i.test(subName);
  
  const isGol1 = /gol\s*(1|i\b)|bus\s*besar|truk\s*besar/i.test(apiName) || /gol\s*(1|i\b)|bus\s*besar/i.test(subName);
  const isGol2 = /gol\s*(2|ii\b)|bus\s*kecil|truk\s*kecil/i.test(apiName) || /gol\s*(2|ii\b)|bus\s*kecil/i.test(subName);
  const isGol3 = /gol\s*(3|iii\b)|mobil|sedan|minibus/i.test(apiName) || /gol\s*(3|iii\b)|mobil|sedan/i.test(subName);
  const isMotor = /motor/i.test(apiName) || /motor/i.test(subName);
  const isSepeda = /sepeda/i.test(apiName) || /sepeda/i.test(subName);

  const isPerahu = apiName.includes('perahu') || subName.includes('perahu');
  const isKereta = apiName.includes('kereta') || subName.includes('kereta');
  const isSepedaTunggal = apiName.includes('sepeda tunggal') || subName.includes('sepeda tunggal');
  const isSepedaGanda = apiName.includes('sepeda ganda') || subName.includes('sepeda ganda');

  const subIsDewasa = /\bdewasa\b|\bdws\b/i.test(subName);
  const subIsAnak = (/\banak\b|3-12/i.test(subName)) && !isTSA;
  const apiIsDewasa = /\bdewasa\b|\bdws\b/i.test(apiName);
  const apiIsAnak = (/\banak\b|3-12/i.test(apiName)) && !isTSA;

  const isDewasa = subIsDewasa && !subIsAnak ? true : subIsAnak && !subIsDewasa ? false : apiIsDewasa;
  const isAnak = subIsAnak && !subIsDewasa ? true : subIsDewasa && !subIsAnak ? false : apiIsAnak;

  // 2. Tentukan Tarif Satuan Berdasarkan Aturan Resmi
  let unitPrice = null;
  let unitLabel = '';

  if (isRombongan) {
    if (isPrimata) {
      const isLibur = resolveIsPrimataLibur({
        item,
        subName,
        apiName,
        targetDate,
        amount,
        isRombongan: true
      });
      if (isLibur) {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WE;
        unitLabel = 'Romb. Primata Weekend/Libur (Diskon 25%)';
      } else {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WD;
        unitLabel = 'Romb. Primata Hari Biasa (Diskon 25%)';
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
    const isLibur = resolveIsPrimataLibur({
      item,
      subName,
      apiName,
      targetDate,
      amount,
      isRombongan: false
    });
    if (isLibur) {
      unitPrice = TARIF_STANDAR.PRIMATA_WE;
      unitLabel = 'Primata Weekend/Libur';
    } else {
      unitPrice = TARIF_STANDAR.PRIMATA_WD;
      unitLabel = 'Primata Hari Biasa';
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
  const apiQty = Number(item?.qty) || (qtyMatch ? parseInt(qtyMatch[1], 10) : 0);

  // Khusus Pusat Primata di 3A: jika terdapat penggabungan tiket H+ (campuran Rp 6.000 & Rp 7.500 dalam 1 baris dengan total Qty pas)
  if (isPrimata && !isRombongan && apiQty > 0 && !isInteger) {
    const diffFromWd = amount - (apiQty * TARIF_STANDAR.PRIMATA_WD);
    const step = TARIF_STANDAR.PRIMATA_WE - TARIF_STANDAR.PRIMATA_WD; // 1.500
    if (diffFromWd > 0 && diffFromWd % step === 0) {
      const qtyWe = diffFromWd / step;
      const qtyWd = apiQty - qtyWe;
      if (qtyWd > 0 && qtyWe > 0) {
        return {
          isValid: true,
          unitPrice,
          qty: apiQty,
          unitLabel: 'Primata Campuran (Hari Kerja + Weekend/H+)',
          label: `${qtyWd.toLocaleString('id-ID')} org @ Rp 6.000 + ${qtyWe.toLocaleString('id-ID')} org @ Rp 7.500 (H+)`
        };
      }
    }
  }

  if (qtyMatch && isInteger) {
    if (!isNaN(apiQty) && apiQty > 0 && apiQty !== roundedQty) {
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

    let hPlusSuffix = '';
    if (isPrimata && targetDate && String(targetDate).trim()) {
      const dateIsLibur = isHolidayOrWeekend(targetDate);
      const rateIsLibur = unitPrice === TARIF_STANDAR.PRIMATA_WE || unitPrice === TARIF_STANDAR.ROMB_PRIMATA_WE;
      if (dateIsLibur && !rateIsLibur) {
        hPlusSuffix = ' (Tiket Hari Kerja / H+)';
      } else if (!dateIsLibur && rateIsLibur && apiQty > 0) {
        hPlusSuffix = ' (Tiket Weekend / H+)';
      }
    }

    return {
      isValid: true,
      unitPrice,
      qty: roundedQty,
      unitLabel,
      label: `${roundedQty.toLocaleString('id-ID')} ${unitText} @ Rp ${unitPrice.toLocaleString('id-ID')}${hPlusSuffix}`
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

    const isCalWeekend = isHolidayOrWeekend(targetDate);
    const expected = isCalWeekend ? expectedWe : expectedWd;
    const rate = isCalWeekend ? TARIF_STANDAR.ROMB_PRIMATA_WE : TARIF_STANDAR.ROMB_PRIMATA_WD;
    const diff = totalRp - expected;

    return {
      isValid: false,
      label: `Primata ${isCalWeekend ? 'Weekend/Libur' : 'Hari Biasa'}`,
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
      const effectiveDate = targetDate || group.validDate || group.itemDate || '';
      const isLibur = resolveIsPrimataLibur({
        item,
        subName: itemName,
        apiName: combined,
        targetDate: effectiveDate,
        amount,
        isRombongan: true
      });
      if (isLibur) {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WE; // 5.625
        unitLabel = 'Romb. Primata Weekend/Libur (Diskon 25%)';
      } else {
        unitPrice = TARIF_STANDAR.ROMB_PRIMATA_WD; // 4.500
        unitLabel = 'Romb. Primata Hari Biasa (Diskon 25%)';
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
    const effectiveDate = targetDate || group.validDate || group.itemDate || '';
    const isLibur = resolveIsPrimataLibur({
      item,
      subName: itemName,
      apiName: combined,
      targetDate: effectiveDate,
      amount,
      isRombongan: false
    });
    if (isLibur) {
      unitPrice = TARIF_STANDAR.PRIMATA_WE; // 7.500
      unitLabel = 'Primata Weekend/Libur';
    } else {
      unitPrice = TARIF_STANDAR.PRIMATA_WD; // 6.000
      unitLabel = 'Primata Hari Biasa';
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


