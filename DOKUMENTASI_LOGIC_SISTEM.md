# DOKUMENTASI LENGKAP LOGIKA SISTEM REKAPITULASI TMR
**UP Taman Margasatwa Ragunan (Seksi Pelayanan & Informasi)**

Dokumen ini mendokumentasikan seluruh arsitektur, algoritma, alur data, dan aturan bisnis (*business rules*) yang telah dibangun dan diuji dalam sistem ini. Dokumen ini berfungsi sebagai pedoman utama agar tidak ada logika yang terlewat atau berubah secara tidak sengaja di masa depan.

---

## 1. Arsitektur Data & Persistensi

### 1.1 Struktur Dokumen Laporan (`allReports`)
Seluruh laporan transaksi disimpan dalam format objek bertingkat berdasarkan tanggal dan jenis dokumen:

```json
{
  "YYYY-MM-DD": {
    "utama": {
      "sequence": "001",
      "signatureDate": "YYYY-MM-DD",
      "activeItems": [
        {
          "catId": "cat_3",
          "itemId": "item_3a",
          "isSusulan": false,
          "validDate": "",
          "itemDate": "",
          "itemNote": ""
        }
      ],
      "formData": {
        "cat_3_item_3a_false___": 5728000
      }
    },
    "lain_1": {
      "sequence": "001",
      "signatureDate": "YYYY-MM-DD",
      "activeItems": [...],
      "formData": {...}
    }
  }
}
```

- **Kunci Dokumen Tanggal:** Format `YYYY-MM-DD` (misal `2026-10-10`).
- **Jenis Dokumen (`activeTypeKey`):**
  - `'utama'`: Dokumen STSU Utama (Retribusi Karcis, Parkir, Fasilitas).
  - `'lain_1'`, `'lain_2'`, dst.: Dokumen STSU Lain-lain (SU/L) untuk sewa lahan, listrik, promosi pedagang, dll.
- **Generator Kunci Unik Transaksi (`getActiveItemKey`):**
  ```javascript
  const getActiveItemKey = (catId, itemId, isSusulan, validDate, itemDate, itemNote) => {
    const isSusulanBool = isSusulan === true || isSusulan === 'true';
    const safeCat = catId || 'defaultCat';
    const safeItem = itemId || 'direct';
    const vDate = isSusulanBool ? (validDate || '') : '';
    const iDate = itemDate || '';
    const iNote = (itemNote || '').trim();
    return `${safeCat}_${safeItem}_${isSusulanBool}_${vDate}_${iDate}_${iNote}`;
  };
  ```

### 1.2 Dual Persistence: Cloud Firestore & LocalStorage
Aplikasi menggunakan sistem **High-Availability Persistence**:
1. **Cloud Firestore:**
   - Koleksi: `tmr_data`
   - Dokumen ID: `user.uid` (fallback jika demo: `'demo_rekapitulasi_laporan'`)
   - Field yang disimpan: `signatures`, `categories`, `allReports`, `bankRows`, `targets`, `lastUpdated`
   - Sinkronisasi realtime menggunakan `onSnapshot` dengan listener tab visibility & multi-PC sync.
2. **LocalStorage Fallback:**
   - `tmr_v19_allReports`
   - `tmr_v19_bankRows`
   - `tmr_v19_categories`
   - `tmr_v19_signatures`
   - `tmr_v19_targets`
   - `tmr_v19_api_ip`

---

## 2. Logika Penarikan & Pengolahan Data Bot 3A

### 2.1 Sumber API
- **Endpoint:** `http://${apiIpAddress}:5000/api/tarik_rekon_3a?tanggal=${targetDate}`
- **Channel 3A:**
  - `GATE` (Pintu Masuk Gerbang Utama)
  - `MERCHANT_PAGE` (Pembelian Tiket Online / Merchant)
  - `TVM` (Ticket Vending Machine)

### 2.2 ID Kamus Data STSU 3A (`stsuNames3A`)
| ID Mentah | Nama Standar STSU |
|---|---|
| `1` | Tiket Dewasa |
| `2` | Tiket Anak (Usia 3-12 tahun) |
| `3` | Rombongan Dewasa Reduksi 25% |
| `4` | Rombongan Anak Reduksi 25% |
| `5` | Kuda Tunggang |
| `6` | Unta Tunggang |
| `7` | Gajah Tunggang |
| `8`, `8_2` | Taman Satwa Anak |
| `9` | Pusat Primata Dewasa (Hari Biasa) |
| `10` | Pusat Primata Anak (Hari Biasa) |
| `11` | Schmutzer Rombongan Dewasa (Hari Biasa) |
| `12` | Schmutzer Rombongan Anak (Hari Biasa) |
| `13`, `13_2` | Pusat Primata Dewasa (Weekend / Holiday) |
| `14`, `14_2` | Pusat Primata Anak (Weekend / Holiday) |
| `15` | Schmutzer Rombongan Anak (Weekend) |
| `16` | Schmutzer Rombongan Dewasa (Weekend) |
| `17` | Kendaraan Gol I |
| `18` | Kendaraan Gol II |
| `19` | Kendaraan Gol III / Mobil |
| `20` | Sepeda Motor |
| `21` | Sepeda |

