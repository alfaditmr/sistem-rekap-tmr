# DOKUMENTASI LENGKAP SISTEM & LOGIKA BISNIS
## Sistem Rekapitulasi Pendapatan & Pelaporan STSU
**UP Taman Margasatwa Ragunan — Seksi Pelayanan dan Informasi**
*Versi Arsitektur: tmr_v19 | Tanggal Pembaruan: November 2026*

---

## DAFTAR ISI
1. [Ringkasan Eksekutif & Arsitektur Sistem](#1-ringkasan-eksekutif--arsitektur-sistem)
2. [Arsitektur Cloud Firestore Terpartisi Bulanan (Monthly Sharding)](#2-arsitektur-cloud-firestore-terpartisi-bulanan-monthly-sharding)
3. [Pusat Cadangan, Pemulihan Database & Ketahanan Lokal (Disaster Recovery)](#3-pusat-cadangan-pemulihan-database--ketahanan-lokal-disaster-recovery)
4. [Fitur Tutup Buku Bulanan (Period Locking & Immutability)](#4-fitur-tutup-buku-bulanan-period-locking--immutability)
5. [Logika Penanganan Dokumen STSU Lain-lain (Multi-Transaksi, Auto-Split & Auto-Merge)](#5-logika-penanganan-dokumen-stsu-lain-lain-multi-transaksi-auto-split--auto-merge)
6. [Rekonsiliasi Mutasi Bank DKI, Multi-Alokasi & Proteksi Bukti Transfer](#6-rekonsiliasi-mutasi-bank-dki-multi-alokasi--proteksi-bukti-transfer)
7. [Penarikan Data Bot Integrasi (3A & IWM), Smart Mapping AI & Validasi Tarif Perda](#7-penarikan-data-bot-integrasi-3a--iwm-smart-mapping-ai--validasi-tarif-perda)
8. [Pusat Laporan & Ekspor Excel Resmi Dinas](#8-pusat-laporan--ekspor-excel-resmi-dinas)
9. [Format Cetak Dokumen Resmi (Format Pemasaran, Format Dinas STSU, Format Standar & NCR Dot Matrix)](#9-format-cetak-dokumen-resmi-format-pemasaran-format-dinas-stsu-format-standar--ncr-dot-matrix)
10. [Struktur File & Komponen Modular](#10-struktur-file--komponen-modular)
11. [SOP & Panduan Operasional Operator Harian](#11-sop--panduan-operasional-operator-harian)

---

## 1. Ringkasan Eksekutif & Arsitektur Sistem

Sistem Rekapitulasi TMR adalah aplikasi web manajemen pendapatan daerah terintegrasi yang digunakan oleh Unit Pengelola Taman Margasatwa Ragunan (UP TMR) untuk merekapitulasi, memvalidasi tarif, mencetak dokumen Surat Tanda Setor Uang (STSU) resmi kedinasan, mencocokkan rekening koran Bank DKI, serta menyajikan laporan eksekutif pendapatan daerah secara *real-time*.

### Stack Teknologi & Infrastruktur
- **Frontend Core:** React 18, Vite 5, Tailwind CSS, Lucide Icons.
- **Database & Real-Time Sync:** Google Firebase Cloud Firestore (arsitektur *monthly sharding* partisi bulanan) & Firebase Authentication.
- **Offline & Local Persistence:** `localStorage` dual-persistence (`tmr_v19_*`) dengan sinkronisasi debounce 500 ms, pemeriksaan delta hash, serta ekspor/impor berkas cadangan penuh (`.json`).
- **Dokumen & Pencetakan:**
  - `FormatPemasaranReport`: Cetak STSU Dasar Hasil Retribusi Pemasaran (23 nomor pos baku).
  - `FormatDinasStsuReport`: Cetak STSU Format Dinas per kategori dengan kop surat resmi Pemprov DKI Jakarta (Logo Jaya Raya transparan) & UP TMR (Logo Ragunan).
  - `PrintPreviewTab`: Format Standar STSU Gabungan (Draft SU / SU/L) & Mode Cetak Continuous Form NCR Dot Matrix A5 dengan elemen geser bebas (*DraggableElement*).
  - `reportExcelExporter`: Generator dokumen laporan Excel (`.xls`) berstandar tabel kedinasan.
- **Hosting & Repositori:** GitHub (`alfaditmr/sistem-rekap-tmr`) & Vercel Deployment.
- **AI Automation:** Integrasi Google Gemini API untuk perapian uraian/keterangan dinamis dokumen keuangan secara otomatis.

---

## 2. Arsitektur Cloud Firestore Terpartisi Bulanan (Monthly Sharding)

### 2.1 Latar Belakang & Masalah
Pada sistem dokumen tunggal (*monolithic document*), ukuran dokumen database tumbuh melampaui batas 1 MB Firestore seiring bertambahnya transaksi harian dan baris mutasi bank. Hal ini menyebabkan:
1. Sinkronisasi multi-PC menjadi lambat (20–30 detik).
2. Kuota baca/tulis dan bandwidth Firebase cepat habis.
3. Risiko *timeout* pada jaringan kantor saat jam sibuk.

### 2.2 Solusi: Monthly Sharding & Delta Sync Engine
Sistem menggunakan arsitektur partisi bulanan (*monthly sharding*):
- **Koleksi `tmr_bank_months/{YYYY-MM}`:** Menyimpan array transaksi rekening koran mutasi bank khusus bulan tersebut (~10–25 KB per dokumen).
- **Koleksi `tmr_report_months/{YYYY-MM}`:** Menyimpan rekapitulasi form laporan STSU harian (`utama`, `lain_1`, `lain_2`, dst.) khusus bulan tersebut (~15–30 KB per dokumen).
- **Dokumen `tmr_data/master_config`:** Menyimpan konfigurasi master (pejabat penandatangan, database kategori & sub-kategori standar, target anggaran, serta status tutup buku bulanan).
- **Cold Storage Master (`tmr_data/tmr_rekapitulasi_pusat`):** Dokumen cadangan komprehensif yang diperbarui otomatis di latar belakang saat sistem dalam kondisi *idle* (jeda 60 detik).

### 2.3 Mekanisme Delta Detection
Sistem menyimpan *hash* stringifikasi per bulan di memori (`previousBankMonthsRef`, `previousReportMonthsRef`). Saat pengguna menginput atau mengubah data:
1. State lokal React dan `localStorage` diperbarui instan (0 ms).
2. Debounce Cloud Push berjalan 500 ms (0,5 detik).
3. Hanya partisi bulan yang *hash*-nya berubah yang dikirim ke Firestore.
4. Partisi bulan lain yang tidak berubah **tidak pernah dikirim ulang**, menghemat >95% kuota tulis Firebase dan menjamin waktu sinkronisasi `< 250 ms`.

```
[User Input / Edit] 
     │ (0 ms)
     ▼
[React State & LocalStorage Cache (tmr_v19_*)]
     │ (Debounce 500 ms)
     ▼
[Delta Hash Checker] ────────► Bandingkan dengan previousHash per {YYYY-MM}
     │
     ├── Jika Berubah: Tulis hanya ke `tmr_report_months/{YYYY-MM}` atau `tmr_bank_months/{YYYY-MM}`
     └── Jika Idle 60s: Cadangkan penuh ke `tmr_rekapitulasi_pusat` (Master Cold Storage)
```

---

## 3. Pusat Cadangan, Pemulihan Database & Ketahanan Lokal (Disaster Recovery)

Fitur **Pusat Cadangan** (*Master Menu Admin > Pusat Cadangan*) menyediakan mekanisme proteksi data mandiri (*Zero Data Loss Guarantee*), terutama untuk mengantisipasi migrasi akun cloud atau gangguan layanan pihak ketiga.

### 3.1 Skema Berkas Cadangan (.JSON)
Format cadangan menggunakan standar versi `tmr_v19`:
```json
{
  "app": "Sistem Rekap STSU - TMR Ragunan",
  "version": "tmr_v19",
  "exportedAt": "2026-11-07T04:30:00.000Z",
  "exportedAtLocal": "7 November 2026, 11:30 WIB",
  "metadata": {
    "totalReports": 215,
    "totalBankRows": 1420,
    "totalCategories": 6,
    "hasSignatures": true,
    "closedMonthsCount": 9,
    "closedMonthsList": ["2026-01", "2026-02", "2026-09"],
    "totalRevenue": 8745230000,
    "totalBankCredit": 8745230000,
    "dateRange": { "earliest": "2026-01-01", "latest": "2026-11-07" },
    "months": ["2026-11", "2026-10", "2026-09"],
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
Saat operator memilih file cadangan `.json`:
1. **Validasi Skema:** Memeriksa keberadaan objek `allReports`, `bankRows`, atau `categories`.
2. **Sanitasi ID Mutasi:** Menjalankan `ensureBankRowIds(bankRows)` agar setiap baris transaksi mutasi bank memiliki ID deterministik yang unik dan stabil.
3. **Standardisasi Kategori Fasilitas:** Menjalankan `ensureStandardFacilityCategories(categories)` untuk memastikan 21 sub-kategori standar Pemakaian Fasilitas TMR selalu lengkap.
4. **Rekonsiliasi Orphan:** Menjalankan `reconcileOrphanBankItems` untuk menyelaraskan alokasi mutasi bank dengan item dokumen STSU.
5. **Pembersihan Delta Hash & Force Push:** Mengosongkan *hash* referensi dan mengirimkan seluruh partisi bulanan ke koleksi Firestore dengan opsi `forceAllPartitions: true`.
6. **Pencatatan Riwayat:** Menyimpan metadata pemulihan terakhir ke `tmr_v19_lastRestoreInfo`.

### 3.3 SOP Ketahanan Data Lokal (Aturan 3-2-1)
- Unduh file `.json` dari menu **Pusat Cadangan** minimal **1 kali setiap akhir minggu** dan wajib sesaat setelah melakukan **Tutup Buku Bulanan**.
- Simpan salinan file `.json` di minimal 2 media berbeda: Harddisk PC Kantor dan Flashdisk fisik Bendahara / Google Drive Dinas.
- Untuk menjalankan aplikasi secara lokal di komputer kantor tanpa bergantung pada Vercel, gunakan perintah `npm run dev` atau `npm run preview` pada folder repositori lokal.

---

## 4. Fitur Tutup Buku Bulanan (Period Locking & Immutability)

Fitur **Tutup Buku Bulanan** melindungi integritas laporan keuangan yang telah diaudit atau disahkan dari perubahan yang tidak disengaja.

### 4.1 Logika & Aturan Bisnis
1. **Identifikasi Periode:** Setiap tanggal transaksi (`YYYY-MM-DD`) dipetakan ke kunci bulan `YYYY-MM`.
2. **Penyimpanan Status Kunci:** Disimpan pada state `closedMonths`:
   ```javascript
   closedMonths: {
     "2026-09": {
       closedAt: "30 Sep 2026, 17:00",
       closedBy: "Bendahara Penerimaan",
       note: "Tutup buku resmi September 2026 - Rekon Selesai"
     }
   }
   ```
3. **Efek Penguncian Menyeluruh:**
   - Pada tab **Input Harian STSU**, seluruh input nominal, pemilihan kategori, penambahan susulan, tombol hapus, serta penarikan data transit otomatis beralih ke mode **Read-Only (Terkunci)**.
   - Pada tab **Cetak STSU** (`FormatPemasaranReport` & `FormatDinasStsuReport`), input pengubahan *Nomor Urut STSU* dan *Tanggal TTD Bawah* ikut dikunci (`disabled={isMonthClosed}`).
   - Muncul banner peringatan bahwa periode tersebut telah ditutup buku secara resmi.
4. **Alur Buka Kunci (Revisi):**
   - Hanya dapat dibuka melalui *Master Menu Admin > Tutup Buku Bulanan* dengan tombol **"Buka Kunci (Revisi)"** disertai konfirmasi eksplisit.

---

## 5. Logika Penanganan Dokumen STSU Lain-lain (Multi-Transaksi, Auto-Split & Auto-Merge)

Dokumen STSU Lain-lain (`lain_1`, `lain_2`, dst.) menangani penerimaan retribusi non-tiket gerbang (sewa fasilitas, listrik, E-Car, kerjasama, pedagang, foto satwa, juru foto, dll.).

### 5.1 Auto-Split (Pemisahan Multi-Kategori)
Jika operator memasukkan lebih dari satu kategori berbeda pada tanggal yang sama:
- Kategori pertama ditempatkan di `lain_1`.
- Kategori kedua secara otomatis dipisahkan ke `lain_2`, kategori ketiga ke `lain_3`, dst.
- Menjamin penomoran dan pencetakan per dokumen STSU Lain-lain tetap terpisah rapi per kategori transaksi.

### 5.2 Auto-Merge (Penggabungan Kategori Sama)
Jika pada tanggal yang sama terdapat dokumen `lain_1` dan `lain_2` dengan kategori yang sama:
- Sistem otomatis menggabungkan keduanya ke dokumen pertama.
- Seluruh rincian alokasi mutasi bank (`bankAllocations`) digabungkan tanpa duplikasi dan total nominal dihitung ulang secara akurat.

### 5.3 Standardisasi Sub-Kategori Pemakaian Fasilitas (`categoryHelper.js`)
Fungsi `ensureStandardFacilityCategories` memastikan kategori **Pemakaian Fasilitas TMR** (`cat_1`) selalu memiliki 21 sub-item standar yang terpetakan langsung ke format laporan resmi (termasuk *Promo Penjualan Produk, Film Cerita/Iklan/Dokumenter/Keluarga, Program TV, Video Clip, Pre-Wedding, Lahan Terbuka, Spanduk, Banner, Panggung, Gedung Informasi, Auditorium, Sound System, Wireless, Pengambilan Foto, Penyediaan Satwa Jinak untuk Berfoto, Film Satwa, dan Pemandu Wisata Indonesia/Inggris*) tanpa menghapus sub-item kustom yang pernah dibuat pengguna.

---

## 6. Rekonsiliasi Mutasi Bank DKI, Multi-Alokasi & Proteksi Bukti Transfer

### 6.1 Parser Rekening Koran & Pairing
Sistem membaca mutasi rekening koran Bank DKI (tanggal, uraian/berita transfer, nominal kredit) dan memungkinkan pencocokan (*pairing*) baik ke transaksi yang sudah ada di dashboard maupun melalui fitur **"Input Baru"** langsung dari baris mutasi bank.

### 6.2 Dukungan Multi-Alokasi & Pelepasan Parsial (*Partial Unmatch*)
Satu pos transaksi pada laporan harian dapat didukung oleh gabungan beberapa baris mutasi bank sekaligus (`bankAllocations`):
```javascript
bankAllocations: [
  {
    bankRowId: "bank_892341_12",
    bankDate: "Sep 28, 2026 14:22:01",
    amount: 1500000,
    desc: "PT ABC - Sewa Booth Kuliner",
    tenant: "PT ABC",
    location: "Plaza Barat",
    apiRefId: "api_101",
    proofUrl: "https://drive.google.com/..."
  }
]
```
- **Akumulasi Otomatis:** Nilai nominal pos dihitung dari `sum(bankAllocations.amount)`.
- **Pelepasan Parsial Aman:** Apabila sebuah pos memiliki lebih dari 1 mutasi bank dan operator membatalkan/melepas salah satu mutasi di tab *Rekon Bank*, sistem **tidak menghapus seluruh item**, melainkan hanya melepas mutasi terkait dan mengurangi nominal pos sesuai nilai mutasi yang dilepas.

### 6.3 Proteksi Bukti Transfer Individual
- Setiap mutasi mendukung penyimpanan tautan bukti transfer (`proofUrl` / `_buktiUrl`).
- Saat sinkronisasi ulang atau pembaruan data, tautan bukti yang sudah terpasang dilindungi agar tidak tertimpa.

---

## 7. Penarikan Data Bot Integrasi (3A & IWM), Smart Mapping AI & Validasi Tarif Perda

Aplikasi dapat menarik rekap transaksi tiket harian secara otomatis dari server bot lokal/jaringan:
- **Bot 3A (Port 5000):** Menarik transaksi *E-Ticketing New Gate*, *Ticket Online (Merchant Page)*, dan *Ticket Vending Machine (TVM)*.
- **Bot IWM (Port 5001):** Menarik transaksi *E-Ticketing Old Gate*, wahana satwa, Pusat Primata Schmutzer, serta daftar mentah rombongan diskon 25%.

### 7.1 Validasi Tarif Resmi Perda DKI Jakarta (`transitValidation.js`)
Di dalam modal **Ruang Transit**, setiap item yang ditarik dari Bot 3A maupun IWM divalidasi secara matematis menggunakan fungsi `checkTransitItemTarif` dan `validateIwmDiskonRow` berdasarkan tarif resmi:

| Kategori / Wahana | Tarif Reguler | Tarif Rombongan (Diskon 25%) |
|---|---|---|
| **Pintu Masuk Dewasa** | Rp 4.000 / orang | Rp 3.000 / orang |
| **Pintu Masuk Anak** | Rp 3.000 / orang | Rp 2.250 / orang |
| **Pusat Primata Schmutzer (Selasa–Jumat / Hari Biasa)** | Rp 6.000 / orang | Rp 4.500 / orang |
| **Pusat Primata Schmutzer (Sabtu–Minggu / Hari Libur)** | Rp 7.500 / orang | Rp 5.625 / orang |
| **Taman Satwa Anak (TSA / Children Zoo)** | Rp 2.500 / orang | — |
| **Kendaraan Gol I (Bus/Truk Besar)** | Rp 15.000 / unit | — |
| **Kendaraan Gol II (Bus/Truk Kecil)** | Rp 12.500 / unit | — |
| **Kendaraan Gol III (Mobil/Sedan/Minibus)** | Rp 6.000 / unit | — |
| **Sepeda Motor** | Rp 3.000 / unit | — |
| **Sepeda** | Rp 1.000 / unit | — |
| **Wahana (Perahu Angsa / Kereta / Sepeda Ganda / Tunggal)** | Rp 40.000 / 20.000 / 20.000 / 15.000 | — |

- **Status Valid (Hijau):** Jika nominal rupiah habis dibagi tarif satuan (`amount % unitPrice === 0`) dan jumlah kuantitas (`Qty`) cocok dengan laporan API.
- **Status Peringatan/Invalid (Merah):** Jika terdapat sisa pembagian (nominal tidak bulat terhadap tarif Perda) atau terdapat selisih antara Qty API dengan hasil bagi nominal.

---

## 8. Pusat Laporan & Ekspor Excel Resmi Dinas

Menu **Pusat Laporan** (`RekapExcelTab.jsx` & `reportExcelExporter.js`) menyediakan 6 jenis laporan berstandar kedinasan yang dapat dilihat langsung di layar maupun diunduh ke format `.xls`:

1. **Rekapitulasi 31 Hari (Pendapatan Retribusi Daerah):** Matriks tanggal 1 s/d 31 lengkap dengan pengelompokan pos retribusi dan total bulanan.
2. **Rekap STSU Kas Daerah & Formulir STS (`StsuKasDaerahTable.jsx`):** Daftar urut nomor STSU harian, tanggal pelimpahan, kode rekening, dan nilai setoran ke Kas Daerah.
3. **Laporan Pengunjung Fisik (`PengunjungReportTable.jsx`):** Rekapitulasi jumlah pengunjung dewasa, anak, rombongan, kendaraan, PPS Schmutzer, dan TSA.
4. **Laporan E-Ticketing & Gate (`TicketingReportTable.jsx`):** Rincian komparasi penerimaan New Gate, Old Gate, Online, dan TVM.
5. **Laporan Pemakaian Tempat & Rekap Promo (`FasilitasPromoTable.jsx`):** Rincian penyewaan lokasi, acara, panggung, dan promosi produk.
6. **Rekonsiliasi Mitra (E-Car, Foto Satwa, dll.):** Pencocokan pendapatan harian dengan tanggal pelimpahan bank dan nama petugas rekon.

---

## 9. Format Cetak Dokumen Resmi (Format Pemasaran, Format Dinas STSU, Format Standar & NCR Dot Matrix)

Menu **Cetak STSU** (`PrintPreviewTab.jsx`) menyediakan **3 pilihan format laporan PDF/Printer A4** serta **1 mode cetak kertas NCR Dot Matrix**:

### 9.1 Format Baru Pemasaran — STSU Dasar Hasil Retribusi (`FormatPemasaranReport.jsx`)
- Mengikuti secara presisi dokumen standar **`format-new-pemasaran (1).docx`**.
- Memiliki **23 Nomor Pos Baku** yang terbagi ke dalam 2 grup kode rekening:
  - **`4.1.02.02.12.00001` (Pasar Grosir / Pertokoan / Tempat Usaha):**
    - No 1: Pedagang Hari Selasa–Sabtu
    - No 2: Pedagang Hari Minggu/Libur Nasional
    - No 3: Pemakaian Lokasi/Tempat Untuk Promo/Penjualan Produk
  - **`4.1.02.02.20.00001` (Retribusi Pemanfaatan Aset Daerah):**
    - No 4 s/d 10: Film Cerita, Film Iklan, Film Dokumentasi/Dokumenter, Film Keluarga, Program Televisi, Video Clip, Pre-Wedding/Sejenisnya.
    - No 11: Pemakaian Lokasi/Tempat Lahan Terbuka.
    - No 12 & 13: Penempatan Spanduk Promosi & Banner/Umbul Promosi.
    - No 14 s/d 18: Fasilitas Panggung, Gedung Informasi, Gedung Auditorium, Sound System, Wireles.
    - No 19 & 20: Pelayanan Pengambilan Foto & Penyediaan Satwa Jinak untuk Berfoto.
    - No 21 s/d 23: Pemutaran Film Satwa, Pemandu Wisata Berbahasa Indonesia & Inggris.
- Dilengkapi input *Nomor Urut STSU*, *Tanggal TTD Bawah*, rincian nama penyewa/perusahaan otomatis di bawah pos yang aktif, kalimat *Terbilang*, dan tanda tangan 2 kolom (Kepala Seksi Pelayanan dan Informasi di kiri, Bendahara Penerimaan di kanan).

### 9.2 Format Dinas STSU — Per Kategori (`FormatDinasStsuReport.jsx` & `stsuTemplates.js`)
- Mencetak lembar Surat Tanda Setor Uang resmi kedinasan (1 kategori template resmi = 1 halaman A4 mandiri) sesuai contoh berkas di folder `format cetak/`.
- **Kop Surat Resmi Kedinasan:**
  - **Sisi Kiri:** Logo Pemprov DKI Jakarta **Jaya Raya** (`/assets/jaya-raya.png` — berlatar belakang transparan murni dan telah di-*crop* presisi).
  - **Tengah:** Judul instansi 2 baris rata tengah sejajar (`whitespace-nowrap`):
    1. `PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA`
    2. `UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN`
  - **Sisi Kanan:** Logo **Taman Margasatwa Ragunan / TMR** (`/assets/logo-tmr.png`).
- **9 Template Resmi yang Didukung (`STSU_TEMPLATES`):**
  1. **STSU Foto Satwa** (`4.1.02.02.020.00001` — *Hasil Pendapatan Retribusi Penyediaan Satwa Jinak untuk Berfoto*).
  2. **STSU Juru Foto** (`4.1.02.02.020.00001` — *Hasil Pendapatan Retribusi Juru Foto*).
  3. **STSU Retribusi Pedagang** (`4.1.02.02.012 00001` — *Hasil Pendapatan Retribusi Pedagang Autodebet*).
  4. **STSU E-Car** (`4.1.04.16.006.00006` — *Hasil Pendapatan Operasional E-Car*).
  5. **STSU Listrik** (`4.1.04.16.006.00006` — *Hasil Pendapatan Rekening Listrik*).
  6. **STSU Kerjasama Pihak Lain** (`4.1.04.16.004.00001` — *Hasil Pendapatan atas Perjanjian Sewa / Kerjasama*).
  7. **STSU Jasa Giro** (`4.1.04.16.006.00001` — *Hasil Pendapatan Jagir dari Rekening Kas*).
  8. **STSU Bank Sampah** (`4.1.04.16.006.00006` — *Penjualan Sampah Anorganik Bank Sampah Tamara*).
  9. **STSU Paket Wisata Edukasi** (`4.1.04.16.006.00006` — *Paket Wisata Edukasi dengan Bus Ragunan*).
- **Ketentuan Penyaringan Otomatis (`isExcludedFromFormatDinas`):**
  - Seluruh transaksi tiket masuk/gerbang (*New Gate, Old Gate, Online, TVM, Primata, TSA*) **dikecualikan** (tidak dibuatkan STSU dinas ini).
  - Pos *Promo / Penjualan Produk* dan *Pemakaian Fasilitas TMR* umum **dikecualikan** karena sudah dicetak pada *Format Baru Pemasaran*.
  - **Prioritas Khusus Foto Satwa & Juru Foto:** Baik diinput sebagai kategori terpisah (misal `cat_3`/`cat_4`) maupun sebagai sub-item di dalam kategori *Pemakaian Fasilitas TMR*, transaksi *Foto Satwa* dan *Juru Foto* selalu lolos filter dan dibuatkan lembar STSU Dinas resminya masing-masing.

### 9.3 Format Standar STSU Gabungan (DRAFT SU / SU/L)
- Menampilkan gabungan seluruh kategori aktif pada tanggal terpilih dalam satu lembar ringkasan cepat untuk pemeriksaan internal sebelum cetak resmi.

### 9.4 Mode Cetak NCR Dot Matrix A5 (`DraggableElement.jsx`)
- Didesain untuk pencetakan ke kertas rangkap 3 *continuous form* A5 pada printer dot matrix (Epson LX-310 / LQ-310).
- Setiap elemen teks (Nomor STSU, Tanggal, Uraian, Nominal, Terbilang, TTD) dapat digeser (*drag-and-drop*) secara bebas di layar dan posisinya tersimpan otomatis di peramban operator.

---

## 10. Struktur File & Komponen Modular

```
sistem-rekap-tmr/
├── public/
│   └── assets/
│       ├── jaya-raya.png                     # Logo Jaya Raya Pemprov DKI (transparan murni)
│       └── logo-tmr.png                      # Logo Taman Margasatwa Ragunan (transparan)
├── src/
│   ├── App.jsx                               # Komponen utama, state global, sharding sync, & backup/restore
│   ├── main.jsx                              # Entry point React & ErrorBoundary wrapper
│   ├── MultiDateCalendar.jsx                 # Komponen pemilih multi-tanggal interaktif
│   ├── RekonBankTab.jsx                      # Modul rekonsiliasi rekening koran Bank DKI & pairing
│   ├── TargetManager.jsx                     # Manajemen master target pendapatan tahunan & bulanan
│   ├── assets/
│   │   ├── jaya-raya.png                     # Cadangan lokal asset logo Jaya Raya
│   │   ├── logo-tmr.png                      # Cadangan lokal asset logo TMR
│   │   └── stsuLogos.js                      # Konstanta path asset logo kop surat STSU
│   ├── components/
│   │   ├── calendar/
│   │   │   └── KalenderTab.jsx               # Kalender monitoring status STSU harian
│   │   ├── common/
│   │   │   └── ErrorBoundary.jsx             # Penangkap error UI agar aplikasi tidak blank putih
│   │   ├── dashboard/
│   │   │   ├── RekapExcelTab.jsx             # Pusat Laporan & ekspor Excel kedinasan
│   │   │   └── reports/
│   │   │       ├── FasilitasPromoTable.jsx   # Tabel laporan pemakaian tempat & promo
│   │   │       ├── PengunjungReportTable.jsx # Tabel laporan fisik pengunjung & wahana
│   │   │       ├── StsuKasDaerahTable.jsx    # Tabel rekap STSU Kas Daerah & Form STS
│   │   │       └── TicketingReportTable.jsx  # Tabel laporan E-Ticketing & Gate
│   │   ├── input/
│   │   │   └── InputHarianTab.jsx            # Form input transaksi STSU Utama & Lain-lain
│   │   ├── modals/
│   │   │   └── ActionModals.jsx              # Modal konfirmasi, edit uraian AI Gemini, & reset
│   │   ├── print/
│   │   │   ├── DraggableElement.jsx          # Komponen kalibrasi posisi cetak NCR dot matrix
│   │   │   ├── FormatDinasStsuReport.jsx     # Cetakan STSU Format Dinas per kategori berkop surat resmi
│   │   │   ├── FormatPemasaranReport.jsx     # Cetakan STSU Format Baru Pemasaran (23 pos baku)
│   │   │   └── PrintPreviewTab.jsx           # Tab kontrol pratinjau cetak PDF, Printer, & NCR
│   │   ├── settings/
│   │   │   └── MasterSettingsTab.jsx         # Pengaturan kategori, pejabat TTD, tutup buku, & pusat cadangan
│   │   └── transit/
│   │       └── TransitModal.jsx              # Modal Ruang Transit penarikan & validasi data Bot 3A/IWM
│   ├── services/
│   │   ├── firebase.js                       # Konfigurasi & fungsi SDK Firebase Auth & Firestore
│   │   └── transitBotService.js              # Klien API Bot 3A & IWM serta algoritma Smart Mapping AI
│   └── utils/
│       ├── categoryHelper.js                 # Standardisasi 21 sub-kategori Pemakaian Fasilitas TMR
│       ├── formatters.js                     # Helper formatRp, terbilang, tanggal Indonesia, & kunci item
│       ├── reportDataHelper.js               # Mesin agregasi data bulanan untuk Pusat Laporan
│       ├── reportExcelExporter.js            # Generator file .xls berformat tabel resmi dinas
│       ├── stsuTemplates.js                  # Definisi 9 template STSU Format Dinas & filter kategori
│       └── transitValidation.js              # Mesin validasi tarif Perda DKI & cek selisih Qty API
├── DOKUMENTASI_LOGIC_SISTEM.md               # Dokumentasi arsitektur & logika sistem lengkap (file ini)
├── README.md                                 # Panduan ringkas proyek & cara menjalankan secara lokal
├── index.html                                # Template HTML utama
└── package.json                              # Daftar dependensi & skrip build Vite
```

---

## 11. SOP & Panduan Operasional Operator Harian

1. **Awal Hari (Pukul 08.00–10.00 WIB):**
   - Login ke aplikasi menggunakan akun resmi Seksi Pelayanan dan Informasi / Bendahara.
   - Pastikan indikator sinkronisasi di pojok kanan atas berstatus aktif (*Cloud Sharding Aktif*).
   - Buka tab **Input Harian**, pilih tanggal transaksi yang akan direkap.
2. **Penarikan & Validasi Data Tiket Otomatis (STSU Utama):**
   - Klik tombol **Tarik 3A** atau **Tarik IWM**.
   - Di dalam **Ruang Transit**, periksa lencana validasi tarif: pastikan seluruh baris berwarna **Hijau (Valid)** sesuai tarif Perda DKI Jakarta.
   - Klik **Import ke Form** untuk memasukkan angka ke laporan harian.
3. **Input Penerimaan Non-Tiket & Rekonsiliasi Bank (STSU Lain-lain):**
   - Buka tab **Rekon Bank DKI**, unggah/tempel mutasi rekening koran harian.
   - Pasangkan (*Match*) mutasi ke pos yang sesuai atau gunakan **Input Baru** untuk membuat dokumen STSU Lain-lain beserta lampiran tautan bukti transfernya.
4. **Pencetakan Dokumen Resmi STSU:**
   - Buka tab **Cetak STSU**.
   - Pilih **Format Baru Pemasaran (Hasil Retribusi)** untuk mencetak lembar STSU 23 pos pemakaian fasilitas & pedagang.
   - Pilih **Format Dinas STSU (Per Kategori)** untuk mencetak lembar STSU berkop surat resmi Jaya Raya & TMR bagi pos E-Car, Listrik, Foto Satwa, Juru Foto, Pedagang, Kerjasama, Jasa Giro, Bank Sampah, atau Paket Wisata.
   - Isi **Nomor Urut STSU** dan sesuaikan **Tanggal TTD Bawah** bila diperlukan, lalu tekan **Cetak Printer** atau **Unduh PDF**.
   - Untuk pencetakan ke kertas fisik rangkap 3, klik tombol kategori pada panel **Cetak NCR Kertas Rangkap 3**.
5. **Akhir Minggu / Akhir Bulan (Tutup Buku & Backup Lokal):**
   - Verifikasi seluruh tabel pada tab **Pusat Laporan** dan unduh berkas `.xls` untuk arsip bulanan.
   - Masuk ke **Master Menu Admin > Tutup Buku Bulanan**, lalu kunci periode bulan yang telah selesai direkonsiliasi.
   - Masuk ke **Master Menu Admin > Pusat Cadangan**, klik **Download Backup Sekarang (.json)**, dan simpan file tersebut ke folder lokal PC serta flashdisk cadangan dinas.
