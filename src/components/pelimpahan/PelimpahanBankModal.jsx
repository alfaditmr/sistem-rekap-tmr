import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
  Copy,
  Check,
  Calendar,
  Share2,
  Building,
  CreditCard,
  Layers,
  Car,
  Camera,
  FileSpreadsheet,
  Plus,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  Ticket
} from 'lucide-react';
import { formatRp, getLocalYMD, getActiveItemKey } from '../../utils/formatters';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format tanggal standar Indonesia: Tanggal DD MMMM YYYY
 */
const formatDateIndo = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const mIndex = parseInt(m, 10) - 1;
  const mName = MONTH_NAMES_ID[mIndex] || m;
  return `Tanggal ${d} ${mName} ${y}`;
};

/**
 * Ekstraksi data 6 channel secara komprehensif dari allReports untuk suatu tanggal
 */
export const extractChannelData = (dateStr, allReports = {}, categories = []) => {
  const dayAll = allReports[dateStr] || {};
  const rekon3a = dayAll.rekon3aSummary || null;
  const rekonIwm = dayAll.rekonIwmSettlement || null;

  // 1. TMR Old Gate
  let oldGateTrx = Number(rekonIwm?.jumlah_transaksi || 0);
  let oldGateNom = 0;

  // 2. TMR New Gate
  let newGateTrx = Number(rekon3a?.GATE?.transactionQty || 0);
  let newGateNom = 0;

  // 3. Golf Car (E-Car / Mobil Listrik)
  let golfCarTrx = 0;
  let golfCarNom = 0;

  // 4. Foto Satwa (Satwa Jinak / Jasa Foto)
  let fotoSatwaTrx = 0;
  let fotoSatwaNom = 0;

  // 5. Website Online (Merchant_Page)
  let onlineTrx = Number(rekon3a?.MERCHANT_PAGE?.transactionQty || 0);
  let onlineNom = 0;

  // 6. Ticket Vending Machine (TVM)
  let tvmTrx = Number(rekon3a?.TVM?.transactionQty || 0);
  let tvmNom = 0;

  // Telusuri seluruh dokumen transaksi (utama, lain, lain_1, dst)
  Object.keys(dayAll).forEach((tKey) => {
    const docData = dayAll[tKey];
    if (!docData || typeof docData !== 'object') return;

    // A. Periksa activeItems
    if (Array.isArray(docData.activeItems)) {
      docData.activeItems.forEach((ai) => {
        if (!ai) return;
        const cat = categories.find((c) => c.id === ai.catId);
        const catName = (cat?.name || '').toLowerCase();
        const catItem = cat?.items?.find((i) => i.id === (ai.itemId || ai.id));
        const itemName = (catItem?.name || ai.itemName || ai.name || '').toLowerCase();
        const itemNote = (ai.itemNote || '').toLowerCase();
        const combined = `${catName} ${itemName} ${itemNote}`;

        const inputKey = getActiveItemKey(
          ai.catId,
          ai.itemId || ai.id,
          ai.isSusulan,
          ai.validDate,
          ai.itemDate,
          ai.itemNote
        );

        const val = Number(
          docData.formData?.[inputKey] ||
          docData.formData?.[`${ai.catId}_${ai.itemId || ai.id}`] ||
          docData.formData?.[ai.catId] ||
          0
        );
        if (val <= 0) return;

        const qty = Number(ai.qty || 0);

        if (/old\s*gate|iwm/i.test(catName)) {
          oldGateNom += val;
        } else if (/new\s*gate/i.test(catName)) {
          newGateNom += val;
        } else if (/online|merchant/i.test(catName)) {
          onlineNom += val;
        } else if (/tvm|vending|vinding/i.test(catName)) {
          tvmNom += val;
        } else if (/golf\s*car|golfcar|e-car|ecar|mobil\s*listrik/i.test(combined)) {
          golfCarNom += val;
          golfCarTrx += qty > 0 ? qty : 1;
        } else if (/foto\s*satwa|satwa\s*jinak|berfoto\s*satwa|jasa\s*foto/i.test(combined)) {
          fotoSatwaNom += val;
          fotoSatwaTrx += qty > 0 ? qty : 1;
        }
      });
    }

    // B. Periksa sisa formData langsung jika activeItems belum terdaftar
    if (docData.formData) {
      Object.keys(docData.formData).forEach((fKey) => {
        const val = Number(docData.formData[fKey]) || 0;
        if (val <= 0) return;

        let catName = '';
        let itemName = '';
        const parts = fKey.split('_');
        if (parts.length >= 2 && parts[0] === 'cat') {
          const catId = `${parts[0]}_${parts[1]}`;
          const itemId = parts[2] === 'item' && parts[3] ? `${parts[2]}_${parts[3]}` : parts[2];
          const cat = categories.find((c) => c.id === catId);
          catName = (cat?.name || '').toLowerCase();
          const subItem = cat?.items?.find((i) => i.id === itemId);
          itemName = (subItem?.name || '').toLowerCase();
        }

        const combined = `${catName} ${itemName}`;
        // Hanya tambahkan jika nominal belum terisi dari activeItems
        if (oldGateNom === 0 && /old\s*gate|iwm/i.test(catName)) {
          oldGateNom += val;
        } else if (newGateNom === 0 && /new\s*gate/i.test(catName)) {
          newGateNom += val;
        } else if (onlineNom === 0 && /online|merchant/i.test(catName)) {
          onlineNom += val;
        } else if (tvmNom === 0 && /tvm|vending|vinding/i.test(catName)) {
          tvmNom += val;
        } else if (golfCarNom === 0 && /golf\s*car|golfcar|e-car|ecar|mobil\s*listrik/i.test(combined)) {
          golfCarNom += val;
          if (golfCarTrx === 0) golfCarTrx = 1;
        } else if (fotoSatwaNom === 0 && /foto\s*satwa|satwa\s*jinak|berfoto\s*satwa|jasa\s*foto/i.test(combined)) {
          fotoSatwaNom += val;
          if (fotoSatwaTrx === 0) fotoSatwaTrx = 1;
        }
      });
    }
  });

  // Fallback ke total nominal dari rekonsiliasi bot jika form belum terinput
  if (oldGateNom === 0 && rekonIwm?.nominal) oldGateNom = Number(rekonIwm.nominal);
  if (newGateNom === 0 && rekon3a?.GATE?.totalNominal) newGateNom = Number(rekon3a.GATE.totalNominal);
  if (onlineNom === 0 && rekon3a?.MERCHANT_PAGE?.totalNominal) onlineNom = Number(rekon3a.MERCHANT_PAGE.totalNominal);
  if (tvmNom === 0 && rekon3a?.TVM?.totalNominal) tvmNom = Number(rekon3a.TVM.totalNominal);

  // Logic Khusus Ketentuan Transaksi TMR:
  // 1. E-Car (Golf Car): 1 kali transaksi = Rp 250.000 (contoh: Rp 500.000 = 2 Trx, Rp 1.000.000 = 4 Trx)
  if (golfCarNom > 0) {
    golfCarTrx = Math.round(golfCarNom / 250000);
  }

  // 2. Foto Satwa: 1 kali transaksi = Rp 5.000 (contoh: Rp 500.000 = 100 Trx, Rp 425.000 = 85 Trx)
  if (fotoSatwaNom > 0) {
    fotoSatwaTrx = Math.round(fotoSatwaNom / 5000);
  }

  return {
    dateStr,
    oldGate: { trx: oldGateTrx, nominal: oldGateNom },
    newGate: { trx: newGateTrx, nominal: newGateNom },
    golfCar: { trx: golfCarTrx, nominal: golfCarNom },
    fotoSatwa: { trx: fotoSatwaTrx, nominal: fotoSatwaNom },
    online: { trx: onlineTrx, nominal: onlineNom },
    tvm: { trx: tvmTrx, nominal: tvmNom }
  };
};

