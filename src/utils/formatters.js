// ==========================================
// 🔴 MODUL HELPER & FORMATTER SISTEM REKAP TMR
// ==========================================

/**
 * Mengamankan konversi data ke string agar tidak terjadi crash / null pointer
 */
export const safeString = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch(e) { return ""; }
  }
  return String(val);
};

/**
 * Sanitasi payload untuk Firestore (mencegah error value 'undefined')
 */
export const sanitizeForFirestore = (data) => {
  if (data === undefined) return null;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value === undefined) return null;
    return value;
  }));
};

/**
 * Mengubah angka menjadi teks terbilang Bahasa Indonesia
 */
export function terbilang(angka, depth = 0) {
  if (depth > 20) return ""; 
  const num = Number(angka);
  if (isNaN(num) || !isFinite(num)) return ""; 
  
  let val = Math.floor(Math.abs(num));
  if (val === 0) return "nol";
  
  const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let divide = 0; let word = "";
  
  if (val < 12) return huruf[val];
  else if (val < 20) return terbilang(val - 10, depth + 1) + " belas";
  else if (val < 100) { divide = Math.floor(val / 10); word = huruf[divide] + " puluh"; let rem = val % 10; return rem > 0 ? word + " " + terbilang(rem, depth + 1) : word; }
  else if (val < 200) { let rem = val - 100; return rem > 0 ? "seratus " + terbilang(rem, depth + 1) : "seratus"; }
  else if (val < 1000) { divide = Math.floor(val / 100); word = huruf[divide] + " ratus"; let rem = val % 100; return rem > 0 ? word + " " + terbilang(rem, depth + 1) : word; }
  else if (val < 2000) { let rem = val - 1000; return rem > 0 ? "seribu " + terbilang(rem, depth + 1) : "seribu"; }
  else if (val < 1000000) { divide = Math.floor(val / 1000); word = terbilang(divide, depth + 1) + " ribu"; let rem = val % 1000; return rem > 0 ? word + " " + terbilang(rem, depth + 1) : word; }
  else if (val < 1000000000) { divide = Math.floor(val / 1000000); word = terbilang(divide, depth + 1) + " juta"; let rem = val % 1000000; return rem > 0 ? word + " " + terbilang(rem, depth + 1) : word; }
  else if (val < 1000000000000) { divide = Math.floor(val / 1000000000); word = terbilang(divide, depth + 1) + " miliar"; let rem = val % 1000000000; return rem > 0 ? word + " " + terbilang(rem, depth + 1) : word; }
  else if (val < 1000000000000000) { divide = Math.floor(val / 1000000000000); word = terbilang(divide, depth + 1) + " triliun"; let rem = val % 1000000000000; return rem > 0 ? word + " " + terbilang(rem, depth + 1) : word; }
  return "";
}

/**
 * Format angka ke format nominal Rupiah (cth: 1.500.000)
 */
export const formatRp = (angka) => {
  const num = Number(angka);
  if (isNaN(num) || num === 0) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Mendapatkan tanggal lokal sekarang dalam format YYYY-MM-DD
 */
export const getLocalYMD = (dateInput = new Date()) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Mendapatkan nama hari Bahasa Indonesia berdasarkan tanggal
 */
export const getDayName = (dateStr) => {
  if (!dateStr) return "";
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(dateStr).getDay()];
};

/**
 * Format tanggal cetak formal Laporan STSU (cth: Kamis, tanggal 10 Oktober 2026)
 */
export const formatTanggalCetak = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).replace(',', ', tanggal');
};

/**
 * Format tanggal pop-up dialog (cth: Kamis, 10 Oktober 2026)
 */
export const formatTanggalPopUp = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format tanggal tanda tangan (cth: 10 Oktober 2026)
 */
export const formatTanggalTtd = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
};

/**
 * Membangun key identitas unik item aktif pada form data laporan
 */
export const getActiveItemKey = (catId, itemId, isSus, validDate, itemDate, itemNote) => {
  let key = `${catId}_${itemId}`;
  if (isSus) key += `_susulan_${validDate}`;
  if (itemDate) key += `_date_${itemDate}`;
  if (itemNote) {
    let hash = 0;
    for (let i = 0; i < itemNote.length; i++) {
      hash = ((hash << 5) - hash) + itemNote.charCodeAt(i);
      hash = hash & hash;
    }
    key += `_note_${Math.abs(hash)}`;
  }
  return key;
};

/**
 * Tooltip hover rincian sumber dana di pratinjau rekapitulasi Excel
 */
export const formatDetailsTooltip = (total, detailsObj = {}) => {
  if (total === 0) return "Tidak ada transaksi";
  let str = `Total Digabungkan: Rp ${formatRp(total)}\n\nRincian Sumber:\n`;
  Object.entries(detailsObj).forEach(([source, amount]) => {
    str += `▸ ${source}: Rp ${formatRp(amount)}\n`;
  });
  return str.trim();
};
