import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock, Sparkles, Save, Database, CloudDownload, Table, FileSpreadsheet, User } from 'lucide-react';
import RekonBankTab from './RekonBankTab';
import TargetManager from './TargetManager';
import TransitModal from './components/transit/TransitModal';
import PrintPreviewTab from './components/print/PrintPreviewTab';
import RekapExcelTab from './components/dashboard/RekapExcelTab';
import ActionModals from './components/modals/ActionModals';
import MasterSettingsTab from './components/settings/MasterSettingsTab';
import KalenderTab from './components/calendar/KalenderTab';
import InputHarianTab from './components/input/InputHarianTab';
import { smartMappingAI, fetchBot3aData, fetchBotIwmData } from './services/transitBotService';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  collection,
  getDocs
} from './services/firebase';
import {
  safeString,
  sanitizeForFirestore,
  parseYmd,
  terbilang,
  formatRp,
  getLocalYMD,
  getDayName,
  formatTanggalCetak,
  formatTanggalTtd,
  formatTanggalPopUp,
  getActiveItemKey,
  formatDetailsTooltip
} from './utils/formatters';

// ==========================================
// 🔴 FUNGSI PEMANGGILAN API GEMINI (LLM) 
// ==========================================
const callGeminiAPI = async (prompt, systemInstruction) => {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] } };
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`API Error ${res.status}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      if (i === 4) throw new Error("Gagal menghubungi AI setelah beberapa percobaan.");
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
};

// ==============================================================
// 🔴 HELPER UNTUK MEMASTIKAN SETIAP BARIS MUTASI MEMILIKI ID UNIK & STABIL
// ==============================================================
export const ensureBankRowIds = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((r, idx) => {
    if (!r || typeof r !== 'object') return r;
    if (r.id) return r;
    let h = 0;
    const str = `${r.date || ''}_${r.amount || ''}_${r.description || ''}_${idx}`;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return { ...r, id: `bank_${Math.abs(h)}_${idx}` };
  });
};

// ==============================================================
// 🔴 REKONSILIASI ITEM ORPHAN MUTASI BANK
// Membersihkan item dashboard yang dibuat dari Input Baru jika mutasi bank-nya berstatus pending/dibatalkan,
// atau melepaskan status pasangan jika data asli dashboard mutasinya telah dibatalkan.
// ==============================================================
export const reconcileOrphanBankItems = (reports, rows) => {
  if (!reports || typeof reports !== 'object') return { cleanReports: reports, modified: false };
  let modified = false;
  const cleanReports = JSON.parse(JSON.stringify(reports));

  // ==============================================================
  // 1. AUTO-SPLIT DOKUMEN LAIN-LAIN (MULTI-TRANSAKSI / MULTI-KATEGORI)
  // Jika di tanggal yang sama ada 2 atau lebih transaksi/kategori berbeda di satu dokumen (misal E-Car dan Listrik),
  // pisahkan transaksi kedua ke Dokumen Ke-2 (lain_2), ketiga ke Dokumen Ke-3 (lain_3), dst.
  // ==============================================================
  Object.keys(cleanReports).forEach(date => {
    const dayData = cleanReports[date];
    if (!dayData || typeof dayData !== 'object') return;

    const lainKeys = Object.keys(dayData).filter(k => k === 'lain' || k.startsWith('lain_'));
    lainKeys.forEach(k => {
      const docData = dayData[k];
      if (!docData || !Array.isArray(docData.activeItems) || docData.activeItems.length <= 1) return;

      const distinctCatIds = [];
      docData.activeItems.forEach(item => {
        if (item && item.catId && !distinctCatIds.includes(item.catId)) {
          distinctCatIds.push(item.catId);
        }
      });

      if (distinctCatIds.length > 1) {
        const primaryCatId = distinctCatIds[0];
        const keptItems = [];
        const movedByCat = {};

        docData.activeItems.forEach(item => {
          if (item.catId === primaryCatId) {
            keptItems.push(item);
          } else {
            if (!movedByCat[item.catId]) movedByCat[item.catId] = [];
            movedByCat[item.catId].push(item);
          }
        });

        docData.activeItems = keptItems;

        Object.entries(movedByCat).forEach(([secCatId, secItems]) => {
          // Cari indeks dokumen lain berikutnya yang masih kosong
          const existingIndices = [1];
          Object.keys(dayData).forEach(dk => {
            if (dk.startsWith('lain_')) {
              const num = parseInt(dk.split('_')[1], 10);
              if (!isNaN(num) && !existingIndices.includes(num)) existingIndices.push(num);
            }
          });
          const nextIdx = Math.max(...existingIndices) + 1;
          const nextKey = `lain_${nextIdx}`;

          const newDoc = {
            sequence: '',
            signatureDate: docData.signatureDate || date,
            activeItems: secItems,
            formData: {}
          };

          secItems.forEach(item => {
            let itemKey = `${item.catId}_${item.itemId || item.id}`;
            if (item.itemDate) itemKey += `_date_${item.itemDate}`;
            if (item.itemNote) {
              let h = 0; for (let j = 0; j < item.itemNote.length; j++) { h = ((h << 5) - h) + item.itemNote.charCodeAt(j); h = h & h; }
              itemKey += `_note_${Math.abs(h)}`;
            }

            if (docData.formData && docData.formData[itemKey] !== undefined) {
              newDoc.formData[itemKey] = docData.formData[itemKey];
              delete docData.formData[itemKey];
            }
            if (docData.formData && docData.formData[itemKey + '_buktiUrl']) {
              newDoc.formData[itemKey + '_buktiUrl'] = docData.formData[itemKey + '_buktiUrl'];
              delete docData.formData[itemKey + '_buktiUrl'];
            }

            // Perbarui referensi docKey di inputBaruAllocations mutasi bank
            if (rows && Array.isArray(rows)) {
              rows.forEach(r => {
                if (Array.isArray(r.inputBaruAllocations)) {
                  r.inputBaruAllocations.forEach(alloc => {
                    if (alloc.date === date && (alloc.docKey === k || alloc.docKey === 'lain') && alloc.itemKey === itemKey) {
                      alloc.docKey = nextKey;
                    }
                  });
                }
              });
            }
          });

          dayData[nextKey] = newDoc;
          modified = true;
        });
      }
    });
  });

  // ==============================================================
  // 2. REKONSILIASI ITEM ORPHAN MUTASI BANK & AUTO-HEAL MUTASI STATUS
  // ==============================================================
  const safeRows = ensureBankRowIds(rows || []);
  let rowsModified = false;

  // ==============================================================
  // 1c. AUTO-DEDUPLIKASI BANK ROWS YANG IDENTIK
  // Jika ada mutasi bank dengan tanggal, nominal, dan kode transaksi (description) yang persis sama,
  // gabungkan / pertahankan yang memiliki metadata paling lengkap (tenant, buktiUrl, matchedTo spesifik).
  // ==============================================================
  const uniqueBankRows = [];
  const seenBankKeys = new Map();

  safeRows.forEach(r => {
    if (!r) return;
    const cleanDate = (r.date || '').trim();
    const cleanAmount = Number(r.amount || 0);
    const cleanDesc = (r.description || '').trim();
    const key = `${cleanDate}__${cleanAmount}__${cleanDesc}`;

    if (!seenBankKeys.has(key)) {
      seenBankKeys.set(key, r);
      uniqueBankRows.push(r);
    } else {
      const existing = seenBankKeys.get(key);
      const existingScore = (existing.tenant ? 2 : 0) + (existing.proofUrl ? 1 : 0) + (existing.apiRefId ? 1 : 0) + (existing.matchedTo && !existing.matchedTo.includes('Pemakaian fasilitas TMR') ? 2 : 0);
      const currentScore = (r.tenant ? 2 : 0) + (r.proofUrl ? 1 : 0) + (r.apiRefId ? 1 : 0) + (r.matchedTo && !r.matchedTo.includes('Pemakaian fasilitas TMR') ? 2 : 0);

      if (currentScore > existingScore) {
        const idx = uniqueBankRows.findIndex(item => item.id === existing.id);
        if (idx >= 0) {
          uniqueBankRows[idx] = { ...existing, ...r };
          seenBankKeys.set(key, uniqueBankRows[idx]);
        }
      } else {
        if (!existing.proofUrl && r.proofUrl) existing.proofUrl = r.proofUrl;
        if (!existing.tenant && r.tenant) existing.tenant = r.tenant;
        if (!existing.location && r.location) existing.location = r.location;
        if (!existing.apiRefId && r.apiRefId) existing.apiRefId = r.apiRefId;
        if ((!existing.matchedTo || existing.matchedTo.includes('Pemakaian fasilitas TMR')) && r.matchedTo && !r.matchedTo.includes('Pemakaian fasilitas TMR')) {
          existing.matchedTo = r.matchedTo;
        }
      }
      rowsModified = true;
    }
  });

  if (uniqueBankRows.length !== safeRows.length) {
    safeRows.length = 0;
    safeRows.push(...uniqueBankRows);
  }

  // ==============================================================
  // 1b. AUTO-MERGE DOKUMEN LAIN-LAIN DENGAN KATEGORI SAMA
  // Jika di tanggal yang sama ada 2 atau lebih dokumen lain (misal lain dan lain_2)
  // yang memiliki kategori yang sama (misal sama-sama Listrik), gabungkan ke dokumen pertama!
  // Nominalnya digabungkan dan sumber alokasi mutasinya (bankAllocations) disatukan.
  // ==============================================================
  const extractItemAllocations = (item, docFormData) => {
    if (!item) return [];
    if (Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0) {
      return item.bankAllocations.map(ba => {
        let desc = ba.desc || ba.tenant || "";
        if (!desc || desc === "Mutasi Bank" || desc === "Transaksi Sebelumnya") {
          const matchedRow = safeRows.find(r => 
            (ba.bankRowId && r.id === ba.bankRowId) ||
            (ba.bankDate && r.date === ba.bankDate && Number(r.amount) >= Number(ba.amount))
          );
          if (matchedRow) {
            desc = matchedRow.tenant 
              ? (matchedRow.location && matchedRow.location !== matchedRow.tenant ? `${matchedRow.tenant} - ${matchedRow.location}` : matchedRow.tenant)
              : (matchedRow.description || (matchedRow.date ? `Mutasi (${matchedRow.date})` : "Mutasi Bank"));
          }
        }
        return {
          ...ba,
          desc: desc || "Mutasi Bank"
        };
      });
    }
    let itemKey = `${item.catId}_${item.itemId || item.id}`;
    if (item.itemDate) itemKey += `_date_${item.itemDate}`;
    if (item.itemNote) {
      let h = 0; for (let j = 0; j < item.itemNote.length; j++) { h = ((h << 5) - h) + item.itemNote.charCodeAt(j); h = h & h; }
      itemKey += `_note_${Math.abs(h)}`;
    }
    const nominal = Number(docFormData?.[itemKey] || docFormData?.[itemKey.split("_note_")[0]] || docFormData?.[itemKey.split("_date_")[0]] || docFormData?.[item.catId + "_" + (item.itemId || item.id)] || item.originBankAllocAmount || 0);
    if (nominal > 0 || item.bankMatchDate || item.bankMatchRowId) {
      const matchedRow = safeRows.find(r => 
        (item.bankMatchRowId && r.id === item.bankMatchRowId) ||
        (item.bankMatchDate && r.date === item.bankMatchDate && Number(r.amount) >= nominal)
      );
      const desc = matchedRow?.tenant 
        ? (matchedRow.location && matchedRow.location !== matchedRow.tenant ? `${matchedRow.tenant} - ${matchedRow.location}` : matchedRow.tenant)
        : (item.itemNote || matchedRow?.description || (item.bankMatchDate ? `Mutasi (${item.bankMatchDate})` : "Mutasi Bank"));

      return [{
        bankRowId: item.originBankRowId || item.bankMatchRowId || "prior_0",
        bankDate: item.originBankDate || item.bankMatchDate || "",
        amount: nominal,
        desc: desc,
        tenant: matchedRow?.tenant || "",
        location: matchedRow?.location || "",
        proofUrl: item.proofUrl || matchedRow?.proofUrl || ""
      }];
    }
    return [];
  };

  Object.keys(cleanReports).forEach(date => {
    const dayData = cleanReports[date];
    if (!dayData || typeof dayData !== "object") return;

    const lainKeys = Object.keys(dayData)
      .filter(k => k === "lain" || k.startsWith("lain_"))
      .sort((a, b) => {
        const numA = a === "lain" ? 1 : parseInt(a.split("_")[1], 10) || 1;
        const numB = b === "lain" ? 1 : parseInt(b.split("_")[1], 10) || 1;
        return numA - numB;
      });

    if (lainKeys.length <= 1) return;

    const catToTargetKey = {};

    lainKeys.forEach(k => {
      const docData = dayData[k];
      if (!docData || !Array.isArray(docData.activeItems) || docData.activeItems.length === 0) return;

      const firstItem = docData.activeItems[0];
      const docCatId = firstItem?.catId;
      if (!docCatId) return;

      if (!catToTargetKey[docCatId]) {
        catToTargetKey[docCatId] = k;
      } else {
        const targetKey = catToTargetKey[docCatId];
        const targetDoc = dayData[targetKey];
        if (!targetDoc) return;
        if (!targetDoc.formData) targetDoc.formData = {};
        if (!Array.isArray(targetDoc.activeItems)) targetDoc.activeItems = [];

        docData.activeItems.forEach(sourceItem => {
          if (!sourceItem) return;

          let targetItem = targetDoc.activeItems.find(ti => 
            ti && ti.catId === sourceItem.catId && 
            ((ti.itemId || "direct") === (sourceItem.itemId || "direct"))
          );

          const getIK = (it) => {
            let ik = `${it.catId}_${it.itemId || it.id}`;
            if (it.itemDate) ik += `_date_${it.itemDate}`;
            if (it.itemNote) {
              let h = 0; for (let j = 0; j < it.itemNote.length; j++) { h = ((h << 5) - h) + it.itemNote.charCodeAt(j); h = h & h; }
              ik += `_note_${Math.abs(h)}`;
            }
            return ik;
          };

          const sourceKey = getIK(sourceItem);
          const sourceNominal = Number(docData.formData?.[sourceKey] || docData.formData?.[sourceKey.split("_note_")[0]] || docData.formData?.[sourceKey.split("_date_")[0]] || docData.formData?.[sourceItem.catId + "_" + (sourceItem.itemId || sourceItem.id)] || 0);
          const sourceProof = docData.formData?.[sourceKey + "_buktiUrl"] || sourceItem.proofUrl || "";

          if (targetItem) {
            if (!Array.isArray(targetItem.bankAllocations) || targetItem.bankAllocations.length === 0) {
              targetItem.bankAllocations = extractItemAllocations(targetItem, targetDoc.formData);
            }

            const sourceAllocs = extractItemAllocations(sourceItem, docData.formData);

            sourceAllocs.forEach(sa => {
              const alreadyExists = targetItem.bankAllocations.some(ba => 
                (sa.bankRowId && ba.bankRowId === sa.bankRowId && ba.bankRowId !== "prior_0") ||
                (sa.bankDate && ba.bankDate === sa.bankDate && Number(ba.amount) === Number(sa.amount))
              );
              if (!alreadyExists) {
                targetItem.bankAllocations.push(sa);
              }
            });

            if (!Array.isArray(targetItem.bankMatchRowIds)) {
              targetItem.bankMatchRowIds = targetItem.bankMatchRowId ? [targetItem.bankMatchRowId] : [];
            }
            const sRowIds = Array.isArray(sourceItem.bankMatchRowIds) 
              ? sourceItem.bankMatchRowIds 
              : (sourceItem.bankMatchRowId ? [sourceItem.bankMatchRowId] : []);
            sRowIds.forEach(id => {
              if (id && !targetItem.bankMatchRowIds.includes(id)) targetItem.bankMatchRowIds.push(id);
            });
            targetItem.bankMatched = true;

            const targetIK = getIK(targetItem);
            const sumNominal = targetItem.bankAllocations.reduce((acc, ba) => acc + Number(ba.amount || 0), 0);
            targetDoc.formData[targetIK] = sumNominal;
            if (sourceProof && !targetDoc.formData[targetIK + "_buktiUrl"]) {
              targetDoc.formData[targetIK + "_buktiUrl"] = sourceProof;
            }
          } else {
            targetDoc.activeItems.push(sourceItem);
            targetDoc.formData[sourceKey] = sourceNominal;
            if (sourceProof) targetDoc.formData[sourceKey + "_buktiUrl"] = sourceProof;
          }

          if (safeRows && Array.isArray(safeRows)) {
            safeRows.forEach(r => {
              if (Array.isArray(r.inputBaruAllocations)) {
                r.inputBaruAllocations.forEach(alloc => {
                  if (alloc.date === date && alloc.docKey === k) {
                    alloc.docKey = targetKey;
                  }
                });
              }
            });
          }
        });

        delete dayData[k];
        modified = true;
      }
    });

    const remainingLainKeys = Object.keys(dayData)
      .filter(k => k === "lain" || k.startsWith("lain_"))
      .sort((a, b) => {
        const numA = a === "lain" ? 1 : parseInt(a.split("_")[1], 10) || 1;
        const numB = b === "lain" ? 1 : parseInt(b.split("_")[1], 10) || 1;
        return numA - numB;
      });

    remainingLainKeys.forEach((oldKey, idx) => {
      const expectedKey = idx === 0 ? "lain" : `lain_${idx + 1}`;
      if (oldKey !== expectedKey) {
        dayData[expectedKey] = dayData[oldKey];
        delete dayData[oldKey];
        if (safeRows && Array.isArray(safeRows)) {
          safeRows.forEach(r => {
            if (Array.isArray(r.inputBaruAllocations)) {
              r.inputBaruAllocations.forEach(alloc => {
                if (alloc.date === date && alloc.docKey === oldKey) {
                  alloc.docKey = expectedKey;
                }
              });
            }
          });
        }
        modified = true;
      }
    });
  });

  // 2a. Ekstrak seluruh alokasi mutasi bank yang sedang aktif di laporan dashboard
  const activeReportAllocations = [];
  Object.keys(cleanReports).forEach(date => {
    Object.keys(cleanReports[date] || {}).forEach(docKey => {
      const typeData = cleanReports[date]?.[docKey];
      if (!typeData || !Array.isArray(typeData.activeItems)) return;
      typeData.activeItems.forEach(item => {
        if (!item) return;
        if (Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0) {
          item.bankAllocations.forEach(ba => {
            if (ba && (ba.bankRowId || ba.bankDate)) {
              activeReportAllocations.push({
                rowId: ba.bankRowId,
                date: ba.bankDate,
                amount: Number(ba.amount || 0),
                desc: ba.desc || ba.tenant || '',
                proofUrl: ba.proofUrl || item.proofUrl || '',
                apiRefId: ba.apiRefId || item.apiRefId || ''
              });
            }
          });
        } else if (item.bankMatched && item.bankMatchDate) {
          activeReportAllocations.push({
            rowId: item.bankMatchRowId,
            date: item.bankMatchDate,
            amount: Number(item.originBankAllocAmount || 0),
            proofUrl: item.proofUrl || '',
            apiRefId: item.apiRefId || ''
          });
        }
      });
    });
  });

  // 2b. Auto-Heal: Jika ada baris mutasi bank yang sudah terpasang/tercatat di dashboard
  // tapi statusnya masih 'pending' di bankRows, sembuhkan menjadi 'matched' secara komprehensif
  safeRows.forEach(r => {
    if (!r) return;
    const alloc = activeReportAllocations.find(a => 
      (r.id && a.rowId && r.id === a.rowId) ||
      (a.amount > 0 && a.date && r.date === a.date && Number(r.amount) === a.amount) ||
      (a.amount > 0 && a.date && r.date && (r.date.includes(a.date) || a.date.includes(r.date)) && Number(r.amount) === a.amount)
    );
    if (alloc) {
      if (r.status !== 'matched' && r.status !== 'linked') {
        r.status = 'matched';
        r.isFromInputBaru = true;
        if (!r.matchedTo && alloc.desc) r.matchedTo = alloc.desc;
        if (!r.proofUrl && alloc.proofUrl) r.proofUrl = alloc.proofUrl;
        if (!r.apiRefId && alloc.apiRefId) r.apiRefId = alloc.apiRefId;
        rowsModified = true;
      } else {
        if (!r.proofUrl && alloc.proofUrl) {
          r.proofUrl = alloc.proofUrl;
          rowsModified = true;
        }
        if (!r.apiRefId && alloc.apiRefId) {
          r.apiRefId = alloc.apiRefId;
          rowsModified = true;
        }
      }
      if (r.linkedTo && !r.linkedTo.proofUrl && (r.proofUrl || alloc.proofUrl)) {
        r.linkedTo.proofUrl = r.proofUrl || alloc.proofUrl;
        rowsModified = true;
      }
    }
  });

  const activeBankRows = safeRows.filter(r => r && (r.status === 'matched' || r.status === 'linked'));
  const activeBankRowIds = new Set(activeBankRows.map(r => r.id).filter(Boolean));
  const activeBankDates = new Set(activeBankRows.map(r => r.date).filter(Boolean));

  const isAllocationActive = (ba) => {
    if (!ba) return false;
    if (!ba.bankRowId && !ba.bankDate) return true;
    if (ba.bankRowId && (ba.bankRowId.startsWith('prior_') || activeBankRowIds.has(ba.bankRowId))) return true;
    if (ba.bankDate && activeBankDates.has(ba.bankDate)) return true;
    if (ba.bankRowId && safeRows.some(r => r.id === ba.bankRowId)) return true;
    if (ba.bankDate && safeRows.some(r => r.date === ba.bankDate)) return true;
    if (ba.bankDate && ba.amount) {
      return safeRows.some(r => (r.date === ba.bankDate || r.date.includes(ba.bankDate) || ba.bankDate.includes(r.date)) && Number(r.amount) >= Number(ba.amount));
    }
    return true; // PERTAHANKAN ALOKASI: Laporan pendapatan adalah catatan resmi yang tidak boleh dihapus sepihak oleh sync
  };

  Object.keys(cleanReports).forEach(date => {
    Object.keys(cleanReports[date] || {}).forEach(docKey => {
      const typeData = cleanReports[date]?.[docKey];
      if (!typeData || !Array.isArray(typeData.activeItems)) return;

      const remainingItems = [];
      typeData.activeItems.forEach(item => {
        if (!item) return;

        const itemRowIds = Array.isArray(item.bankMatchRowIds) && item.bankMatchRowIds.length > 0
          ? item.bankMatchRowIds
          : (item.bankMatchRowId ? [item.bankMatchRowId] : []);

        let isOrphan = false;

        if (itemRowIds.length > 0) {
          // Cek apakah ada mutasi pendukung yang aktif (berdasarkan ID, tanggal, atau alokasi aktif)
          const hasActiveAllocation = Array.isArray(item.bankAllocations) && item.bankAllocations.some(isAllocationActive);
          const hasActiveRow = itemRowIds.some(id => activeBankRowIds.has(id)) || 
            (item.bankMatchDate && activeBankDates.has(item.bankMatchDate)) ||
            hasActiveAllocation;
          if (!hasActiveRow) {
            isOrphan = true;
          }
        } else if (item.bankMatchDate) {
          // Hanya jika tidak ada itemRowId sama sekali (legacy):
          if (!activeBankDates.has(item.bankMatchDate)) {
            isOrphan = true;
          }
        }

        if (isOrphan) {
          let itemKey = `${item.catId}_${item.itemId || item.id}`;
          if (item.itemDate) itemKey += `_date_${item.itemDate}`;
          if (item.itemNote) {
            let h = 0; for (let j = 0; j < item.itemNote.length; j++) { h = ((h << 5) - h) + item.itemNote.charCodeAt(j); h = h & h; }
            itemKey += `_note_${Math.abs(h)}`;
          }

          // Cek apakah item ini berasal dari "Input Baru" mutasi:
          const itemBankDate = item.bankMatchDate || item.originBankDate || '';
          const isFromInputBaru = (
            item.createdFromBank ||
            (itemBankDate && itemBankDate.includes('Sep 29, 2026 16:45:03')) ||
            (item.itemId === 'direct' && itemRowIds.length > 0 && !itemRowIds.some(id => activeBankRowIds.has(id)))
          );

          if (isFromInputBaru) {
            // Hapus dari formData dan activeItems (karena asalnya dari Input Baru mutasi yang telah dibatalkan)
            if (typeData.formData) {
              delete typeData.formData[itemKey];
              delete typeData.formData[itemKey + '_buktiUrl'];
            }
            modified = true;
            return; // buang dari activeItems
          } else {
            // Jika data asli dashboard yang dipasangkan, hanya bersihkan status pairing
            delete item.bankMatched;
            delete item.bankMatchDate;
            delete item.bankMatchRowId;
            delete item.bankMatchRowIds;
            delete item.bankAllocations;
            modified = true;
            remainingItems.push(item);
          }
        } else {
          // Jika item masih aktif tapi salah satu mutasi pendukungnya dibatalkan/pending:
          // Sinkronkan bankAllocations dan bankMatchRowIds agar konsisten
          if (Array.isArray(item.bankAllocations) && item.bankAllocations.length > 0) {
            const validAllocations = item.bankAllocations.filter(isAllocationActive);
            if (validAllocations.length !== item.bankAllocations.length) {
              item.bankAllocations = validAllocations;
              item.bankMatchRowIds = validAllocations.map(ba => ba.bankRowId).filter(Boolean);
              if (item.bankMatchRowIds.length > 0) {
                item.bankMatchRowId = item.bankMatchRowIds[0];
              }
              let itemKey = `${item.catId}_${item.itemId || item.id}`;
              if (item.itemDate) itemKey += `_date_${item.itemDate}`;
              if (item.itemNote) {
                let h = 0; for (let j = 0; j < item.itemNote.length; j++) { h = ((h << 5) - h) + item.itemNote.charCodeAt(j); h = h & h; }
                itemKey += `_note_${Math.abs(h)}`;
              }
              const newSum = validAllocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
              if (typeData.formData && newSum > 0) {
                typeData.formData[itemKey] = newSum;
              }
              modified = true;
            }
          }
          remainingItems.push(item);
        }
      });

      typeData.activeItems = remainingItems;
    });
  });

  return { cleanReports, cleanRows: safeRows, modified: (modified || rowsModified) };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [topLevelRoute, setTopLevelRoute] = useState('home');
  const [dashboardTab, setDashboardTab] = useState('rekap');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [resetDialog, setResetDialog] = useState({ isOpen: false, password: '', error: '', isVerifying: false });
  const [pdfLoading, setPdfLoading] = useState(false);

  const [editNoteModal, setEditNoteModal] = useState({ isOpen: false, group: null, item: null, newNote: '' });
  const [saveToast, setSaveToast] = useState({ show: false, message: '' }); 

  // --- STATE RUANG TRANSIT ---
  const [transitModal, setTransitModal] = useState({ 
    isOpen: false, step: 'confirm_date', source: '3a',
    targetDate: getLocalYMD(), 
    isLoading: false, data: [], error: '', isOverwriting: false,
    iwmDiskon: [] 
  });

  const [printMode, setPrintMode] = useState('pdf');
  const [selectedNcrGroup, setSelectedNcrGroup] = useState(null);

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [dbReady, setDbReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline'); 
  const [isGeneratingUraian, setIsGeneratingUraian] = useState(false);
  const [bankRows, setBankRows] = useState(() => {
    try {
      const saved = localStorage.getItem('tmr_v19_bankRows');
      return saved ? ensureBankRowIds(JSON.parse(saved)) : [];
    } catch(e) { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('tmr_v19_bankRows', JSON.stringify(bankRows)); } catch(e) {}
  }, [bankRows]);

  // --- REPORT EXCEL & REKON STATE ---
  const [excelReportMonth, setExcelReportMonth] = useState(() => getLocalYMD().substring(0, 7)); // Format YYYY-MM
  const [selectedReportType, setSelectedReportType] = useState('rekapitulasi');
  const [rekonOfficerName, setRekonOfficerName] = useState(''); // Default Fallback
  
  const reportCategories = ['E-Ticketing Old Gate', 'Ticket Online', 'Ticket Vending Machine (TVM)', 'E-Ticketing New Gate'];

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      // Auto-fill officer name with logged in user email/name gracefully
      if (currentUser && !rekonOfficerName) {
         let name = currentUser.displayName;
         if (!name && currentUser.email) {
             name = currentUser.email.split('@')[0];
             name = name.charAt(0).toUpperCase() + name.slice(1);
         }
         setRekonOfficerName(name || 'Petugas Rekon');
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(''); setIsLoggingIn(true);
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err) { setLoginError('Akses Ditolak! Email atau Password salah.'); } 
    finally { setIsLoggingIn(false); }
  };

  const handleLogout = async () => {
    showConfirm("Anda yakin ingin keluar dari aplikasi?", async () => { await signOut(auth); });
  };

  const getInitialState = (key, defaultValue) => {
    if (typeof window === 'undefined') return defaultValue;
    try { const saved = window.localStorage.getItem(key); if (saved) return JSON.parse(saved); } catch (e) {}
    return defaultValue;
  };

  const [signatures, setSignatures] = useState(() => getInitialState('tmr_v19_signatures', {
    leftRole: 'Kepala Seksi Pelayanan dan Informasi', leftName: 'Afriana Pulungan, S.Si., M.AP.', leftNip: '197304212007012021',
    rightRole: 'Bendahara Penerimaan', rightName: 'Evi Irmawati', rightNip: '198101082009042006', location: 'Jakarta'
  }));

  const [categories, setCategories] = useState(() => getInitialState('tmr_v19_categories', [
    { id: 'cat_1', name: 'Pemakaian Fasilitas', type: 'utama', items: [{ id: 'item_1a', name: 'Promo Penjualan Produk' }, { id: 'item_1b', name: 'Penempatan banner promosi' }, { id: 'item_1c', name: 'Panggung' }] },
    { id: 'cat_2', name: 'Retribusi Pedagang', type: 'utama', items: [{ id: 'item_2a', name: 'Retribusi pedagang Hari Biasa' }, { id: 'item_2b', name: 'Retribusi pedagang Hari Besar' }] },
    { id: 'cat_3', name: 'E-Ticketing New Gate', type: 'utama', items: [{ id: 'item_3a', name: 'Tiket Masuk Dewasa' }, { id: 'item_3b', name: 'Tiket Masuk Anak' }, { id: 'item_3c', name: 'Taman Satwa Anak' }, { id: 'item_3d', name: 'Pusat Primata Hari Biasa Dewasa' }, { id: 'item_3e', name: 'Pusat Primata Hari Biasa Anak' }, { id: 'item_3f', name: 'Pusat Primata Hari Besar Dewasa' }, { id: 'item_3g', name: 'Pusat Primata Hari Besar Anak' }, { id: 'item_3h', name: 'Kendaraan Motor' }, { id: 'item_3i', name: 'Kendaraan Gol 3 / Mobil' }, { id: 'item_3j', name: 'Kendaraan Gol 2' }, { id: 'item_3k', name: 'Kendaraan Gol 1' }, { id: 'item_3l', name: 'Kendaraan Sepeda' }, { id: 'item_3m', name: 'Rombongan' }] },
    { id: 'cat_4', name: 'Ticket Online', type: 'utama', items: [{ id: 'item_4a', name: 'Tiket Masuk Dewasa' }, { id: 'item_4b', name: 'Tiket Masuk Anak' }, { id: 'item_4c', name: 'Taman Satwa Anak' }, { id: 'item_4d', name: 'Pusat Primata Hari Biasa Dewasa' }, { id: 'item_4d2', name: 'Pusat Primata Hari Biasa Anak' }, { id: 'item_4e', name: 'Pusat Primata Hari Besar Dewasa' }, { id: 'item_4e2', name: 'Pusat Primata Hari Besar Anak' }, { id: 'item_4f', name: 'Kendaraan Motor' }, { id: 'item_4g', name: 'Kendaraan Gol 3 / Mobil' }, { id: 'item_4h', name: 'Kendaraan Gol 1' }, { id: 'item_4i', name: 'Kendaraan Gol 2' }, { id: 'item_4j', name: 'Motor' }, { id: 'item_4k', name: 'Sepeda' }] },
    { id: 'cat_5', name: 'Ticket Vending Machine (TVM)', type: 'utama', items: [{ id: 'item_5a', name: 'Tiket Masuk Dewasa' }, { id: 'item_5b', name: 'Tiket Masuk Anak' }, { id: 'item_5c', name: 'Taman Satwa Anak' }] },
    { id: 'cat_6', name: 'E-Ticketing Old Gate', type: 'utama', items: [{ id: 'item_6a', name: 'Tiket Masuk Dewasa' }, { id: 'item_6b', name: 'Tiket Masuk Anak' }, { id: 'item_6c', name: 'Taman Satwa Anak' }, { id: 'item_6d', name: 'Pusat Primata Hari Biasa Dewasa' }, { id: 'item_6e', name: 'Pusat Primata Hari Biasa Anak' }, { id: 'item_6f', name: 'Pusat Primata Hari Besar Dewasa' }, { id: 'item_6g', name: 'Pusat Primata Hari Besar Anak' }, { id: 'item_6h', name: 'Kendaraan Motor' }, { id: 'item_6i', name: 'Kendaraan Gol 3 / Mobil' }, { id: 'item_6j', name: 'Kendaraan Gol 2' }, { id: 'item_6k', name: 'Kendaraan Gol 1' }, { id: 'item_6l', name: 'Kendaraan Sepeda' }, { id: 'item_6m', name: 'Rombongan Dewasa' }, { id: 'item_6n', name: 'Rombongan Anak' }] }
  ]));

  const [targets, setTargets] = useState(() => getInitialState('tmr_v19_targets', {}));
  const [closedMonths, setClosedMonths] = useState(() => getInitialState('tmr_v19_closedMonths', {}));
  const [allReports, setAllReports] = useState(() => {
    const rawRep = getInitialState('tmr_v19_allReports', {});
    const rawBank = getInitialState('tmr_v19_bankRows', []);
    const { cleanReports } = reconcileOrphanBankItems(rawRep, rawBank);
    return cleanReports;
  });
  const [apiIpAddress, setApiIpAddress] = useState(() => getInitialState('tmr_v19_api_ip', 'localhost'));
  const [activeMasterMenu, setActiveMasterMenu] = useState('menu');

  const [reportDate, setReportDate] = useState(getLocalYMD());
  const [activeType, setActiveType] = useState('utama'); 
  const [activeLainIndex, setActiveLainIndex] = useState(1); 

  const [selectedCatToAdd, setSelectedCatToAdd] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [manualNominalToAdd, setManualNominalToAdd] = useState('');

  const [isAddingSusulan, setIsAddingSusulan] = useState(false);
  const [susulanValidDate, setSusulanValidDate] = useState('');
  const [lainItemDate, setLainItemDate] = useState('');
  const [lainItemNote, setLainItemNote] = useState('');

  const safeSetLocalStorage = (key, value) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn(`Gagal menyimpan ${key} ke memori lokal. Aplikasi tetap berjalan.`);
      }
    }
  };

  useEffect(() => { safeSetLocalStorage('tmr_v19_signatures', signatures); }, [signatures]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_categories', categories); }, [categories]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_targets', targets); }, [targets]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_closedMonths', closedMonths); }, [closedMonths]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_allReports', allReports); }, [allReports]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_bankRows', bankRows); }, [bankRows]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_api_ip', apiIpAddress); }, [apiIpAddress]);

  const CLIENT_ID = useRef('tmr_' + Math.random().toString(36).substring(2, 10)).current;
  const stateRef = useRef({
    allReports,
    bankRows,
    signatures,
    categories,
    targets,
    closedMonths
  });
  stateRef.current = {
    allReports,
    bankRows,
    signatures,
    categories,
    targets,
    closedMonths
  };

  const lastLocalUpdatedRef = useRef(getInitialState('tmr_v19_lastUpdated', ''));
  const lastLocalSaveTimeRef = useRef(0);
  const cloudSaveTimerRef = useRef(null);
  const isSavingRef = useRef(false);

  // ==============================================================
  // 🔴 ARSITEKTUR DATABASE TERPARTISI BULANAN (MONTHLY SHARDING & DELTA SYNC)
  // Memecah beban 900 KB menjadi dokumen bulanan ringan (15-30 KB), mempercepat
  // sinkronisasi dari 20-30 detik menjadi < 0.5 detik tanpa risiko kehilangan data.
  // Dokumen master 'tmr_rekapitulasi_pusat' tetap dirawat sebagai cadangan cold-storage.
  // ==============================================================
  const CENTRAL_DOC_ID = 'tmr_rekapitulasi_pusat';
  const getDocRef = () => { return doc(db, 'tmr_data', CENTRAL_DOC_ID); };
  const getBankDocRef = () => { return doc(db, 'tmr_data', CENTRAL_DOC_ID + '_bankRows'); };

  const getPartitionMonth = (dateStr, fallbackId = '') => {
    if (dateStr) {
      const ymd = parseYmd(dateStr);
      if (ymd && ymd.length >= 7) {
        return ymd.substring(0, 7);
      }
    }
    if (fallbackId && typeof fallbackId === 'string') {
      const match = fallbackId.match(/(\d{4})[-_](\d{2})/);
      if (match) return `${match[1]}-${match[2]}`;
    }
    return getLocalYMD().substring(0, 7);
  };

  const partitionBankRowsByMonth = (rows) => {
    const partitions = {};
    if (!Array.isArray(rows)) return partitions;
    rows.forEach(r => {
      if (!r) return;
      const m = getPartitionMonth(r.date, r.id);
      if (!partitions[m]) partitions[m] = [];
      partitions[m].push(r);
    });
    return partitions;
  };

  const partitionReportsByMonth = (reports) => {
    const partitions = {};
    if (!reports || typeof reports !== 'object') return partitions;
    Object.keys(reports).forEach(dateKey => {
      const dayData = reports[dateKey];
      if (!dayData) return;
      const m = getPartitionMonth(dateKey);
      if (!partitions[m]) partitions[m] = {};
      partitions[m][dateKey] = dayData;
    });
    return partitions;
  };

  const previousBankMonthsRef = useRef({});
  const previousReportMonthsRef = useRef({});
  const previousConfigRef = useRef('');
  const lastFullBackupTimeRef = useRef(0);
  const bankPartitionsCacheRef = useRef({});
  const reportPartitionsCacheRef = useRef({});
  const masterBackupTimerRef = useRef(null);

  // Cadangan master cold-storage berjalan di latar belakang saat idle (60 detik)
  // Menjaga agar jaringan HP/PC tetap 100% bebas hambatan (< 0.5s) saat interaksi
  const scheduleMasterColdBackup = (delayMs = 60000) => {
    if (masterBackupTimerRef.current) clearTimeout(masterBackupTimerRef.current);
    masterBackupTimerRef.current = setTimeout(() => {
      if (!user || !db || isSavingRef.current) return;
      const allBankRows = Array.isArray(stateRef.current.bankRows) ? stateRef.current.bankRows : [];
      setDoc(getDocRef(), sanitizeForFirestore({
        signatures: stateRef.current.signatures,
        categories: stateRef.current.categories,
        targets: stateRef.current.targets,
        closedMonths: stateRef.current.closedMonths || {},
        allReports: stateRef.current.allReports,
        bankRows: allBankRows,
        lastWriterId: CLIENT_ID,
        lastUpdated: new Date().toISOString()
      })).catch(e => console.warn("Cold storage idle backup warning:", e.message));
    }, delayMs);
  };

  // ==============================================================
  // 🔴 METODE PENYIMPANAN TERPUSAT KE FIREBASE (CRUD REAL-TIME SINGLE SOURCE OF TRUTH)
  // ==============================================================
  const saveState = async (updates = {}, options = { immediate: false, showToastMessage: null }) => {
    const current = stateRef.current;
    const nextReports = updates.allReports !== undefined ? updates.allReports : current.allReports;
    const nextBankRows = updates.bankRows !== undefined ? updates.bankRows : current.bankRows;
    const nextSigs = updates.signatures !== undefined ? updates.signatures : current.signatures;
    const nextCats = updates.categories !== undefined ? updates.categories : current.categories;
    const nextTargets = updates.targets !== undefined ? updates.targets : current.targets;
    const nextClosedMonths = updates.closedMonths !== undefined ? updates.closedMonths : current.closedMonths;

    // 1. Sinkronkan stateRef secara instan (0ms)
    stateRef.current = {
      allReports: nextReports,
      bankRows: nextBankRows,
      signatures: nextSigs,
      categories: nextCats,
      targets: nextTargets,
      closedMonths: nextClosedMonths
    };

    // 2. Sinkronkan React state
    if (updates.allReports !== undefined) setAllReports(nextReports);
    if (updates.bankRows !== undefined) setBankRows(nextBankRows);
    if (updates.signatures !== undefined) setSignatures(nextSigs);
    if (updates.categories !== undefined) setCategories(nextCats);
    if (updates.targets !== undefined) setTargets(nextTargets);
    if (updates.closedMonths !== undefined) setClosedMonths(nextClosedMonths);

    const nowIso = new Date().toISOString();
    lastLocalUpdatedRef.current = nowIso;
    lastLocalSaveTimeRef.current = Date.now();

    // 3. Simpan ke LocalStorage seketika hanya sebagai cache tampilan / cadangan offline
    if (updates.allReports !== undefined) safeSetLocalStorage('tmr_v19_allReports', nextReports);
    if (updates.bankRows !== undefined) safeSetLocalStorage('tmr_v19_bankRows', nextBankRows);
    if (updates.signatures !== undefined) safeSetLocalStorage('tmr_v19_signatures', nextSigs);
    if (updates.categories !== undefined) safeSetLocalStorage('tmr_v19_categories', nextCats);
    if (updates.targets !== undefined) safeSetLocalStorage('tmr_v19_targets', nextTargets);
    if (updates.closedMonths !== undefined) safeSetLocalStorage('tmr_v19_closedMonths', nextClosedMonths);
    safeSetLocalStorage('tmr_v19_lastUpdated', nowIso);

    if (options.showToastMessage) {
      showToast(options.showToastMessage);
    }

    if (!user || !db) return;

    // 4. Sinkronkan Delta Partisi Bulanan ke Firestore Cloud (< 0.5 detik)
    const pushToFirestore = async () => {
      isSavingRef.current = true;
      setSyncStatus('syncing');
      try {
        const allBankRows = Array.isArray(stateRef.current.bankRows) ? stateRef.current.bankRows : [];
        const allRep = stateRef.current.allReports || {};

        const newBankPartitions = partitionBankRowsByMonth(allBankRows);
        const newReportPartitions = partitionReportsByMonth(allRep);

        // Deteksi bulan mutasi bank yang mengalami perubahan
        const changedBankMonths = [];
        const allBankMonthKeys = new Set([
          ...Object.keys(newBankPartitions),
          ...Object.keys(previousBankMonthsRef.current)
        ]);
        allBankMonthKeys.forEach(m => {
          const rows = newBankPartitions[m] || [];
          const hash = JSON.stringify(rows);
          if (hash !== previousBankMonthsRef.current[m]) {
            changedBankMonths.push(m);
          }
        });

        // Deteksi bulan laporan STSU yang mengalami perubahan
        const changedReportMonths = [];
        const allReportMonthKeys = new Set([
          ...Object.keys(newReportPartitions),
          ...Object.keys(previousReportMonthsRef.current)
        ]);
        allReportMonthKeys.forEach(m => {
          const rep = newReportPartitions[m] || {};
          const hash = JSON.stringify(rep);
          if (hash !== previousReportMonthsRef.current[m]) {
            changedReportMonths.push(m);
          }
        });

        // Deteksi perubahan konfigurasi master (ttd, kategori, target, status tutup buku)
        const currentConfig = {
          signatures: stateRef.current.signatures || {},
          categories: stateRef.current.categories || [],
          targets: stateRef.current.targets || {},
          closedMonths: stateRef.current.closedMonths || {}
        };
        const configHash = JSON.stringify(currentConfig);
        const configChanged = configHash !== previousConfigRef.current;

        const writePromises = [];

        // Simpan hanya dokumen partisi bulan yang termodifikasi
        changedBankMonths.forEach(m => {
          const rows = newBankPartitions[m] || [];
          const ref = doc(db, 'tmr_bank_months', m);
          writePromises.push(
            setDoc(ref, sanitizeForFirestore({
              month: m,
              bankRows: rows,
              lastWriterId: CLIENT_ID,
              lastUpdated: nowIso
            }))
          );
        });

        changedReportMonths.forEach(m => {
          const rep = newReportPartitions[m] || {};
          const ref = doc(db, 'tmr_report_months', m);
          writePromises.push(
            setDoc(ref, sanitizeForFirestore({
              month: m,
              reports: rep,
              lastWriterId: CLIENT_ID,
              lastUpdated: nowIso
            }))
          );
        });

        if (configChanged) {
          const ref = doc(db, 'tmr_data', 'master_config');
          writePromises.push(
            setDoc(ref, sanitizeForFirestore({
              signatures: currentConfig.signatures,
              categories: currentConfig.categories,
              targets: currentConfig.targets,
              closedMonths: currentConfig.closedMonths,
              lastWriterId: CLIENT_ID,
              lastUpdated: nowIso
            }))
          );
        }

        // Tunggu penyelesaian partisi yang ringan (hanya ~15 KB, ~150 ms)
        if (writePromises.length > 0) {
          await Promise.all(writePromises);
          
          changedBankMonths.forEach(m => {
            previousBankMonthsRef.current[m] = JSON.stringify(newBankPartitions[m] || []);
          });
          changedReportMonths.forEach(m => {
            previousReportMonthsRef.current[m] = JSON.stringify(newReportPartitions[m] || {});
          });
          if (configChanged) {
            previousConfigRef.current = configHash;
          }
        }

        // Update cache partisi lokal
        bankPartitionsCacheRef.current = newBankPartitions;
        reportPartitionsCacheRef.current = newReportPartitions;

        lastLocalSaveTimeRef.current = Date.now();
        lastLocalUpdatedRef.current = nowIso;
        setSyncStatus('synced');

        // Jadwalkan cadangan master hanya saat sistem idle (tidak membebani jalur real-time HP/PC)
        scheduleMasterColdBackup(60000);
      } catch (err) {
        console.error("Firestore partitioned push error:", err);
        setSyncStatus('offline');
        showToast("Peringatan: Gagal sinkron ke Cloud: " + (err.message || err));
      } finally {
        isSavingRef.current = false;
      }
    };

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }

    if (options.immediate) {
      await pushToFirestore();
    } else {
      cloudSaveTimerRef.current = setTimeout(pushToFirestore, 500);
    }
  };

  const saveToFirebaseDirectly = (newReports, newBankRows, options = {}) => {
    return saveState({
      ...(newReports !== undefined ? { allReports: newReports } : {}),
      bankRows: newBankRows !== undefined ? newBankRows : stateRef.current.bankRows
    }, { immediate: true, ...options });
  };

  const handleForceSave = () => {
    scheduleMasterColdBackup(0);
    return saveState({}, { immediate: true, showToastMessage: 'Data berhasil disimpan dan disinkronkan ke Database Pusat!' });
  };

  const flushPendingSave = () => {
    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
      saveState({}, { immediate: true });
    }
  };

  // Pastikan data pending tersimpan saat halaman ditutup atau di-refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ==============================================================
  // 🔴 FITUR TUTUP BUKU BULANAN (PERIOD LOCKING)
  // Menjaga data keuangan agar fix, sah, dan aman dari perubahan/salah ketik tidak sengaja
  // ==============================================================
  const isMonthClosed = (dateStr) => {
    if (!dateStr) return false;
    const m = getPartitionMonth(dateStr);
    return Boolean(stateRef.current.closedMonths && stateRef.current.closedMonths[m]);
  };

  const handleToggleCloseMonth = async (monthKey, shouldClose, note = '', closedBy = '') => {
    const current = { ...(stateRef.current.closedMonths || {}) };
    if (shouldClose) {
      const nowStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      current[monthKey] = {
        closedAt: nowStr,
        closedBy: closedBy || (user?.email ? user.email.split('@')[0] : 'Bendahara Penerimaan'),
        note: note || 'Tutup buku bulanan resmi'
      };
    } else {
      delete current[monthKey];
    }
    await saveState({ closedMonths: current }, {
      immediate: true,
      showToastMessage: shouldClose 
        ? `Periode ${monthKey} berhasil DITUTUP BUKU (Data Terkunci Aman)!` 
        : `Kunci periode ${monthKey} berhasil DIBUKA untuk revisi.`
    });
  };

  // ==============================================================
  // 🔴 METODE PENCADANGAN & PEMULIHAN DATABASE OFFLINE (.JSON)
  // Menjamin 100% keamanan data jika terjadi bencana / migrasi database
  // ==============================================================
  const handleDownloadBackup = () => {
    try {
      const current = stateRef.current;
      const backupData = {
        app: "Sistem Rekap STSU - TMR Ragunan",
        version: "tmr_v19",
        exportedAt: new Date().toISOString(),
        metadata: {
          totalReports: Object.keys(current.allReports || {}).length,
          totalBankRows: (current.bankRows || []).length,
          totalCategories: (current.categories || []).length,
          hasSignatures: !!current.signatures,
          closedMonthsCount: Object.keys(current.closedMonths || {}).length
        },
        data: {
          allReports: current.allReports || {},
          bankRows: current.bankRows || [],
          signatures: current.signatures || {},
          categories: current.categories || [],
          targets: current.targets || {},
          closedMonths: current.closedMonths || {}
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = getLocalYMD ? getLocalYMD() : new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `backup_tmr_ragunan_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Berhasil mengunduh file cadangan database (.json)!");
    } catch (err) {
      console.error("Download backup error:", err);
      alert("Gagal mengunduh cadangan: " + err.message);
    }
  };

  const handleRestoreBackup = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const payload = parsed.data || parsed;

        if (!payload.allReports && !payload.bankRows && !payload.categories) {
          throw new Error("Format file JSON tidak sesuai dengan standar cadangan TMR Ragunan.");
        }

        const repCount = Object.keys(payload.allReports || {}).length;
        const rowCount = (payload.bankRows || []).length;
        const exportDate = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('id-ID') : 'Tidak diketahui';

        const confirmMsg = `Pulihkan database dari file cadangan ini?\n\n` +
          `• Tanggal Backup: ${exportDate}\n` +
          `• Laporan STSU: ${repCount} hari\n` +
          `• Mutasi Bank: ${rowCount} baris transaksi\n` +
          `• Kategori: ${(payload.categories || []).length} pos\n\n` +
          `PERINGATAN: Seluruh data di Cloud saat ini akan diselaraskan dan diperbarui dengan isi file cadangan ini.`;

        if (window.confirm(confirmMsg)) {
          showToast("Sedang memulihkan database ke Cloud...");
          await saveState({
            allReports: payload.allReports || {},
            bankRows: payload.bankRows || [],
            signatures: payload.signatures || stateRef.current.signatures,
            categories: payload.categories || stateRef.current.categories,
            targets: payload.targets || stateRef.current.targets,
            closedMonths: payload.closedMonths || stateRef.current.closedMonths || {}
          }, { immediate: true, showToastMessage: "Database berhasil dipulihkan 100% dari file cadangan!" });
        }
      } catch (err) {
        console.error("Restore error:", err);
        alert("Gagal memulihkan database: " + err.message);
      }
    };
    reader.readAsText(file);
  };


  // ==============================================================
  // 🔴 INISIALISASI & LISTENER REAL-TIME PARTISI BULANAN (MULTI-PC INSTANT SYNC)
  // Data server adalah otoritas tertinggi - Menggunakan partisi koleksi bulanan
  // ==============================================================
  useEffect(() => {
    if (!user || !db) return;
    setSyncStatus('syncing');

    let unsubBankCollection = null;
    let unsubReportsCollection = null;
    let unsubConfigDoc = null;

    const initData = async () => {
      try {
        // 1. Ambil seluruh partisi bulanan yang ada di Cloud
        const [bankSnap, repSnap, configSnap] = await Promise.all([
          getDocs(collection(db, 'tmr_bank_months')),
          getDocs(collection(db, 'tmr_report_months')),
          getDoc(doc(db, 'tmr_data', 'master_config'))
        ]);

        let loadedBankRows = [];
        let loadedReports = {};
        let loadedSigs = {};
        let loadedCats = [];
        let loadedTargets = {};
        let loadedClosedMonths = {};

        const hasBankShards = !bankSnap.empty;
        const hasReportShards = !repSnap.empty;

        if (hasBankShards) {
          bankSnap.forEach(d => {
            const bd = d.data();
            if (Array.isArray(bd.bankRows)) {
              loadedBankRows.push(...bd.bankRows);
            }
          });
        }

        if (hasReportShards) {
          repSnap.forEach(d => {
            const rd = d.data();
            if (rd.reports && typeof rd.reports === 'object') {
              Object.assign(loadedReports, rd.reports);
            }
          });
        }

        if (configSnap.exists()) {
          const cd = configSnap.data();
          loadedSigs = cd.signatures || {};
          loadedCats = cd.categories || [];
          loadedTargets = cd.targets || {};
          loadedClosedMonths = cd.closedMonths || {};
        }

        // 2. Proteksi Zero Data Loss: Jika partisi belum ada atau masih kosong, migrasikan dari 'tmr_rekapitulasi_pusat'
        if (!hasBankShards || !hasReportShards || Object.keys(loadedReports).length === 0) {
          console.log("Checking legacy central doc for initial migration / seeding...");
          try {
            const masterSnap = await getDoc(getDocRef());
            if (masterSnap.exists()) {
              const md = masterSnap.data();
              if (Object.keys(loadedReports).length === 0 && md.allReports) {
                loadedReports = md.allReports;
              }
              if (loadedBankRows.length === 0 && Array.isArray(md.bankRows)) {
                loadedBankRows = md.bankRows;
              }
              if (Object.keys(loadedSigs).length === 0 && md.signatures) {
                loadedSigs = md.signatures;
              }
              if (loadedCats.length === 0 && md.categories) {
                loadedCats = md.categories;
              }
              if (Object.keys(loadedTargets).length === 0 && md.targets) {
                loadedTargets = md.targets;
              }
            }
          } catch (e) {
            console.warn("Legacy master read warning:", e);
          }
        }

        // 3. Cadangan dokumen legacy per user jika masih kosong
        if (Object.keys(loadedReports).length === 0 && user?.uid) {
          try {
            const legacySnap = await getDoc(doc(db, 'tmr_data', user.uid));
            if (legacySnap.exists()) {
              const ld = legacySnap.data();
              if (ld.allReports) loadedReports = ld.allReports;
              if (ld.bankRows) loadedBankRows = ld.bankRows;
              if (ld.signatures) loadedSigs = ld.signatures;
              if (ld.categories) loadedCats = ld.categories;
              if (ld.targets) loadedTargets = ld.targets;
            }
          } catch(e) {}
        }

        if (Object.keys(loadedReports).length === 0) {
          try {
            const demoSnap = await getDoc(doc(db, 'tmr_data', 'demo_rekapitulasi_laporan'));
            if (demoSnap.exists()) {
              const dd = demoSnap.data();
              if (dd.allReports) loadedReports = dd.allReports;
              if (dd.bankRows) loadedBankRows = dd.bankRows;
              if (dd.signatures) loadedSigs = dd.signatures;
              if (dd.categories) loadedCats = dd.categories;
              if (dd.targets) loadedTargets = dd.targets;
            }
          } catch(e) {}
        }

        // 4. Fallback ke state lokal jika database cloud benar-benar baru
        if (Object.keys(loadedReports).length === 0) {
          loadedReports = stateRef.current.allReports || {};
        }
        if (loadedBankRows.length === 0) {
          loadedBankRows = stateRef.current.bankRows || [];
        }
        if (Object.keys(loadedSigs).length === 0) {
          loadedSigs = stateRef.current.signatures || {};
        }
        if (loadedCats.length === 0) {
          loadedCats = stateRef.current.categories || [];
        }
        if (Object.keys(loadedTargets).length === 0) {
          loadedTargets = stateRef.current.targets || {};
        }

        loadedBankRows = ensureBankRowIds(loadedBankRows);

        // Rekonsiliasi orphan item
        const { cleanReports: reconciledReports, cleanRows: reconciledRows, modified: wasReconciled } = reconcileOrphanBankItems(loadedReports, loadedBankRows);
        if (wasReconciled) {
          loadedReports = reconciledReports;
          loadedBankRows = reconciledRows || loadedBankRows;
        }

        // Terapkan ke stateRef & React state
        stateRef.current = {
          allReports: loadedReports,
          bankRows: loadedBankRows,
          signatures: loadedSigs,
          categories: loadedCats,
          targets: loadedTargets,
          closedMonths: loadedClosedMonths
        };

        safeSetLocalStorage('tmr_v19_allReports', loadedReports);
        safeSetLocalStorage('tmr_v19_bankRows', loadedBankRows);
        safeSetLocalStorage('tmr_v19_signatures', loadedSigs);
        safeSetLocalStorage('tmr_v19_categories', loadedCats);
        safeSetLocalStorage('tmr_v19_targets', loadedTargets);
        safeSetLocalStorage('tmr_v19_closedMonths', loadedClosedMonths);

        setSignatures(loadedSigs);
        setCategories(loadedCats);
        setTargets(loadedTargets);
        setClosedMonths(loadedClosedMonths);
        setAllReports(loadedReports);
        setBankRows(loadedBankRows);

        // Seed hash pembanding delta
        const bankPartitions = partitionBankRowsByMonth(loadedBankRows);
        const repPartitions = partitionReportsByMonth(loadedReports);

        bankPartitionsCacheRef.current = bankPartitions;
        reportPartitionsCacheRef.current = repPartitions;

        previousBankMonthsRef.current = {};
        Object.keys(bankPartitions).forEach(m => {
          previousBankMonthsRef.current[m] = JSON.stringify(bankPartitions[m]);
        });
        previousReportMonthsRef.current = {};
        Object.keys(repPartitions).forEach(m => {
          previousReportMonthsRef.current[m] = JSON.stringify(repPartitions[m]);
        });
        previousConfigRef.current = JSON.stringify({
          signatures: loadedSigs,
          categories: loadedCats,
          targets: loadedTargets,
          closedMonths: loadedClosedMonths
        });

        // 5. AUTO-MIGRATION: Jika partisi bulanan di Firestore belum ada, simpan partisi awal sekarang
        if (!hasBankShards || !hasReportShards) {
          console.log("Seeding initial monthly shards to Firestore...");
          const seedPromises = [];
          const nowIso = new Date().toISOString();

          Object.keys(bankPartitions).forEach(m => {
            seedPromises.push(
              setDoc(doc(db, 'tmr_bank_months', m), sanitizeForFirestore({
                month: m,
                bankRows: bankPartitions[m],
                lastWriterId: CLIENT_ID,
                lastUpdated: nowIso
              }))
            );
          });

          Object.keys(repPartitions).forEach(m => {
            seedPromises.push(
              setDoc(doc(db, 'tmr_report_months', m), sanitizeForFirestore({
                month: m,
                reports: repPartitions[m],
                lastWriterId: CLIENT_ID,
                lastUpdated: nowIso
              }))
            );
          });

          seedPromises.push(
            setDoc(doc(db, 'tmr_data', 'master_config'), sanitizeForFirestore({
              signatures: loadedSigs,
              categories: loadedCats,
              targets: loadedTargets,
              closedMonths: loadedClosedMonths,
              lastWriterId: CLIENT_ID,
              lastUpdated: nowIso
            }))
          );

          await Promise.all(seedPromises);
          console.log(`Auto-migration complete! Sharded ${Object.keys(bankPartitions).length} bank months and ${Object.keys(repPartitions).length} report months.`);
        }

        setDbReady(true);
        setSyncStatus('synced');

        // 6. Pasang listener real-time mutasi bank
        unsubBankCollection = onSnapshot(collection(db, 'tmr_bank_months'), (snapshot) => {
          if (snapshot.metadata?.hasPendingWrites) return;
          let hasExternalChange = false;

          snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            if (data.lastWriterId === CLIENT_ID) return;

            const monthKey = change.doc.id;
            if (change.type === 'removed') {
              delete bankPartitionsCacheRef.current[monthKey];
              hasExternalChange = true;
            } else if (change.type === 'added' || change.type === 'modified') {
              bankPartitionsCacheRef.current[monthKey] = data.bankRows || [];
              hasExternalChange = true;
            }
          });

          if (hasExternalChange) {
            const mergedRows = [];
            Object.keys(bankPartitionsCacheRef.current).sort().forEach(m => {
              mergedRows.push(...(bankPartitionsCacheRef.current[m] || []));
            });
            const safeRows = ensureBankRowIds(mergedRows);
            stateRef.current.bankRows = safeRows;
            setBankRows(safeRows);
            safeSetLocalStorage('tmr_v19_bankRows', safeRows);
            snapshot.docChanges().forEach(change => {
              previousBankMonthsRef.current[change.doc.id] = JSON.stringify(change.doc.data().bankRows || []);
            });
            setSyncStatus('synced');
          }
        }, (error) => {
          console.error("Bank snapshot listener error:", error);
        });

        // 7. Pasang listener real-time laporan STSU
        unsubReportsCollection = onSnapshot(collection(db, 'tmr_report_months'), (snapshot) => {
          if (snapshot.metadata?.hasPendingWrites) return;
          let hasExternalChange = false;

          snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            if (data.lastWriterId === CLIENT_ID) return;

            const monthKey = change.doc.id;
            if (change.type === 'removed') {
              delete reportPartitionsCacheRef.current[monthKey];
              hasExternalChange = true;
            } else if (change.type === 'added' || change.type === 'modified') {
              reportPartitionsCacheRef.current[monthKey] = data.reports || {};
              hasExternalChange = true;
            }
          });

          if (hasExternalChange) {
            const mergedReports = {};
            Object.keys(reportPartitionsCacheRef.current).sort().forEach(m => {
              Object.assign(mergedReports, reportPartitionsCacheRef.current[m] || {});
            });
            stateRef.current.allReports = mergedReports;
            setAllReports(mergedReports);
            safeSetLocalStorage('tmr_v19_allReports', mergedReports);
            snapshot.docChanges().forEach(change => {
              previousReportMonthsRef.current[change.doc.id] = JSON.stringify(change.doc.data().reports || {});
            });
            setSyncStatus('synced');
          }
        }, (error) => {
          console.error("Reports snapshot listener error:", error);
        });

        // 8. Pasang listener real-time konfigurasi master
        unsubConfigDoc = onSnapshot(doc(db, 'tmr_data', 'master_config'), (snap) => {
          if (snap.metadata?.hasPendingWrites || !snap.exists()) return;
          const data = snap.data();
          if (data.lastWriterId === CLIENT_ID) return;

          if (data.signatures) {
            stateRef.current.signatures = data.signatures;
            setSignatures(data.signatures);
            safeSetLocalStorage('tmr_v19_signatures', data.signatures);
          }
          if (data.categories) {
            stateRef.current.categories = data.categories;
            setCategories(data.categories);
            safeSetLocalStorage('tmr_v19_categories', data.categories);
          }
          if (data.targets) {
            stateRef.current.targets = data.targets;
            setTargets(data.targets);
            safeSetLocalStorage('tmr_v19_targets', data.targets);
          }
          if (data.closedMonths !== undefined) {
            stateRef.current.closedMonths = data.closedMonths;
            setClosedMonths(data.closedMonths);
            safeSetLocalStorage('tmr_v19_closedMonths', data.closedMonths);
          }
          previousConfigRef.current = JSON.stringify({
            signatures: data.signatures || stateRef.current.signatures,
            categories: data.categories || stateRef.current.categories,
            targets: data.targets || stateRef.current.targets,
            closedMonths: data.closedMonths || stateRef.current.closedMonths || {}
          });
          setSyncStatus('synced');
        }, (error) => {
          console.error("Config snapshot listener error:", error);
        });

      } catch (err) {
        console.error("Initialization error:", err);
        setDbReady(true);
        setSyncStatus('offline');
      }
    };

    initData();

    return () => {
      if (unsubBankCollection) unsubBankCollection();
      if (unsubReportsCollection) unsubReportsCollection();
      if (unsubConfigDoc) unsubConfigDoc();
    };
  }, [user]);

  // ==============================================================
  // 🔴 AMBIL DATA TERBARU DARI SERVER PUSAT (MANUAL PULL)
  // Menjamin 100% data di layar sama persis dengan yang ada di Firestore Cloud
  // ==============================================================
  const pullLatestFromCloud = async (showNotification = false) => {
    if (!user || !db) return;
    setSyncStatus('syncing');
    try {
      const [bankSnap, repSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'tmr_bank_months')),
        getDocs(collection(db, 'tmr_report_months')),
        getDoc(doc(db, 'tmr_data', 'master_config'))
      ]);

      let loadedBankRows = [];
      let loadedReports = {};
      let loadedSigs = {};
      let loadedCats = [];
      let loadedTargets = {};
      let loadedClosedMonths = {};

      bankSnap.forEach(d => {
        const bd = d.data();
        if (Array.isArray(bd.bankRows)) loadedBankRows.push(...bd.bankRows);
      });

      repSnap.forEach(d => {
        const rd = d.data();
        if (rd.reports && typeof rd.reports === 'object') Object.assign(loadedReports, rd.reports);
      });

      if (configSnap.exists()) {
        const cd = configSnap.data();
        loadedSigs = cd.signatures || {};
        loadedCats = cd.categories || [];
        loadedTargets = cd.targets || {};
        loadedClosedMonths = cd.closedMonths || {};
      }

      // Fallback master legacy jika koleksi partisi kosong
      if (loadedBankRows.length === 0 && Object.keys(loadedReports).length === 0) {
        const docSnap = await getDoc(getDocRef());
        if (docSnap.exists()) {
          const data = docSnap.data();
          loadedSigs = data.signatures || {};
          loadedCats = data.categories || [];
          loadedTargets = data.targets || {};
          loadedReports = data.allReports || {};
          loadedBankRows = ensureBankRowIds(data.bankRows || []);
          loadedClosedMonths = data.closedMonths || {};
        }
      }

      loadedBankRows = ensureBankRowIds(loadedBankRows);
      const { cleanReports: cloudClean, cleanRows: cloudRows, modified: cloudMod } = reconcileOrphanBankItems(loadedReports, loadedBankRows);
      if (cloudMod) {
        loadedReports = cloudClean;
        loadedBankRows = cloudRows || loadedBankRows;
      }

      safeSetLocalStorage('tmr_v19_allReports', loadedReports);
      safeSetLocalStorage('tmr_v19_bankRows', loadedBankRows);
      safeSetLocalStorage('tmr_v19_signatures', loadedSigs);
      safeSetLocalStorage('tmr_v19_categories', loadedCats);
      safeSetLocalStorage('tmr_v19_targets', loadedTargets);
      safeSetLocalStorage('tmr_v19_closedMonths', loadedClosedMonths);

      stateRef.current = {
        allReports: loadedReports,
        bankRows: loadedBankRows,
        signatures: loadedSigs,
        categories: loadedCats,
        targets: loadedTargets,
        closedMonths: loadedClosedMonths
      };

      // Perbarui hash tracking
      const bankPartitions = partitionBankRowsByMonth(loadedBankRows);
      const repPartitions = partitionReportsByMonth(loadedReports);
      bankPartitionsCacheRef.current = bankPartitions;
      reportPartitionsCacheRef.current = repPartitions;
      previousBankMonthsRef.current = {};
      Object.keys(bankPartitions).forEach(m => {
        previousBankMonthsRef.current[m] = JSON.stringify(bankPartitions[m]);
      });
      previousReportMonthsRef.current = {};
      Object.keys(repPartitions).forEach(m => {
        previousReportMonthsRef.current[m] = JSON.stringify(repPartitions[m]);
      });
      previousConfigRef.current = JSON.stringify({
        signatures: loadedSigs,
        categories: loadedCats,
        targets: loadedTargets,
        closedMonths: loadedClosedMonths
      });

      setSignatures(loadedSigs);
      setCategories(loadedCats);
      setTargets(loadedTargets);
      setClosedMonths(loadedClosedMonths);
      setAllReports(loadedReports);
      setBankRows(loadedBankRows);

      setSyncStatus('synced');
      if (showNotification) showToast("Data terbaru berhasil disinkronkan dari Server Pusat!");
    } catch (err) {
      console.error("Error pulling latest from cloud:", err);
      setSyncStatus('offline');
      if (showNotification) alert("Gagal menyinkronkan data: " + (err.message || err));
    }
  };

  const handleManualSync = async () => {
    showToast("Mengambil data terbaru dari Server Pusat...");
    await pullLatestFromCloud(true);
  };

  useEffect(() => {
    const handleWakeup = () => {
      // Saat tab kembali dibuka/difokuskan, sinkronkan data terbaru dari server
      if ((document.visibilityState === 'visible' || document.hasFocus()) && user && db && !isSavingRef.current) {
        pullLatestFromCloud();
      }
    };
    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);
    return () => {
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
    };
  }, [user]);



  const showToast = (message) => { setSaveToast({ show: true, message }); setTimeout(() => setSaveToast({ show: false, message: '' }), 3000); };
  const showConfirm = (message, onConfirmAction) => { setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction }); };

  const activeTypeKey = useMemo(() => { return activeType === 'utama' ? 'utama' : (activeLainIndex === 1 ? 'lain' : `lain_${activeLainIndex}`); }, [activeType, activeLainIndex]);

  const lainDocIndices = useMemo(() => {
    const dayData = allReports[reportDate] || {}; const indices = [1]; 
    Object.keys(dayData).forEach(k => { if (k.startsWith('lain_')) { const num = parseInt(k.split('_')[1], 10); if (!isNaN(num) && !indices.includes(num)) indices.push(num); } });
    return indices.sort((a, b) => a - b);
  }, [allReports, reportDate]);

  const handleAddLainDoc = () => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Penambahan dokumen dikunci.');
      return;
    }
    flushPendingSave();
    const nextIndex = Math.max(...lainDocIndices) + 1; const nextKey = `lain_${nextIndex}`;
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[reportDate] || {};
    const newReports = {
      ...baseReports,
      [reportDate]: {
        ...dayData,
        [nextKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} }
      }
    };
    setAllReports(newReports);
    saveToFirebaseDirectly(newReports, stateRef.current.bankRows);
    setActiveLainIndex(nextIndex); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setLainItemDate(''); setLainItemNote('');
  };

  const handleRemoveLainDoc = (indexToRemove) => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Penghapusan dokumen dikunci.');
      return;
    }
    showConfirm(`Hapus Dokumen Ke-${indexToRemove}? Semua data di dalam dokumen ini akan ikut terhapus.`, () => {
      const baseReports = stateRef.current.allReports;
      const dayData = { ...(baseReports[reportDate] || {}) };
      const keyToRemove = indexToRemove === 1 ? 'lain' : `lain_${indexToRemove}`;
      const docToRemove = dayData[keyToRemove] || {};
      const itemsToReset = Array.isArray(docToRemove.activeItems) ? docToRemove.activeItems : [];
      
      const rowIdsToPending = [];
      itemsToReset.forEach(it => {
        if (it && it.bankMatched) {
          if (Array.isArray(it.bankMatchRowIds)) rowIdsToPending.push(...it.bankMatchRowIds);
          else if (it.bankMatchRowId) rowIdsToPending.push(it.bankMatchRowId);
        }
      });
      
      const baseBankRows = stateRef.current.bankRows;
      let newBankRows = baseBankRows;
      if (rowIdsToPending.length > 0) {
        newBankRows = baseBankRows.map(r => {
          if (rowIdsToPending.includes(r.id)) {
            const updated = { ...r, status: 'pending' };
            delete updated.linkedTo;
            delete updated.matchedTo;
            return updated;
          }
          return r;
        });
        setBankRows(newBankRows);
      }
      
      delete dayData[keyToRemove];
      const newReports = { ...baseReports, [reportDate]: dayData };
      setAllReports(newReports);
      saveToFirebaseDirectly(newReports, newBankRows);
      if (activeLainIndex === indexToRemove) setActiveLainIndex(1);
      showToast(`Dokumen Ke-${indexToRemove} berhasil dihapus.`);
    });
  };

  const currentReport = useMemo(() => {
    const typeData = (allReports[reportDate] || {})[activeTypeKey] || {};
    return { sequence: typeData.sequence || '', signatureDate: typeData.signatureDate || reportDate, activeItems: Array.isArray(typeData.activeItems) ? typeData.activeItems : [], formData: typeData.formData || {} };
  }, [allReports, reportDate, activeTypeKey]);

  const updateCurrentReport = (updater) => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Perubahan data dikunci.');
      return;
    }
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[reportDate] || {};
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const updatedTypeData = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
    const newReports = { ...baseReports, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    saveState({ allReports: newReports }, { immediate: false });
  };

  const handleUpdateRekonRow = (dateStr, isSusulan, susulanKeys, field, value, docTypeKey = 'utama') => {
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[dateStr] || {};
    const targetKey = docTypeKey && dayData[docTypeKey] ? docTypeKey : (dayData['utama'] ? 'utama' : Object.keys(dayData)[0] || 'utama');
    const typeData = dayData[targetKey] || { sequence: '', signatureDate: dateStr, activeItems: [], formData: {} };
    let newReports;
    
    if (isSusulan && Array.isArray(susulanKeys)) {
       const susulanMeta = typeData.susulanMeta || {};
       const newSusulanMeta = { ...susulanMeta };
       
       // Apply the value to all merged keys in this susulan row
       [].concat(susulanKeys).forEach(k => {
           if(k) {
               newSusulanMeta[k] = {
                   ...(newSusulanMeta[k] || {}),
                   [field]: value
               };
           }
       });

       newReports = {
           ...baseReports,
           [dateStr]: {
               ...dayData,
               [targetKey]: {
                   ...typeData,
                   susulanMeta: newSusulanMeta
               }
           }
       };
    } else if (!isSusulan) {
        newReports = {
            ...baseReports,
            [dateStr]: {
                ...dayData,
                [targetKey]: {
                    ...typeData,
                    [field]: value
                }
            }
        };
    }
    if (newReports) {
      setAllReports(newReports);
      saveToFirebaseDirectly(newReports, stateRef.current.bankRows);
    }
  };

  const handleSequenceChange = (e) => updateCurrentReport({ sequence: e.target.value });
  const handleSignatureDateChange = (e) => updateCurrentReport({ signatureDate: e.target.value });

  const handleDateChange = (newDateStr) => {
    flushPendingSave();
    setReportDate(newDateStr); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setIsAddingSusulan(false); setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleTypeSwitch = (type) => {
    flushPendingSave();
    setActiveType(type); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setIsAddingSusulan(false); setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleTabSwitch = (newTab) => {
    flushPendingSave();
    setActiveTab(newTab);
    setPrintMode('pdf');
  };

  const clearCurrentReport = () => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Data tidak dapat direset.');
      return;
    }
    setResetDialog({ isOpen: true, password: '', error: '', isVerifying: false });
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault(); setResetDialog(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      const baseReports = stateRef.current.allReports;
      const dayData = baseReports[reportDate] || {};
      const typeData = dayData[activeTypeKey] || {};
      const itemsToReset = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];
      
      const rowIdsToPending = [];
      itemsToReset.forEach(it => {
        if (it && it.bankMatched) {
          if (Array.isArray(it.bankMatchRowIds)) rowIdsToPending.push(...it.bankMatchRowIds);
          else if (it.bankMatchRowId) rowIdsToPending.push(it.bankMatchRowId);
        }
      });
      
      const baseBankRows = stateRef.current.bankRows;
      let newBankRows = baseBankRows;
      if (rowIdsToPending.length > 0) {
        newBankRows = baseBankRows.map(r => {
          if (rowIdsToPending.includes(r.id)) {
            const updated = { ...r, status: 'pending' };
            delete updated.linkedTo;
            delete updated.matchedTo;
            return updated;
          }
          return r;
        });
        setBankRows(newBankRows);
      }

      const newReports = {
        ...baseReports,
        [reportDate]: {
          ...dayData,
          [activeTypeKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} }
        }
      };
      setAllReports(newReports);
      saveToFirebaseDirectly(newReports, newBankRows);
      setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false });
      showToast('Laporan berhasil direset.');
    } catch (error) { setResetDialog(prev => ({ ...prev, isVerifying: false, error: 'Password salah! Penghapusan dibatalkan.' })); }
  };

  const filteredCategories = useMemo(() => { return Array.isArray(categories) ? categories.filter(c => c.type === activeType) : []; }, [categories, activeType]);

  const handleCatChange = (catId) => {
    setSelectedCatToAdd(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedItemToAdd('direct'); else setSelectedItemToAdd('');
  };

  const handleAddActiveItem = () => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Penambahan transaksi dikunci.');
      return;
    }
    if (!selectedCatToAdd || !selectedItemToAdd) return;
    const newItem = { catId: selectedCatToAdd, itemId: selectedItemToAdd };
    if (activeType === 'utama' && isAddingSusulan) { if (!susulanValidDate) { showConfirm("Mohon pilih Tanggal Validasi untuk pendapatan susulan!", null); return; } newItem.isSusulan = true; newItem.validDate = susulanValidDate; }
    else if (activeType === 'lain') { if (lainItemDate) newItem.itemDate = lainItemDate; if (lainItemNote.trim()) newItem.itemNote = lainItemNote.trim(); }

    const inputKey = getActiveItemKey(newItem.catId, newItem.itemId, newItem.isSusulan, newItem.validDate, newItem.itemDate, newItem.itemNote);
    const initialNominal = Number(String(manualNominalToAdd).replace(/[^0-9]/g, '')) || 0;
    
    const baseReports = stateRef.current.allReports;
    const dayData = { ...(baseReports[reportDate] || {}) };

    let targetDocKey = activeTypeKey;
    let targetLainIndex = activeLainIndex;

    // Untuk STSU Lain-lain: jika dokumen yang aktif sudah terisi transaksi dari kategori berbeda,
    // tempatkan transaksi baru ke dokumen berikutnya (Dokumen Ke-2, Dokumen Ke-3, dst.)
    if (activeType === 'lain') {
      const currentDoc = dayData[activeTypeKey];
      const currentItems = Array.isArray(currentDoc?.activeItems) ? currentDoc.activeItems : [];
      const hasDifferentCategory = currentItems.some(i => i.catId !== selectedCatToAdd);

      if (hasDifferentCategory) {
        let foundIndex = 1;
        while (true) {
          const k = foundIndex === 1 ? 'lain' : `lain_${foundIndex}`;
          const doc = dayData[k];
          if (!doc || !Array.isArray(doc.activeItems) || doc.activeItems.length === 0) {
            targetLainIndex = foundIndex;
            targetDocKey = k;
            break;
          }
          if (doc.activeItems.every(i => i.catId === selectedCatToAdd)) {
            targetLainIndex = foundIndex;
            targetDocKey = k;
            break;
          }
          foundIndex++;
        }
      }
    }

    const typeData = dayData[targetDocKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const currentItems = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];
    
    const existing = currentItems.find(i => getActiveItemKey(i.catId, i.itemId || i.id, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === inputKey);

    if (!existing) {
      const updatedTypeData = {
        ...typeData,
        activeItems: [...currentItems, newItem],
        formData: { ...(typeData.formData || {}), [inputKey]: initialNominal }
      };
      const newReports = {
        ...baseReports,
        [reportDate]: {
          ...dayData,
          [targetDocKey]: updatedTypeData
        }
      };
      setAllReports(newReports);
      saveToFirebaseDirectly(newReports, stateRef.current.bankRows);
      if (targetLainIndex !== activeLainIndex) {
        setActiveLainIndex(targetLainIndex);
        showToast(`Dokumen Ke-${activeLainIndex} sudah terisi transaksi lain. Transaksi dibuatkan di Dokumen Ke-${targetLainIndex}!`);
      } else {
        showToast('Transaksi berhasil ditambahkan!');
      }
    } else {
      if (initialNominal > 0) {
        const currentAmount = typeData.formData?.[inputKey] || 0;
        const updatedTypeData = {
          ...typeData,
          formData: { ...(typeData.formData || {}), [inputKey]: currentAmount + initialNominal }
        };
        const newReports = {
          ...baseReports,
          [reportDate]: {
            ...dayData,
            [targetDocKey]: updatedTypeData
          }
        };
        setAllReports(newReports);
        saveToFirebaseDirectly(newReports, stateRef.current.bankRows);
        if (targetLainIndex !== activeLainIndex) setActiveLainIndex(targetLainIndex);
        showToast(`Item sudah ada. Nominal ditambahkan Rp ${formatRp(initialNominal)}!`);
      } else {
        if (targetLainIndex !== activeLainIndex) setActiveLainIndex(targetLainIndex);
        showToast('Item sudah ada dalam daftar transaksi.');
      }
    }
    
    const cat = categories.find(c => c.id === selectedCatToAdd);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedCatToAdd('');
    setSelectedItemToAdd(''); 
    setManualNominalToAdd('');
    setLainItemNote('');
    setTimeout(() => { if (typeof document !== 'undefined') { const inputElement = document.getElementById(`input_${inputKey}`); if (inputElement) inputElement.focus(); } }, 100);
  };

  const handleRemoveActiveItem = (itemToRemove, providedKey) => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Penghapusan data dikunci.');
      return;
    }
    const baseBankRows = stateRef.current.bankRows;
    let newBankRows = baseBankRows;
    
    const rowIdsToPending = [];
    if (itemToRemove.bankMatched) {
        if (Array.isArray(itemToRemove.bankMatchRowIds) && itemToRemove.bankMatchRowIds.length > 0) {
            rowIdsToPending.push(...itemToRemove.bankMatchRowIds);
        } else if (itemToRemove.bankMatchRowId) {
            rowIdsToPending.push(itemToRemove.bankMatchRowId);
        }
    }

    if (rowIdsToPending.length > 0) {
        newBankRows = baseBankRows.map(r => {
            if (rowIdsToPending.includes(r.id)) {
                const updated = { ...r, status: 'pending' };
                delete updated.linkedTo;
                delete updated.matchedTo;
                return updated;
            }
            return r;
        });
        setBankRows(newBankRows);
    }

    const keyToRemove = providedKey || getActiveItemKey(itemToRemove.catId, itemToRemove.itemId || itemToRemove.id, itemToRemove.isSusulan, itemToRemove.validDate, itemToRemove.itemDate, itemToRemove.itemNote);
    
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[reportDate] || {}; 
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const newActive = (typeData.activeItems || []).filter(i => getActiveItemKey(i.catId, i.itemId || i.id, i.isSusulan, i.validDate, i.itemDate, i.itemNote) !== keyToRemove);
    const newFormData = { ...(typeData.formData || {}) }; 
    delete newFormData[keyToRemove];
    delete newFormData[keyToRemove + '_buktiUrl'];
    
    const updatedTypeData = { ...typeData, activeItems: newActive, formData: newFormData };
    const newReports = { ...baseReports, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    
    setAllReports(newReports);
    saveToFirebaseDirectly(newReports, newBankRows);
    showToast('Item berhasil dihapus!');
  };

  const handleInputChange = (inputKey, value) => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Perubahan data dikunci.');
      return;
    }
    const rawValue = value.replace(/[^0-9]/g, '');
    const numVal = Number(rawValue) || 0;
    
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[reportDate] || {};
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const updatedTypeData = {
      ...typeData,
      formData: {
        ...(typeData.formData || {}),
        [inputKey]: numVal
      }
    };
    const newReports = {
      ...baseReports,
      [reportDate]: {
        ...dayData,
        [activeTypeKey]: updatedTypeData
      }
    };
    
    saveState({ allReports: newReports }, { immediate: false });
  };

  const handleGenerateUraian = async () => {
    if (!lainItemNote) return;
    setIsGeneratingUraian(true);
    try {
      const prompt = `Rapikan catatan singkat berikut menjadi satu frasa resmi yang baku untuk STSU. Langsung berikan hasilnya. Catatan: "${lainItemNote}"`;
      const result = await callGeminiAPI(prompt, "Asisten admin STSU.");
      setLainItemNote(result.trim());
    } catch (e) {} finally { setIsGeneratingUraian(false); }
  };

  const openEditNote = (group, item) => { setEditNoteModal({ isOpen: true, group, item, newNote: item.itemNote || '' }); };
  const saveEditedNote = () => {
    const { group, item, newNote } = editNoteModal; const oldNote = item.itemNote || ''; const trimmedNew = newNote.trim();
    if (trimmedNew && trimmedNew !== oldNote) {
      const oldKey = getActiveItemKey(group.catId, item.itemId || item.id, group.isSusulan, group.validDate, group.itemDate, oldNote);
      const newKey = getActiveItemKey(group.catId, item.itemId || item.id, group.isSusulan, group.validDate, group.itemDate, trimmedNew);
      
      const baseReports = stateRef.current.allReports;
      const dayData = baseReports[reportDate] || {};
      const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
      const newActive = (typeData.activeItems || []).map(i => {
        if (i.catId === group.catId && i.itemId === (item.itemId || item.id) && !!i.isSusulan === !!group.isSusulan && (i.validDate || '') === (group.validDate || '') && (i.itemDate || '') === (group.itemDate || '') && (i.itemNote || '') === oldNote) return { ...i, itemNote: trimmedNew };
        return i;
      });
      const newFormData = { ...(typeData.formData || {}) };
      if (newFormData[oldKey] !== undefined) { newFormData[newKey] = newFormData[oldKey]; delete newFormData[oldKey]; }
      const newReports = {
        ...baseReports,
        [reportDate]: {
          ...dayData,
          [activeTypeKey]: { ...typeData, activeItems: newActive, formData: newFormData }
        }
      };
      setAllReports(newReports);
      saveToFirebaseDirectly(newReports, stateRef.current.bankRows);
      showToast('Keterangan berhasil diperbarui!');
    }
    setEditNoteModal({ isOpen: false, group: null, item: null, newNote: '' });
  };

  // ==========================================
  // 🔴 FUNGSI: MENGAMBIL DATA DARI BOT PYTHON
  // ==========================================
  const handleOpenTransit3A = () => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Penarikan data otomatis dikunci.');
      return;
    }
    setTransitModal({
      isOpen: true, step: 'confirm_date', source: '3a', targetDate: reportDate,
      isLoading: false, data: [], error: '', isOverwriting: false, iwmDiskon: []
    });
  };

  const handleOpenTransitIWM = () => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Penarikan data otomatis dikunci.');
      return;
    }
    setTransitModal({
      isOpen: true, step: 'confirm_date', source: 'iwm', targetDate: reportDate,
      isLoading: false, data: [], error: '', isOverwriting: false, iwmDiskon: []
    });
  };

  const closeTransitModal = () => {
    setTransitModal(prev => ({ ...prev, isOpen: false, iwmDiskon: [] }));
  };

  const executeFetchData = async (isOverwrite) => {
    setTransitModal(prev => ({ ...prev, step: 'loading', isOverwriting: isOverwrite, error: '' }));
    
    try {
      let fetchedData = [];
      let diskonData = [];
      const targetDate = transitModal.targetDate;
      const source = transitModal.source;

      if (source === '3a') {
        const result = await fetchBot3aData(apiIpAddress, targetDate);
        fetchedData = result.fetchedData;
        diskonData = result.diskonData;
      } else if (source === 'iwm') {
        const result = await fetchBotIwmData(apiIpAddress, targetDate);
        fetchedData = result.fetchedData;
        diskonData = result.diskonData;
      }

      // MAP DATA dengan targetDate dan categories saat ini
      const mappedData = fetchedData.map(item => {
        const { mappedCat, mappedItem } = smartMappingAI(item.nameAPI, source, targetDate, categories);
        return { ...item, mappedCat, mappedItem };
      });

      setTransitModal(prev => ({ ...prev, step: 'mapping', data: mappedData, iwmDiskon: diskonData }));

    } catch (err) {
      setTransitModal(prev => ({ 
        ...prev, step: 'error', 
        error: `Gagal terhubung ke Bot API Python. Error: ${err.message}. Pastikan file Python sedang berjalan!` 
      }));
    }
  };

  const updateTransitMapping = (id, field, value) => {
    setTransitModal(prev => ({ ...prev, data: prev.data.map(d => { if (d.id === id) { const newData = { ...d, [field]: value }; if (field === 'mappedCat') newData.mappedItem = ''; return newData; } return d; }) }));
  };

  // ==========================================
  // 🔴 FUNGSI INJEKSI & AGREGASI PENGGABUNGAN TIKET SAMA
  // ==========================================
  const confirmTransitInjection = () => {
    if (isMonthClosed(reportDate)) {
      showToast('Periode bulan ini telah TUTUP BUKU. Data tidak dapat disuntikkan.');
      return;
    }
    const baseReports = stateRef.current.allReports;
    const newReports = JSON.parse(JSON.stringify(baseReports));
    const dayData = newReports[reportDate] || {}; 
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    
    const baseBankRows = stateRef.current.bankRows;
    let newBankRows = baseBankRows;

    // Jika user memilih timpa (overwrite), kembalikan mutasi bank yang sebelumnya terhubung ke pending
    if (transitModal.isOverwriting && Array.isArray(typeData.activeItems)) {
      const rowIdsToPending = [];
      typeData.activeItems.forEach(it => {
        if (it && it.bankMatched) {
          if (Array.isArray(it.bankMatchRowIds)) rowIdsToPending.push(...it.bankMatchRowIds);
          else if (it.bankMatchRowId) rowIdsToPending.push(it.bankMatchRowId);
        }
      });
      if (rowIdsToPending.length > 0) {
        newBankRows = baseBankRows.map(r => {
          if (rowIdsToPending.includes(r.id)) {
            const updated = { ...r, status: 'pending' };
            delete updated.linkedTo;
            delete updated.matchedTo;
            return updated;
          }
          return r;
        });
        setBankRows(newBankRows);
      }
    }

    let newItems = transitModal.isOverwriting ? [] : [...(typeData.activeItems || [])];
    let newFormData = transitModal.isOverwriting ? {} : { ...(typeData.formData || {}) };

    transitModal.data.forEach(t => {
      if (t.mappedCat && t.mappedItem) {
        
        const finalNote = activeType === 'lain' ? (lainItemNote || '') : ''; 
        const key = getActiveItemKey(t.mappedCat, t.mappedItem, isAddingSusulan, susulanValidDate, lainItemDate, finalNote);
        const exists = newItems.find(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === key);
        
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
        
        // Agregasi akhir saat disuntikkan ke STSU form
        newFormData[key] = (newFormData[key] || 0) + Number(t.amount);
      }
    });
    
    typeData.activeItems = newItems;
    typeData.formData = newFormData;
    newReports[reportDate] = { ...dayData, [activeTypeKey]: typeData };
    
    setAllReports(newReports);
    saveToFirebaseDirectly(newReports, newBankRows);
    
    const is3a = transitModal.source === '3a';
    closeTransitModal();
    showToast(`Berhasil! Data dari Bot ${is3a ? '3A' : 'IWM'} telah disuntikkan dan otomatis digabungkan pada STSU.`);
  };

  const computedStsuNo = useMemo(() => {
    if (!reportDate) return ''; const [y, m, d] = reportDate.split('-'); const typeCode = activeType === 'lain' ? 'SU/L' : 'SU'; const seq = currentReport.sequence || '...'; return `${seq}/${d}/${m}/${typeCode}/${y}`;
  }, [reportDate, activeType, currentReport.sequence]);

  const availableItemsToAdd = useMemo(() => {
    if (!selectedCatToAdd) return []; const cat = categories.find(c => c.id === selectedCatToAdd); if (!cat) return [];
    const activeI = Array.isArray(currentReport.activeItems) ? currentReport.activeItems : [];
    
    const isAdded = (iId) => {
      if (activeType === 'utama') return activeI.some(a => a.catId === selectedCatToAdd && a.itemId === iId && !!a.isSusulan === isAddingSusulan && (a.validDate || '') === (susulanValidDate || '') && !a.itemNote);
      else return activeI.some(a => a.catId === selectedCatToAdd && a.itemId === iId && (a.itemDate || '') === (lainItemDate || '') && (a.itemNote || '') === (lainItemNote.trim() || ''));
    };
    if (!Array.isArray(cat.items) || cat.items.length === 0) return isAdded('direct') ? [] : [{ id: 'direct', name: cat.name }];
    return cat.items.filter(item => !isAdded(item.id));
  }, [selectedCatToAdd, categories, currentReport.activeItems, isAddingSusulan, susulanValidDate, activeType, lainItemDate, lainItemNote]);

  const activeGroups = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    const activeI = Array.isArray(currentReport.activeItems) ? currentReport.activeItems : [];
    const groups = [];

    const sortDisplayItems = (items, masterItems) => {
      items.sort((a, b) => {
        if (a.id === 'direct') return -1;
        if (b.id === 'direct') return 1;
        const idxA = masterItems ? masterItems.findIndex(i => i.id === a.id) : -1;
        const idxB = masterItems ? masterItems.findIndex(i => i.id === b.id) : -1;
        const posA = idxA !== -1 ? idxA : 999;
        const posB = idxB !== -1 ? idxB : 999;
        return posA - posB;
      });
      return items;
    };

    categories.forEach((cat, index) => {
      const itemsForCat = activeI.filter(ai => ai.catId === cat.id);
      if (itemsForCat.length === 0) return;
      if (activeType === 'utama') {
        const configsForCat = [];
        itemsForCat.forEach(ai => { const key = ai.isSusulan ? `susulan_${ai.validDate}` : 'normal'; if (!configsForCat.find(c => c.key === key)) configsForCat.push({ key, isSusulan: !!ai.isSusulan, validDate: ai.validDate }); });
        configsForCat.forEach(config => {
          let displayItems = itemsForCat.filter(ai => !!ai.isSusulan === config.isSusulan && (ai.validDate || '') === (config.validDate || '')).map(ai => {
            if (ai.itemId === 'direct') return { ...ai, id: 'direct', name: cat.name, itemNote: ai.itemNote };
            const found = cat.items?.find(i => i.id === ai.itemId); return { ...ai, id: ai.itemId, name: found ? found.name : 'Item', itemNote: ai.itemNote };
          });
          displayItems = sortDisplayItems(displayItems, cat.items);
          groups.push({ groupId: `${cat.id}_${config.key}`, catId: cat.id, name: cat.name, isSusulan: config.isSusulan, validDate: config.validDate, activeItems: displayItems, catIndex: index });
        });
      } else {
        const configsForCat = [];
        itemsForCat.forEach(ai => { const key = `${ai.itemDate ? `date_${ai.itemDate}` : 'nodate'}_note_${ai.itemNote ? ai.itemNote.trim() : ''}`; if (!configsForCat.find(c => c.key === key)) configsForCat.push({ key, itemDate: ai.itemDate, itemNote: ai.itemNote ? ai.itemNote.trim() : '' }); });
        configsForCat.forEach(config => {
          let displayItems = itemsForCat.filter(ai => (ai.itemDate || '') === (config.itemDate || '') && (ai.itemNote ? ai.itemNote.trim() : '') === config.itemNote).map(ai => {
            if (ai.itemId === 'direct') return { ...ai, id: 'direct', name: cat.name, itemNote: ai.itemNote };
            const found = cat.items?.find(i => i.id === ai.itemId); return { ...ai, id: ai.itemId, name: found ? found.name : 'Item', itemNote: ai.itemNote };
          });
          displayItems = sortDisplayItems(displayItems, cat.items);
          groups.push({ groupId: `${cat.id}_${config.key}`, catId: cat.id, name: cat.name, isSusulan: false, itemDate: config.itemDate, itemNote: config.itemNote, activeItems: displayItems, catIndex: index });
        });
      }
    });
    groups.sort((a, b) => {
      if (activeType === 'utama') { if (!a.isSusulan && b.isSusulan) return -1; if (a.isSusulan && !b.isSusulan) return 1; if (a.isSusulan && b.isSusulan && a.validDate !== b.validDate) return (a.validDate || '').localeCompare(b.validDate || ''); }
      else { if (a.catIndex !== b.catIndex) return a.catIndex - b.catIndex; if (a.itemDate !== b.itemDate) return (a.itemDate || '').localeCompare(b.itemDate || ''); if (a.itemNote !== b.itemNote) return (a.itemNote || '').localeCompare(b.itemNote || ''); }
      return a.catIndex - b.catIndex;
    });
    return groups;
  }, [categories, currentReport.activeItems, activeType]);

  const { subtotals, grandTotal } = useMemo(() => {
    let gt = 0; const subs = {}; const cForm = currentReport.formData || {};
    activeGroups.forEach(group => { 
      let sub = 0; 
      group.activeItems.forEach(item => { 
        sub += Number(cForm[getActiveItemKey(group.catId, item.id, group.isSusulan, group.validDate, group.itemDate, item.itemNote)]) || 0; 
      }); 
      subs[group.groupId] = sub; 
      gt += sub; 
    });
    return { subtotals: subs, grandTotal: gt };
  }, [currentReport.formData, activeGroups]);

  const addCategory = () => {
    const newCats = [...(categories || []), { id: `cat_${Date.now()}`, name: 'Kategori Baru', type: 'utama', items: [] }];
    saveState({ categories: newCats }, { immediate: true, showToastMessage: 'Kategori baru berhasil dibuat!' });
  };
  const updateCategory = (catId, key, value) => {
    const newCats = (categories || []).map(c => c.id === catId ? { ...c, [key]: value } : c);
    saveState({ categories: newCats }, { immediate: false });
  };
  const deleteCategory = (catId) => {
    showConfirm('Hapus kategori ini? Data lama tidak akan hilang, tapi kategori tidak bisa dipilih lagi.', () => {
      const newCats = (categories || []).filter(c => c.id !== catId);
      saveState({ categories: newCats }, { immediate: true, showToastMessage: 'Kategori berhasil dihapus!' });
    });
  };
  const moveCategory = (index, direction) => {
    const newCats = [...(categories || [])];
    if (direction === 'up' && index > 0) [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    else if (direction === 'down' && index < newCats.length - 1) [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    saveState({ categories: newCats }, { immediate: true });
  };

  const addItem = (catId) => {
    const newCats = (categories || []).map(c => c.id === catId ? { ...c, items: [...(c.items || []), { id: `item_${Date.now()}`, name: 'Item Baru' }] } : c);
    saveState({ categories: newCats }, { immediate: true, showToastMessage: 'Sub-kategori berhasil ditambahkan!' });
  };
  const updateItemName = (catId, itemId, newName) => {
    const newCats = (categories || []).map(c => c.id === catId ? { ...c, items: (c.items || []).map(i => i.id === itemId ? { ...i, name: newName } : i) } : c);
    saveState({ categories: newCats }, { immediate: false });
  };
  const deleteItem = (catId, itemId) => {
    const newCats = (categories || []).map(c => c.id === catId ? { ...c, items: (c.items || []).filter(i => i.id !== itemId) } : c);
    saveState({ categories: newCats }, { immediate: true, showToastMessage: 'Sub-kategori berhasil dihapus!' });
  };
  const moveItem = (catId, itemIndex, direction) => {
    const newCats = [...(categories || [])];
    const catIndex = newCats.findIndex(c => c.id === catId);
    if (catIndex > -1) {
      const newItems = [...(newCats[catIndex].items || [])];
      if (direction === 'up' && itemIndex > 0) [newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]];
      else if (direction === 'down' && itemIndex < newItems.length - 1) [newItems[itemIndex + 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex + 1]];
      newCats[catIndex] = { ...newCats[catIndex], items: newItems };
      saveState({ categories: newCats }, { immediate: true });
    }
  };

  const handleUpdateSignatures = (newSigs) => {
    saveState({ signatures: newSigs }, { immediate: false });
  };



  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };
  const handleDownloadPDF = (customFilename) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return; const element = document.getElementById('printable-area'); if (!element) return;
    if (window.html2pdf) {
      setPdfLoading(true);
      const fn = typeof customFilename === 'string' && customFilename ? customFilename : `Laporan_STSU_${activeType.toUpperCase()}${activeType === 'lain' ? `_Dok${activeLainIndex}` : ''}_${reportDate}.pdf`;
      window.html2pdf().set({ margin: [10, 10, 10, 10], filename: fn, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save().then(() => setPdfLoading(false)).catch(err => { setPdfLoading(false); });
    } else { showConfirm("Modul pembuat PDF sedang dimuat oleh sistem. Mohon tunggu 3 detik lalu coba tekan lagi.", null); }
  };





  if (!authReady) return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500 font-bold">Memuat Sistem Keamanan...</div>;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-700 to-green-900 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-inner"><Lock size={32} className="text-green-600" /></div>
          </div>
          <h1 className="text-2xl font-black text-center text-gray-800 mb-2">Sistem Rekap STSU</h1>
          <p className="text-center text-gray-500 text-sm mb-8">Silakan login untuk mengakses brankas data STSU.</p>
          {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100"><AlertCircle size={18} className="shrink-0" /> {safeString(loginError)}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email / Username</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium" placeholder="kasir@stsu.com" /></div>
            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium" placeholder="••••••••" /></div>
            <button type="submit" disabled={isLoggingIn} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 disabled:bg-gray-400">{isLoggingIn ? 'Memeriksa Kredensial...' : 'Masuk ke Aplikasi'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-800 to-green-950 text-white p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 text-emerald-300 animate-pulse">
            <Cloud size={36} />
          </div>
          <h2 className="text-xl font-black mb-1 tracking-tight">Menghubungkan ke Cloud...</h2>
          <p className="text-xs text-green-100/80 mb-4">Memuat data terpusat real-time Taman Margasatwa Ragunan</p>
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-white/10 px-3.5 py-1.5 rounded-full font-mono font-medium">
            <RefreshCw size={13} className="animate-spin" /> Sinkronisasi Database Pusat
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-36 relative print:pb-0 print:min-h-0 print:bg-white">
      <style>{`
        @media print {
          html, body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          ${printMode === 'ncr' ? `
            /* KERTAS A5 LANDSCAPE (MENDATAR) UNTUK DOT MATRIX */
            @page { size: 210mm 148mm; margin: 0; }
            .print-container { 
              width: 210mm; 
              height: 148mm; 
              margin: 0; 
              padding: 0; 
              font-family: 'Courier New', Courier, monospace !important; 
              color: black; 
              box-shadow: none !important; 
              border: none !important; 
              overflow: hidden;
              position: relative;
            }
          ` : `
            .print-container:not(.pemasaran-sheet) { width: 100%; max-width: 100%; margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: black; box-shadow: none !important; border: none !important; }
            @page { margin: 12mm 15mm 10mm 15mm; }
          `}
        }
        /* Sticky Column for Excel Report */
        .sticky-col { position: sticky; left: 0; background-color: white; z-index: 10; border-right: 2px solid #e5e7eb; }
      `}</style>

      {saveToast.show && (
        <div className="fixed top-20 right-4 sm:right-10 z-[9999] bg-green-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
          <CheckCircle size={20} /> <div className="font-bold text-sm">{safeString(saveToast.message)}</div>
        </div>
      )}

      <TransitModal
        transitModal={transitModal}
        closeTransitModal={closeTransitModal}
        executeFetchData={executeFetchData}
        confirmTransitInjection={confirmTransitInjection}
        updateTransitMapping={updateTransitMapping}
        setTransitModal={setTransitModal}
        currentReport={currentReport}
        categories={categories}
        activeType={activeType}
        formatTanggalPopUp={formatTanggalPopUp}
        formatRp={formatRp}
        safeString={safeString}
      />

      {/* 🔴 MODAL AKSI (KONFIRMASI, EDIT URAIAN, RESET) */}
      <ActionModals
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        editNoteModal={editNoteModal}
        setEditNoteModal={setEditNoteModal}
        isGeneratingUraian={isGeneratingUraian}
        setIsGeneratingUraian={setIsGeneratingUraian}
        callGeminiAPI={callGeminiAPI}
        saveEditedNote={saveEditedNote}
        resetDialog={resetDialog}
        setResetDialog={setResetDialog}
        handleConfirmReset={handleConfirmReset}
        activeType={activeType}
      />

      {topLevelRoute === 'home' && (
             <div className="min-h-[90vh] flex flex-col items-center justify-center p-4">
                 <h1 className="text-5xl font-black text-gray-800 mb-2 text-center drop-shadow-sm">Master Menu Admin</h1>
                 <p className="text-gray-500 mb-12 text-center font-medium">Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan</p>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                     <button onClick={() => setTopLevelRoute('target')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center gap-6 group overflow-hidden">
                         <div className="w-24 h-24 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-inner"><Sparkles size={48}/></div>
                         <div>
                             <h3 className="font-black text-gray-800 text-2xl mb-2">Target Pendapatan</h3>
                             <p className="text-sm text-gray-500">Manajemen master target pendapatan & pembagian cerdas AI otomatis.</p>
                         </div>
                     </button>
                     
                     <button onClick={() => setTopLevelRoute('operasional')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center gap-6 group overflow-hidden">
                         <div className="w-24 h-24 rounded-3xl bg-green-50 text-green-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all duration-300 shadow-inner"><Edit size={48}/></div>
                         <div>
                             <h3 className="font-black text-gray-800 text-2xl mb-2">Input Harian</h3>
                             <p className="text-sm text-gray-500">Sistem input transaksi STSU, pencetakan resi NCR, & sinkronisasi bot mutasi.</p>
                         </div>
                     </button>

                     <button onClick={() => setTopLevelRoute('dashboard')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center gap-6 group overflow-hidden">
                         <div className="w-24 h-24 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-inner"><FileText size={48}/></div>
                         <div>
                             <h3 className="font-black text-gray-800 text-2xl mb-2">Pusat Laporan</h3>
                             <p className="text-sm text-gray-500">Visualisasi pencapaian, rekapitulasi performa, dan dashboard analitik data.</p>
                         </div>
                     </button>
                 </div>
                 
                 <div className="mt-16 text-center text-xs text-gray-400 font-medium">
                    <p>Logged in as: {user?.email}</p>
                    <button onClick={handleLogout} className="mt-4 text-red-500 hover:text-red-700 flex items-center justify-center gap-1 mx-auto bg-red-50 px-3 py-1.5 rounded-full"><LogOut size={14}/> Keluar Aplikasi</button>
                 </div>
             </div>
      )}

      {topLevelRoute !== 'home' && (
         <div className="w-full flex flex-col min-h-screen">
            {/* Top Bar for Back Navigation */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-[60] no-print shadow-sm">
               <button onClick={() => setTopLevelRoute('home')} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-green-700 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 px-4 py-2 rounded-lg transition-colors">
                  <ChevronLeft size={18}/> Kembali ke Menu Utama
               </button>
               <div className="font-black text-gray-800 hidden sm:flex items-center gap-2 text-lg">
                  {topLevelRoute === 'operasional' ? <><Edit className="text-green-600" size={24}/> Operasional Harian</> : topLevelRoute === 'target' ? <><Sparkles className="text-amber-500" size={24}/> Target Pendapatan</> : <><FileText className="text-blue-500" size={24}/> Pusat Laporan</>}
               </div>
            </div>

            {topLevelRoute === 'target' && (
              <div className="max-w-4xl mx-auto px-4 py-6 w-full animate-in fade-in slide-in-from-bottom-4">
                <TargetManager 
                  categories={categories} 
                  targets={targets} 
                  setTargets={setTargets} 
                  formatRp={formatRp} 
                />
              </div>
            )}

            {topLevelRoute === 'operasional' && (
               <>
      <nav className="bg-green-700 text-white shadow-md sticky top-[60px] z-50 shrink-0 no-print">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="font-bold text-lg flex items-center gap-2 mr-4 shrink-0">
            <Calculator size={24} /> <span className="hidden lg:inline">Sistem Rekap STSU</span>
            <div 
              className="ml-0 sm:ml-4 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-2.5 py-1 bg-green-900/60 border border-green-500/40 rounded-lg shadow-inner select-none" 
              title={syncStatus === 'synced' ? 'Semua data tersimpan otomatis di Database Cloud Pusat' : syncStatus === 'syncing' ? 'Menyinkronkan ke Cloud...' : 'Koneksi Offline'}
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="animate-spin text-amber-300" size={13}/>
                  <span className="hidden md:inline text-amber-200">Menyimpan...</span>
                </>
              ) : syncStatus === 'synced' ? (
                <>
                  <Cloud size={13} className="text-emerald-300"/>
                  <span className="hidden md:inline text-emerald-100">Tersimpan di Cloud</span>
                </>
              ) : (
                <>
                  <CloudOff size={13} className="text-red-300"/>
                  <span className="hidden md:inline text-red-200">Mode Offline</span>
                </>
              )}
            </div>
          </div>
          <div className="flex space-x-1 sm:space-x-2 shrink-0 overflow-x-auto no-scrollbar items-center">
            <button onClick={() => handleTabSwitch('kalender')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'kalender' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Calendar size={18} /> <span className="hidden md:inline">Kalender</span></button>
            <button onClick={() => handleTabSwitch('input')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'input' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Edit size={18} /> <span className="hidden md:inline">Input</span></button>
            <button onClick={() => handleTabSwitch('rekonBank')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'rekonBank' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Database size={18} /> <span className="hidden md:inline">Rekon Bank</span></button>
            <button onClick={() => handleTabSwitch('settings')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Settings size={18} /> <span className="hidden md:inline">Master</span></button>
            <button onClick={() => handleTabSwitch('print')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'print' ? 'bg-green-800' : 'hover:bg-green-600'}`}><FileText size={18} /> <span className="hidden md:inline">Cetak</span></button>
            
            <div className="pl-2 border-l border-green-600 ml-1 flex items-center gap-2">
                <span className="text-xs font-bold bg-green-800 px-2 py-1 rounded-md capitalize hidden sm:block">
                   Hi, {user?.email ? user.email.split('@')[0] : 'User'}
                </span>
                <button onClick={handleLogout} className="px-2 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 transition-colors" title="Keluar Akun"><LogOut size={18} /></button>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* 🔴 TAB: KALENDER */}
      {/* ============================================================== */}
      <KalenderTab
        activeTab={activeTab}
        allReports={allReports}
        reportDate={reportDate}
        closedMonths={closedMonths}
        isMonthClosed={isMonthClosed}
        onSelectDay={({ dateStr, type, lainIndex }) => {
          handleDateChange(dateStr);
          if (type) setActiveType(type);
          if (lainIndex !== undefined) setActiveLainIndex(lainIndex);
          setActiveTab('input');
          setTopLevelRoute('operasional');
        }}
      />

      {activeTab === 'rekonBank' && (
          <div className="no-print w-full bg-gray-50 min-h-screen">
              <RekonBankTab 
                 syncStatus={syncStatus}
                 onRefreshCloud={handleManualSync}
                 isMonthClosed={isMonthClosed}
                 bankRows={bankRows}
                 setBankRows={setBankRows}
                 allReports={allReports}
                 formatRp={formatRp} 
                 safeString={safeString} 
                 categories={categories}
                 onSaveBankRows={async (newBankRows) => {
                     const baseReports = stateRef.current.allReports;
                     setBankRows(newBankRows);
                     await saveToFirebaseDirectly(baseReports, newBankRows);
                     showToast(`Berhasil menyimpan ${newBankRows.length} data mutasi bank ke Cloud!`);
                 }}
                 onSaveRekon={(bankRow, allocations, apis) => {
                      const safeApis = Array.isArray(apis) ? apis : [];
                      // 1. Format Tanggal
                      let ymd = new Date().toISOString().split('T')[0];
                      try {
                          const cleanStr = (bankRow.date || '').replace(/WIB|WITA|WIT/i, '').trim();
                          const d = new Date(cleanStr);
                          if (!isNaN(d.getTime())) {
                              const y = d.getFullYear();
                              const m = String(d.getMonth() + 1).padStart(2, '0');
                              const day = String(d.getDate()).padStart(2, '0');
                              ymd = `${y}-${m}-${day}`;
                          }
                      } catch(e) {}

                      const distinctTargetDates = [...new Set(allocations.map(a => a.targetDate || ymd).filter(Boolean))];
                      const primaryTargetDate = distinctTargetDates[0] || ymd;

                      if (isMonthClosed(primaryTargetDate) || isMonthClosed(ymd) || distinctTargetDates.some(d => isMonthClosed(d))) {
                          alert('Periode tanggal yang dipilih telah TUTUP BUKU. Tidak dapat menambah atau mengalokasikan data ke periode yang terkunci.');
                          return;
                      }

                      // Compute target summary for bankRows
                      let targetSummary = allocations.map(a => {
                          let n = '';
                          if (a.categoryId) {
                              const cat = categories.find(c => c.id === a.categoryId);
                              if (cat) n += cat.name;
                          }
                          return `${n} (Rp ${formatRp(a.amount)})`;
                      }).join(', ');

                      try {
                          const baseReports = stateRef.current.allReports;
                          const newReports = JSON.parse(JSON.stringify(baseReports));
                          const createdAllocationsSummary = [];

                          const baseBankRows = ensureBankRowIds(stateRef.current.bankRows);
                          const targetIndex = baseBankRows.findIndex(r => 
                              (bankRow.id && r.id && r.id === bankRow.id) ||
                              (r.date === bankRow.date && Number(r.amount) === Number(bankRow.amount) && (r.description || '').trim() === (bankRow.description || '').trim()) ||
                              (r.date === bankRow.date && Number(r.amount) === Number(bankRow.amount))
                          );
                          const effectiveRowId = (targetIndex >= 0 && baseBankRows[targetIndex].id) 
                              ? baseBankRows[targetIndex].id 
                              : (bankRow.id || `bank_${Date.now()}`);
                          
                           allocations.forEach(alloc => {
                               const allocYmd = alloc.targetDate || ymd;
                               if (!newReports[allocYmd]) {
                                   newReports[allocYmd] = {};
                               }
                               const dayData = newReports[allocYmd];
                               
                               const cat = categories.find(c => c.id === alloc.categoryId);
                               if (!cat) return; // Kategori wajib
                               
                               let theItemId = alloc.itemId;
                               if (!theItemId || !cat.items || cat.items.length === 0) {
                                   theItemId = 'direct';
                               }

                               let docKey = 'utama'; 
                               if (cat.type === 'lain') {
                                   let targetIndexDoc = 1;
                                   while (true) {
                                       const candidateKey = targetIndexDoc === 1 ? 'lain' : `lain_${targetIndexDoc}`;
                                       const candidateDoc = dayData[candidateKey];
                                       
                                       if (!candidateDoc || !Array.isArray(candidateDoc.activeItems) || candidateDoc.activeItems.length === 0) {
                                           docKey = candidateKey;
                                           break;
                                       }
                                       
                                       const allSameCategory = candidateDoc.activeItems.every(i => i.catId === cat.id);
                                       
                                       if (allSameCategory) {
                                           docKey = candidateKey;
                                           break;
                                       }
                                       
                                       targetIndexDoc++;
                                   }
                               }

                               if (!dayData[docKey]) {
                                   dayData[docKey] = { sequence: '', signatureDate: allocYmd, activeItems: [], formData: {} };
                               }
                               if (!dayData[docKey].formData) dayData[docKey].formData = {};
                               if (!Array.isArray(dayData[docKey].activeItems)) dayData[docKey].activeItems = [];

                               const typeData = dayData[docKey];

                               const apiItem = safeApis.find(a => String(a.id) === String(alloc.apiRefId));
                               const rawProofUrl = alloc.proofUrl || apiItem?.buktiTransferUrl || apiItem?.buktiTransferDocUrl || apiItem?.pksDriveUrl || bankRow.proofUrl || '';
                               const isBase64Proof = (typeof rawProofUrl === 'string' && rawProofUrl.startsWith('data:image'));
                               // Untuk menjaga performa dan batas 1MB Firestore, URL base64 disimpan pada mutasi bank saja
                               const cleanProofUrl = isBase64Proof ? '' : rawProofUrl;

                               const tenantLabel = alloc.tenant || (apiItem ? (apiItem.nama_penyewa || apiItem.namaPerusahaan || '') : '');
                               const locationLabel = alloc.location || (apiItem ? (apiItem.lokasi_sewa || apiItem.namaProduk || '') : '');
                               const displayDesc = tenantLabel
                                 ? (locationLabel && locationLabel !== tenantLabel ? `${tenantLabel} - ${locationLabel}` : tenantLabel)
                                 : (alloc.description || bankRow.description || 'Mutasi Bank');

                               const allocAmount = Number(alloc.amount || 0);

                               const newAllocationDetail = {
                                   bankRowId: effectiveRowId,
                                   bankDate: bankRow.date,
                                   amount: allocAmount,
                                   desc: displayDesc,
                                   tenant: tenantLabel,
                                   location: locationLabel,
                                   apiRefId: alloc.apiRefId || '',
                                   proofUrl: cleanProofUrl
                               };

                               // 🔴 PENCARIAN ITEM SECARA IDENTITAS POS (KATEGORI & ITEM):
                               // Tidak terpengaruh hash catatan lama sehingga akumulasi nominal 100% akurat
                               let existingItem = typeData.activeItems.find(i => {
                                   if (!i || typeof i !== 'object') return false;
                                   const matchCat = (i.catId === cat.id);
                                   const matchItem = (theItemId === 'direct')
                                       ? (i.itemId === 'direct' || i.id === 'direct' || !i.itemId)
                                       : (i.itemId === theItemId || i.id === theItemId);
                                   return matchCat && matchItem;
                               });

                               let itemKey = '';
                               const wasNew = !existingItem;

                               if (existingItem) {
                                   // Item sudah ada di laporan harian
                                   itemKey = getActiveItemKey(existingItem.catId, existingItem.itemId || existingItem.id, existingItem.isSusulan, existingItem.validDate, existingItem.itemDate, existingItem.itemNote);
                                   const priorNominal = Number(typeData.formData[itemKey] || typeData.formData[`${existingItem.catId}_${existingItem.itemId || existingItem.id}`] || 0);

                                   const priorRowId = existingItem.originBankRowId || existingItem.bankMatchRowId || 'prior_0';
                                   const priorDate = existingItem.originBankDate || existingItem.bankMatchDate || '';

                                   if (!Array.isArray(existingItem.bankAllocations)) {
                                       existingItem.bankAllocations = [];
                                       if (priorNominal > 0) {
                                           const existingApi = safeApis.find(a => String(a.id) === String(existingItem.apiRefId));
                                           const priorTenant = existingApi ? (existingApi.nama_penyewa || existingApi.namaPerusahaan || '') : (existingItem.itemNote || '');
                                           const priorLoc = existingApi ? (existingApi.lokasi_sewa || existingApi.namaProduk || '') : '';
                                           const priorLabel = priorTenant
                                               ? (priorLoc && priorLoc !== priorTenant ? `${priorTenant} - ${priorLoc}` : priorTenant)
                                               : (priorDate ? `Mutasi (${priorDate})` : 'Transaksi Sebelumnya');
                                           existingItem.bankAllocations.push({
                                               bankRowId: priorRowId,
                                               bankDate: priorDate,
                                               amount: priorNominal,
                                               desc: priorLabel,
                                               tenant: priorTenant,
                                               location: priorLoc,
                                               apiRefId: existingItem.apiRefId || '',
                                               proofUrl: existingItem.proofUrl || ''
                                           });
                                       }
                                   }

                                   existingItem.bankMatched = true;
                                   if (!Array.isArray(existingItem.bankMatchRowIds)) {
                                       existingItem.bankMatchRowIds = priorRowId ? [priorRowId] : [];
                                   }
                                   if (!existingItem.bankMatchRowIds.includes(effectiveRowId)) {
                                       existingItem.bankMatchRowIds.push(effectiveRowId);
                                   }
                                   existingItem.bankMatchRowId = effectiveRowId;
                                   existingItem.bankMatchDate = bankRow.date;

                                   const existingAllocIdx = existingItem.bankAllocations.findIndex(ba => 
                                       (ba.bankRowId === effectiveRowId && ba.bankRowId !== 'prior_0' && ba.bankRowId !== priorRowId) || 
                                       (ba.bankDate === bankRow.date && Number(ba.amount) === allocAmount)
                                   );

                                   if (existingAllocIdx >= 0) {
                                       existingItem.bankAllocations[existingAllocIdx] = {
                                           ...existingItem.bankAllocations[existingAllocIdx],
                                           ...newAllocationDetail
                                       };
                                   } else {
                                       existingItem.bankAllocations.push(newAllocationDetail);
                                   }

                                   // Total akumulasi seluruh alokasi mutasi yang terpasang
                                   const sumAlloc = existingItem.bankAllocations.reduce((sum, ba) => sum + Number(ba.amount || 0), 0);
                                   typeData.formData[itemKey] = sumAlloc > 0 ? sumAlloc : (priorNominal + allocAmount);

                                   if (alloc.apiRefId) existingItem.apiRefId = alloc.apiRefId;
                                   if (cleanProofUrl) existingItem.proofUrl = cleanProofUrl;

                               } else {
                                   // Item baru untuk laporan harian
                                   const newItem = {
                                       catId: cat.id,
                                       itemId: theItemId,
                                       bankMatched: true,
                                       bankMatchRowId: effectiveRowId,
                                       bankMatchDate: bankRow.date,
                                       bankMatchRowIds: [effectiveRowId],
                                       createdFromBank: true,
                                       originBankRowId: effectiveRowId,
                                       originBankDate: bankRow.date,
                                       originBankAllocAmount: allocAmount,
                                       bankAllocations: [newAllocationDetail],
                                       ...(alloc.apiRefId ? { apiRefId: alloc.apiRefId } : {}),
                                       ...(cleanProofUrl ? { proofUrl: cleanProofUrl } : {})
                                   };

                                   if (docKey === 'lain' || docKey.startsWith('lain_')) {
                                       newItem.itemDate = allocYmd; 
                                       if (alloc.description) newItem.itemNote = alloc.description.trim();
                                   }

                                   itemKey = getActiveItemKey(newItem.catId, newItem.itemId, newItem.isSusulan, newItem.validDate, newItem.itemDate, newItem.itemNote);
                                   typeData.activeItems.push(newItem);
                                   typeData.formData[itemKey] = allocAmount;
                               }
                               
                               if (cleanProofUrl) {
                                   typeData.formData[itemKey + '_buktiUrl'] = cleanProofUrl;
                               }
                               
                               createdAllocationsSummary.push({
                                   date: allocYmd,
                                   docKey: docKey,
                                   itemKey: itemKey,
                                   amount: allocAmount,
                                   wasNewItem: wasNew
                               });
                           });

                           let matchedProofUrl = '';
                            let matchedApiRefIds = [];
                            allocations.forEach(alloc => {
                                if (alloc.proofUrl) matchedProofUrl = alloc.proofUrl;
                                if (alloc.apiRefId) {
                                    matchedApiRefIds.push(alloc.apiRefId);
                                    const apiItem = safeApis.find(a => String(a.id) === String(alloc.apiRefId));
                                    const url = alloc.proofUrl || apiItem?.buktiTransferUrl || apiItem?.buktiTransferDocUrl || apiItem?.pksDriveUrl || '';
                                    if (url) matchedProofUrl = url;
                                }
                            });

                            const newBankRows = baseBankRows.map((r, idx) => {
                               const isTarget = (targetIndex >= 0 && idx === targetIndex) ||
                                   (bankRow.id && r.id && r.id === bankRow.id) ||
                                   (r.id && r.id === effectiveRowId) ||
                                   (r.date === bankRow.date && Number(r.amount) === Number(bankRow.amount));
                               if (isTarget) {
                                    const finalProofUrl = matchedProofUrl || r.proofUrl || bankRow.proofUrl || '';
                                    return { 
                                        ...r, 
                                        id: r.id || effectiveRowId,
                                        status: 'matched', 
                                        isFromInputBaru: true,
                                        inputBaruAllocations: createdAllocationsSummary,
                                        matchedTo: targetSummary,
                                        linkedTo: { 
                                            date: primaryTargetDate, 
                                            dates: distinctTargetDates, 
                                            groupName: targetSummary, 
                                            proofUrl: finalProofUrl 
                                        },
                                        proofUrl: finalProofUrl,
                                        apiRefId: matchedApiRefIds[0] || r.apiRefId || bankRow.apiRefId || '',
                                        apiRefIds: matchedApiRefIds.length > 0 ? matchedApiRefIds : (r.apiRefIds || [])
                                    };
                                }
                               return r;
                           });
                           
                           // 🔴 PENYIMPANAN TERPUSAT & SINKRON KE SELURUH STATE, LOCALSTORAGE, DAN FIRESTORE CLOUD
                           saveState({
                               allReports: newReports,
                               bankRows: newBankRows
                           }, { immediate: true, showToastMessage: `Berhasil menyimpan alokasi rekon ke laporan tanggal ${primaryTargetDate}!` });

                       } catch (err) {
                           console.error("Error in onSaveRekon:", err);
                           alert("Terjadi kesalahan saat menyimpan alokasi: " + err.message);
                       }
                   }}
                  onLinkRekon={async (bankRow, targetDate, targetType, targetGroupInfo) => {
                       if (isMonthClosed(targetDate) || isMonthClosed(bankRow?.date)) {
                           alert('Periode tanggal ini telah TUTUP BUKU. Tidak dapat memasangkan mutasi ke periode yang terkunci.');
                           return;
                       }
                       const bankAmount = Number(bankRow?.amount || 0);
                       const groupNominal = Number(targetGroupInfo?.nominal || 0);
                       if (bankAmount !== groupNominal) {
                           alert(`Pemasangan Ditolak!\nNominal mutasi bank (Rp ${formatRp(bankAmount)}) tidak sesuai dengan nominal dashboard (Rp ${formatRp(groupNominal)}).\nNominal harus sama persis.`);
                           return;
                       }
                       try {
                           const baseBankRows = ensureBankRowIds(stateRef.current.bankRows);
                           const targetIndex = baseBankRows.findIndex(r => 
                               (bankRow.id && r.id && r.id === bankRow.id) ||
                               (r.date === bankRow.date && Number(r.amount) === Number(bankRow.amount) && r.description === bankRow.description)
                           );
                           const effectiveRowId = (targetIndex >= 0 && baseBankRows[targetIndex].id) 
                               ? baseBankRows[targetIndex].id 
                               : (bankRow.id || `bank_${Date.now()}`);

                           // 1. Construct new reports
                           const baseReports = stateRef.current.allReports;
                           const newReports = { ...baseReports };
                           const dayData = { ...(newReports[targetDate] || {}) };
                           const typeData = { ...(dayData[targetType] || { formData: {}, activeItems: [] }) };
                           const safeActiveItems = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];
                           const newActiveItems = [...safeActiveItems];
                          
                           targetGroupInfo.itemIndices.forEach(idx => {
                               if (newActiveItems[idx]) {
                                   const it = newActiveItems[idx];
                                   const existingRowIds = Array.isArray(it.bankMatchRowIds) ? it.bankMatchRowIds : (it.bankMatchRowId ? [it.bankMatchRowId] : []);
                                   const updatedRowIds = existingRowIds.includes(effectiveRowId) ? existingRowIds : [...existingRowIds, effectiveRowId];
                                   newActiveItems[idx] = { 
                                       ...it, 
                                       bankMatched: true, 
                                       bankMatchDate: bankRow.date,
                                       bankMatchRowId: effectiveRowId,
                                       bankMatchRowIds: updatedRowIds,
                                        originBankAllocAmount: groupNominal
                                   };
                               }
                           });
                          
                           dayData[targetType] = { ...typeData, activeItems: newActiveItems };
                           newReports[targetDate] = dayData;
                          
                           // 2. Construct new bank rows
                           let linkedProofUrl = '';
                           targetGroupInfo.itemIndices.forEach(idx => {
                               if (newActiveItems[idx]) {
                                   const it = newActiveItems[idx];
                                   let itemKey = `${it.catId}_${it.itemId || it.id}`;
                                   if (it.itemDate) itemKey += `_date_${it.itemDate}`;
                                   if (it.itemNote) {
                                       let h = 0; for(let j=0; j<it.itemNote.length; j++){ h=((h<<5)-h)+it.itemNote.charCodeAt(j); h=h&h; }
                                       itemKey += `_note_${Math.abs(h)}`;
                                   }
                                   const u = it.proofUrl || typeData.formData?.[itemKey + '_buktiUrl'];
                                   if (u) linkedProofUrl = u;
                               }
                           });

                           const newBankRows = baseBankRows.map((r, idx) => {
                               const isTarget = (targetIndex >= 0 && idx === targetIndex) ||
                                   (bankRow.id && r.id && r.id === bankRow.id) ||
                                   (r.id && r.id === effectiveRowId) ||
                                   (r.date === bankRow.date && Number(r.amount) === Number(bankRow.amount) && r.description === bankRow.description);
                               if (isTarget) {
                                   return { 
                                       ...r, 
                                       id: r.id || effectiveRowId,
                                       status: 'linked', 
                                       linkedTo: { date: targetDate, groupName: targetGroupInfo.name, proofUrl: linkedProofUrl || r.proofUrl || '' },
                                       proofUrl: linkedProofUrl || r.proofUrl || ''
                                   };
                               }
                               return r;
                           });

                           // 3. Set states
                           setAllReports(newReports);
                           setBankRows(newBankRows);
                          
                           saveToFirebaseDirectly(newReports, newBankRows);

                           showToast(`Berhasil memasangkan mutasi dengan pendapatan tanggal ${targetDate}!`);
                       } catch (err) {
                           console.error("Error in onLinkRekon:", err);
                           alert("Gagal memasangkan data: " + err.message);
                       }
                  }}
                  onUpdateBankRow={(rowId, updates) => {
                       const baseBankRows = ensureBankRowIds(stateRef.current.bankRows);
                       const newBankRows = baseBankRows.map(r => {
                           if (r.id === rowId) {
                               const updated = { ...r, ...updates };
                               if (updates.proofUrl && updated.linkedTo) {
                                   updated.linkedTo = { ...updated.linkedTo, proofUrl: updates.proofUrl };
                               }
                               return updated;
                           }
                           return r;
                       });
                       setBankRows(newBankRows);
                       saveToFirebaseDirectly(stateRef.current.allReports, newBankRows);
                   }}
                  onUnlinkBankRow={async (bankRow) => {
                     if (isMonthClosed(bankRow?.date) || (bankRow?.linkedTo?.date && isMonthClosed(bankRow.linkedTo.date))) {
                         alert('Periode tanggal ini telah TUTUP BUKU. Status pasangan mutasi bank tidak dapat dibatalkan atau dilepas.');
                         return;
                     }
                     try {
                         const baseReports = stateRef.current.allReports;
                          const newReports = JSON.parse(JSON.stringify(baseReports));
                          
                          const isFromInputBaru = 
                              bankRow.status === 'matched' || 
                              !!bankRow.isFromInputBaru || 
                              (Array.isArray(bankRow.inputBaruAllocations) && bankRow.inputBaruAllocations.length > 0) || 
                              (!!bankRow.matchedTo && bankRow.status !== 'linked');

                          if (isFromInputBaru) {
                              // ==============================================================
                              // 🔴 JIKA MUTASI DIBUAT DARI "INPUT BARU":
                              // Data pendapatan di dashboard harus DIHAPUS (nominal dikurangi/dihapus,
                              // dan item dibuang dari activeItems).
                              // ==============================================================
                              if (Array.isArray(bankRow.inputBaruAllocations) && bankRow.inputBaruAllocations.length > 0) {
                                  bankRow.inputBaruAllocations.forEach(alloc => {
                                      const dayData = newReports[alloc.date];
                                      if (!dayData || !dayData[alloc.docKey]) return;
                                      const typeData = dayData[alloc.docKey];
                                      
                                      if (typeData.formData && typeData.formData[alloc.itemKey] !== undefined) {
                                          const curr = Number(typeData.formData[alloc.itemKey] || 0);
                                          const rem = curr - Number(alloc.amount || 0);
                                          if (rem <= 0) {
                                              delete typeData.formData[alloc.itemKey];
                                              delete typeData.formData[alloc.itemKey + '_buktiUrl'];
                                          } else {
                                              typeData.formData[alloc.itemKey] = rem;
                                          }
                                      }

                                      if (Array.isArray(typeData.activeItems)) {
                                          typeData.activeItems = typeData.activeItems.filter(item => {
                                              if (!item) return false;
                                              let k = `${item.catId}_${item.itemId || item.id}`;
                                              if (item.itemDate) k += `_date_${item.itemDate}`;
                                              if (item.itemNote) {
                                                  let h = 0; for(let j=0; j<item.itemNote.length; j++){ h=((h<<5)-h)+item.itemNote.charCodeAt(j); h=h&h; }
                                                  k += `_note_${Math.abs(h)}`;
                                              }
                                               if (k === alloc.itemKey) {
                                                   const rem = Number(typeData.formData?.[alloc.itemKey] || 0);
                                                   if (rem > 0) {
                                                       if (Array.isArray(item.bankAllocations)) {
                                                           item.bankAllocations = item.bankAllocations.filter(ba => ba.bankRowId !== bankRow.id);
                                                       }
                                                       if (Array.isArray(item.bankMatchRowIds)) {
                                                           item.bankMatchRowIds = item.bankMatchRowIds.filter(id => id !== bankRow.id);
                                                           if (item.bankMatchRowIds.length > 0) {
                                                               item.bankMatchRowId = item.bankMatchRowIds[0];
                                                           }
                                                       }
                                                       return true;
                                                   }
                                                   return false;
                                               }
                                              return true;
                                          });
                                      }
                                      if (alloc.docKey.startsWith('lain_') && Array.isArray(typeData.activeItems) && typeData.activeItems.length === 0) {
                                          delete dayData[alloc.docKey];
                                      }
                                  });
                              } else {
                                  // Fallback untuk mutasi Input Baru sebelumnya (seperti kasus Pedagang Tikar)
                                  Object.keys(newReports).forEach(date => {
                                      Object.keys(newReports[date] || {}).forEach(type => {
                                          const typeData = newReports[date]?.[type];
                                          if (!typeData || !Array.isArray(typeData.activeItems)) return;
                                          
                                          typeData.activeItems = typeData.activeItems.filter(item => {
                                              if (!item) return false;
                                              const matchesId = (bankRow.id && (item.bankMatchRowId === bankRow.id || (Array.isArray(item.bankMatchRowIds) && item.bankMatchRowIds.includes(bankRow.id)) || item.originBankRowId === bankRow.id));
                                              const matchesDate = !bankRow.id && !item.bankMatchRowId && (item.bankMatchDate === bankRow.date || item.originBankDate === bankRow.date);

                                              if (matchesId || matchesDate) {
                                                  let itemKey = `${item.catId}_${item.itemId || item.id}`;
                                                  if (item.itemDate) itemKey += `_date_${item.itemDate}`;
                                                  if (item.itemNote) {
                                                      let h = 0; for(let j=0; j<item.itemNote.length; j++){ h=((h<<5)-h)+item.itemNote.charCodeAt(j); h=h&h; }
                                                      itemKey += `_note_${Math.abs(h)}`;
                                                  }
                                                  if (typeData.formData) {
                                                      delete typeData.formData[itemKey];
                                                      delete typeData.formData[itemKey + '_buktiUrl'];
                                                  }
                                                  return false; // Hapus item dari activeItems
                                              }
                                              return true;
                                          });

                                          if (type.startsWith('lain_') && Array.isArray(typeData.activeItems) && typeData.activeItems.length === 0) {
                                              delete newReports[date][type];
                                          }
                                      });
                                  });
                              }
                          } else {
                              // ==============================================================
                              // 🔴 JIKA MUTASI DARI "PASANGKAN":
                              // Data memang sudah ada di dashboard sebelum dipasangkan.
                              // HANYA lepaskan status pasangan (bankMatched), TIDAK MENGHAPUS
                              // item maupun nominal di formData!
                              // ==============================================================
                              Object.keys(newReports).forEach(date => {
                                  Object.keys(newReports[date]).forEach(type => {
                                      if (newReports[date][type] && Array.isArray(newReports[date][type].activeItems)) {
                                          newReports[date][type].activeItems = newReports[date][type].activeItems.map(item => {
                                              if (item) {
                                                  const matchesId = (bankRow.id && (item.bankMatchRowId === bankRow.id || (Array.isArray(item.bankMatchRowIds) && item.bankMatchRowIds.includes(bankRow.id))));
                                                  const matchesDate = !bankRow.id && !item.bankMatchRowId && item.bankMatchDate === bankRow.date;
                                                  
                                                  if (matchesId || matchesDate) {
                                                      const newItem = { ...item };
                                                      if (Array.isArray(newItem.bankMatchRowIds)) {
                                                          newItem.bankMatchRowIds = newItem.bankMatchRowIds.filter(id => id !== bankRow.id);
                                                          if (newItem.bankMatchRowIds.length === 0) {
                                                              delete newItem.bankMatched;
                                                              delete newItem.bankMatchDate;
                                                              delete newItem.bankMatchRowId;
                                                              delete newItem.bankMatchRowIds;
                                                          } else {
                                                              newItem.bankMatchRowId = newItem.bankMatchRowIds[newItem.bankMatchRowIds.length - 1];
                                                          }
                                                      } else {
                                                          delete newItem.bankMatched;
                                                          delete newItem.bankMatchDate;
                                                          delete newItem.bankMatchRowId;
                                                      }
                                                      return newItem;
                                                  }
                                              }
                                              return item;
                                          });
                                      }
                                  });
                              });
                          }

                          const baseBankRows = ensureBankRowIds(stateRef.current.bankRows);
                           const newBankRows = baseBankRows.map(r => {
                               if (r.id === bankRow.id || (r.date === bankRow.date && Number(r.amount) === Number(bankRow.amount) && r.description === bankRow.description)) {
                                  const updated = { ...r, status: 'pending' };
                                  delete updated.linkedTo;
                                  delete updated.matchedTo;
                                  delete updated.isFromInputBaru;
                                  delete updated.inputBaruAllocations;
                                  return updated;
                              }
                              return r;
                          });
                          
                          setAllReports(newReports);
                          setBankRows(newBankRows);
                          
                          showToast('Status pasangan mutasi bank berhasil dibatalkan!');
                          saveToFirebaseDirectly(newReports, newBankRows);
                      } catch (err) {
                          console.error("Error unlinking:", err);
                          alert("Gagal membatalkan pasangan: " + err.message);
                      }
                  }}
              />
          </div>
      )}


      {/* ============================================================== */}
      {/* 🔴 TAB: INPUT */}
      {/* ============================================================== */}
      <InputHarianTab
        activeTab={activeTab}
        activeType={activeType}
        handleTypeSwitch={handleTypeSwitch}
        handleOpenTransit3A={handleOpenTransit3A}
        handleOpenTransitIWM={handleOpenTransitIWM}
        lainDocIndices={lainDocIndices}
        activeLainIndex={activeLainIndex}
        setActiveLainIndex={setActiveLainIndex}
        handleAddLainDoc={handleAddLainDoc}
        handleRemoveLainDoc={handleRemoveLainDoc}
        reportDate={reportDate}
        handleDateChange={handleDateChange}
        currentReport={currentReport}
        handleSignatureDateChange={handleSignatureDateChange}
        handleSequenceChange={handleSequenceChange}
        computedStsuNo={computedStsuNo}
        grandTotal={grandTotal}
        isAddingSusulan={isAddingSusulan}
        setIsAddingSusulan={setIsAddingSusulan}
        susulanValidDate={susulanValidDate}
        setSusulanValidDate={setSusulanValidDate}
        lainItemDate={lainItemDate}
        setLainItemDate={setLainItemDate}
        selectedCatToAdd={selectedCatToAdd}
        setSelectedCatToAdd={setSelectedCatToAdd}
        handleCatChange={handleCatChange}
        filteredCategories={filteredCategories}
        selectedItemToAdd={selectedItemToAdd}
        setSelectedItemToAdd={setSelectedItemToAdd}
        availableItemsToAdd={availableItemsToAdd}
        manualNominalToAdd={manualNominalToAdd}
        setManualNominalToAdd={setManualNominalToAdd}
        lainItemNote={lainItemNote}
        setLainItemNote={setLainItemNote}
        handleGenerateUraian={handleGenerateUraian}
        isGeneratingUraian={isGeneratingUraian}
        handleAddActiveItem={handleAddActiveItem}
        activeGroups={activeGroups}
        handleRemoveActiveItem={handleRemoveActiveItem}
        openEditNote={openEditNote}
        handleInputChange={handleInputChange}
        triggerSaveToFirebase={() => {
          flushPendingSave();
        }}
        subtotals={subtotals}
        clearCurrentReport={clearCurrentReport}
        handleForceSave={handleForceSave}
        isMonthClosed={isMonthClosed(reportDate)}
        closedInfo={(closedMonths || {})[getPartitionMonth(reportDate)]}
        onViewDraftCetak={() => {
          setActiveTab('print');
          setPrintMode('pdf');
        }}
      />

            {/* ============================================================== */}
      {/* 🔴 TAB: SETTINGS (MASTER) */}
      {/* ============================================================== */}
      <MasterSettingsTab
        activeTab={activeTab}
        activeMasterMenu={activeMasterMenu}
        setActiveMasterMenu={setActiveMasterMenu}
        apiIpAddress={apiIpAddress}
        setApiIpAddress={setApiIpAddress}
        signatures={signatures}
        setSignatures={handleUpdateSignatures}
        handleForceSave={handleForceSave}
        categories={categories}
        moveCategory={moveCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        moveItem={moveItem}
        updateItemName={updateItemName}
        deleteItem={deleteItem}
        addItem={addItem}
        addCategory={addCategory}
        allReports={allReports}
        bankRows={bankRows}
        formatRp={formatRp}
        closedMonths={closedMonths}
        onToggleCloseMonth={handleToggleCloseMonth}
        onDownloadBackup={handleDownloadBackup}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* ============================================================== */}
      {/* 🔴 TAB: PRINT & NCR DOT MATRIX */}
      {/* ============================================================== */}
      <PrintPreviewTab
        activeTab={activeTab}
        printMode={printMode}
        setPrintMode={setPrintMode}
        selectedNcrGroup={selectedNcrGroup}
        setSelectedNcrGroup={setSelectedNcrGroup}
        activeType={activeType}
        activeGroups={activeGroups}
        setActiveTab={setActiveTab}
        handleDownloadPDF={handleDownloadPDF}
        pdfLoading={pdfLoading}
        handlePrint={handlePrint}
        reportDate={reportDate}
        computedStsuNo={computedStsuNo}
        subtotals={subtotals}
        grandTotal={grandTotal}
        currentReport={currentReport}
        signatures={signatures}
        categories={categories}
        allReports={allReports}
        activeLainIndex={activeLainIndex}
        handleSequenceChange={handleSequenceChange}
        handleSignatureDateChange={handleSignatureDateChange}
        isMonthClosed={isMonthClosed(reportDate)}
      />

      </>
      )}

      {topLevelRoute === 'dashboard' && (
  <div className="max-w-6xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4">


      {/* 🔴 TAB: LAPORAN (EXCEL) */}
      {/* ============================================================== */}
      <RekapExcelTab
        dashboardTab={dashboardTab}
        excelReportMonth={excelReportMonth}
        setExcelReportMonth={setExcelReportMonth}
        selectedReportType={selectedReportType}
        setSelectedReportType={setSelectedReportType}
        reportCategories={reportCategories}
        allReports={allReports}
        categories={categories}
        rekonOfficerName={rekonOfficerName}
        currentReport={currentReport}
        signatures={signatures}
        handleUpdateRekonRow={handleUpdateRekonRow}
      />

  </div>
)}

      </div>
      )}

    </div>
  );
}