### 2.3 Aturan Pengelompokan & Agregasi Otomatis (`process3aData`)
1. **Taman Satwa Anak (TSA):**
   - Semua channel yang terdeteksi TSA digabung paksa ke kunci `${channel}_tsa_all`.
   - Nama tampilan: `[${channel}] Taman Satwa Anak (Total)`.
2. **Pusat Primata (Non-Rombongan):**
   - Deteksi Libur: Jika ID `13`, `13_2`, `14`, `14_2`, atau ada teks `holiday`/`libur`/`weekend`, atau kalender jatuh di Sabtu/Minggu (hari ke-0 atau ke-6).
   - Jika Libur: groupKey `${channel}_prm_we_${dewasa/anak}`, nama `[${channel}] Pusat Primata Dewasa/Anak (Weekend / Hari Besar)`.
   - Jika Biasa: groupKey `${channel}_prm_wd_${dewasa/anak}`, nama `[${channel}] Pusat Primata Dewasa/Anak (Hari Biasa)`.
3. **Pintu Masuk Gerbang:**
   - Digabung ke `${channel}_gate_${dewasa/anak}`.
   - Nama tampilan: `[${channel}] Tiket Masuk Dewasa/Anak (Total)`.
4. **Kendaraan:**
   - Motor: `${channel}_kend_motor` -> `[${channel}] Kendaraan Motor (Total)`
   - Mobil / Gol 3: `${channel}_kend_mobil` -> `[${channel}] Kendaraan Gol 3 / Mobil (Total)`
   - Gol 2: `${channel}_kend_gol2` -> `[${channel}] Kendaraan Gol 2 (Total)`
   - Gol 1: `${channel}_kend_gol1` -> `[${channel}] Kendaraan Gol 1 (Total)`
   - Sepeda: `${channel}_kend_sepeda` -> `[${channel}] Kendaraan Sepeda (Total)`

---

## 3. Logika Penarikan Data Bot IWM

### 3.1 Sumber API
- **Endpoint:** `http://${apiIpAddress}:5001/api/tarik_rekon_iwm?tanggal=${targetDate}`
- **Area:** `area_lainnya`, `primata`, dan `laporan_diskon`.

### 3.2 Pemrosesan Rombongan & Diskon IWM
- Rombongan IWM memiliki tarif reduksi khusus.
- Nilai rombongan dikurangi dari reguler agar tidak terjadi *double count* (duplikasi nominal):
  ```javascript
  const netDewasa = Math.max(0, (al.dewasa || 0) - deductAlDewasa);
  const netAnak = Math.max(0, (al.anak || 0) - deductAlAnak);
  ```
- Rombongan IWM dimasukkan dengan metadata `itemNote`: nama rombongan, sehingga muncul jelas di STSU.

---

## 4. Logika Pencocokan Cerdas (`smartMappingAI`)

Fungsi `smartMappingAI(nameAPI, apiSource, targetDate)` bertanggung jawab menentukan kategori dan sub-kategori secara otomatis.

### 4.1 Tahap 1: Penentuan Kategori Target (`guessCat`)
Pencocokan **MURNI MENGGUNAKAN NAMA KATEGORI (KEYWORD)**, BUKAN HARDCODE ID:

```javascript
if (apiSource === 'iwm') {
  // Semua tiket IWM otomatis masuk ke kategori Old Gate / IWM
  const cat = categories.find(c => c.name.toLowerCase().includes('old gate') || c.name.toLowerCase().includes('iwm'));
  if (cat) guessCat = cat.id;
} else {
  // Data 3A dipetakan berdasarkan kata kunci channel
  if (lowerName.includes('gate')) {
    const cat = categories.find(c => c.name.toLowerCase().includes('new gate'));
    if (cat) guessCat = cat.id;
  } else if (lowerName.includes('merchant_page') || lowerName.includes('online')) {
    const cat = categories.find(c => c.name.toLowerCase().includes('online'));
    if (cat) guessCat = cat.id;
  } else if (lowerName.includes('tvm') || lowerName.includes('vending')) {
    const cat = categories.find(c => c.name.toLowerCase().includes('tvm') || c.name.toLowerCase().includes('vending'));
    if (cat) guessCat = cat.id;
  }
}
```

### 4.2 Tahap 2: Penentuan Sub-Kategori Target (`guessItem`) via Sistem Scoring AI
1. **Normalisasi String:**
   - Mengubah `sepededa` -> `sepeda`
   - `gol iii` -> `gol 3`
   - `gol ii` -> `gol 2`
   - `gol i\b` -> `gol 1`
