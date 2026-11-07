/**
 * stsuTemplates.js
 * Template cetak STSU format dinas (sesuai file resmi di folder "format cetak"):
 *  - STSU Foto Satwa.xls            -> Retribusi Pemanfaatan Aset Daerah (Satwa Jinak untuk Berfoto)
 *  - STSU-PLL E-Car.xls             -> Pendapatan BLUD dari Pengembangan Usaha (E-Car)
 *  - STSU-PLL Kerjasama Dll.xls     -> Jasa Giro / Hasil Kerjasama dengan Pihak Lain
 *  - STSU-PLL Listrik.xls           -> Rekening Listrik
 *  - STSU-PLL Pedagang dan Foto.xls -> Retribusi Pedagang (Autodebet) & Juru Foto
 *  - STSU-PLL Virtual .xls          -> Bank Sampah & Paket Wisata Edukasi
 *
 * Catatan penting kedinasan:
 * - Seluruh tiket masuk/gerbang (New Gate, Old Gate, Online, TVM) TIDAK dicetak di Format Dinas STSU.
 * - Promo / Penjualan Produk dan Pemakaian Fasilitas TMR TIDAK dicetak di Format Dinas STSU
 *   (dicetak di Format Baru Pemasaran 23 pos baku hasil retribusi), KECUALI item khusus
 *   yang memiliki template resmi tersendiri yaitu "Foto Satwa" dan "Juru Foto".
 *
 * Modul ini murni presentasi: tidak mengubah data/logic/fitur yang sudah ada.
 */

const PEMANFAATAN_ASET_TITLE = ['RETRIBUSI PEMANFAATAN ASET DAERAH'];
const PENGEMBANGAN_USAHA_TITLE = ['PENDAPATAN BLUD DARI PENGEMBANGAN USAHA'];

const clean = (s = '') => String(s).replace(/\s*\n+\s*/g, ' ').trim();

const joinNote = (items) =>
  items
    .map((i) => clean(i.note))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

/**
 * Deteksi apakah teks merujuk pada transaksi Penyediaan Satwa Jinak untuk Berfoto (STSU Foto Satwa).
 * Mengecualikan Taman Satwa Anak (TSA) dan Pemutaran Film Satwa.
 */
export const isFotoSatwaText = (text = '') => {
  const t = String(text || '').toLowerCase();
  if (/taman\s*satwa|film\s*satwa|\btsa\b/i.test(t)) return false;
  return /satwa\s*jinak|satwa\s*jikan|foto\s*satwa|berfoto|penyedia.*satwa|penyesia.*satwa|peneyedia.*satwa/i.test(t);
};

/**
 * Deteksi apakah teks merujuk pada transaksi Juru Foto / Pelayanan Pengambilan Foto (STSU Juru Foto).
 */
export const isJuruFotoText = (text = '') => {
  const t = String(text || '').toLowerCase();
  if (isFotoSatwaText(t)) return false;
  return /juru\s*foto|jurufoto|pengambilan\s*foto|ambil\s*foto/i.test(t);
};

/**
 * Memeriksa apakah suatu kategori / item merupakan transaksi tiket gerbang / wahana / online.
 * Catatan penting: JANGAN mengecek berdasarkan ID seperti cat_3/cat_4 karena pada database
 * eksisting cat_3 = Juru Foto dan cat_4 = Penyediaan satwa jinak untuk berfoto.
 */
export const isTicketCategory = (catOrGroupName = '') => {
  const name = String(catOrGroupName || '').toLowerCase();

  // Foto Satwa & Juru Foto bukan tiket gerbang
  if (isFotoSatwaText(name) || isJuruFotoText(name)) return false;

  // Pola nama kategori / grup tiket gerbang & wahana (termasuk ejaan 'vinding')
  if (/e-?ticketing|ticket|tiket|vending|vinding|tvm|\bgate\b|gerbang/i.test(name)) {
    return true;
  }

  // Pola nama item tiket masuk / wahana
  if (/tiket masuk|pintu masuk|schmutzer|pusat primata|taman satwa anak|rombongan dewasa|rombongan anak/i.test(name)) {
    return true;
  }

  return false;
};

/**
 * Memeriksa apakah transaksi dikecualikan dari Format Dinas STSU.
 * - Tiket masuk/gerbang -> Dikecualikan
 * - Promo / Penjualan Produk (Pos 4.1.02.02.012 00001) -> Dikecualikan (dicetak di Format Baru Pemasaran)
 * - Pemakaian Fasilitas TMR umum (Pos 4.1.02.02.020.00001) -> Dikecualikan (dicetak di Format Baru Pemasaran)
 *   KECUALI: Satwa Jinak untuk Berfoto (STSU Foto Satwa) & Juru Foto (STSU Juru Foto)
 */
