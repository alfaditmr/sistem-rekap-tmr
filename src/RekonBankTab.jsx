import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Upload, RefreshCw, Link as LinkIcon, CheckCircle, AlertCircle, Plus, Trash, Database, 
  Filter, Trash2, Edit, RotateCcw, Zap, Sparkles, Calendar, ChevronLeft, ChevronRight, ListFilter 
} from 'lucide-react';
import MultiDateCalendar from './MultiDateCalendar';

export default function RekonBankTab({ 
  bankRows = [], 
  setBankRows, 
  formatRp, 
  safeString, 
  categories = [], 
  onSaveRekon, 
  allReports = {}, 
  onLinkRekon, 
  onUpdateBankRow, 
  onUnlinkBankRow, 
  onSaveBankRows, 
  syncStatus, 
  onRefreshCloud 
}) {
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [selectedBankDates, setSelectedBankDates] = useState([]);
  const [editModal, setEditModal] = useState({ isOpen: false, row: null, proof: '', proofUrl: '' });
  const [apiFilterStatus, setApiFilterStatus] = useState('all');
  const [apiData, setApiData] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiDate, setApiDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [dateStatusFilter, setDateStatusFilter] = useState('all'); // 'all' | 'pending' | 'paired'

  // Helper untuk parsing tanggal format mutasi bank ke YYYY-MM-DD
  const parseYmd = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    try {
      const cleanStr = dateStr.replace(/WIB|WITA|WIT/i, '').trim();
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      const dmy = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dmy) {
        return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
      }
    } catch(e) {}
    return '';
  };

  const formatCompactRp = (val) => {
    const num = Number(val) || 0;
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1).replace('.0', '')} M`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')} Jt`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} rb`;
    return String(num);
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch(e) {}
    return dateStr;
  };

  // Mencari tanggal transaksi mutasi paling akhir untuk inisialisasi kalender
  const latestBankDate = useMemo(() => {
    let maxTime = 0;
    let maxYmd = '';
    bankRows.forEach(r => {
      const ymd = parseYmd(r.date);
      if (ymd) {
        const t = new Date(ymd).getTime();
        if (t > maxTime) {
          maxTime = t;
          maxYmd = ymd;
        }
      }
    });
    return maxYmd;
  }, [bankRows]);

  const hasInitializedDate = useRef(false);

  useEffect(() => {
    if (latestBankDate && !hasInitializedDate.current) {
      setSelectedDate(latestBankDate);
      const parts = latestBankDate.split('-');
      if (parts.length === 3) {
        setCalendarMonth(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
      }
      hasInitializedDate.current = true;
    }
  }, [latestBankDate]);

  // Indexing seluruh mutasi bank berdasarkan tanggal YYYY-MM-DD
  const bankRowsByDate = useMemo(() => {
    const map = {};
    bankRows.forEach(r => {
      const ymd = parseYmd(r.date);
      if (!ymd) return;
      if (!map[ymd]) {
        map[ymd] = {
          rows: [],
          totalAmount: 0,
          pairedCount: 0,
          pendingCount: 0,
          pairedAmount: 0,
          pendingAmount: 0
        };
      }
      map[ymd].rows.push(r);
      const amt = Number(r.amount) || 0;
      map[ymd].totalAmount += amt;
      if (r.status === 'matched' || r.status === 'linked') {
        map[ymd].pairedCount += 1;
        map[ymd].pairedAmount += amt;
      } else {
        map[ymd].pendingCount += 1;
        map[ymd].pendingAmount += amt;
      }
    });
    return map;
  }, [bankRows]);

  // Statistik bulan yang sedang aktif di kalender
  const monthStats = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    
    let totalAmount = 0;
    let totalCount = 0;
    let pairedCount = 0;
    let pairedAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    Object.entries(bankRowsByDate).forEach(([ymd, data]) => {
      if (ymd.startsWith(prefix)) {
        totalAmount += data.totalAmount;
        totalCount += data.rows.length;
        pairedCount += data.pairedCount;
        pairedAmount += data.pairedAmount;
        pendingCount += data.pendingCount;
        pendingAmount += data.pendingAmount;
      }
    });

    return {
      totalAmount,
      totalCount,
      pairedCount,
      pairedAmount,
      pendingCount,
      pendingAmount
    };
  }, [calendarMonth, bankRowsByDate]);

  // Matriks kalender bulan aktif
  const { blanks, days } = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const blanksArr = Array.from({ length: firstDayIndex }, (_, i) => i);
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateData = bankRowsByDate[dateStr] || null;
      return {
        day: d,
        dateStr,
        hasData: !!dateData,
        totalRows: dateData ? dateData.rows.length : 0,
        totalAmount: dateData ? dateData.totalAmount : 0,
        pairedCount: dateData ? dateData.pairedCount : 0,
        pendingCount: dateData ? dateData.pendingCount : 0,
        isAllPaired: dateData ? (dateData.rows.length > 0 && dateData.pendingCount === 0) : false,
        hasPending: dateData ? (dateData.pendingCount > 0) : false,
        rows: dateData ? dateData.rows : []
      };
    });
    return { blanks: blanksArr, days: daysArr };
  }, [calendarMonth, bankRowsByDate]);

  const prevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const jumpToLatestMonth = () => {
    if (latestBankDate) {
      const parts = latestBankDate.split('-');
      if (parts.length === 3) {
        setCalendarMonth(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
      }
      setSelectedDate(latestBankDate);
    } else {
      setCalendarMonth(new Date());
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Data mutasi pada tanggal yang sedang dipilih
  const activeDateData = useMemo(() => {
    return bankRowsByDate[selectedDate] || null;
  }, [selectedDate, bankRowsByDate]);

  const displayedDateRows = useMemo(() => {
    if (!activeDateData) return [];
    if (dateStatusFilter === 'pending') {
      return activeDateData.rows.filter(r => r.status === 'pending');
    }
    if (dateStatusFilter === 'paired') {
      return activeDateData.rows.filter(r => r.status === 'matched' || r.status === 'linked');
    }
    return activeDateData.rows;
  }, [activeDateData, dateStatusFilter]);

  // Logika Pencocokan Bukti API
  const getMatchedInfoForApi = (item) => {
    const urls = [
      item.buktiTransferUrl, 
      item.buktiTransferDocUrl, 
      item.pksDriveUrl, 
      item.fileUrl, 
      item.url
    ].filter(u => typeof u === 'string' && u.trim().length > 0).map(u => u.trim());
    
    const extractDriveId = (u) => {
      if (!u || typeof u !== 'string') return '';
      const m = u.match(/[-\w]{25,}/);
      return m ? m[0] : '';
    };
    
    const itemDriveIds = urls.map(extractDriveId).filter(Boolean);
    const itemId = String(item.id || '');
    
    const isUrlMatch = (target) => {
      if (!target || typeof target !== 'string') return false;
      const t = target.trim();
      if (!t) return false;
      if (urls.some(u => u === t || t.includes(u) || u.includes(t))) return true;
      const targetDriveId = extractDriveId(t);
      if (targetDriveId && itemDriveIds.includes(targetDriveId)) return true;
      return false;
    };

    const matchedRow = bankRows.find(r => {
      if (r.status !== 'matched' && r.status !== 'linked') return false;
      if (r.apiRefId && String(r.apiRefId) === itemId) return true;
      if (Array.isArray(r.apiRefIds) && r.apiRefIds.some(id => String(id) === itemId)) return true;
      if (isUrlMatch(r.proofUrl)) return true;
      if (isUrlMatch(r.linkedTo?.proofUrl)) return true;
      if (isUrlMatch(r.transferProof)) return true;
      return false;
    });
    if (matchedRow) return { isMatched: true, matchedRow };

    if (allReports) {
      for (const ymd of Object.keys(allReports)) {
        const dayData = allReports[ymd];
        if (!dayData) continue;
        for (const type of Object.keys(dayData)) {
          const typeData = dayData[type];
          if (typeData && Array.isArray(typeData.activeItems)) {
            for (const activeItem of typeData.activeItems) {
              if (activeItem.bankMatched) {
                if (activeItem.apiRefId && String(activeItem.apiRefId) === itemId) {
                  return { isMatched: true, reportItem: activeItem, reportDate: ymd };
                }
                if (isUrlMatch(activeItem.proofUrl)) {
                  return { isMatched: true, reportItem: activeItem, reportDate: ymd };
                }
                if (typeData.formData) {
                  let itemKey = activeItem.catId + '_' + (activeItem.itemId || activeItem.id);
                  if (activeItem.itemDate) itemKey += '_date_' + activeItem.itemDate;
                  if (activeItem.itemNote) {
                    let h = 0; for(let j=0; j<activeItem.itemNote.length; j++){ h=((h<<5)-h)+activeItem.itemNote.charCodeAt(j); h=h&h; }
                    itemKey += '_note_' + Math.abs(h);
                  }
                  const formUrl = typeData.formData[itemKey + '_buktiUrl'];
                  if (formUrl && isUrlMatch(formUrl)) {
                    return { isMatched: true, reportItem: activeItem, reportDate: ymd };
                  }
                }
              }
            }
          }
        }
      }
    }
    return { isMatched: false };
  };

  const matchedApiCount = useMemo(() => {
    return apiData.filter(item => getMatchedInfoForApi(item).isMatched).length;
  }, [apiData, bankRows, allReports]);

  const displayedApiData = useMemo(() => {
    if (apiFilterStatus === 'matched') return apiData.filter(item => getMatchedInfoForApi(item).isMatched);
    if (apiFilterStatus === 'unmatched') return apiData.filter(item => !getMatchedInfoForApi(item).isMatched);
    return apiData;
  }, [apiData, apiFilterStatus, bankRows, allReports]);

  const handleViewProof = (e, url) => {
    e.preventDefault();
    if (!url) return;
    if (url.startsWith('data:image')) {
      const win = window.open();
      if (win) {
        win.document.write(`<html><head><title>Bukti Transfer</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#222;"><img src="${url}" style="max-width:100%;max-height:100vh;" /></body></html>`);
        win.document.close();
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const uniqueBankDates = useMemo(() => {
    const dates = new Set(bankRows.map(r => {
      if (!r.date) return '';
      const match = r.date.match(/^[A-Za-z]+\s\d{2},\s\d{4}/);
      if (match) return match[0];
      const parts = r.date.split(',');
      if (parts.length > 1) return `${parts[0]}, ${parts[1].trim().split(' ')[0]}`;
      return r.date.split(' ')[0];
    }).filter(Boolean));
    return ['Semua', ...Array.from(dates)];
  }, [bankRows]);

  const filteredBankRows = useMemo(() => {
    if (selectedBankDates.length === 0 || (selectedBankDates.length === 1 && selectedBankDates[0] === 'Semua')) return bankRows;
    return bankRows.filter(r => selectedBankDates.some(d => r.date.includes(d)));
  }, [bankRows, selectedBankDates]);
  
  const groupedBankRows = useMemo(() => {
    const groups = {};
    filteredBankRows.forEach(r => {
      let d = r.date;
      const match = r.date.match(/^[A-Za-z]+\s\d{2},\s\d{4}/);
      if (match) d = match[0];
      else {
        const parts = r.date.split(',');
        if (parts.length > 1) d = `${parts[0]}, ${parts[1].trim().split(' ')[0]}`;
        else d = r.date.split(' ')[0];
      }
      if (!groups[d]) groups[d] = { total: 0, rows: [] };
      groups[d].rows.push(r);
      groups[d].total += (Number(r.amount) || 0);
    });
    return Object.entries(groups).sort((a,b) => new Date(b[0]) - new Date(a[0]));
  }, [filteredBankRows]);

  // Modal State
  const [splitModal, setSplitModal] = useState({ isOpen: false, bankRow: null, allocations: [] });
  const [linkModal, setLinkModal] = useState({ isOpen: false, bankRow: null });
  const [linkModalFilterDate, setLinkModalFilterDate] = useState('Semua');

  const fetchApiFasilitas = async () => {
    if (!apiDate) {
      alert("Silakan pilih tanggal terlebih dahulu agar data spesifik dan penarikan lebih cepat.");
      return;
    }
    setLoadingApi(true);
    try {
      const url = `https://sistem-informasi-ragunan.vercel.app/api/fasilitas?date=${apiDate}`;
      const res = await fetch(url);
      const fasRes = await res.json();
      
      if (fasRes && fasRes.data && fasRes.data.length > 0) {
        const newFasilitas = fasRes.data.map(d => ({...d, source: 'Fasilitas'}));
        setApiData(prev => [...prev.filter(d => d.source !== 'Fasilitas'), ...newFasilitas]);
        alert(`Berhasil memuat ${newFasilitas.length} transaksi Fasilitas (tanggal ${apiDate}).`);
      } else {
        alert(`Tidak ada data bukti transfer Fasilitas untuk tanggal ${apiDate}.`);
      }
    } catch(e) {
      console.error("API Fasilitas error:", e);
      alert("Gagal menarik data Fasilitas dari API. Pastikan endpoint aktif dan bisa diakses.");
    }
    setLoadingApi(false);
  };

  const fetchApiPromo = async () => {
    if (!apiDate) {
      alert("Silakan pilih tanggal terlebih dahulu agar data spesifik dan penarikan lebih cepat.");
      return;
    }
    setLoadingApi(true);
    try {
      const url = `https://sistem-informasi-ragunan.vercel.app/api/promo?date=${apiDate}`;
      const res = await fetch(url);
      const proRes = await res.json();
      
      if (proRes && proRes.data && proRes.data.length > 0) {
        const newPromo = proRes.data.map(d => ({...d, source: 'Promo'}));
        setApiData(prev => [...prev.filter(d => d.source !== 'Promo'), ...newPromo]);
        alert(`Berhasil memuat ${newPromo.length} transaksi Promo (tanggal ${apiDate}).`);
      } else {
        alert(`Tidak ada data bukti transfer Promo untuk tanggal ${apiDate}.`);
      }
    } catch(e) {
      console.error("API Promo error:", e);
      alert("Gagal menarik data Promo dari API. Pastikan endpoint aktif dan bisa diakses.");
    }
    setLoadingApi(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const formattedRows = [];
        let rowIdx = 0;

        results.data.forEach((row) => {
          if (!row || row.length < 4) return;
          const possibleDate = (row[2] || '').trim();
          const possibleDesc = (row[3] || '').trim();
          let possibleAmount = 0;
          const uangMasukCell = (row[5] || '').trim();
          
          if (uangMasukCell) {
            let s = String(uangMasukCell).trim();
            let val = 0;
            if (s.includes('.') && s.includes(',')) {
              let lastDot = s.lastIndexOf('.');
              let lastComma = s.lastIndexOf(',');
              if (lastComma > lastDot) s = s.substring(0, lastComma).replace(/[^0-9-]/g, '');
              else s = s.substring(0, lastDot).replace(/[^0-9-]/g, '');
            } else if (s.includes(',')) {
              let parts = s.split(',');
              if (parts[parts.length-1].length === 2) s = parts[0].replace(/[^0-9-]/g, '');
              else s = s.replace(/[^0-9-]/g, '');
            } else if (s.includes('.')) {
              let parts = s.split('.');
              if (parts[parts.length-1].length === 2) s = parts[0].replace(/[^0-9-]/g, '');
              else s = s.replace(/[^0-9-]/g, '');
            } else {
              s = s.replace(/[^0-9-]/g, '');
            }
            val = parseFloat(s) || 0;
            if (val > 0) possibleAmount = val;
          }
          
          if (possibleAmount > 0) {
            formattedRows.push({
              id: `bank_${rowIdx++}`,
              date: possibleDate || 'Tanpa Tanggal',
              description: possibleDesc || 'Tanpa Keterangan',
              amount: possibleAmount,
              status: 'pending'
            });
          }
        });

        if (formattedRows.length === 0) {
          alert("Gagal membaca CSV. Pastikan file berisi mutasi dengan angka Rupiah yang benar (contoh: 1.000.000).");
          e.target.value = null;
          return;
        }
        
        const currentRows = Array.isArray(bankRows) ? bankRows : [];
        const combined = [...currentRows];
        let newAdded = 0;

        formattedRows.forEach((r, idx) => {
          const isDup = combined.some(existing => 
            existing.date === r.date && 
            existing.amount === r.amount && 
            existing.description === r.description
          );
          if (!isDup) {
            combined.push({
              ...r,
              id: `bank_${Date.now()}_${idx}`
            });
            newAdded++;
          }
        });

        const finalRows = combined.length > 2000 ? combined.slice(combined.length - 2000) : combined;

        if (onSaveBankRows) {
          onSaveBankRows(finalRows);
        } else {
          setBankRows(finalRows);
        }

        e.target.value = null;
        alert(`Berhasil memuat file CSV!\n${newAdded} data mutasi baru ditambahkan (Total: ${finalRows.length} mutasi).\nData langsung disimpan permanen ke Cloud.`);
      }
    });
  };

  const openSplitModal = (row) => {
    setSplitModal({
      isOpen: true,
      bankRow: row,
      allocations: [{ id: Date.now(), categoryId: '', itemId: '', apiRefId: '', amount: row.amount, targetDate: parseYmd(row.date) || selectedDate || new Date().toISOString().split('T')[0] }]
    });
  };

  const addAllocation = () => {
    setSplitModal(prev => ({
      ...prev,
      allocations: [...prev.allocations, { id: Date.now(), categoryId: '', itemId: '', apiRefId: '', amount: 0, targetDate: parseYmd(prev.bankRow?.date) || selectedDate || new Date().toISOString().split('T')[0] }]
    }));
  };

  const updateAllocation = (id, field, value) => {
    setSplitModal(prev => ({
      ...prev,
      allocations: prev.allocations.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAllocation = (id) => {
    setSplitModal(prev => ({
      ...prev,
      allocations: prev.allocations.filter(a => a.id !== id)
    }));
  };

  const saveSplit = () => {
    const totalAllocated = splitModal.allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    if (totalAllocated !== splitModal.bankRow.amount) {
      alert(`Total alokasi (Rp ${formatRp(totalAllocated)}) tidak sama dengan nominal bank (Rp ${formatRp(splitModal.bankRow.amount)})`);
      return;
    }

    const hasEmptyCat = splitModal.allocations.some(a => !a.categoryId);
    if (hasEmptyCat) {
      alert("Silakan pilih setidaknya Kategori (Dropdown Pertama) untuk setiap alokasi.");
      return;
    }
    
    if (onSaveRekon) {
      onSaveRekon(splitModal.bankRow, splitModal.allocations, apiData);
    }

    setSplitModal({ isOpen: false, bankRow: null, allocations: [] });
  };

  const getItemsForCategory = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.items : [];
  };

  const uniqueDashboardDates = useMemo(() => {
    if (!allReports) return [];
    return Object.keys(allReports).sort((a, b) => new Date(b) - new Date(a));
  }, [allReports]);

  const unlinkedItems = useMemo(() => {
    const groups = [];
    if (!allReports) return groups;
    
    Object.entries(allReports).forEach(([date, dayData]) => {
      Object.keys(dayData || {}).forEach(type => {
        if (dayData[type] && dayData[type].activeItems) {
          const typeGroups = {};
          
          dayData[type].activeItems.forEach((item, idx) => {
            if (!item.bankMatched) {
              let itemKey = `${item.catId}_${item.itemId || item.id}`;
              if (item.isSusulan) itemKey += `_susulan_${item.validDate}`;
              if (item.itemDate) itemKey += `_date_${item.itemDate}`;
              if (item.itemNote) {
                let h = 0; for(let i=0;i<item.itemNote.length;i++){ h=((h<<5)-h)+item.itemNote.charCodeAt(i); h=h&h; }
                itemKey += `_note_${Math.abs(h)}`;
              }
              const nominal = dayData[type].formData?.[itemKey] || 0;
              
              if (nominal > 0) {
                let groupKey = '';
                let groupName = categories.find(c => c.id === item.catId)?.name || item.catId;
                
                if (type === 'utama') {
                  groupKey = `${item.catId}_${item.isSusulan ? 'susulan' : 'normal'}_${item.validDate || ''}`;
                } else {
                  groupKey = `${item.catId}_${item.itemDate || ''}_${item.itemNote ? item.itemNote.trim() : ''}`;
                }
                
                if (!typeGroups[groupKey]) {
                  typeGroups[groupKey] = {
                    date,
                    type,
                    groupKey,
                    name: groupName,
                    nominal: 0,
                    itemIndices: [],
                    note: item.itemNote || ''
                  };
                }
                
                typeGroups[groupKey].nominal += nominal;
                typeGroups[groupKey].itemIndices.push(idx);
              }
            }
          });
          
          Object.values(typeGroups).forEach(g => {
            if (g.nominal > 0) groups.push(g);
          });
        }
      });
    });
    return groups.sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [allReports, categories]);

  const openLinkModal = (row) => {
    setLinkModal({ isOpen: true, bankRow: row });
  };

  const handleLink = (targetGroupInfo) => {
    if (onLinkRekon && linkModal.bankRow) {
      onLinkRekon(linkModal.bankRow, targetGroupInfo.date, targetGroupInfo.type, targetGroupInfo);
      setLinkModal({ isOpen: false, bankRow: null });
    }
  };

  // 🔴 RENDER BADGE PASANGAN (TIDAK MENJABARKAN RINCIAN ITEM / NOMINAL KECIL)
  // Menampilkan ringkas: [YYYY-MM-DD] Nama Kategori (Tiket Online, TVM, dll.)
  const renderMatchedBadge = (row) => {
    let dynamicName = row.linkedTo?.groupName;
    const matchedDetails = [];

    // 1. Prioritaskan mencari di allReports (sumber data dashboard utama yang paling akurat)
    if (allReports) {
      Object.keys(allReports).forEach(ymd => {
        const dayData = allReports[ymd];
        if (dayData && typeof dayData === 'object') {
          Object.keys(dayData).forEach(type => {
            const typeData = dayData[type];
            if (typeData && Array.isArray(typeData.activeItems)) {
              typeData.activeItems.forEach(item => {
                const isRowMatch = item && item.bankMatched && (
                  item.bankMatchRowId === row.id || 
                  (Array.isArray(item.bankMatchRowIds) && item.bankMatchRowIds.includes(row.id))
                );
                if (isRowMatch) {
                  const cat = categories.find(c => c.id === item.catId);
                  let name = cat ? cat.name : item.catId;
                  if (item.itemNote) {
                    name = `${name} (${item.itemNote})`;
                  }
                  const proofUrl = item.proofUrl || typeData.formData?.[`${item.catId}_${item.itemId || item.id}_buktiUrl`] || row.proofUrl || '';
                  const targetDate = item.validDate || item.itemDate || ymd;
                  matchedDetails.push({ date: targetDate, name, proofUrl });
                }
              });
            }
          });
        }
      });
    }

    // 2. Jika tidak ditemukan di allReports, gunakan linkedTo (fallback)
    if (matchedDetails.length === 0 && dynamicName && row.linkedTo?.date) {
      const parts = dynamicName.split(',');
      parts.forEach(p => {
        let cleanName = p.replace(/\s*\(Rp\s*[\d\.,\s]+\)/gi, '').trim();
        const foundCat = categories.find(c => cleanName.toLowerCase().startsWith(c.name.toLowerCase()));
        if (foundCat) cleanName = foundCat.name;
        if (cleanName) {
          matchedDetails.push({ date: row.linkedTo.date, name: cleanName, proofUrl: row.linkedTo.proofUrl || row.proofUrl || '' });
        }
      });
    }

    // 3. Fallback ke matchedTo
    if (matchedDetails.length === 0 && row.matchedTo) {
      const targetDate = row.linkedTo?.date || (row.date ? row.date.split(" ")[0] : "");
      const parts = row.matchedTo.split(',');
      parts.forEach(p => {
        let cleanName = p.replace(/\s*\(Rp\s*[\d\.,\s]+\)/gi, '').trim();
        const foundCat = categories.find(c => cleanName.toLowerCase().startsWith(c.name.toLowerCase()));
        if (foundCat) cleanName = foundCat.name;
        if (cleanName) {
          matchedDetails.push({ date: targetDate, name: cleanName, proofUrl: row.proofUrl || "" });
        }
      });
    }

    // Dedup array: jika 10 sub-item tiket sama dalam satu kategori di hari yang sama, gabung jadi 1 nama kategori bersih!
    const uniqueDetails = [];
    const seen = new Set();
    matchedDetails.forEach(d => {
      const key = `${d.date}_${d.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDetails.push(d);
      } else {
        const existing = uniqueDetails.find(u => `${u.date}_${u.name}` === key);
        if (existing && !existing.proofUrl && d.proofUrl) {
          existing.proofUrl = d.proofUrl;
        }
      }
    });

    if (uniqueDetails.length === 0 && !row.proofUrl && !row.transferProof) return null;

    return (
      <div className="text-xs text-indigo-700 bg-indigo-50/80 px-3.5 py-2.5 rounded-xl border border-indigo-100 font-medium flex flex-col gap-1.5 min-w-[210px] shadow-2xs">
        <span className="text-[11px] text-gray-500 font-normal">Telah dipasangkan dengan:</span>
        {uniqueDetails.map((detail, idx) => {
          const activeProof = detail.proofUrl || row.proofUrl || (row.transferProof && (row.transferProof.startsWith('http') || row.transferProof.startsWith('data:')) ? row.transferProof : '');
          return (
            <div key={idx} className="flex flex-col gap-1">
              <span className="font-bold text-indigo-900 leading-snug">
                [{detail.date}] {detail.name}
              </span>
              {activeProof && (
                <button 
                  type="button" 
                  onClick={(e) => handleViewProof(e, activeProof)}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-black bg-white hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit shadow-2xs transition-colors mt-0.5"
                  title="Klik untuk melihat bukti transfer"
                >
                  <LinkIcon size={12} className="text-indigo-600"/> Lihat Bukti Transfer
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Card Baris Mutasi
  const renderMutationCard = (row) => {
    const isPaired = row.status === 'matched' || row.status === 'linked';
    return (
      <div key={row.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-b-0 gap-4">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {isPaired 
              ? <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 w-max shadow-2xs border border-emerald-200">
                  <CheckCircle size={12}/> {row.status === 'linked' ? 'Sudah Dipasangkan (Linked)' : 'Sudah Dipasangkan (Matched)'}
                </span>
              : <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-md w-max inline-flex items-center gap-1 shadow-2xs border border-amber-200">
                  <AlertCircle size={12}/> Belum Dipasangkan (Pending)
                </span>}
            <span className="text-xs text-gray-500 font-medium">{row.date}</span>
          </div>
          <div className={`font-semibold text-sm leading-snug ${isPaired ? 'text-gray-800' : 'text-gray-900'}`}>{row.description}</div>
          {row.transferProof && (
            <div className="mt-1.5 text-[11px] text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg inline-block border border-blue-100 font-medium whitespace-pre-wrap">
              Keterangan: {row.transferProof}
            </div>
          )}
        </div>
        <div className="text-left md:text-right shrink-0 md:mr-4">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Nominal Bank</div>
          <div className={`font-black text-lg ${isPaired ? 'text-emerald-700' : 'text-blue-900'}`}>Rp {formatRp(row.amount)}</div>
        </div>
        <div className="shrink-0 flex items-center flex-wrap gap-2">
          {!isPaired && (
            <>
              <button onClick={() => openLinkModal(row)} className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-2xs">
                <LinkIcon size={15}/> Pasangkan (H-1)
              </button>
              <button onClick={() => openSplitModal(row)} className="text-white bg-blue-600 hover:bg-blue-700 font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm">
                <Plus size={15}/> Input Baru
              </button>
            </>
          )}
          {isPaired && (
            <>
              {renderMatchedBadge(row)}
              <button onClick={() => setEditModal({isOpen: true, row, proof: row.transferProof || '', proofUrl: row.proofUrl || ''})} className="text-gray-500 hover:text-blue-600 bg-white border border-gray-200 shadow-2xs px-2.5 py-2 rounded-lg flex items-center justify-center transition-colors self-start" title="Edit Keterangan / Batalkan Pasangan">
                <Edit size={16}/>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Database size={28} className="text-blue-600" /> Rekonsiliasi Bank & API
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Pantau status mutasi bank dalam format kalender dan cocokkan dengan data pendapatan dashboard / API.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button 
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Calendar size={14}/> Kalender
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ListFilter size={14}/> Semua Daftar
            </button>
          </div>

          {/* Tarik API Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-1.5 bg-indigo-50 p-1.5 rounded-xl shadow-2xs border border-indigo-100">
            <input 
              type="date" 
              value={apiDate} 
              onChange={e => setApiDate(e.target.value)} 
              className="px-2 py-1.5 rounded-lg border border-indigo-200 text-xs sm:text-sm text-indigo-900 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Filter Tanggal API"
            />
            <div className="hidden sm:block w-px bg-indigo-200 h-6 mx-1"></div>
            <div className="flex gap-1">
              <button onClick={fetchApiFasilitas} disabled={loadingApi} className="hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors text-xs">
                <RefreshCw size={13} className={loadingApi ? 'animate-spin' : ''} /> Tarik Fasilitas
              </button>
              <div className="w-px bg-indigo-200 mx-0.5"></div>
              <button onClick={fetchApiPromo} disabled={loadingApi} className="hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors text-xs">
                <RefreshCw size={13} className={loadingApi ? 'animate-spin' : ''} /> Tarik Promo
              </button>
            </div>
          </div>

          {/* Cloud Sync */}
          <button 
            type="button" 
            onClick={() => onRefreshCloud && onRefreshCloud()} 
            className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-2xs text-xs sm:text-sm"
            title="Tarik pembaruan data rekon dan mutasi terbaru dari PC lain / Cloud"
          >
            <RefreshCw size={15} className={syncStatus === 'syncing' ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
            <span className="hidden sm:inline">Sinkron Cloud</span>
          </button>

          {/* Upload CSV */}
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm text-xs sm:text-sm">
            <Upload size={16} /> Upload CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>

          {/* Clear CSV */}
          <button onClick={() => { if(window.confirm('Hapus semua data CSV mutasi bank?')) { if (onSaveBankRows) onSaveBankRows([]); else setBankRows([]); } }} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-xl transition-colors border border-red-100" title="Bersihkan Semua Data Mutasi">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* API Drawer Cards if API loaded */}
      {apiData.length > 0 && (
        <div className="mb-6 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-indigo-900 text-sm flex items-center gap-2">
                <Database size={18} className="text-indigo-600"/> {apiData.length} Bukti Transfer Tersedia dari API
              </h3>
              <div className="flex items-center gap-1.5 ml-1">
                <button 
                  type="button"
                  onClick={() => setApiFilterStatus('all')}
                  className={'text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-all ' + (apiFilterStatus === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200')}
                >
                  Semua ({apiData.length})
                </button>
                <button 
                  type="button"
                  onClick={() => setApiFilterStatus('unmatched')}
                  className={'text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 ' + (apiFilterStatus === 'unmatched' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200')}
                >
                  <AlertCircle size={10}/> Belum Dipasangkan ({apiData.length - matchedApiCount})
                </button>
                <button 
                  type="button"
                  onClick={() => setApiFilterStatus('matched')}
                  className={'text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 ' + (apiFilterStatus === 'matched' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200')}
                >
                  <CheckCircle size={10}/> Sudah Dipasangkan ({matchedApiCount})
                </button>
              </div>
            </div>
            <button onClick={() => setApiData([])} className="text-xs text-indigo-400 hover:text-rose-600 font-bold transition-colors self-end sm:self-auto">
              Bersihkan Data API
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
            {displayedApiData.map(item => {
              const isListrik = item.tipe_transaksi === 'Listrik Tambahan' || (typeof item.id === 'string' && item.id.includes('_listrik'));
              const isPromo = item.source === 'Promo';
              const badgeBg = isListrik ? 'bg-amber-100 text-amber-800 border-amber-200' : isPromo ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200';
              const nominal = item.jumlahTransferNumeric || (typeof item.jumlahTransfer === 'string' ? Number(item.jumlahTransfer.replace(/[^0-9]/g, '')) : item.jumlahTransfer) || 0;
              const proofUrl = item.buktiTransferUrl || item.buktiTransferDocUrl || item.pksDriveUrl;

              const matchedInfo = getMatchedInfoForApi(item);
              const isMatched = matchedInfo.isMatched;

              return (
                <div 
                  key={item.id} 
                  className={'min-w-[250px] max-w-[290px] p-3.5 rounded-xl shadow-2xs border flex flex-col justify-between transition-all ' + (
                    isMatched ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/50 border-emerald-400 ring-2 ring-emerald-300/40 shadow-xs' : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5 gap-1">
                      <span className={'text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ' + badgeBg}>
                        {isListrik && <Zap size={10} className="fill-amber-500 text-amber-500"/>}
                        {isPromo && <Sparkles size={10} className="text-purple-500"/>}
                        {item.tipe_transaksi || item.source}
                      </span>
                      
                      {isMatched ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-600 text-white border-emerald-700 flex items-center gap-1 shadow-2xs"><CheckCircle size={10} className="text-emerald-100 fill-emerald-700"/> Sudah Dipasangkan</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                          <AlertCircle size={10} className="text-amber-500"/> Belum Dipasangkan
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] font-bold text-gray-400 mb-1">
                      Tanggal: {item.tanggal_transfer || item.tanggalTransfer || '-'}
                    </div>

                    <div className={'font-bold text-sm truncate ' + (isMatched ? 'text-emerald-950 font-black' : 'text-gray-900')} title={item.nama_penyewa || item.namaPerusahaan}>
                      {item.nama_penyewa || item.namaPerusahaan || '-'}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5" title={item.lokasi_sewa || item.keterangan_transaksi || item.namaProduk}>
                      {item.lokasi_sewa || item.namaProduk || '-'}
                    </div>

                    {isMatched && (
                      <div className="mt-2 text-[11px] bg-emerald-100/90 text-emerald-900 border border-emerald-200 px-2 py-1 rounded-md font-medium flex items-center justify-between gap-1">
                        <span className="truncate">✓ Terpasang ke mutasi</span>
                        {matchedInfo.matchedRow && (
                          <span className="font-bold shrink-0 text-emerald-800 text-[10px]">
                            {matchedInfo.matchedRow.date?.split(' ')[0] || ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <div className={'font-black text-base ' + (isMatched ? 'text-emerald-800' : 'text-indigo-700')}>
                      Rp {formatRp(nominal)}
                    </div>
                    <button 
                      type="button" 
                      onClick={(e) => handleViewProof(e, proofUrl)} 
                      className={'text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ' + (
                        isMatched ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      )}
                      title="Lihat Bukti Transfer"
                    >
                      <LinkIcon size={12}/> Bukti
                    </button>
                  </div>
                </div>
              );
            })}
            {displayedApiData.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500 w-full italic">
                Tidak ada data bukti transfer untuk filter ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔴 TAMPILAN 1: KALENDER MUTASI BANK (DEFAULT) */}
      {/* ============================================================== */}
      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          {/* Month Header & KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Mutasi Bulan Ini</div>
                <div className="text-xl font-black text-gray-900 mt-0.5">Rp {formatRp(monthStats.totalAmount)}</div>
                <div className="text-xs text-gray-500 mt-0.5 font-medium">{monthStats.totalCount} transaksi mutasi</div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Database size={22}/>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
              <div>
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Sudah Dipasangkan</div>
                <div className="text-xl font-black text-emerald-700 mt-0.5">Rp {formatRp(monthStats.pairedAmount)}</div>
                <div className="text-xs text-emerald-600 mt-0.5 font-bold flex items-center gap-1">
                  <CheckCircle size={12}/> {monthStats.pairedCount} transaksi selesai
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle size={22}/>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center justify-between bg-gradient-to-br from-white to-amber-50/30">
              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Belum Dipasangkan (Pending)</div>
                <div className="text-xl font-black text-amber-700 mt-0.5">Rp {formatRp(monthStats.pendingAmount)}</div>
                <div className="text-xs text-amber-600 mt-0.5 font-bold flex items-center gap-1">
                  <AlertCircle size={12}/> {monthStats.pendingCount} transaksi pending
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <AlertCircle size={22}/>
              </div>
            </div>
          </div>

          {/* Kalender Grid Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            {/* Header navigasi bulan */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors shadow-2xs" title="Bulan Sebelumnya">
                  <ChevronLeft size={20}/>
                </button>
                <h3 className="text-base sm:text-lg font-black text-gray-800 uppercase tracking-wide min-w-[200px] text-center">
                  {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors shadow-2xs" title="Bulan Berikutnya">
                  <ChevronRight size={20}/>
                </button>
                {latestBankDate && (
                  <button onClick={jumpToLatestMonth} className="ml-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl border border-blue-200 transition-colors">
                    Ke Mutasi Terbaru
                  </button>
                )}
              </div>

              {/* Legend status */}
              <div className="flex items-center gap-2.5 text-xs font-bold flex-wrap">
                <div className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle size={13} className="text-emerald-600"/> Semua Pasang
                </div>
                <div className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <AlertCircle size={13} className="text-amber-600"/> Ada Belum Pasang
                </div>
              </div>
            </div>

            {/* Header hari dalam minggu */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
                <div key={d} className={`text-[11px] sm:text-xs font-black uppercase tracking-wider py-1 ${i === 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid Sel Hari */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {blanks.map(b => (
                <div key={`blank-${b}`} className="min-h-[85px] sm:min-h-[105px] bg-gray-50/40 rounded-xl border border-dashed border-gray-100"></div>
              ))}

              {days.map(d => {
                const isSelected = selectedDate === d.dateStr;
                const isToday = d.dateStr === new Date().toISOString().split('T')[0];
                return (
                  <div 
                    key={d.dateStr}
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/30'
                        : d.hasPending
                          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50/70 hover:shadow-2xs'
                          : d.isAllPaired
                            ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-50/70 hover:shadow-2xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs sm:text-sm font-black w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : isToday 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'text-gray-700'
                      }`}>
                        {d.day}
                      </span>
                      {isToday && <span className="text-[9px] font-bold text-indigo-600 uppercase">Hari Ini</span>}
                    </div>

                    {d.hasData ? (
                      <div className="mt-1 flex flex-col gap-1">
                        <div className="font-extrabold text-[11px] sm:text-xs text-blue-900 truncate" title={`Rp ${formatRp(d.totalAmount)}`}>
                          Rp {formatCompactRp(d.totalAmount)}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {d.isAllPaired && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md">
                              <CheckCircle size={10} className="shrink-0"/> {d.pairedCount} Pasang
                            </span>
                          )}
                          {d.hasPending && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-md">
                              <AlertCircle size={10} className="shrink-0"/> {d.pendingCount} Belum
                            </span>
                          )}
                          {d.hasPending && d.pairedCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-md">
                              ✓ {d.pairedCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-300 font-medium text-center py-1 select-none">-</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Mutasi Pada Tanggal Terpilih */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 p-4 sm:p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1 flex items-center gap-1.5">
                  <Calendar size={14}/> Detail Mutasi Bank
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900">
                  {selectedDate ? formatDateIndo(selectedDate) : 'Pilih Tanggal pada Kalender'}
                </h3>
                {activeDateData && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span>Total: <b className="text-gray-800">{activeDateData.rows.length} Transaksi</b> (<span className="text-blue-700 font-black">Rp {formatRp(activeDateData.totalAmount)}</span>)</span>
                    <span className="text-emerald-700 font-black flex items-center gap-1">✓ {activeDateData.pairedCount} Sudah Dipasangkan</span>
                    {activeDateData.pendingCount > 0 && (
                      <span className="text-amber-700 font-black flex items-center gap-1">⏳ {activeDateData.pendingCount} Belum Dipasangkan</span>
                    )}
                  </div>
                )}
              </div>

              {activeDateData && (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs self-start md:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDateStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dateStatusFilter === 'all' 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Semua ({activeDateData.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      dateStatusFilter === 'pending' 
                        ? 'bg-amber-600 text-white shadow-2xs' 
                        : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <AlertCircle size={12}/> Belum Dipasangkan ({activeDateData.pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateStatusFilter('paired')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      dateStatusFilter === 'paired' 
                        ? 'bg-emerald-600 text-white shadow-2xs' 
                        : 'text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle size={12}/> Sudah Dipasangkan ({activeDateData.pairedCount})
                  </button>
                </div>
              )}
            </div>

            <div>
              {displayedDateRows.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {displayedDateRows.map(row => renderMutationCard(row))}
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500">
                  {activeDateData ? (
                    <div>
                      <CheckCircle size={36} className="mx-auto text-emerald-400 mb-2"/>
                      <p className="font-bold text-gray-700">Tidak ada mutasi dengan filter ini pada tanggal {formatDateIndo(selectedDate)}.</p>
                    </div>
                  ) : (
                    <div>
                      <Calendar size={36} className="mx-auto text-gray-300 mb-2"/>
                      <p className="font-bold text-gray-700">Tidak ada mutasi bank pada tanggal {selectedDate || 'ini'}.</p>
                      <p className="text-xs text-gray-400 mt-1">Silakan klik tanggal yang memiliki tanda nominal mutasi pada kalender di atas.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 🔴 TAMPILAN 2: DAFTAR SEMUA GROUP TANGGAL */
        /* ============================================================== */
        <div className="space-y-6">
          {bankRows.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                <Filter size={16} /> Filter Tanggal Mutasi:
              </div>
              <MultiDateCalendar 
                uniqueDates={uniqueBankDates} 
                selectedDates={selectedBankDates} 
                onChange={setSelectedBankDates} 
              />
              <div className="text-sm text-gray-500 sm:ml-auto text-right">
                <div>Menampilkan {filteredBankRows.length} dari {bankRows.length} data mutasi</div>
                <div className="text-xs font-bold mt-1 uppercase tracking-wide text-gray-400">
                  Total Filter: <span className="text-blue-600 text-base font-black">Rp {formatRp(filteredBankRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {groupedBankRows.map(([dateGroup, data]) => (
              <div key={dateGroup} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <Database size={18} className="text-gray-400"/> {dateGroup}
                  </h3>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Pemasukan</div>
                    <div className="font-black text-blue-700 text-lg">Rp {formatRp(data.total)}</div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.rows.map(row => renderMutationCard(row))}
                </div>
              </div>
            ))}
            {groupedBankRows.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Database size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-600 mb-1">Belum Ada Data Mutasi</h3>
                <p className="text-gray-500 text-sm">Upload file CSV mutasi bank Anda untuk mulai melakukan rekonsiliasi.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔴 MODAL: INPUT BARU / SPLIT TRANSAKSI */}
      {/* ============================================================== */}
      {splitModal.isOpen && splitModal.bankRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div>
                <h3 className="text-lg font-black text-blue-900">Alokasi & Validasi Uang Masuk</h3>
                <p className="text-sm text-blue-700">Tanggal: {splitModal.bankRow.date} | Ket: {splitModal.bankRow.description}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Nominal Bank</div>
                <div className="text-2xl font-black text-blue-800">Rp {formatRp(splitModal.bankRow.amount)}</div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {splitModal.allocations.map((alloc) => (
                  <div key={alloc.id} className="flex flex-col md:flex-row gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="w-full md:flex-[0.8]">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Tgl Dashboard</label>
                      <input type="date" value={alloc.targetDate} onChange={e => updateAllocation(alloc.id, 'targetDate', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" />
                    </div>
                    <div className="w-full md:flex-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Kategori POS</label>
                      <select value={alloc.categoryId} onChange={e => updateAllocation(alloc.id, 'categoryId', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                        <option value="">-- Pilih --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="w-full md:flex-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Item POS</label>
                      <select value={alloc.itemId} onChange={e => updateAllocation(alloc.id, 'itemId', e.target.value)} disabled={!alloc.categoryId} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                        <option value="">-- Pilih Item --</option>
                        {getItemsForCategory(alloc.categoryId).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="w-full md:flex-[1.2]">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Hubungkan Bukti API</label>
                      <select 
                        value={alloc.apiRefId} 
                        onChange={e => {
                          const selectedId = e.target.value;
                          const itemFound = apiData.find(d => d.id === selectedId);
                          updateAllocation(alloc.id, 'apiRefId', selectedId);
                          if (itemFound) {
                            const itemNominal = itemFound.jumlahTransferNumeric || (typeof itemFound.jumlahTransfer === 'string' ? Number(itemFound.jumlahTransfer.replace(/[^0-9]/g, '')) : itemFound.jumlahTransfer) || 0;
                            if (!alloc.amount || Number(alloc.amount) === splitModal.bankRow.amount || Number(alloc.amount) === 0) {
                              updateAllocation(alloc.id, 'amount', itemNominal);
                            }
                            if (itemFound.tanggal_transfer) {
                              updateAllocation(alloc.id, 'targetDate', itemFound.tanggal_transfer);
                            }
                          }
                        }} 
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-indigo-700 font-bold"
                      >
                        <option value="">-- Tanpa Bukti API --</option>
                        {apiData.map(d => {
                          const nominal = d.jumlahTransferNumeric || (typeof d.jumlahTransfer === 'string' ? Number(d.jumlahTransfer.replace(/[^0-9]/g, '')) : d.jumlahTransfer) || 0;
                          const labelTenant = d.nama_penyewa || d.namaPerusahaan || '';
                          const labelDetail = d.lokasi_sewa || d.namaProduk || '';
                          return (
                            <option key={d.id} value={d.id}>
                              [{d.tipe_transaksi || d.source}] {labelTenant} - Rp {formatRp(nominal)} {labelDetail ? `(${labelDetail})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="w-full md:flex-[0.8]">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Nominal</label>
                      <input type="number" value={alloc.amount} onChange={e => updateAllocation(alloc.id, 'amount', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-right" />
                    </div>
                    <div className="pb-1">
                      <button onClick={() => removeAllocation(alloc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addAllocation} className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                <Plus size={16}/> Tambah Pecahan Baru
              </button>

              <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button onClick={() => setSplitModal({isOpen:false})} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100">Batal</button>
                <button onClick={saveSplit} className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center gap-2">
                  <CheckCircle size={18}/> Simpan Alokasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔴 MODAL: PASANGKAN DENGAN PENDAPATAN DASHBOARD (H-1) */}
      {/* ============================================================== */}
      {linkModal.isOpen && linkModal.bankRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-indigo-100 flex justify-between items-center bg-indigo-50 shrink-0">
              <div>
                <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2"><LinkIcon size={20}/> Pasangkan dengan Pendapatan Dashboard</h3>
                <p className="text-sm text-indigo-700 mt-1">Mutasi: {linkModal.bankRow.date} | {linkModal.bankRow.description}</p>
              </div>
              <div className="text-right bg-white p-2 px-4 rounded-xl shadow-sm">
                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Nominal Mutasi</div>
                <div className="text-xl font-black text-indigo-800">Rp {formatRp(linkModal.bankRow.amount)}</div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="mb-4 flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">
                  Pilih item pendapatan dari Dashboard yang ingin dipasangkan (H-1 / H-2):
                </div>
                <select 
                  value={linkModalFilterDate} 
                  onChange={(e) => setLinkModalFilterDate(e.target.value)}
                  className="text-sm font-bold bg-indigo-50 text-indigo-700 border-none rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Tanggal Dashboard</option>
                  {uniqueDashboardDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              {unlinkedItems.filter(item => linkModalFilterDate === 'Semua' || item.date === linkModalFilterDate).length === 0 ? (
                <div className="text-center p-10 bg-white rounded-xl border border-dashed border-gray-300">
                  <CheckCircle size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-bold">Semua data pendapatan sudah dipasangkan / belum ada data.</p>
                  <p className="text-xs text-gray-400 mt-1">Gunakan "Input Baru" jika mutasi ini belum pernah diinput di dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unlinkedItems.filter(item => linkModalFilterDate === 'Semua' || item.date === linkModalFilterDate).map(item => (
                    <button 
                      key={`${item.date}_${item.groupKey}`}
                      onClick={() => handleLink(item)}
                      className="text-left bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-800">{item.name}</div>
                        <div className="font-black text-indigo-700">Rp {formatRp(item.nominal)}</div>
                      </div>
                      <div className="flex gap-2 items-center text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-bold">Tgl Dashboard: {item.date}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded uppercase">{item.type}</span>
                      </div>
                      {item.note && (
                        <div className="mt-2 text-xs text-gray-400 line-clamp-1 italic">
                          "{item.note}"
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white flex justify-end shrink-0">
              <button onClick={() => setLinkModal({isOpen:false})} className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔴 MODAL: EDIT KETERANGAN / BATALKAN PASANGAN */}
      {/* ============================================================== */}
      {editModal.isOpen && editModal.row && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Edit Mutasi Bank</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Keterangan / Nama Pentransfer</label>
                <textarea 
                  value={editModal.proof}
                  onChange={e => setEditModal(prev => ({...prev, proof: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder="Contoh: Transfer dari Zainal Abidin PT..."
                />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Link Bukti Transfer (URL / Google Drive / Gambar)</label>
                <input 
                  type="text"
                  value={editModal.proofUrl || ''}
                  onChange={e => setEditModal(prev => ({...prev, proofUrl: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  placeholder="https://drive.google.com/... atau https://..."
                />
                {editModal.proofUrl && (
                  <button 
                    type="button" 
                    onClick={(e) => handleViewProof(e, editModal.proofUrl)} 
                    className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    <LinkIcon size={12}/> Uji Buka Link Bukti
                  </button>
                )}
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-2">
                <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1.5"><RotateCcw size={16}/> Salah Pasang?</h4>
                <p className="text-[11px] text-red-700 font-medium mb-3">Jika mutasi ini salah dipasangkan, Anda dapat membatalkannya untuk mengembalikan mutasi ini menjadi <span className="font-bold">Pending</span>.</p>
                <button onClick={() => {
                  if (confirm('Yakin ingin membatalkan status pasangan pada mutasi ini?')) {
                    if (onUnlinkBankRow) onUnlinkBankRow(editModal.row);
                    setEditModal({isOpen:false, row:null, proof:'', proofUrl:''});
                  }
                }} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors w-full text-center flex items-center justify-center gap-1">
                  <RotateCcw size={14} /> Batalkan Pasangan
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setEditModal({isOpen:false, row:null, proof:'', proofUrl:''})} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded-xl text-sm transition-colors">Batal</button>
              <button onClick={() => {
                if (onUpdateBankRow) onUpdateBankRow(editModal.row.id, { transferProof: editModal.proof, proofUrl: editModal.proofUrl || '' });
                setEditModal({isOpen:false, row:null, proof:'', proofUrl:''});
              }} className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl text-sm transition-colors shadow-sm">Simpan Keterangan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
