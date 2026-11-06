/**
 * categoryHelper.js
 * Modul standardisasi sub-kategori Pemakaian Fasilitas TMR
 * Menyelaraskan seluruh pos retribusi fasilitas sesuai Surat Tanda Setor Uang (STSU)
 * format resmi Pemasaran & Pemanfaatan Aset Daerah (23 Nomor Pos Baku).
 */

export const STANDARD_FACILITY_ITEMS = [
  { id: 'item_1a', name: 'Promo Penjualan Produk' },
  { id: 'item_1_film_cerita', name: 'Film Cerita' },
  { id: 'item_1_film_iklan', name: 'Film Iklan' },
  { id: 'item_1_film_dok', name: 'Film Dokumentasi/Dokumenter' },
  { id: 'item_1_film_kel', name: 'Film Keluarga' },
  { id: 'item_1_program_tv', name: 'Program Televisi' },
  { id: 'item_1_video_clip', name: 'Video Clip' },
  { id: 'item_1_prewedding', name: 'Pre-Wedding' },
  { id: 'item_1_lahan', name: 'Pemakaian Tempat Lahan terbuka' },
  { id: 'item_1_spanduk', name: 'Penempatan Spanduk Promosi' },
  { id: 'item_1b', name: 'Penempatan Banner Promosi' },
  { id: 'item_1c', name: 'Fasilitas Panggung' },
  { id: 'item_1_gedung_info', name: 'Fasilitas Gedung Informasi' },
  { id: 'item_1_auditorium', name: 'Fasilitas Gedung Auditorium' },
  { id: 'item_1_sound', name: 'Pemakaian Sound System' },
  { id: 'item_1_wireles', name: 'Pemakaian Wireles' },
  { id: 'item_1_ambil_foto', name: 'Pelayanan Pengambilan Foto' },
  { id: 'item_1_satwa_foto', name: 'Penyediaan Satwa Jinak untuk Berfoto' },
  { id: 'item_1_film_satwa', name: 'Pemutaran Film Satwa' },
  { id: 'item_1_guide_indo', name: 'Pemandu Wisata Berbahasa Indonesia' },
  { id: 'item_1_guide_inggris', name: 'Pemandu Wisata Berbahasa Inggris' }
];

/**
 * Memastikan kategori 'Pemakaian Fasilitas TMR' (cat_1) selalu memiliki
 * daftar sub-kategori lengkap sesuai naskah dinas STSU Retribusi (Gambar 2).
 * TIDAK menghapus item kustom yang sudah ada dan mempertahankan ID yang telah berjalan.
 */
export function ensureStandardFacilityCategories(categoriesList) {
  if (!Array.isArray(categoriesList) || categoriesList.length === 0) {
    return categoriesList;
  }

  // Cari kategori Pemakaian Fasilitas
  const catIdx = categoriesList.findIndex(
    c => c && (c.id === 'cat_1' || /fasilitas/i.test(c.name || ''))
  );
  if (catIdx === -1) return categoriesList;

  const currentCat = categoriesList[catIdx];
  const existingItems = Array.isArray(currentCat.items) ? [...currentCat.items] : [];

  // Helper normalisasi untuk pencocokan string nama item
  const normalize = (str = '') => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

  let modified = false;
  const newItems = [...existingItems];

  STANDARD_FACILITY_ITEMS.forEach(stdItem => {
    const stdNorm = normalize(stdItem.name);

    // Cek apakah item sudah ada berdasarkan ID, nama identik, atau pola alias
    const exists = existingItems.some(ex => {
      if (String(ex.id) === String(stdItem.id)) return true;
      const exNorm = normalize(ex.name || '');
      if (exNorm === stdNorm) return true;

      // Pencocokan fleksibel alias variasi penulisan nama
      if (stdNorm.includes('promo') && exNorm.includes('promo')) return true;
      if (stdNorm.includes('banner') && exNorm.includes('banner')) return true;
      if (stdNorm.includes('panggung') && exNorm.includes('panggung')) return true;
      if (stdNorm.includes('lahan') && exNorm.includes('lahan')) return true;
      if (stdNorm.includes('prewedding') && (exNorm.includes('prewed') || exNorm.includes('prewedding'))) return true;
      if (stdNorm.includes('wireles') && (exNorm.includes('wireles') || exNorm.includes('wireless'))) return true;
      if (stdNorm.includes('filmcerita') && exNorm.includes('filmcerita')) return true;
      if (stdNorm.includes('filmiklan') && exNorm.includes('filmiklan')) return true;
      if (stdNorm.includes('filmdok') && (exNorm.includes('dokumenter') || exNorm.includes('dokumentasi'))) return true;
      if (stdNorm.includes('filmkeluarga') && exNorm.includes('filmkeluarga')) return true;
      if (stdNorm.includes('programtv') && (exNorm.includes('programtv') || exNorm.includes('programtelevisi') || exNorm.includes('televisi'))) return true;
      if (stdNorm.includes('videoclip') && (exNorm.includes('videoclip') || exNorm.includes('videoklip'))) return true;
      if (stdNorm.includes('spanduk') && exNorm.includes('spanduk')) return true;
      if (stdNorm.includes('gedunginformasi') && exNorm.includes('gedunginformasi')) return true;
      if (stdNorm.includes('auditorium') && exNorm.includes('auditorium')) return true;
      if (stdNorm.includes('soundsystem') && exNorm.includes('soundsystem')) return true;
      if (stdNorm.includes('satwajinak') && exNorm.includes('satwajinak')) return true;
      if (stdNorm.includes('filmsatwa') && exNorm.includes('filmsatwa')) return true;
      if (stdNorm.includes('guideindo') && (exNorm.includes('pemandu') && exNorm.includes('indo'))) return true;
      if (stdNorm.includes('guideinggris') && (exNorm.includes('pemandu') && (exNorm.includes('inggris') || exNorm.includes('eng')))) return true;
      if (stdNorm.includes('ambilfoto') && (exNorm.includes('pengambilanfoto') || exNorm.includes('ambilfoto'))) return true;
      return false;
    });

    if (!exists) {
      newItems.push({ ...stdItem });
      modified = true;
    }
  });

  const targetName = currentCat.name && currentCat.name.toLowerCase().includes('tmr')
    ? currentCat.name
    : 'Pemakaian Fasilitas TMR';

  if (!modified && currentCat.name === targetName) {
    return categoriesList;
  }

  const updatedCat = {
    ...currentCat,
    name: targetName,
    items: newItems
  };

  const updatedCategories = [...categoriesList];
  updatedCategories[catIdx] = updatedCat;
  return updatedCategories;
}