export const isExcludedFromFormatDinas = (catOrGroupName = '', catId = '', itemName = '') => {
  const cName = String(catOrGroupName || '').toLowerCase();
  const cId = String(catId || '').toLowerCase();
  const iName = String(itemName || '').toLowerCase();
  const combined = `${cName} ${iName}`.trim();

  // 1. Transaksi Foto Satwa & Juru Foto selalu diperbolehkan (TIDAK PERNAH dikecualikan)
  if (isFotoSatwaText(combined) || isJuruFotoText(combined)) {
    return false;
  }

  // 2. Seluruh transaksi tiket
  if (isTicketCategory(cName) || isTicketCategory(iName)) {
    return true;
  }

  // 3. Promo / Penjualan Produk dikecualikan dari format dinas
  if (/promo|penjualan produk/i.test(combined) && !/banner|spanduk|umbul/i.test(combined)) {
    return true;
  }

  // 4. Pemakaian Fasilitas TMR umum dikecualikan (dicetak di Format Baru Pemasaran)
  const isFasilitas = cId === 'cat_1' || /fasilitas/i.test(cName);
  if (isFasilitas) {
    return true;
  }

  return false;
};

/**
 * Daftar template STSU resmi yang memiliki file template cetak di folder "format cetak".
 * Urutan penting: yang paling spesifik lebih dulu.
 */
export const STSU_TEMPLATES = [
  {
    id: 'foto_satwa',
    label: 'STSU Foto Satwa',
    test: (t) => isFotoSatwaText(t),
    title: PEMANFAATAN_ASET_TITLE,
    kode: '4.1.02.02.020.00001',
    heading: ['PEMAKAIAN FASILITAS', 'TAMAN MARGASATWA RAGUNAN'],
    rows: ({ subtotal }) => [
      {
        lines: ['Hasil Pendapatan Retribusi Penyediaan', 'Satwa Jinak untuk Berfoto'],
        amount: subtotal
      }
    ],
    footerLines: ({ dateText }) => [`Tanggal  ${dateText}`]
  },
  {
    id: 'ecar',
    label: 'STSU E-Car',
    test: (t) => /e-?car/.test(t),
    title: PENGEMBANGAN_USAHA_TITLE,
    kode: '4.1.04.16.006.00006',
    heading: ['PENDAPATAN BLUD DARI', 'PENGEMBANGAN USAHA :'],
    rows: ({ subtotal }) => [{ lines: ['Hasil Pendapatan Operasional E-Car'], amount: subtotal }],
    footerLines: ({ dateText }) => [`Tanggal ${dateText}`]
  },
  {
    id: 'jasa_giro',
    label: 'STSU Jasa Giro',
    test: (t) => /jasa giro|jagir/.test(t),
    title: ['PENDAPATAN BLUD DARI JASA GIRO'],
    kode: '4.1.04.16.006.00001',
    heading: ['PENDAPATAN BLUD DARI', 'JASA GIRO'],
    rows: ({ items, subtotal }) => {
      const note = joinNote(items);
      return [
        {
          lines: ['Hasil pendapatan Jagir dari  Rekening', note ? `Kas Bulan ${note}` : 'Kas Bulan ........................'],
          amount: subtotal
        }
      ];
    },
    footerLines: () => []
  },
  {
    id: 'kerjasama',
    label: 'STSU Kerjasama Pihak Lain',
    test: (t) => /kerja ?sama|sewa|pakarindo|laseko|koprimas|dorit|indomaret|minimarket|atm/.test(t),
    title: ['PENDAPATAN BLUD DARI HASIL KERJASAMA DENGAN PIHAK LAIN'],
    kode: '4.1.04.16.004.00001',
    heading: ['PENDAPATAN BLUD DARI HASIL', 'KERJASAMA DENGAN PIHAK LAIN'],
    rows: ({ items, subtotal, catName }) => {
      const note = joinNote(items);
      return [
        {
          lines: ['Hasil Pendapatan atas Perjanjian Sewa', ...(note ? [note] : [clean(catName)])],
          amount: subtotal
        }
      ];
    },
    footerLines: () => []
  },
  {
    id: 'listrik',
    label: 'STSU Listrik',
    test: (t) => /listrik/.test(t),
    title: PENGEMBANGAN_USAHA_TITLE,
    kode: '4.1.04.16.006.00006',
    heading: ['PENDAPATAN BLUD DARI', 'PENGEMBANGAN USAHA :'],
    rows: ({ items, subtotal }) => {
      const note = joinNote(items);
      return [
        {
          lines: ['Hasil pendapatan rekening listrik dari', ...(note ? [note] : [])],
          amount: subtotal
        }
      ];
    },
    footerLines: () => []
  },
  {
    id: 'bank_sampah',
    label: 'STSU Bank Sampah',
    test: (t) => /sampah/.test(t),
    title: PENGEMBANGAN_USAHA_TITLE,
    kode: '4.1.04.16.006.00006',
    heading: ['PENDAPATAN BLUD DARI', 'PENGEMBANGAN USAHA :'],
    rows: ({ items, subtotal }) => {
      const note = joinNote(items);
      return [
        {
          lines: [
            'Hasil Pendapatan penjualan sampah',
            'Anorganik Bank Sampah Tamara',
            note ? `UP TMR periode Bulan ${note}` : 'UP TMR periode Bulan ..............'
          ],
          amount: subtotal
        }
      ];
    },
    footerLines: () => []
  },
  {
    id: 'paket_wisata',
    label: 'STSU Paket Wisata Edukasi',
    test: (t) => /paket wisata|wisata edukasi|bus ragunan/.test(t),
    title: PENGEMBANGAN_USAHA_TITLE,
    kode: '4.1.04.16.006.00006',
    heading: ['PENDAPATAN BLUD DARI', 'PENGEMBANGAN USAHA :'],
    rows: ({ items, subtotal }) => {
      const note = joinNote(items);
      return [
        {
          lines: [
            'Hasil Pendapatan Paket Wisata',
            'Edukasi dengan Bus Ragunan dari',
            ...(note ? [note] : [])
          ],
          amount: subtotal
        }
      ];
    },
    footerLines: ({ itemDateText, dateText }) => [itemDateText ? `tanggal ${itemDateText}` : `tanggal ${dateText}`]
  },
  {
    id: 'juru_foto',
    label: 'STSU Juru Foto',
    test: (t) => isJuruFotoText(t),
    title: [
      'RETRIBUSI PEMANFAATAN ASET DAERAH YANG TIDAK MENGGANGGU',
      'PENYELENGGARAAN TUGAS DAN FUNGSI ORGANISASI PERANGKAT DAERAH'
    ],
    kode: '4.1.02.02.020.00001',
    heading: ['PEMAKAIAN FASILITAS', 'TAMAN MARGASATWA RAGUNAN'],
    rows: ({ subtotal }) => [{ lines: ['Hasil Pendapatan Retribusi Juru Foto'], amount: subtotal }],
    footerLines: ({ dateText }) => [`Autodebet Tanggal ${dateText}`]
  },
  {
    id: 'pedagang',
    label: 'STSU Retribusi Pedagang',
    test: (t) => /pedagang|pkl|tikar/.test(t),
    title: [
      'RETRIBUSI PENYEDIAAN TEMPAT KEGIATAN USAHA BERUPA PASAR GROSIR,',
      'PERTOKOAN, DAN TEMPAT KEGIATAN USAHA LAINNYA'
    ],
    kode: '4.1.02.02.012 00001',
    heading: ['PEMAKAIAN FASILITAS', 'TAMAN MARGASATWA RAGUNAN', 'Hasil pendapatan Retribusi'],
    rows: ({ items }) =>
      items.map((i) => ({
        lines: [clean(i.name) + (i.note ? ` (${clean(i.note)})` : '')],
        amount: i.amount
      })),
    footerLines: ({ dateText }) => [`Autodebet Tanggal ${dateText}`]
  }
];

