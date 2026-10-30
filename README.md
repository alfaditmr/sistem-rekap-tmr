# Sistem Rekapitulasi Pendapatan & Pelaporan STSU
**Unit Pengelola Taman Margasatwa Ragunan (UP TMR)**
*Seksi Pelayanan dan Informasi — Dinas Pertamanan dan Hutan Kota Provinsi DKI Jakarta*

Aplikasi manajemen pendapatan daerah dan pelaporan Surat Tanda Setoran Uang (STSU) terintegrasi dengan sinkronisasi real-time multi-PC, pencocokan rekening koran Bank DKI, ruang transit otomasi Bot 3A & IWM, pencetakan Continuous Form NCR Dot Matrix, dan ekspor laporan Excel resmi kedinasan.

---

## 🌟 Fitur Utama

- **Real-Time Multi-PC Cloud Sharding:** Arsitektur partisi bulanan (`tmr_bank_months` dan `tmr_report_months`) pada Google Firebase Firestore dengan deteksi perubahan delta (< 0.5s debounce) untuk performa instan tanpa beban kuota.
- **Pusat Cadangan & Pemulihan (Disaster Recovery):** Unduh dan pulihkan seluruh database offline dalam format `.json` (`tmr_v19`) dengan rekonsiliasi orphan otomatis dan sinkronisasi menyeluruh ke Cloud.
- **Tutup Buku Bulanan (Period Locking):** Mengunci data transaksi bulanan agar berstatus permanen (Read-Only) dan terlindung dari perubahan tidak sengaja setelah buku kas ditutup oleh Bendahara.
- **Input STSU Harian & Auto-Split/Merge:** Mendukung input STSU Utama (karcis gerbang, parkir, wahana) dan STSU Lain-lain (sewa lahan, listrik, promosi pedagang) dengan pemisahan otomatis dokumen multi-kategori dan alokasi mutasi bank.
- **Rekon Bank DKI & Proteksi Bukti Transfer:** Parser rekening koran mutasi bank, pemasangan transaksi (*pairing*), tautan dokumen bukti setoran individual, dan pencegahan duplikasi bukti.
- **Ruang Transit Otomasi Bot 3A & IWM:** Penarikan data API otomatis dari Bot Pintu Gerbang (3A) dan Sistem Tiket Lama (IWM) dengan AI Smart Mapping untuk penempatan pos penerimaan yang presisi.
- **Cetak STSU Multi-Format:**
  - **Mode PDF A4:** Dokumen resmi STSU dan lembar Format Pemasaran Pemakaian Fasilitas (23 nomor pos standar).
  - **Mode Dot Matrix NCR A5:** Cetak continuous form ke printer pita (Epson LX-310/LQ-310) dengan fitur kalibrasi posisi teks geser bebas (*draggable*).
- **Pusat Laporan & Ekspor Excel:** Laporan Rekapitulasi 31 Hari Pendapatan Retribusi Daerah, Rekap STSU Kas Daerah, Laporan Pengunjung Fisik, E-Ticketing Gate, Pemakaian Tempat & Rekap Promo, serta Rekonsiliasi Mitra (E-Car & Foto Satwa).

---

## 📖 Dokumentasi Lengkap

Untuk pedoman teknis mendalam mengenai arsitektur, algoritma, rumus agregasi, alur data, dan SOP kedinasan, silakan baca:
👉 **[DOKUMENTASI_LOGIC_SISTEM.md](./DOKUMENTASI_LOGIC_SISTEM.md)**

---

## 🚀 Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Node.js (v18+)
- Koneksi Internet (untuk sinkronisasi Firebase Cloud)

### Langkah Instalasi
```bash
# 1. Masuk ke direktori proyek
cd sistem-rekap-tmr

# 2. Pasang dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev
```

Buka peramban pada alamat `http://localhost:5173`.