export default function PelimpahanBankModal({
  isOpen,
  onClose,
  allReports = {},
  categories = [],
  rekonOfficerName = '',
  currentReport = {},
  signatures = {},
  handleUpdateRekonRow
}) {
  // Mode Pelimpahan: 'pelimpahan_1' (Old Gate, New Gate, Golf Car, Foto Satwa) atau 'pelimpahan_2' (Online & TVM)
  const [activeType, setActiveType] = useState('pelimpahan_1');

  // Daftar tanggal yang akan dilimpahkan
  const [selectedDates, setSelectedDates] = useState(() => {
    const today = getLocalYMD();
    return [today];
  });

  // Nilai custom/override jika diedit manual di tabel
  const [customData, setCustomData] = useState({});

  // Tanggal & Petugas Pelimpahan Bank
  const [bankRemitDate, setBankRemitDate] = useState(() => getLocalYMD());
  const [officerName, setOfficerName] = useState(rekonOfficerName || 'Petugas Rekon');

  // Input tambah tanggal manual
  const [newDateInput, setNewDateInput] = useState(() => getLocalYMD());

  // Input rentang tanggal
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [showRangePicker, setShowRangePicker] = useState(false);

  // Status feedback
  const [copied, setCopied] = useState(false);
  const [appliedToast, setAppliedToast] = useState(false);

  // Inisialisasi daftar tanggal saat modal dibuka (bisa default weekend terakhir jika hari Senin)
  useEffect(() => {
    if (isOpen && selectedDates.length === 0) {
      setSelectedDates([getLocalYMD()]);
    }
  }, [isOpen]);

  // Urutkan tanggal secara kronologis (ascending)
  const sortedDates = useMemo(() => {
    return [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
  }, [selectedDates]);

  // Data teragregasi untuk seluruh tanggal yang dipilih
  const aggregatedData = useMemo(() => {
    const map = {};
    sortedDates.forEach((dStr) => {
      const extracted = extractChannelData(dStr, allReports, categories);
      const overrides = customData[dStr] || {};

      map[dStr] = {
        dateStr: dStr,
        oldGate: {
          trx: overrides.oldGate?.trx !== undefined ? Number(overrides.oldGate.trx) : extracted.oldGate.trx,
          nominal: overrides.oldGate?.nominal !== undefined ? Number(overrides.oldGate.nominal) : extracted.oldGate.nominal
        },
        newGate: {
          trx: overrides.newGate?.trx !== undefined ? Number(overrides.newGate.trx) : extracted.newGate.trx,
          nominal: overrides.newGate?.nominal !== undefined ? Number(overrides.newGate.nominal) : extracted.newGate.nominal
        },
        golfCar: {
          trx: overrides.golfCar?.trx !== undefined ? Number(overrides.golfCar.trx) : extracted.golfCar.trx,
          nominal: overrides.golfCar?.nominal !== undefined ? Number(overrides.golfCar.nominal) : extracted.golfCar.nominal
        },
        fotoSatwa: {
          trx: overrides.fotoSatwa?.trx !== undefined ? Number(overrides.fotoSatwa.trx) : extracted.fotoSatwa.trx,
          nominal: overrides.fotoSatwa?.nominal !== undefined ? Number(overrides.fotoSatwa.nominal) : extracted.fotoSatwa.nominal
        },
        online: {
          trx: overrides.online?.trx !== undefined ? Number(overrides.online.trx) : extracted.online.trx,
          nominal: overrides.online?.nominal !== undefined ? Number(overrides.online.nominal) : extracted.online.nominal
        },
        tvm: {
          trx: overrides.tvm?.trx !== undefined ? Number(overrides.tvm.trx) : extracted.tvm.trx,
          nominal: overrides.tvm?.nominal !== undefined ? Number(overrides.tvm.nominal) : extracted.tvm.nominal
        }
      };
    });
    return map;
  }, [sortedDates, allReports, categories, customData]);

  // Handle edit langsung pada input cell
  const handleCellChange = (dateStr, channelKey, field, val) => {
    const num = val === '' ? 0 : Number(val.toString().replace(/[^\d]/g, ''));
    setCustomData((prev) => {
      const dayData = prev[dateStr] || {};
      const channelData = dayData[channelKey] || {};
      const nextChannel = {
        ...channelData,
        [field]: isNaN(num) ? 0 : num
      };

      // Auto update Trx jika nominal E-Car (250rb) atau Foto Satwa (5rb) diubah
      if (field === 'nominal') {
        if (channelKey === 'golfCar') {
          nextChannel.trx = Math.round((isNaN(num) ? 0 : num) / 250000);
        } else if (channelKey === 'fotoSatwa') {
          nextChannel.trx = Math.round((isNaN(num) ? 0 : num) / 5000);
        }
      }

      return {
        ...prev,
        [dateStr]: {
          ...dayData,
          [channelKey]: nextChannel
        }
      };
    });
  };

  // Reset override tanggal tertentu
  const handleResetDate = (dateStr) => {
    setCustomData((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  };

  // Hapus tanggal dari list
  const handleRemoveDate = (dateStr) => {
    setSelectedDates((prev) => prev.filter((d) => d !== dateStr));
    setCustomData((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  };

  // Tambah tanggal tunggal
  const handleAddDate = () => {
    if (!newDateInput || selectedDates.includes(newDateInput)) return;
    setSelectedDates((prev) => [...prev, newDateInput]);
  };

  // Preset Cepat: Weekend Terakhir (Jumat, Sabtu, Minggu)
  const handleSetWeekendPreset = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0: Min, 1: Sen, ... 5: Jum, 6: Sab

    // Hitung hari Minggu terakhir (atau hari ini jika Minggu)
    const sundayOffset = currentDay === 0 ? 0 : currentDay;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - sundayOffset);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() - 1);

    const friday = new Date(sunday);
    friday.setDate(sunday.getDate() - 2);

    const formatYMD = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    setSelectedDates([formatYMD(friday), formatYMD(saturday), formatYMD(sunday)]);
  };

  // Preset Cepat: Hari Ini
  const handleSetTodayPreset = () => {
    setSelectedDates([getLocalYMD()]);
  };

  // Preset Cepat: Kemarin
  const handleSetYesterdayPreset = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const ymd = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    setSelectedDates([ymd]);
  };

  // Terapkan Rentang Tanggal
  const handleApplyDateRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (start > end) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir!');
      return;
    }

    const dates = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(
        `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`
      );
      curr.setDate(curr.getDate() + 1);
    }
    setSelectedDates(dates);
    setShowRangePicker(false);
  };

  // ============================================================================
  // GENERATOR FORMAT PESAN WHATSAPP SESUAI FORMAT BAKU RESMI TMR
  // ============================================================================

  const generatedMessage = useMemo(() => {
    if (sortedDates.length === 0) {
      return 'Belum ada tanggal yang dipilih.';
    }

    if (activeType === 'pelimpahan_1') {
      // -------------------------------------------------------------
      // FORMAT REKON PELIMPAHAN 1:
      // Grouping per channel: TMR OLD GATE, TMR NEW GATE, Golf Car, Foto Satwa
      // (Format langsung tanpa 'rekon pelimpahan 1 >>' dan kosong tidak ditulis)
      // -------------------------------------------------------------
      const formatTrxRp = (trx, rp) => {
        const trxFormatted = Number(trx || 0).toLocaleString('id-ID');
        const rpFormatted = Number(rp || 0).toLocaleString('id-ID');
        return `( ${trxFormatted} Trx / Rp. ${rpFormatted} )`;
      };

      const sections = [];

      // 1. TMR OLD GATE
      const linesOldGate = sortedDates
        .filter((d) => {
          const row = aggregatedData[d]?.oldGate;
          return row && (Number(row.trx) > 0 || Number(row.nominal) > 0);
        })
        .map((d) => {
          const row = aggregatedData[d].oldGate;
          return `${formatDateIndo(d)} ${formatTrxRp(row.trx, row.nominal)}`;
        });
      if (linesOldGate.length > 0) {
        sections.push(`TMR OLD GATE\n${linesOldGate.join('\n')}`);
      }

      // 2. TMR NEW GATE
      const linesNewGate = sortedDates
        .filter((d) => {
          const row = aggregatedData[d]?.newGate;
          return row && (Number(row.trx) > 0 || Number(row.nominal) > 0);
        })
        .map((d) => {
          const row = aggregatedData[d].newGate;
          return `${formatDateIndo(d)} ${formatTrxRp(row.trx, row.nominal)}`;
        });
      if (linesNewGate.length > 0) {
        sections.push(`TMR NEW GATE\n${linesNewGate.join('\n')}`);
      }

      // 3. Golf Car (E-Car: 250rb / Trx)
      const linesGolfCar = sortedDates
        .filter((d) => {
          const row = aggregatedData[d]?.golfCar;
          return row && (Number(row.trx) > 0 || Number(row.nominal) > 0);
        })
        .map((d) => {
          const row = aggregatedData[d].golfCar;
          return `${formatDateIndo(d)} ${formatTrxRp(row.trx, row.nominal)}`;
        });
      if (linesGolfCar.length > 0) {
        sections.push(`Golf Car\n${linesGolfCar.join('\n')}`);
      }

      // 4. Foto Satwa (5rb / Trx)
      const linesFotoSatwa = sortedDates
        .filter((d) => {
          const row = aggregatedData[d]?.fotoSatwa;
          return row && (Number(row.trx) > 0 || Number(row.nominal) > 0);
        })
        .map((d) => {
          const row = aggregatedData[d].fotoSatwa;
          return `${formatDateIndo(d)} ${formatTrxRp(row.trx, row.nominal)}`;
        });
      if (linesFotoSatwa.length > 0) {
        sections.push(`Foto Satwa\n${linesFotoSatwa.join('\n')}`);
      }

      if (sections.length === 0) {
        return 'Tidak ada transaksi pada tanggal yang dipilih.';
      }

      return `${sections.join('\n\n')}\n\nSilahkan dilimpahkan\nTerima kasih 🙏`;
    } else {
      // -------------------------------------------------------------
      // FORMAT REKON PELIMPAHAN 2:
      // Grouping per tanggal: Website Online ( Merchant_Page ) & TVM
      // (Kosong tidak dituliskan)
      // -------------------------------------------------------------
      const dateBlocks = [];
      sortedDates.forEach((d) => {
        const online = aggregatedData[d]?.online || { trx: 0, nominal: 0 };
        const tvm = aggregatedData[d]?.tvm || { trx: 0, nominal: 0 };

        const trxOnline = Number(online.trx || 0);
        const nomOnline = Number(online.nominal || 0);
        const trxTvm = Number(tvm.trx || 0);
        const nomTvm = Number(tvm.nominal || 0);

        // Jika kedua channel 0, lewati tanggal tersebut
        if (trxOnline === 0 && nomOnline === 0 && trxTvm === 0 && nomTvm === 0) {
          return;
        }

        const lines = [`${formatDateIndo(d)}`];

        if (trxOnline > 0 || nomOnline > 0) {
          lines.push(`Website Online ( Merchant_Page )`);
          lines.push(`${trxOnline.toLocaleString('id-ID')} Trx Rp.${nomOnline.toLocaleString('id-ID')}`);
        }

        if (trxTvm > 0 || nomTvm > 0) {
          lines.push(`Tiket Vending Machine ( TVM )`);
          lines.push(`${trxTvm.toLocaleString('id-ID')} Trx Rp.${nomTvm.toLocaleString('id-ID')}`);
        }

        dateBlocks.push(lines.join('\n'));
      });

      if (dateBlocks.length === 0) {
        return 'Tidak ada transaksi pada tanggal yang dipilih.';
      }

      return `Selamat Siang\n\n${dateBlocks.join('\n\n')}\n\nSilahkan dilimpahkan\nTerima kasih 🙏`;
    }
  }, [activeType, sortedDates, aggregatedData]);

  // Total akumulasi untuk indikator ringkasan
  const totalSummary = useMemo(() => {
    let totTrx = 0;
    let totNom = 0;

    sortedDates.forEach((d) => {
      const row = aggregatedData[d];
      if (!row) return;

      if (activeType === 'pelimpahan_1') {
        totTrx += (row.oldGate.trx || 0) + (row.newGate.trx || 0) + (row.golfCar.trx || 0) + (row.fotoSatwa.trx || 0);
        totNom += (row.oldGate.nominal || 0) + (row.newGate.nominal || 0) + (row.golfCar.nominal || 0) + (row.fotoSatwa.nominal || 0);
      } else {
        totTrx += (row.online.trx || 0) + (row.tvm.trx || 0);
        totNom += (row.online.nominal || 0) + (row.tvm.nominal || 0);
      }
    });

    return { totTrx, totNom };
  }, [activeType, sortedDates, aggregatedData]);

  // Salin ke Clipboard
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      alert('Gagal menyalin teks secara otomatis. Silakan salin manual.');
    }
  };

  // Buka langsung di WhatsApp
  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(generatedMessage);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Terapkan Tanggal Pelimpahan ke database Rekon (mengupdate signatureDate dan rekonOfficer)
  const handleApplyToRekonReports = () => {
    if (!handleUpdateRekonRow) {
      alert('Fungsi update rekon tidak tersedia.');
      return;
    }
    if (!bankRemitDate) {
      alert('Pilih tanggal pelimpahan bank terlebih dahulu!');
      return;
    }

    if (
      !window.confirm(
        `Terapkan tanggal pelimpahan ${bankRemitDate} untuk ${sortedDates.length} tanggal yang dipilih ke data Laporan Rekonsiliasi?`
      )
    ) {
      return;
    }

    sortedDates.forEach((dStr) => {
      handleUpdateRekonRow(dStr, false, null, 'signatureDate', bankRemitDate, 'utama');
      if (officerName) {
        handleUpdateRekonRow(dStr, false, null, 'rekonOfficer', officerName, 'utama');
      }
    });

    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 3000);
  };

  // Unduh Memo Pelimpahan dalam format Excel (.xls)
  const handleDownloadExcelMemo = () => {
    const isP1 = activeType === 'pelimpahan_1';
    const title = isP1 ? 'REKON PELIMPAHAN 1' : 'REKON PELIMPAHAN 2';

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .header { font-size: 14pt; font-weight: bold; text-align: center; }
          .sub-header { font-size: 11pt; font-weight: bold; text-align: center; margin-bottom: 15px; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #2e7d32; color: #ffffff; border: 1px solid #000000; padding: 6px; text-align: center; font-size: 10pt; }
          td { border: 1px solid #000000; padding: 5px; font-size: 10pt; }
          .total-row { background-color: #c8e6c9; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">UNIT PENGELOLA TAMAN MARGASATWA RAGUNAN</div>
        <div class="sub-header">${title} - DAFTAR PELIMPAHAN KE PIHAK BANK</div>
        <p><strong>Tanggal Pelimpahan Bank:</strong> ${formatDateIndo(bankRemitDate)} | <strong>Petugas:</strong> ${officerName}</p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal Transaksi</th>
              ${
                isP1
                  ? `
                <th>Old Gate (Trx)</th><th>Old Gate (Rp)</th>
                <th>New Gate (Trx)</th><th>New Gate (Rp)</th>
                <th>Golf Car (Trx)</th><th>Golf Car (Rp)</th>
                <th>Foto Satwa (Trx)</th><th>Foto Satwa (Rp)</th>
              `
                  : `
                <th>Online (Trx)</th><th>Online (Rp)</th>
                <th>TVM (Trx)</th><th>TVM (Rp)</th>
              `
              }
              <th>Total Trx</th>
              <th>Total Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
    `;

    sortedDates.forEach((d, idx) => {
      const row = aggregatedData[d];
      let rowTrx = 0;
      let rowNom = 0;

      if (isP1) {
        rowTrx = (row.oldGate.trx || 0) + (row.newGate.trx || 0) + (row.golfCar.trx || 0) + (row.fotoSatwa.trx || 0);
        rowNom = (row.oldGate.nominal || 0) + (row.newGate.nominal || 0) + (row.golfCar.nominal || 0) + (row.fotoSatwa.nominal || 0);
        tableHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="text-align: center;">${d}</td>
            <td style="text-align: right;">${(row.oldGate.trx || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.oldGate.nominal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.newGate.trx || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.newGate.nominal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.golfCar.trx || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.golfCar.nominal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.fotoSatwa.trx || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.fotoSatwa.nominal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right; font-weight: bold;">${rowTrx.toLocaleString('id-ID')}</td>
            <td style="text-align: right; font-weight: bold;">${rowNom.toLocaleString('id-ID')}</td>
          </tr>
        `;
      } else {
        rowTrx = (row.online.trx || 0) + (row.tvm.trx || 0);
        rowNom = (row.online.nominal || 0) + (row.tvm.nominal || 0);
        tableHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="text-align: center;">${d}</td>
            <td style="text-align: right;">${(row.online.trx || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.online.nominal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.tvm.trx || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(row.tvm.nominal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: right; font-weight: bold;">${rowTrx.toLocaleString('id-ID')}</td>
            <td style="text-align: right; font-weight: bold;">${rowNom.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }
    });

    tableHtml += `
          <tr class="total-row">
            <td colspan="${isP1 ? 10 : 6}" style="text-align: right;">GRAND TOTAL</td>
            <td style="text-align: right;">${totalSummary.totTrx.toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${totalSummary.totNom.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>
      </body></html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title} - ${bankRemitDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-inner">
              <Send size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Fitur Pelimpahan ke Pihak Bank</span>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/50 text-white px-2 py-0.5 rounded-full border border-emerald-300/40">
                  Resmi TMR
                </span>
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                Pilih tanggal pelimpahan (multi-date untuk weekend/libur) & otomatis hasilkan format memo bank
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
          {/* 1. TAB PILIHAN: REKON PELIMPAHAN 1 vs REKON PELIMPAHAN 2 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            <button
              onClick={() => setActiveType('pelimpahan_1')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeType === 'pelimpahan_1'
                  ? 'bg-emerald-600 text-white shadow-md scale-[1.01]'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-white/70'
              }`}
            >
              <Building size={16} />
              <span>Rekon Pelimpahan 1 (Old Gate, New Gate, Golf Car, Foto Satwa)</span>
            </button>
            <button
              onClick={() => setActiveType('pelimpahan_2')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeType === 'pelimpahan_2'
                  ? 'bg-teal-600 text-white shadow-md scale-[1.01]'
                  : 'text-gray-600 hover:text-teal-700 hover:bg-white/70'
              }`}
            >
              <CreditCard size={16} />
              <span>Rekon Pelimpahan 2 (Website Online & TVM)</span>
            </button>
          </div>

          {/* 2. AREA PEMILIHAN TANGGAL (MULTI-DATE / WEEKEND SUPPORT) */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-700" />
                <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                  Pilih Tanggal Transaksi yang Dilimpahkan ({sortedDates.length} Tanggal)
                </span>
              </div>

              {/* Preset Tombol Cepat */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSetTodayPreset}
                  className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold shadow-2xs transition-colors"
                >
                  ⚡ Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterdayPreset}
                  className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold shadow-2xs transition-colors"
                >
                  ⚡ Kemarin
                </button>
                <button
                  type="button"
                  onClick={handleSetWeekendPreset}
                  className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-black shadow-2xs transition-all"
                  title="Pilih otomatis hari Jumat, Sabtu, dan Minggu terakhir"
                >
                  🔥 Weekend Terakhir (Jum, Sab, Min)
                </button>
                <button
                  type="button"
                  onClick={() => setShowRangePicker(!showRangePicker)}
                  className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold shadow-2xs transition-colors"
                >
                  📅 Rentang Tanggal
                </button>
              </div>
            </div>

            {/* Popup Rentang Tanggal jika dibuka */}
            {showRangePicker && (
              <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-sm flex flex-wrap items-center gap-2 text-xs animate-in fade-in">
                <span className="font-bold text-gray-700">Dari:</span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="font-bold text-gray-700">Sampai:</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyDateRange}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                >
                  Terapkan Rentang
                </button>
                <button
                  type="button"
                  onClick={() => setShowRangePicker(false)}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            )}

            {/* Chips / Badge Daftar Tanggal yang Terpilih */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {sortedDates.map((d) => (
                <div
                  key={d}
                  className="bg-white px-2.5 py-1 rounded-xl border border-emerald-300 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-emerald-950 font-mono"
                >
                  <span>{d}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDate(d)}
                    className="text-gray-400 hover:text-red-500 rounded-full p-0.5 transition-colors"
                    title={`Hapus tanggal ${d}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Tambah Tanggal Tambahan */}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddDate}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Plus size={14} />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. KPI RINGKASAN TOTAL DILIMPAHKAN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Transaksi
                </span>
                <div className="text-xl font-black text-emerald-900 mt-0.5">
                  {totalSummary.totTrx.toLocaleString('id-ID')} Trx
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Layers size={18} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-3.5 rounded-2xl border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Total Nominal Pelimpahan
                </span>
                <div className="text-xl font-black text-teal-900 mt-0.5">
                  Rp {formatRp(totalSummary.totNom)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                <CreditCard size={18} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3.5 rounded-2xl border border-indigo-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                  Jumlah Hari Terpilih
                </span>
                <div className="text-xl font-black text-indigo-900 mt-0.5">
                  {sortedDates.length} Hari Transaksi
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Calendar size={18} />
              </div>
            </div>
          </div>

          {/* 4. DUA KOLOM: EDITABLE TABLE (KIRI) & LIVE PREVIEW PESAN WHATSAPP (KANAN) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* KOLOM KIRI: EDITABLE RINCIAN DATA (6 Cols) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <span>Rincian Data Per Tanggal</span>
                  <span className="text-[10px] font-normal text-gray-500 lowercase">(bisa diedit jika perlu koreksi)</span>
                </h3>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-gray-200 max-h-[380px] overflow-y-auto">
                {sortedDates.map((dStr) => {
                  const data = aggregatedData[dStr];
                  return (
                    <div key={dStr} className="p-3 bg-white hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                        <span className="font-bold text-xs text-gray-800 font-mono">
                          📅 {formatDateIndo(dStr)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResetDate(dStr)}
                          className="text-[10px] text-gray-500 hover:text-emerald-700 font-medium flex items-center gap-1"
                          title="Kembalikan ke data asli sistem"
                        >
                          <RefreshCw size={11} /> Reset
                        </button>
                      </div>

                      {activeType === 'pelimpahan_1' ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Old Gate */}
                          <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                            <span className="text-[10px] font-bold text-purple-900 uppercase">TMR Old Gate</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={data.oldGate.trx}
                                onChange={(e) => handleCellChange(dStr, 'oldGate', 'trx', e.target.value)}
                                className="w-16 bg-white border border-purple-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-purple-900"
                                placeholder="Trx"
                              />
                              <span className="text-[10px] text-gray-500">Trx</span>
                              <input
                                type="text"
                                value={data.oldGate.nominal}
                                onChange={(e) => handleCellChange(dStr, 'oldGate', 'nominal', e.target.value)}
                                className="w-full bg-white border border-purple-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-purple-900"
                                placeholder="Rp"
                              />
                            </div>
                          </div>

                          {/* New Gate */}
                          <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
                            <span className="text-[10px] font-bold text-blue-900 uppercase">TMR New Gate</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={data.newGate.trx}
                                onChange={(e) => handleCellChange(dStr, 'newGate', 'trx', e.target.value)}
                                className="w-16 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-blue-900"
                                placeholder="Trx"
                              />
                              <span className="text-[10px] text-gray-500">Trx</span>
                              <input
                                type="text"
                                value={data.newGate.nominal}
                                onChange={(e) => handleCellChange(dStr, 'newGate', 'nominal', e.target.value)}
                                className="w-full bg-white border border-blue-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-blue-900"
                                placeholder="Rp"
                              />
                            </div>
                          </div>

                          {/* Golf Car */}
                          <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-900 uppercase">Golf Car</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={data.golfCar.trx}
                                onChange={(e) => handleCellChange(dStr, 'golfCar', 'trx', e.target.value)}
                                className="w-16 bg-white border border-emerald-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-emerald-900"
                                placeholder="Trx"
                              />
                              <span className="text-[10px] text-gray-500">Trx</span>
                              <input
                                type="text"
                                value={data.golfCar.nominal}
                                onChange={(e) => handleCellChange(dStr, 'golfCar', 'nominal', e.target.value)}
                                className="w-full bg-white border border-emerald-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-emerald-900"
                                placeholder="Rp"
                              />
                            </div>
                          </div>

                          {/* Foto Satwa */}
                          <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
                            <span className="text-[10px] font-bold text-amber-900 uppercase">Foto Satwa</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={data.fotoSatwa.trx}
                                onChange={(e) => handleCellChange(dStr, 'fotoSatwa', 'trx', e.target.value)}
                                className="w-16 bg-white border border-amber-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-amber-900"
                                placeholder="Trx"
                              />
                              <span className="text-[10px] text-gray-500">Trx</span>
                              <input
                                type="text"
                                value={data.fotoSatwa.nominal}
                                onChange={(e) => handleCellChange(dStr, 'fotoSatwa', 'nominal', e.target.value)}
                                className="w-full bg-white border border-amber-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-amber-900"
                                placeholder="Rp"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Online */}
                          <div className="p-2 rounded-xl bg-cyan-50/60 border border-cyan-100 space-y-1">
                            <span className="text-[10px] font-bold text-cyan-900 uppercase">Website Online</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={data.online.trx}
                                onChange={(e) => handleCellChange(dStr, 'online', 'trx', e.target.value)}
                                className="w-16 bg-white border border-cyan-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-cyan-900"
                                placeholder="Trx"
                              />
                              <span className="text-[10px] text-gray-500">Trx</span>
                              <input
                                type="text"
                                value={data.online.nominal}
                                onChange={(e) => handleCellChange(dStr, 'online', 'nominal', e.target.value)}
                                className="w-full bg-white border border-cyan-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-cyan-900"
                                placeholder="Rp"
                              />
                            </div>
                          </div>

                          {/* TVM */}
                          <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                            <span className="text-[10px] font-bold text-indigo-900 uppercase">Tiket Vending Machine (TVM)</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={data.tvm.trx}
                                onChange={(e) => handleCellChange(dStr, 'tvm', 'trx', e.target.value)}
                                className="w-16 bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-indigo-900"
                                placeholder="Trx"
                              />
                              <span className="text-[10px] text-gray-500">Trx</span>
                              <input
                                type="text"
                                value={data.tvm.nominal}
                                onChange={(e) => handleCellChange(dStr, 'tvm', 'nominal', e.target.value)}
                                className="w-full bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-indigo-900"
                                placeholder="Rp"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KOLOM KANAN: LIVE PREVIEW PESAN WHATSAPP & ACTION BUTTONS (6 Cols) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <span>Format Pesan Bank / WhatsApp</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded font-bold">Live Preview</span>
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {generatedMessage.length} karakter
                </span>
              </div>

              {/* Textarea Live Output */}
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedMessage}
                  rows={14}
                  className="w-full p-3.5 bg-gray-900 text-emerald-400 font-mono text-xs rounded-2xl border border-gray-700 shadow-inner focus:outline-none resize-none leading-relaxed select-all"
                />
              </div>

              {/* Tombol Aksi Utama Pesan */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Pesan (Copy)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Share2 size={16} />
                  <span>Kirim ke WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcelMemo}
                  className="py-2.5 px-3 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  title="Unduh Excel Memo Pelimpahan (.xls)"
                >
                  <FileSpreadsheet size={15} />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. FITUR SINKRONISASI TANGGAL PELIMPAHAN KE DATA REKON */}
          <div className="p-4 bg-gradient-to-r from-gray-50 via-emerald-50/30 to-gray-50 rounded-2xl border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <span className="text-xs font-black text-gray-800">
                  Sinkronisasi Tanggal Pelimpahan ke Laporan Rekonsiliasi
                </span>
              </div>
              <p className="text-[11px] text-gray-600">
                Otomatis mengisi kolom <em>Tanggal Pelimpahan</em> untuk {sortedDates.length} tanggal transaksi ini pada tabel Rekon Mitra.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs bg-white border border-gray-300 rounded-xl px-2 py-1 shadow-2xs">
                <span className="font-semibold text-gray-500">Tgl Masuk Bank:</span>
                <input
                  type="date"
                  value={bankRemitDate}
                  onChange={(e) => setBankRemitDate(e.target.value)}
                  className="font-mono text-xs outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs bg-white border border-gray-300 rounded-xl px-2 py-1 shadow-2xs">
                <span className="font-semibold text-gray-500">Petugas:</span>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="text-xs outline-none bg-transparent w-24 font-bold text-indigo-700"
                  placeholder="Petugas"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyToRekonReports}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                  appliedToast
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {appliedToast ? <Check size={14} /> : <CheckCircle2 size={14} />}
                <span>{appliedToast ? 'Tersimpan ke Rekon!' : 'Terapkan ke Laporan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between shrink-0 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Format Rekon Pelimpahan:</span>
            <span>
              {activeType === 'pelimpahan_1'
                ? 'TMR Old Gate, New Gate, Golf Car, Foto Satwa'
                : 'Website Online (Merchant_Page) & TVM'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