/**
 * Memilih template berdasarkan nama kategori, nama item, dan keterangan.
 * Kategori yang dikecualikan (tiket, promo, fasilitas umum) akan mengembalikan null.
 */
export const resolveStsuTemplate = (catName = '', itemNames = [], notes = [], catId = '') => {
  const all = `${catName} ${itemNames.join(' ')} ${notes.join(' ')}`.toLowerCase();

  // 1. Transaksi Foto Satwa & Juru Foto selalu diprioritaskan utama
  if (isFotoSatwaText(all)) return STSU_TEMPLATES.find((t) => t.id === 'foto_satwa');
  if (isJuruFotoText(all)) return STSU_TEMPLATES.find((t) => t.id === 'juru_foto');

  // 2. Pengecekan tiket: seluruh tiket tidak dicetak
  if (isTicketCategory(catName) || isTicketCategory(all)) return null;

  // 3. Promo / Penjualan Produk: tidak dicetak di format dinas STSU
  if (/promo|penjualan produk/i.test(all) && !/banner|spanduk|umbul/i.test(all)) {
    return null;
  }

  // 4. Pemakaian Fasilitas TMR umum: tidak dicetak di format dinas STSU (hanya Foto Satwa dan Juru Foto)
  if (/fasilitas/i.test(catName) || catId === 'cat_1') {
    return null;
  }

  // 5. Cocokkan nama kategori langsung
  const catHit = STSU_TEMPLATES.find((t) => t.test(String(catName).toLowerCase()));
  if (catHit) return catHit;

  // 6. Cocokkan dari gabungan teks
  const anyHit = STSU_TEMPLATES.find((t) => t.test(all));
  return anyHit || null;
};
