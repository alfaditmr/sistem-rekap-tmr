# DOKUMENTASI LENGKAP SISTEM & LOGIKA BISNIS
## Sistem Rekapitulasi Pendapatan & Pelaporan STSU
**UP Taman Margasatwa Ragunan — Seksi Pelayanan dan Informasi**
*Versi Arsitektur: tmr_v19 | Tanggal Pembaruan: Oktober 2026*

---

## DAFTAR ISI
1. [Ringkasan Eksekutif & Arsitektur Sistem](#1-ringkasan-eksekutif--arsitektur-sistem)
2. [Arsitektur Cloud Firestore Terpartisi Bulanan (Monthly Sharding)](#2-arsitektur-cloud-firestore-terpartisi-bulanan-monthly-sharding)
3. [Pusat Cadangan & Pemulihan Database (Backup & Disaster Recovery)](#3-pusat-cadangan--pemulihan-database-backup--disaster-recovery)
4. [Fitur Tutup Buku Bulanan (Period Locking & Immutability)](#4-fitur-tutup-buku-bulanan-period-locking--immutability)
5. [Logika Penanganan Dokumen STSU Lain-lain (Multi-Transaksi & Auto-Merge)](#5-logika-penanganan-dokumen-stsu-lain-lain-multi-transaksi--auto-merge)
6. [Rekonsiliasi Mutasi Bank DKI & Proteksi Bukti Transfer](#6-rekonsiliasi-mutasi-bank-dki--proteksi-bukti-transfer)
7. [Penarikan Data Bot Integrasi (3A & IWM) dan Smart Mapping AI](#7-penarikan-data-bot-integrasi-3a--iwm-dan-smart-mapping-ai)
8. [Pusat Laporan & Ekspor Excel Resmi Dinas](#8-pusat-laporan--ekspor-excel-resmi-dinas)
9. [Format Cetak Dokumen Resmi & Continuous Form NCR Dot Matrix](#9-format-cetak-dokumen-resmi--continuous-form-ncr-dot-matrix)
10. [Struktur File & Komponen Modular](#10-struktur-file--komponen-modular)
11. [SOP & Panduan Operasional Operator Harian](#11-sop--panduan-operasional-operator-harian)

---

## 1. Ringkasan Eksekutif & Arsitektur Sistem

Sistem Rekapitulasi TMR adalah aplikasi manajemen pendapatan daerah terintegrasi yang digunakan oleh Unit Pengelola Taman Margasatwa Ragunan (UP TMR) untuk merekapitulasi, memvalidasi, mencetak dokumen Surat Tanda Setoran Uang (STSU), mencocokkan rekening koran Bank DKI, dan menyajikan laporan eksekutif pendapatan daerah secara real-time.

### Stack Teknologi
- **Frontend Core:** React 19, Vite, Tailwind CSS.
- **Database & Sync:** Google Firebase Cloud Firestore (arsitektur sharding partisi bulanan real-time).
- **Offline Cache:** LocalStorage dual-persistence dengan sinkronisasi debounce & delta hash.
- **Dokumen & Cetak:** html2pdf.js, custom dot-matrix continuous form A5 drag-and-drop printer, Excel XML/HTML native exporter.
- **AI Automation:** Integrasi Google Gemini API untuk perapian uraian/keterangan dinamis dokumen keuangan secara otomatis.

---

## 2. Arsitektur Cloud Firestore Terpartisi Bulanan (Monthly Sharding)

### 2.1 Latar Belakang & Masalah
Pada sistem dokumen tunggal (*monolithic doc*), ukuran dokumen database tumbuh melampaui 900 KB. Hal ini menyebabkan:
1. Sinkronisasi multi-PC menjadi lambat (20–30 detik).
2. Kuota bandwidth Firebase cepat membengkak.
3. Risiko *timeout* pada koneksi internet seluler atau jaringan kantor saat jam sibuk.

### 2.2 Solusi: Monthly Sharding & Delta Sync Engine
Sistem dirombak dengan arsitektur partisi bulanan (*monthly sharding*):
- **Koleksi `tmr_bank_months`:** Dokumen per bulan (contoh: `2026-09`, `2026-10`) yang hanya menyimpan transaksi rekening koran mutasi bank pada bulan tersebut (~10–25 KB).
- **Koleksi `tmr_report_months`:** Dokumen per bulan yang menyimpan rekapitulasi form laporan STSU harian pada bulan tersebut (~15–30 KB).
- **Dokumen `tmr_data/master_config`:** Menyimpan konfigurasi master (pejabat penandatangan, database kategori, target anggaran, dan status tutup buku bulanan).
- **Cold Storage Master (`tmr_rekapitulasi_pusat`):** Dokumen cadangan komprehensif yang diperbarui otomatis di latar belakang saat sistem dalam kondisi *idle* (jeda 60 detik).

### 2.3 Mekanisme Delta Detection
Sistem menyimpan hash stringifikasi per bulan di memori (`previousBankMonthsRef`, `previousReportMonthsRef`). Saat pengguna menginput atau mengubah data:
1. State lokal dan React diperbarui instan (0 ms).
2. Debounce Cloud Push berjalan 500 ms (0.5 detik).
3. Hanya partisi bulan yang hash-nya berubah yang dikirim ke Firestore.
4. Partisi bulan lain yang tidak berubah **tidak pernah dikirim ulang**, menghemat 95% bandwidth dan menjamin waktu sinkronisasi `< 250 ms`.

```
[User Input] 
     │ (0ms)
     ▼
[React State & LocalStorage Cache]
     │ (Debounce 500ms)
     ▼
[Delta Hash Checker] ────────► Bandingkan dengan previousHash
     │
     ├── Jika Berubah: Tulis ke `tmr_report_months/{YYYY-MM}` (< 20 KB)
     └── Jika Idle 60s: Cadangkan ke `tmr_rekapitulasi_pusat` (Cold Storage)
```

---

## 3. Pusat Cadangan & Pemulihan Database (Backup & Disaster Recovery)

Fitur **Pusat Cadangan** (*Master Menu Admin > Pusat Cadangan*) menyediakan mekanisme proteksi data mutlak (*Zero Data Loss Guarantee*).

### 3.1 Skema Berkas Cadangan (.JSON)
Format cadangan menggunakan standar versi `tmr_v19`:
```json
{
  "app": "Sistem Rekap STSU - TMR Ragunan",
  "version": "tmr_v19",
  "exportedAt": "2026-10-26T03:50:00.000Z",
  "exportedAtLocal": "26 Oktober 2026, 10:50 WIB",
  "metadata": {
    "totalReports": 31,
    "totalBankRows": 154,
    "totalCategories": 6,
    "hasSignatures": true,
    "closedMonthsCount": 2,
    "closedMonthsList": ["2026-08", "2026-09"],
    "totalRevenue": 8745230000,
    "totalBankCredit": 8745230000,
    "dateRange": { "earliest": "2026-01-01", "latest": "2026-10-26" },
    "months": ["2026-10", "2026-09", "2026-08"],
    "apiIpAddress": "localhost"
  },
  "data": {
    "allReports": { ... },
    "bankRows": [ ... ],
    "signatures": { ... },
    "categories": [ ... ],
    "targets": { ... },
    "closedMonths": { ... },
    "apiIpAddress": "localhost"
  }
}
```

### 3.2 Alur Pemulihan (*Restore Engine*)
Saat operator memilih file `.json`:
1. **Validasi Skema:** Memeriksa keberadaan node `allReports`, `bankRows`, atau `categories`.
2. **Sanitasi ID Mutasi:** Menjalankan `ensureBankRowIds(bankRows)` agar setiap transaksi mutasi bank memiliki ID deterministik yang stabil.
3. **Rekonsiliasi Orphan:** Menjalankan `reconcileOrphanBankItems` untuk menyelaraskan alokasi mutasi bank dengan item dokumen STSU.
4. **Pembersihan Delta Hash:** Mengosongkan `previousBankMonthsRef` dan `previousReportMonthsRef`.
5. **Force Partition Cloud Push:** Mengirimkan seluruh partisi bulanan ke koleksi Firestore dengan opsi `forceAllPartitions: true` sehingga seluruh shard di Cloud 100% identik dengan berkas cadangan.
6. **Master Cold Storage Update:** Memanggil `scheduleMasterColdBackup(0)` seketika.
7. **Pencatatan Riwayat:** Menyimpan waktu dan nama file restore ke `tmr_v19_lastRestoreInfo`.

### 3.3 SOP Ketahanan Data (3-2-1 Rule)
- Cadangan diunduh minimal **1 kali per minggu** atau sesaat setelah **Tutup Buku Bulanan**.
- Simpan file `.json` di minimal 2 tempat: Harddisk komputer kantor dan Flashdisk fisik Bendahara / Google Drive dinas.
- Berkas cadangan hanya berisi angka transaksi, nama pihak, dan tanggal resmi tanpa kata sandi atau data kredensial login.

---

## 4. Fitur Tutup Buku Bulanan (Period Locking & Immutability)

Fitur **Tutup Buku Bulanan** dirancang untuk melindungi integritas laporan keuangan yang telah diaudit atau disahkan dari perubahan yang tidak disengaja.

### 4.1 Logika & Aturan Bisnis
1. **Identifikasi Periode:** Setiap tanggal transaksi dipetakan ke bulan `YYYY-MM`.
2. **Penyimpanan Status Kunci:** Disimpan pada node `closedMonths`:
   ```javascript
   closedMonths: {
     "2026-09": {
       closedAt: "30 Sep 2026, 17:00",
       closedBy: "Evi Irmawati",
       note: "Tutup buku resmi September 2026 - Rekon Beres"
     }
   }
   ```
3. **Efek Penguncian:**
   - Pada form **Input Harian STSU**, form otomatis beralih ke mode **Read-Only**.
   - Input nominal, pemilihan kategori, penambahan susulan, tombol hapus, dan reset dinonaktifkan.
   - Muncul banner peringatan berwarna ungu/indigo: *"Periode Ini Telah Ditutup Buku Resmi"*.
4. **Alur Buka Kunci (Revisi):**
   - Hanya dapat dibuka melalui menu *Master Menu > Tutup Buku Bulanan* dengan tombol *"Buka Kunci (Revisi)"*.
   - Tindakan ini dicatat dan memerlukan konfirmasi sadar dari operator.

---

## 5. Logika Penanganan Dokumen STSU Lain-lain (Multi-Transaksi & Auto-Merge)

Dokumen STSU Lain-lain (`lain_1`, `lain_2`, dst.) menangani penerimaan retribusi non-karcis pintu (sewa fasilitas, listrik, sewa lahan booth, promosi pedagang, dll.).

### 5.1 Auto-Split (Pemisahan Multi-Kategori)
Jika operator memasukkan lebih dari satu kategori berbeda pada satu tanggal (misalnya *E-Car* dan *Listrik*):
- Kategori pertama ditempatkan di `lain_1`.
- Kategori kedua secara otomatis dipisahkan ke `lain_2`.
- Kategori ketiga ke `lain_3`, dan seterusnya.
- Hal ini menjamin resi NCR dan format cetak STSU Lain-lain hanya menampilkan 1 kategori utama per lembar dokumen resmi.

### 5.2 Auto-Merge (Penggabungan Kategori Sama)
Jika di tanggal yang sama terdapat dokumen `lain_1` dan `lain_2` yang memiliki kategori identik (misalnya sama-sama *Pemakaian Fasilitas Listrik*):
- Sistem secara otomatis menggabungkan kedua dokumen ke `lain_1`.
- Seluruh mutasi pendukung (`bankAllocations`) digabungkan ke item tujuan tanpa menduplikasi data.
- Total nominal dihitung ulang secara otomatis (`sum(bankAllocations.amount)`).

### 5.3 Struktur Alokasi Mutasi Bank (`bankAllocations`)
Setiap item transaksi pada dokumen STSU menyimpan array mutasi pendukungnya:
```javascript
bankAllocations: [
  {
    bankRowId: "bank_892341_12",
    bankDate: "Sep 28, 2026 14:22:01",
    amount: 1500000,
    desc: "PT ABC - Sewa Booth Kuliner",
    tenant: "PT ABC",
    location: "Plaza Barat",
    proofUrl: "https://drive.google.com/..."
  }
]
```

---

## 6. Rekonsiliasi Mutasi Bank DKI & Proteksi Bukti Transfer

### 6.1 Parser Rekening Koran
Sistem membaca mutasi rekening koran Bank DKI format CSV/teks:
- Tanggal transaksi (format DD/MM/YYYY atau timestamp ISO).
- Keterangan mutasi (nama penyetor, nomor referensi, berita transfer).
- Nominal kredit (penerimaan dana masuk).

### 6.2 Proteksi Bukti Transfer Individual
Setiap baris mutasi bank memiliki properti `proofUrl`:
1. **Tidak Boleh Tertimpa:** Saat data mutasi disinkronkan atau dilakukan penarikan ulang, URL bukti transfer individual yang telah diunggah operator dilindungi dan dipertahankan.
2. **Pencegahan Duplikasi di Dropdown:** Bukti mutasi yang sudah berstatus `matched` atau `linked` disaring dari modal validasi agar tidak dapat dipilih dua kali untuk pos berbeda.
3. **Penyimpanan Aman:** Mendukung URL cloud storage eksternal (Google Drive, Cloud Storage, dsb.).

---

## 7. Penarikan Data Bot Integrasi (3A & IWM) dan Smart Mapping AI

Aplikasi terhubung ke robot otomasi lokal/jaringan untuk menarik rekap transaksi harian:
- **Bot 3A (Port 5000):** Menarik transaksi *GATE* (Pintu Masuk), *MERCHANT_PAGE* (Online), dan *TVM* (Vending Machine).
- **Bot IWM (Port 5001):** Menarik transaksi Old Gate, wahana satwa, primata schmutzer, dan rombongan diskon.

### 7.1 Kamus Data STSU 3A (`stsuNames3A`)
| ID | Pos STSU |
|---|---|
| `1` | Tiket Masuk Dewasa |
| `2` | Tiket Masuk Anak |
| `3`, `4` | Rombongan Dewasa / Anak Reduksi 25% |
| `8`, `8_2` | Taman Satwa Anak (TSA) |
| `9`, `10` | Pusat Primata Hari Biasa Dewasa / Anak |
| `13`, `14` | Pusat Primata Weekend / Hari Libur Dewasa / Anak |
| `17`–`21` | Kendaraan (Gol 1, Gol 2, Gol 3/Mobil, Motor, Sepeda) |

### 7.2 Logika Deduplikasi Rombongan IWM
Untuk mencegah duplikasi nominal (*double counting*), nilai pengunjung rombongan dengan potongan harga khusus secara otomatis dipotong dari total bruto area lainnya:
```javascript
const netDewasa = Math.max(0, (al.dewasa || 0) - deductAlDewasa);
const netAnak = Math.max(0, (al.anak || 0) - deductAlAnak);
```

### 7.3 Smart Mapping AI
Algoritma `smartMappingAI` memetakan nama mentah dari API bot ke kategori target dan sub-kategori menggunakan sistem pembobotan (*scoring matrix*):
- Pencocokan kalender (Sabtu/Minggu/Hari Libur Nasional) otomatis memberikan penalti `-100` jika terjadi silang antara weekday dan weekend pada Pusat Primata.
- Sub-kategori dengan bobot skor tertinggi dipilih secara otomatis sebelum operator mengonfirmasi impor di Ruang Transit.

---

## 8. Pusat Laporan & Ekspor Excel Resmi Dinas

Menu **Pusat Laporan** (`RekapExcelTab`) menyediakan 5 kategori laporan berstandar kedinasan:

### 8.1 Rekapitulasi 31 Hari (Pendapatan Retribusi Daerah)
- Matriks horizontal tanggal 1 sampai 31 dengan subtotal mingguan dan grand total bulanan.
- Menampilkan seluruh pos retribusi daerah secara komprehensif.
- Fitur tooltip detail transaksi per hari dan fungsi download `.xls` berformat tabel resmi.

### 8.2 Rekap STSU Kas Daerah & Formulir STS
- Agregasi dokumen STSU harian yang siap dilaporkan ke BPKD / Kas Daerah.
- Dilengkapi kolom Nomor STSU, Tanggal Pelimpahan, Rekening Kas Daerah, dan Nama Penyetor.

### 8.3 Laporan Pengunjung (TMR, PPS Schmutzer, TSA)
- Laporan jumlah pengunjung fisik berdasarkan kategori dewasa, anak, dan rombongan.
- Menyajikan perbandingan data kunjungan hari kerja vs akhir pekan.

### 8.4 Laporan E-Ticketing & Gate
- Rekapitulasi Old Gate, New Gate, Ticket Vending Machine (TVM), dan Tiket Online.

### 8.5 Laporan Pemakaian Tempat & Rekap Promo
- Rekapitulasi pendapatan sewa tempat, panggung promosi, sewa lahan booth, dan penempatan banner.

### 8.6 Rekonsiliasi Mitra (E-Car, Foto Satwa, dll.)
- Laporan pencocokan pendapatan harian dengan tanggal pelimpahan dan petugas rekon dinas.

---

## 9. Format Cetak Dokumen Resmi & Continuous Form NCR Dot Matrix

Menu **Cetak STSU** (`PrintPreviewTab`) mendukung dua metode cetak dokumen:

### 9.1 Mode PDF A4 Standar
- Format dokumen resmi Surat Tanda Setoran Uang berukuran A4.
- Dilengkapi tanda tangan formal Penyetor (Kepala Seksi Pelayanan dan Informasi) dan Penerima (Bendahara Penerimaan).
- **Format Pemasaran (Pemakaian Fasilitas & Pemanfaatan Aset):** Sesuai spesifikasi naskah dinas resmi `format-new-pemasaran (1).docx` dengan 23 nomor pos standar:
  - **4.1.02 Pendapatan Retribusi Daerah :**
    - **`4.1.02.02.12.00001` Retribusi Penyediaan Tempat Kegiatan Usaha Berupa Pasar Grosir, Pertokoan dan Tempat Kegiatan Usaha Lainnya:**
      - No 1: Pedagang Hari Selasa-Sabtu
      - No 2: Pedagang Hari Minggu/Libur Nasional
      - No 3: Pemakaian Lokasi/Tempat Untuk Promo/Penjualan Produk
    - **`4.1.02.02.20.00001` Retribusi Pemanfaatan Aset Daerah:**
      - No 4: Film Cerita
      - No 5: Film Iklan
      - No 6: Film Dokumentasi/Dokumenter
      - No 7: Film Keluarga
      - No 8: Program Televisi
      - No 9: Video Clip
      - No 10: Pre-Wedding/Sejenisnya
      - No 11: Pemakaian Lokasi/Tempat Lahan Terbuka
      - No 12: Penempatan Spanduk Promosi
      - No 13: Penempatan Banner/Umbul Promosi
      - No 14: Fasilitas Panggung
      - No 15: Fasilitas Gedung Informasi
      - No 16: Fasilitas Gedung Auditorium
      - No 17: Pemakaian Sound System
      - No 18: Pemakaian Wireles
      - No 19: Pelayanan Pengambilan Foto
      - No 20: Penyediaan Satwa Jinak untuk Berfoto
      - No 21: Pemutaran Film Satwa (di Luar jadwal pemutaran)
      - No 22: Pelayanan Pemandu Wisata Berbahasa Indonesia
      - No 23: Pelayanan Pemandu Wisata Berbahasa Inggris
  - Tata letak diatur presisi dengan pembatas garis putus-putus (*dashed line*) dan proporsi pas 1 lembar A4.

### 9.2 Mode Dot Matrix Continuous Form A5 NCR
- Didesain khusus untuk printer dot matrix pita (Epson LX-310 / LQ-310).
- Menggunakan kertas rangkap continuous form ukuran A5 portrait / letter.
- **Fitur Draggable Element (`DraggableElement`):** Setiap kotak teks, nomor STSU, nominal, terbilang, dan tanda tangan dapat digeser posisinya secara interaktif dengan mouse untuk kalibrasi presisi pada form fisik NCR yang telah dicetak dari percetakan.
- Posisi kalibrasi koordinat tersimpan otomatis di browser operator.

---

## 10. Struktur File & Komponen Modular

Proyek telah dipecah menjadi modul-modul terfokus demi pemeliharaan jangka panjang:

```
sistem-rekap-tmr/
├── src/
│   ├── App.jsx                           # Komponen orkestrator utama, routing, & cloud sync
│   ├── RekonBankTab.jsx                  # Modul rekonsiliasi rekening koran Bank DKI
│   ├── TargetManager.jsx                 # Manajemen target anggaran tahunan & bulanan
│   ├── components/
│   │   ├── calendar/
│   │   │   └── KalenderTab.jsx           # Kalender status harian STSU & badge indikator
│   │   ├── dashboard/
│   │   │   ├── RekapExcelTab.jsx         # Pusat Laporan & ekspor rekapitulasi Excel
│   │   │   └── reports/
│   │   │       ├── FasilitasPromoTable.jsx
│   │   │       ├── PengunjungReportTable.jsx
│   │   │       ├── StsuKasDaerahTable.jsx
│   │   │       └── TicketingReportTable.jsx
│   │   ├── input/
│   │   │   └── InputHarianTab.jsx        # Form input transaksi STSU Utama & Lain-lain
│   │   ├── modals/
│   │   │   └── ActionModals.jsx          # Modal konfirmasi umum, edit uraian AI, & reset
│   │   ├── print/
│   │   │   ├── DraggableElement.jsx      # Elemen drag-and-drop continuous form NCR
│   │   │   ├── FormatPemasaranReport.jsx # Lembar cetak pemakaian fasilitas No. 1-23
│   │   │   └── PrintPreviewTab.jsx       # Pratinjau PDF & dot matrix continuous form
│   │   ├── settings/
│   │   │   └── MasterSettingsTab.jsx     # Master kategori, pejabat TTD, tutup buku, & pusat cadangan
│   │   └── transit/
│   │       └── TransitModal.jsx          # Ruang transit review & checklist bot API
│   ├── services/
│   │   ├── firebase.js                   # Inisialisasi Firebase Cloud Firestore & Auth
│   │   └── transitBotService.js          # Service bot 3A & IWM serta Smart Mapping AI
│   └── utils/
│       ├── formatters.js                 # Helper formatRp, terbilang, tanggal, & hash
│       ├── reportDataHelper.js           # Agregator data laporan bulanan
│       └── reportExcelExporter.js        # Generator berkas Excel resmi dinas
├── DOKUMENTASI_LOGIC_SISTEM.md           # Pedoman logika & arsitektur sistem (dokumen ini)
└── package.json
```

---

## 11. SOP & Panduan Operasional Operator Harian

1. **Awal Hari (Pukul 08.00–10.00):**
   - Masuk ke aplikasi menggunakan akun operator resmi.
   - Periksa status koneksi di pojok kanan atas (*Cloud Sharding Aktif*).
   - Masuk ke menu *Input Harian*, pilih tanggal hari sebelumnya jika merekap transaksi kemarin.
2. **Penarikan Data Tiket Otomatis:**
   - Klik tombol *Tarik 3A* di form STSU Utama.
   - Review data di Ruang Transit, pastikan pemetaan kategori telah sesuai, lalu klik *Import ke Form*.
   - Klik tombol *Tarik IWM*, pilih opsi *Gabungkan* untuk melengkapi data rombongan dan gerbang lama.
3. **Pencocokan Rekening Koran (Rekon Bank):**
   - Masuk ke tab *Rekon Bank DKI*.
   - Upload mutasi bank atau tempel rekening koran harian.
   - Cocokkan transaksi dengan grup kategori STSU (*Pairing*).
   - Tautkan bukti transfer jika ada penyetoran khusus non-tunai.
4. **Cetak Resi & Dokumen Resmi:**
   - Masuk ke tab *Cetak STSU*.
   - Pilih mode *PDF* untuk arsip digital dan laporan pimpinan.
   - Pilih mode *Continuous Form Dot Matrix* untuk mencetak resi fisik NCR bagi penyetor.
5. **Akhir Bulan (Tutup Buku & Cadangan):**
   - Masuk ke tab *Laporan Excel*, verifikasi Rekapitulasi 31 Hari dan Rekap STSU Kas Daerah.
   - Buka *Master Menu Admin > Tutup Buku Bulanan*, klik *Tutup Buku Bulan Ini* agar data terkunci permanen.
   - Buka *Master Menu Admin > Pusat Cadangan*, klik *Download Backup Sekarang*, dan simpan berkas `.json` ke flashdisk dinas bendahara.
