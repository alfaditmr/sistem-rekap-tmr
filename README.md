# Sistem Rekapitulasi Pendapatan & Pelaporan STSU
**Unit Pengelola Taman Margasatwa Ragunan (UP TMR)**  
*Seksi Pelayanan dan Informasi — Pemerintah Provinsi DKI Jakarta*

Aplikasi web manajemen pendapatan daerah dan pelaporan **Surat Tanda Setor Uang (STSU)** terintegrasi dengan sinkronisasi *real-time* multi-PC berbasis partisi bulanan (*Monthly Sharding*), rekonsiliasi rekening koran Bank DKI, ruang transit otomasi Bot 3A & IWM bervalidasi tarif Perda DKI Jakarta, pencetakan dokumen STSU multi-format (Format Baru Pemasaran, Format Dinas berkop surat resmi, Format Standar, serta Continuous Form NCR Dot Matrix), dan ekspor laporan Excel resmi kedinasan.

---

## 🌟 Fitur Utama (Kondisi Sistem Saat Ini — `tmr_v19`)

1. **Real-Time Multi-PC Cloud Sharding:**
   - Arsitektur partisi bulanan (`tmr_bank_months` dan `tmr_report_months`) pada Google Firebase Firestore dengan deteksi perubahan *delta hash* (< 0,5 detik *debounce*) untuk performa instan dan hemat kuota Cloud.
   - Dilengkapi *Master Cold Storage* otomatis dan penyimpanan ganda ke `localStorage`.

2. **Pusat Cadangan & Pemulihan Database Offline (`.json`):**
   - Ekspor seluruh database (`allReports`, `bankRows`, `categories`, `signatures`, `targets`, `closedMonths`) ke dalam satu file `.json` standar `tmr_v19`.
   - Pemulihan (*restore*) cerdas dengan rekonsiliasi *orphan* otomatis dan penyelarasan penuh ke seluruh partisi Cloud.

3. **Tutup Buku Bulanan (*Period Locking*):**
   - Mengunci periode laporan bulanan (`YYYY-MM`) yang telah selesai diaudit agar berstatus *Read-Only* (termasuk mengunci input form harian, nomor urut STSU, dan tanggal tanda tangan).

4. **Input STSU Harian, Auto-Split/Merge & Standardisasi Kategori:**
   - Mendukung **STSU Utama (SU)** dan **STSU Lain-lain (SU/L)** dengan fitur *Auto-Split* (memisahkan multi-kategori ke lembar `lain_1`, `lain_2`, dst.) dan *Auto-Merge* (menggabungkan kategori yang sama di tanggal yang sama).
   - Standardisasi otomatis 21 sub-kategori *Pemakaian Fasilitas TMR* (`categoryHelper.js`) yang selaras dengan 23 pos baku laporan pemasaran.

5. **Rekon Bank DKI, Multi-Alokasi & Proteksi Bukti Transfer:**
   - Pencocokan (*pairing*) mutasi rekening koran Bank DKI ke pos laporan harian, mendukung gabungan beberapa mutasi dalam satu pos (*multi-allocation*) serta pelepasan parsial (*partial unmatch*) tanpa merusak sisa alokasi lainnya.
   - Proteksi tautan bukti transfer individual agar tidak tertimpa saat sinkronisasi.

6. **Ruang Transit Bot 3A & IWM + Validasi Tarif Resmi Perda (`transitValidation.js`):**
   - Penarikan data otomatis dari Bot 3A (Port 5000) dan Bot IWM (Port 5001) dengan *Smart Mapping AI*.
   - Pengecekan matematis otomatis terhadap tarif Perda DKI Jakarta (Tiket Dewasa/Anak, Rombongan Diskon 25%, Pusat Primata Schmutzer Hari Biasa/Weekend, Taman Satwa Anak, Kendaraan Gol I–III/Motor/Sepeda, dan Wahana) lengkap dengan indikator status validasi Hijau/Merah.

7. **Cetak STSU Multi-Format (`PrintPreviewTab.jsx`):**
   - **Format Baru Pemasaran (`FormatPemasaranReport.jsx`):** Lembar STSU Dasar Hasil Retribusi 23 nomor pos baku sesuai dokumen standar pemasaran.
   - **Format Dinas STSU Per Kategori (`FormatDinasStsuReport.jsx` & `stsuTemplates.js`):** Lembar STSU kedinasan A4 per kategori (Foto Satwa, Juru Foto, Retribusi Pedagang, E-Car, Listrik, Kerjasama Pihak Lain, Jasa Giro, Bank Sampah, Paket Wisata Edukasi) dengan kop surat resmi Pemprov DKI Jakarta (**Logo Jaya Raya** transparan di kiri & **Logo TMR** di kanan). Otomatis mengecualikan transaksi tiket gerbang dan pos fasilitas umum yang sudah masuk ke Format Pemasaran.
   - **Format Standar STSU (DRAFT):** Ringkasan gabungan seluruh pos aktif harian.
   - **Mode Cetak NCR Dot Matrix A5 (`DraggableElement.jsx`):** Pencetakan ke kertas rangkap 3 *continuous form* dengan posisi elemen yang dapat digeser bebas (*drag-and-drop*).

8. **Pusat Laporan & Ekspor Excel Resmi (`.xls`):**
   - Menyediakan 6 tabel laporan kedinasan: *Rekapitulasi 31 Hari*, *Rekap STSU Kas Daerah & Form STS*, *Laporan Pengunjung Fisik*, *Laporan E-Ticketing & Gate*, *Pemakaian Tempat & Rekap Promo*, serta *Rekonsiliasi Mitra*.

---

## 📖 Dokumentasi Teknis & Logika Sistem

Penjelasan lengkap mengenai arsitektur database, struktur skema JSON, aturan bisnis, daftar kode rekening, rumus validasi tarif, struktur direktori file, dan SOP operator harian tersedia pada dokumen:

👉 **[DOKUMENTASI_LOGIC_SISTEM.md](./DOKUMENTASI_LOGIC_SISTEM.md)**

---

## 🚀 Menjalankan & Mem-backup Aplikasi Secara Lokal

### Prasyarat
- **Node.js** (v18 atau lebih baru)
- **Git** (opsional, untuk sinkronisasi repositori)

### Langkah Menjalankan di Komputer Lokal
```bash
# 1. Masuk ke folder proyek
cd sistem-rekap-tmr

# 2. Pasang seluruh dependensi lokal
npm install

# 3. Jalankan server lokal (Development Mode)
npm run dev

# 4. Atau bangun versi produksi (Build) dan jalankan secara lokal
npm run build
npm run preview
```

Buka browser pada alamat yang ditampilkan di terminal (umumnya `http://localhost:5173` atau `http://localhost:4173`).