2. **Kriteria & Bobot Skor:**
   - **Dewasa:** `+10` jika nama sub kategori mengandung `dewasa`.
   - **Anak:** `+10` jika nama sub mengandung `anak` (dan bukan TSA/satwa).
   - **Taman Satwa Anak:** `+15` jika sub mengandung `satwa` atau `children`.
   - **Rombongan:** `+15` jika sub mengandung `rombongan`.
   - **Pusat Primata (Schmutzer):**
     - `+10` untuk kata primata/schmutzer.
     - **Sinkronisasi Kalender:**
       - Jika API Libur dan Sub Libur: `+100`
       - Jika API Weekday dan Sub Weekday: `+100`
       - Jika Silang (API Libur tapi Sub Weekday atau sebaliknya): `-100` (penalti keras)
   - **Kendaraan:**
     - Sepeda: `+30`
     - Motor: `+30`
     - Gol 1: `+30`
     - Gol 2: `+30`
     - Gol 3 / Mobil: `+30`
3. Sub kategori dengan skor tertinggi (`bestScore`) otomatis terpilih sebagai `guessItem`.

---

## 5. Logika Ruang Transit & Injeksi ke Form (`confirmTransitInjection`)

### 5.1 Alur Pengambilan Bertahap (3A lalu IWM)
1. **Tarik Data 3A:** Data 3A diambil dan masuk ke Ruang Transit 3A. Pengguna mengonfirmasi "Import ke Form". Data 3A tersimpan di STSU.
2. **Tarik Data IWM:** Pengguna menarik data IWM pada tanggal yang sama.
   - Karena tanggal sudah memiliki data, modal menampilkan konfirmasi:
     - **"Gabungkan" (`isOverwriting = false`):** Mempertahankan seluruh data 3A dan menambahkan data IWM. Jika item sama, nominal dijumlahkan (`formData[key] += amount`).
     - **"Ya, Timpa Data" (`isOverwriting = true`):** Mengganti seluruh data tanggal tersebut.

### 5.2 Kode Injeksi yang Aman
```javascript
let newItems = transitModal.isOverwriting ? [] : [...(typeData.activeItems || [])];
let newFormData = transitModal.isOverwriting ? {} : { ...(typeData.formData || {}) };

transitModal.data.forEach(t => {
  if (t.mappedCat && t.mappedItem) {
    const finalNote = activeType === 'lain' ? (lainItemNote || '') : (t.itemNote || ''); 
    const key = getActiveItemKey(t.mappedCat, t.mappedItem, isAddingSusulan, susulanValidDate, lainItemDate, finalNote);
    const exists = newItems.find(i => getActiveItemKey(i.catId, i.itemId || i.id, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === key);
    
    if (!exists) {
      newItems.push({ 
        catId: t.mappedCat, 
        itemId: t.mappedItem, 
        isSusulan: isAddingSusulan, 
        validDate: susulanValidDate, 
        itemDate: lainItemDate, 
        itemNote: finalNote 
      });
    }
    
    newFormData[key] = (newFormData[key] || 0) + Number(t.amount);
  }
});
```

---

## 6. Logika Rekon Bank & Pemasangan Bukti Transfer

1. **Parser CSV Rekening Koran Bank DKI:**
   - Kolom C: Tanggal Transaksi
   - Kolom D: Keterangan Mutasi
   - Kolom F: Nominal Kredit (Penerimaan)
2. **Pemasangan Transaksi (*Pairing*):**
   - Transaksi bank dipasangkan dengan grup kategori STSU pada tanggal terkait.
   - Status: `Sudah dipasangkan` / `Belum dipasangkan`.
   - Link Bukti Transfer: Mendukung URL dokumen/gambar transfer yang disimpan di `proofUrl`.
   - Fitur *Unlink*: Melepaskan pasangan mutasi bank jika terjadi kesalahan input tanpa menghapus data mutasi aslinya.

---

## 7. Rencana Pemisahan Modular (*Modular Architecture Plan*)

Untuk menjaga kode tetap aman dan tidak saling mengganggu:

| No | Modul yang Dipisahkan | File Target | Tanggung Jawab |
|---|---|---|---|
| 1 | Bot Transit Logic | `src/services/transitBotService.js` | Berisi `smartMappingAI`, `process3aData`, dan fetcher Bot 3A/IWM. |
| 2 | Transit Modal Component | `src/components/transit/TransitModal.jsx` | UI Ruang Transit 3A & IWM. |
| 3 | Rekon Bank & Pairing | `src/components/rekon/RekonBankTab.jsx` | UI Rekon Bank, parser CSV, dan modal pemasangan bukti. |
| 4 | Cetak NCR & STSU | `src/components/print/PrintManager.jsx` | Template cetak A4 dan dot matrix NCR A5. |
| 5 | Master & Target | `src/components/master/MasterManager.jsx` | Master Kategori, Tanda Tangan, dan Target Pendapatan. |
| 6 | Form Input Harian | `src/components/input/InputHarianTab.jsx` | Form input STSU & SU/L transaksi harian. |
