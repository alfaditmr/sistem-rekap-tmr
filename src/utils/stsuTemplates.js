/**
 * stsuTemplates.js
 * Template cetak STSU format dinas (folder "format cetak"):
 *  - STSU Foto Satwa.xls            -> Retribusi Pemanfaatan Aset Daerah (Satwa Jinak untuk Berfoto)
 *  - STSU-PLL E-Car.xls             -> Pendapatan BLUD dari Pengembangan Usaha (E-Car)
 *  - STSU-PLL Kerjasama Dll.xls     -> Jasa Giro / Hasil Kerjasama dengan Pihak Lain
 *  - STSU-PLL Listrik.xls           -> Rekening Listrik
 *  - STSU-PLL Pedagang dan Foto.xls -> Retribusi Pedagang (Autodebet) & Juru Foto
 *  - STSU-PLL Virtual .xls          -> Bank Sampah & Paket Wisata Edukasi
 *
 * Modul ini murni presentasi: tidak mengubah data/logic yang sudah ada.
 */

const PEMANFAATAN_ASET_TITLE = ['RETRIBUSI PEMANFAATAN ASET DAERAH'];
const PENGEMBANGAN_USAHA_TITLE = ['PENDAPATAN BLUD DARI PENGEMBANGAN USAHA'];

const clean = (s = '') => String(s).replace(/\s*\n+\s*/g, ' ').trim();

const joinNote = (items) =>
  items.map((i) => clean(i.note)).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

/**
 * Daftar template. Urutan penting: yang paling spesifik lebih dulu.
 * `test` menerima teks gabungan (nama kategori + nama item + catatan) huruf kecil.
 */
export const STSU_TEMPLATES = [
  {
    id: 'foto_satwa',
    label: 'STSU Foto Satwa',
    test: (t) => /satwa jinak|foto satwa|berfoto/.test(t),
    title: PEMANFAATAN_ASET_TITLE,
    kode: '4.1.02.02.020.00001',
    heading: ['PEMAKAIAN FASILITAS', 'TAMAN MARGASATWA RAGUNAN'],
    rows: ({ subtotal, dateText }) => [
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
          lines: ['Hasil pendapatan Jagir dari Rekening', note || 'Kas Bulan ........................'],
          amount: subtotal
        }
      ];
    },
    footerLines: () => []
  },
  {
    id: 'kerjasama',
    label: 'STSU Kerjasama Pihak Lain',
    test: (t) => /kerja ?sama|sewa|pakarindo|laseko|koprimas|dorit|indomaret|minimarket/.test(t),
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
          lines: ['Hasil Pendapatan penjualan sampah', 'Anorganik Bank Sampah Tamara', note || 'UP TMR periode Bulan ..............'],
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
    footerLines: ({ itemDateText }) => (itemDateText ? [`tanggal ${itemDateText}`] : [])
  },
  {
    id: 'juru_foto',
    label: 'STSU Juru Foto',
    test: (t) => /juru foto|jurufoto|pelayanan pengambilan foto|pengambilan foto/.test(t),
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
  },
  {
    id: 'promo',
    label: 'STSU Promo / Penjualan Produk',
    test: (t) => /promo|penjualan produk/.test(t) && !/banner|spanduk|umbul/.test(t),
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
    footerLines: ({ dateText }) => [`Tanggal ${dateText}`]
  },
  {
    id: 'fasilitas',
    label: 'STSU Pemakaian Fasilitas TMR',
    test: (t) => /fasilitas/.test(t),
    title: PEMANFAATAN_ASET_TITLE,
    kode: '4.1.02.02.020.00001',
    heading: ['PEMAKAIAN FASILITAS', 'TAMAN MARGASATWA RAGUNAN', 'Hasil Pendapatan Retribusi'],
    rows: ({ items }) =>
      items.map((i) => ({
        lines: [clean(i.name) + (i.note ? ` (${clean(i.note)})` : '')],
        amount: i.amount
      })),
    footerLines: ({ dateText }) => [`Tanggal ${dateText}`]
  }
];

/** Template cadangan untuk kategori lain yang belum punya format khusus */
export const GENERIC_STSU_TEMPLATE = {
  id: 'generic',
  label: 'STSU Pendapatan Lain',
  title: PENGEMBANGAN_USAHA_TITLE,
  kode: '4.1.04.16.006.00006',
  heading: ['PENDAPATAN BLUD DARI', 'PENGEMBANGAN USAHA :'],
  rows: ({ items, subtotal, catName }) => {
    const note = joinNote(items);
    return [
      {
        lines: [`Hasil Pendapatan ${clean(catName)}`, ...(note ? [note] : [])],
        amount: subtotal
      }
    ];
  },
  footerLines: ({ dateText }) => [`Tanggal ${dateText}`]
};

/**
 * Memilih template berdasarkan nama kategori, nama item, dan keterangan.
 * Kategori didahulukan agar item bernama umum tidak salah template.
 */
export const resolveStsuTemplate = (catName = '', itemNames = [], notes = []) => {
  const byCat = String(catName).toLowerCase();
  const all = `${catName} ${itemNames.join(' ')} ${notes.join(' ')}`.toLowerCase();

  // Kategori yang sama persis tidak ambigu: cocokkan nama kategori dulu
  const catHit = STSU_TEMPLATES.find((t) => t.id !== 'fasilitas' && t.id !== 'promo' && t.test(byCat));
  if (catHit) return catHit;

  if (/fasilitas/.test(byCat)) {
    // Pemakaian Fasilitas TMR: promo penjualan produk masuk Pos 4.1.02.02.012
    const onlyPromo =
      itemNames.length > 0 &&
      itemNames.every((n) => /promo|penjualan produk/i.test(n) && !/banner|spanduk|umbul/i.test(n));
    return STSU_TEMPLATES.find((t) => t.id === (onlyPromo ? 'promo' : 'fasilitas'));
  }

  const anyHit = STSU_TEMPLATES.find((t) => t.test(all));
  return anyHit || GENERIC_STSU_TEMPLATE;
};
