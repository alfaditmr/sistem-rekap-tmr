import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock, Sparkles, Save } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ==========================================
// 🔴 KONFIGURASI DATABASE FIREBASE BAPAK FATAH 🔴
// ==========================================
const myFirebaseConfig = {
  apiKey: "AIzaSyB_PtIg3kNwwpa62bIeFmBiDkn-KRxm5es",
  authDomain: "rekap-stsu.firebaseapp.com",
  projectId: "rekap-stsu",
  storageBucket: "rekap-stsu.firebasestorage.app",
  messagingSenderId: "811185738366",
  appId: "1:811185738366:web:2db209f6eab966bccd7e2f"
};

const isCanvasEnv = typeof __firebase_config !== 'undefined';
const finalConfig = isCanvasEnv ? JSON.parse(__firebase_config) : myFirebaseConfig;

let app, auth, db;
try {
  app = initializeApp(finalConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

// --- FUNGSI FORMATTING (KOREKSI TERBILANG) ---
function terbilang(angka) {
  angka = Math.floor(Math.abs(angka));
  if (angka === 0) return "nol";
  
  const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let divide = 0;
  let word = "";
  
  if (angka < 12) {
    return huruf[angka];
  } else if (angka < 20) {
    return terbilang(angka - 10) + " belas";
  } else if (angka < 100) {
    divide = Math.floor(angka / 10);
    word = huruf[divide] + " puluh";
    let rem = angka % 10;
    return rem > 0 ? word + " " + terbilang(rem) : word;
  } else if (angka < 200) {
    let rem = angka - 100;
    return rem > 0 ? "seratus " + terbilang(rem) : "seratus";
  } else if (angka < 1000) {
    divide = Math.floor(angka / 100);
    word = huruf[divide] + " ratus";
    let rem = angka % 100;
    return rem > 0 ? word + " " + terbilang(rem) : word;
  } else if (angka < 2000) {
    let rem = angka - 1000;
    return rem > 0 ? "seribu " + terbilang(rem) : "seribu";
  } else if (angka < 1000000) {
    divide = Math.floor(angka / 1000);
    word = terbilang(divide) + " ribu";
    let rem = angka % 1000;
    return rem > 0 ? word + " " + terbilang(rem) : word;
  } else if (angka < 1000000000) {
    divide = Math.floor(angka / 1000000);
    word = terbilang(divide) + " juta";
    let rem = angka % 1000000;
    return rem > 0 ? word + " " + terbilang(rem) : word;
  } else if (angka < 1000000000000) {
    divide = Math.floor(angka / 1000000000);
    word = terbilang(divide) + " miliar";
    let rem = angka % 1000000000;
    return rem > 0 ? word + " " + terbilang(rem) : word;
  }
  return "";
}

const formatRp = (angka) => {
  if (!angka) return "0";
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getLocalYMD = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[d.getDay()];
};

// ==========================================
// 🔴 FUNGSI PEMANGGILAN API GEMINI (LLM) 🔴
// ==========================================
const callGeminiAPI = async (prompt, systemInstruction) => {
  const apiKey = ""; // Disuplai otomatis oleh environment runtime
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API Error ${res.status}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      if (i === 4) throw new Error("Gagal menghubungi AI setelah beberapa percobaan.");
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
};


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [resetDialog, setResetDialog] = useState({ isOpen: false, password: '', error: '', isVerifying: false });
  const [pdfLoading, setPdfLoading] = useState(false);

  // --- STATE MODAL EDIT CATATAN (URAIAN) ---
  const [editNoteModal, setEditNoteModal] = useState({ isOpen: false, group: null, item: null, newNote: '' });
  const [saveToast, setSaveToast] = useState(false); // Untuk notifikasi sukses manual save

  // --- STATE PRINT MODE (PDF GABUNGAN / NCR PER KATEGORI) ---
  const [printMode, setPrintMode] = useState('pdf');
  const [selectedNcrGroup, setSelectedNcrGroup] = useState(null);

  // --- STATE LOGIN & AUTHENTICATION ---
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- STATE FIREBASE & SYNC ---
  const [dbReady, setDbReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline'); 

  // --- STATE AI GENERATION ---
  const [isGeneratingUraian, setIsGeneratingUraian] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoginError('Akses Ditolak! Email atau Password salah.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    showConfirm("Anda yakin ingin keluar dari aplikasi?", async () => {
      await signOut(auth);
    });
  };

  const getInitialState = (key, defaultValue) => {
    try { const saved = localStorage.getItem(key); if (saved) return JSON.parse(saved); } catch (e) {}
    return defaultValue;
  };

  const [signatures, setSignatures] = useState(() => getInitialState('tmr_v19_signatures', {
    leftRole: 'Kepala Seksi Pelayanan dan Informasi',
    leftName: 'Afriana Pulungan, S.Si., M.AP.',
    leftNip: '197304212007012021',
    rightRole: 'Bendahara Penerimaan',
    rightName: 'Evi Irmawati',
    rightNip: '198101082009042006',
    location: 'Jakarta'
  }));

  const [categories, setCategories] = useState(() => getInitialState('tmr_v19_categories', [
    { id: 'cat_1', name: 'pemakaian fasilitas', type: 'utama', items: [{ id: 'item_1a', name: 'Promo Penjualan Produk' }, { id: 'item_1b', name: 'Penempatan banner promosi' }, { id: 'item_1c', name: 'Panggung' }] },
    { id: 'cat_2', name: 'Retribusi Pedagang', type: 'utama', items: [{ id: 'item_2a', name: 'Retribusi pedagang Hari Biasa' }, { id: 'item_2b', name: 'Retribusi pedagang Hari Besar' }] },
    { id: 'cat_3', name: 'Pendapatan Retribusi Juru Foto', type: 'utama', items: [] },
    { id: 'cat_4', name: 'Penyediaan satwa jinak untuk berfoto', type: 'utama', items: [] },
    { id: 'cat_5', name: 'E-ticketing', type: 'utama', items: [{ id: 'item_5a', name: 'Dewasa' }, { id: 'item_5b', name: 'Anak' }, { id: 'item_5c', name: 'Taman Satwa Anak' }] },
    { id: 'cat_6', name: 'Ticket online', type: 'utama', items: [{ id: 'item_6a', name: 'Dewasa' }, { id: 'item_6b', name: 'Anak' }, { id: 'item_6c', name: 'Taman Satwa Anak' }] }
  ]));

  const defaultReportData = {
    "utama": {
      sequence: "...",
      signatureDate: getLocalYMD(),
      activeItems: [
        {catId: "cat_1", itemId: "item_1a"}, {catId: "cat_1", itemId: "item_1b"}, {catId: "cat_1", itemId: "item_1c"},
        {catId: "cat_2", itemId: "item_2a"}, {catId: "cat_2", itemId: "item_2b"},
        {catId: "cat_3", itemId: "direct"},
        {catId: "cat_4", itemId: "direct"},
        {catId: "cat_5", itemId: "item_5a"}, {catId: "cat_5", itemId: "item_5b"}, {catId: "cat_5", itemId: "item_5c"},
        {catId: "cat_6", itemId: "item_6a"}, {catId: "cat_6", itemId: "item_6b"}, {catId: "cat_6", itemId: "item_6c"}
      ],
      formData: {
        "cat_1_item_1a": 5000000, "cat_1_item_1b": 700000, "cat_1_item_1c": 750000,
        "cat_2_item_2a": 750000, "cat_2_item_2b": 1000000,
        "cat_3_direct": 5800000,
        "cat_4_direct": 1015000,
        "cat_5_item_5a": 45752000, "cat_5_item_5b": 14490000, "cat_5_item_5c": 1647500,
        "cat_6_item_6a": 6556000, "cat_6_item_6b": 1431000, "cat_6_item_6c": 722500
      }
    }
  };

  const [allReports, setAllReports] = useState(() => getInitialState('tmr_v19_allReports', { [getLocalYMD()]: defaultReportData }));

  const [reportDate, setReportDate] = useState(getLocalYMD());
  const [activeType, setActiveType] = useState('utama'); 
  const [activeLainIndex, setActiveLainIndex] = useState(1); 

  const [selectedCatToAdd, setSelectedCatToAdd] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [isAddingSusulan, setIsAddingSusulan] = useState(false);
  const [susulanValidDate, setSusulanValidDate] = useState('');
  
  const [lainItemDate, setLainItemDate] = useState('');
  const [lainItemNote, setLainItemNote] = useState('');

  useEffect(() => { localStorage.setItem('tmr_v19_signatures', JSON.stringify(signatures)); }, [signatures]);
  useEffect(() => { localStorage.setItem('tmr_v19_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('tmr_v19_allReports', JSON.stringify(allReports)); }, [allReports]);

  const getDocRef = () => {
    return doc(db, 'tmr_data', 'rekapitulasi_laporan');
  };

  useEffect(() => {
    if (!user || !db) return;
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        const docSnap = await getDoc(getDocRef());
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.signatures) setSignatures(data.signatures);
          if (data.categories) setCategories(data.categories);
          if (data.allReports) setAllReports(data.allReports);
        }
        setDbReady(true);
        setSyncStatus('synced');
      } catch (e) {
        setSyncStatus('offline');
      }
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // AUTO SAVE EFEK (Dipercepat menjadi 1 detik)
  useEffect(() => {
    if (!user || !dbReady || !db) return;
    setSyncStatus('syncing');
    const saveData = async () => {
      try {
        await setDoc(getDocRef(), {
          signatures, categories, allReports, lastUpdated: new Date().toISOString()
        });
        setSyncStatus('synced');
      } catch(e) {
        setSyncStatus('offline');
      }
    };
    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  }, [signatures, categories, allReports, user, dbReady]);

  // FUNGSI PAKSA SIMPAN (MANUAL SAVE) UNTUK KEAMANAN DATA ADMIN
  const handleForceSave = async () => {
    if (!user || !dbReady) return;
    setSyncStatus('syncing');
    try {
      await setDoc(getDocRef(), {
        signatures, categories, allReports, lastUpdated: new Date().toISOString()
      });
      setSyncStatus('synced');
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch(e) {
      setSyncStatus('offline');
    }
  };

  const showConfirm = (message, onConfirmAction) => {
    setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction });
  };

  const activeTypeKey = useMemo(() => {
    if (activeType === 'utama') return 'utama';
    return activeLainIndex === 1 ? 'lain' : `lain_${activeLainIndex}`;
  }, [activeType, activeLainIndex]);

  const lainDocIndices = useMemo(() => {
    const dayData = allReports[reportDate] || {};
    const indices = [1]; 
    Object.keys(dayData).forEach(k => {
      if (k.startsWith('lain_')) {
        const num = parseInt(k.split('_')[1], 10);
        if (!isNaN(num) && !indices.includes(num)) {
          indices.push(num);
        }
      }
    });
    return indices.sort((a, b) => a - b);
  }, [allReports, reportDate]);

  const handleAddLainDoc = () => {
    const nextIndex = Math.max(...lainDocIndices) + 1;
    const nextKey = `lain_${nextIndex}`;
    setAllReports(prev => {
      const dayData = prev[reportDate] || {};
      return {
        ...prev,
        [reportDate]: {
          ...dayData,
          [nextKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} }
        }
      };
    });
    setActiveLainIndex(nextIndex);
    setSelectedCatToAdd(''); setSelectedItemToAdd('');
    setLainItemDate(''); setLainItemNote('');
  };

  const handleRemoveLainDoc = (indexToRemove) => {
    showConfirm(`Hapus Dokumen Ke-${indexToRemove}? Semua data di dalam dokumen ini akan ikut terhapus.`, () => {
      setAllReports(prev => {
        const dayData = { ...(prev[reportDate] || {}) };
        const keyToRemove = indexToRemove === 1 ? 'lain' : `lain_${indexToRemove}`;
        delete dayData[keyToRemove];
        return { ...prev, [reportDate]: dayData };
      });
      if (activeLainIndex === indexToRemove) {
         setActiveLainIndex(1);
      }
    });
  };

  const currentReport = useMemo(() => {
    const dayData = allReports[reportDate] || {};
    const typeData = dayData[activeTypeKey] || {};
    return {
      sequence: typeData.sequence || '',
      signatureDate: typeData.signatureDate || reportDate,
      activeItems: Array.isArray(typeData.activeItems) ? typeData.activeItems : [],
      formData: typeData.formData || {}
    };
  }, [allReports, reportDate, activeTypeKey]);

  const updateCurrentReport = (updater) => {
    setAllReports(prev => {
      const dayData = prev[reportDate] || {};
      const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
      const updatedTypeData = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
      return { ...prev, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    });
  };

  const handleSequenceChange = (e) => updateCurrentReport({ sequence: e.target.value });
  const handleSignatureDateChange = (e) => updateCurrentReport({ signatureDate: e.target.value });

  const handleDateChange = (newDateStr) => {
    setReportDate(newDateStr);
    setSelectedCatToAdd(''); setSelectedItemToAdd('');
    setIsAddingSusulan(false);
    setSusulanValidDate('');
    setLainItemDate('');
    setLainItemNote('');
    setActiveLainIndex(1);
    setPrintMode('pdf');
  };

  const handleTypeSwitch = (type) => {
    setActiveType(type);
    setSelectedCatToAdd(''); setSelectedItemToAdd('');
    setIsAddingSusulan(false);
    setSusulanValidDate('');
    setLainItemDate('');
    setLainItemNote('');
    setActiveLainIndex(1);
    setPrintMode('pdf');
  };

  const clearCurrentReport = () => {
    setResetDialog({ isOpen: true, password: '', error: '', isVerifying: false });
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetDialog(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      updateCurrentReport({ sequence: '', signatureDate: reportDate, activeItems: [], formData: {} });
      setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false });
    } catch (error) {
      setResetDialog(prev => ({ ...prev, isVerifying: false, error: 'Password salah! Penghapusan dibatalkan.' }));
    }
  };

  const filteredCategories = useMemo(() => {
    return Array.isArray(categories) ? categories.filter(c => c.type === activeType) : [];
  }, [categories, activeType]);

  const handleCatChange = (catId) => {
    setSelectedCatToAdd(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedItemToAdd('direct');
    else setSelectedItemToAdd('');
  };

  const getActiveItemKey = (catId, itemId, isSus, validDate, itemDate, itemNote) => {
    let key = `${catId}_${itemId}`;
    if (isSus) key += `_susulan_${validDate}`;
    if (itemDate) key += `_date_${itemDate}`;
    if (itemNote) {
       let hash = 0;
       for (let i = 0; i < itemNote.length; i++) {
         hash = ((hash << 5) - hash) + itemNote.charCodeAt(i);
         hash = hash & hash;
       }
       key += `_note_${Math.abs(hash)}`;
    }
    return key;
  };

  const handleAddActiveItem = () => {
    if (!selectedCatToAdd || !selectedItemToAdd) return;
    
    const newItem = { catId: selectedCatToAdd, itemId: selectedItemToAdd };

    if (activeType === 'utama') {
      if (isAddingSusulan) {
        if (!susulanValidDate) return alert("Mohon pilih Tanggal Validasi untuk pendapatan susulan!");
        newItem.isSusulan = true;
        newItem.validDate = susulanValidDate;
      }
    } else if (activeType === 'lain') {
      if (lainItemDate) {
        newItem.itemDate = lainItemDate;
      }
      if (lainItemNote.trim()) {
        newItem.itemNote = lainItemNote.trim();
      }
    }

    const inputKey = getActiveItemKey(newItem.catId, newItem.itemId, newItem.isSusulan, newItem.validDate, newItem.itemDate, newItem.itemNote);

    updateCurrentReport(prev => {
      const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
      const currentForm = prev.formData || {};
      
      const exists = currentItems.find(i => {
         const iKey = getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote);
         return iKey === inputKey;
      });
      if (exists) return prev;

      return {
        ...prev,
        activeItems: [...currentItems, newItem],
        formData: { ...currentForm, [inputKey]: 0 }
      };
    });
    
    const cat = categories.find(c => c.id === selectedCatToAdd);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedCatToAdd('');
    setSelectedItemToAdd('');
    setLainItemNote('');

    setTimeout(() => {
      const inputElement = document.getElementById(`input_${inputKey}`);
      if (inputElement) inputElement.focus();
    }, 100);
  };

  const handleRemoveActiveItem = (itemToRemove) => {
    const inputKeyToRemove = getActiveItemKey(itemToRemove.catId, itemToRemove.itemId, itemToRemove.isSusulan, itemToRemove.validDate, itemToRemove.itemDate, itemToRemove.itemNote);
    updateCurrentReport(prev => {
      const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
      const newActive = currentItems.filter(i => {
         const iKey = getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote);
         return iKey !== inputKeyToRemove;
      });
      const newFormData = { ...(prev.formData || {}) };
      delete newFormData[inputKeyToRemove];
      return { ...prev, activeItems: newActive, formData: newFormData };
    });
  };

  const handleInputChange = (inputKey, value) => {
    const rawValue = value.replace(/[^0-9]/g, '');
    updateCurrentReport(prev => ({
      ...prev, formData: { ...(prev.formData || {}), [inputKey]: Number(rawValue) || 0 }
    }));
  };

  // --- FUNGSI HANDLER AI UNTUK URAIAN DINAMIS ---
  const handleGenerateUraian = async () => {
    if (!lainItemNote) return;
    setIsGeneratingUraian(true);
    try {
      const prompt = `Rapikan catatan singkat berikut menjadi satu frasa atau kalimat resmi yang baku, sopan, dan formal untuk keperluan dokumen Surat Tanda Setoran Uang (STSU) bagian keterangan. Jangan tambahkan kata pengantar atau penutup, langsung berikan hasilnya. Catatan asli: "${lainItemNote}"`;
      const result = await callGeminiAPI(prompt, "Anda adalah asisten admin keuangan Sistem Rekap STSU.");
      setLainItemNote(result.trim());
    } catch (e) {
      showConfirm("Gagal menghubungi AI. Silakan coba lagi nanti.", null);
    } finally {
      setIsGeneratingUraian(false);
    }
  };

  // --- FUNGSI BUKA MODAL EDIT URAIAN ---
  const openEditNote = (group, item) => {
    setEditNoteModal({
      isOpen: true,
      group,
      item,
      newNote: item.itemNote || ''
    });
  };

  // --- FUNGSI SIMPAN PERUBAHAN EDIT URAIAN ---
  const saveEditedNote = () => {
    const { group, item, newNote } = editNoteModal;
    const oldNote = item.itemNote || '';
    const trimmedNew = newNote.trim();

    if (trimmedNew && trimmedNew !== oldNote) {
      const oldKey = getActiveItemKey(group.catId, item.itemId || item.id, group.isSusulan, group.validDate, group.itemDate, oldNote);
      const newKey = getActiveItemKey(group.catId, item.itemId || item.id, group.isSusulan, group.validDate, group.itemDate, trimmedNew);

      updateCurrentReport(prev => {
        const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
        
        // Ganti note di array items
        const newActive = currentItems.map(i => {
          if (i.catId === group.catId &&
              i.itemId === (item.itemId || item.id) &&
              !!i.isSusulan === !!group.isSusulan &&
              (i.validDate || '') === (group.validDate || '') &&
              (i.itemDate || '') === (group.itemDate || '') &&
              (i.itemNote || '') === oldNote) {
             return { ...i, itemNote: trimmedNew };
          }
          return i;
        });

        // Pindahkan value nominal dari kunci lama ke kunci baru
        const newFormData = { ...(prev.formData || {}) };
        if (newFormData[oldKey] !== undefined) {
           newFormData[newKey] = newFormData[oldKey];
           delete newFormData[oldKey];
        }

        return { ...prev, activeItems: newActive, formData: newFormData };
      });
    }
    setEditNoteModal({ isOpen: false, group: null, item: null, newNote: '' });
  };

  const computedStsuNo = useMemo(() => {
    if (!reportDate) return '';
    const [y, m, d] = reportDate.split('-');
    const typeCode = activeType === 'lain' ? 'SU/L' : 'SU';
    const seq = currentReport.sequence || '...';
    return `${seq}/${d}/${m}/${typeCode}/${y}`;
  }, [reportDate, activeType, currentReport.sequence]);

  const availableItemsToAdd = useMemo(() => {
    if (!selectedCatToAdd) return [];
    const cat = categories.find(c => c.id === selectedCatToAdd);
    if (!cat) return [];
    const activeI = Array.isArray(currentReport.activeItems) ? currentReport.activeItems : [];
    
    const isAdded = (iId) => {
      if (activeType === 'utama') {
         return activeI.some(a => a.catId === selectedCatToAdd && a.itemId === iId && !!a.isSusulan === isAddingSusulan && (a.validDate || '') === (susulanValidDate || ''));
      } else {
         return activeI.some(a => a.catId === selectedCatToAdd && a.itemId === iId && (a.itemDate || '') === (lainItemDate || '') && (a.itemNote || '') === (lainItemNote.trim() || ''));
      }
    };

    if (!Array.isArray(cat.items) || cat.items.length === 0) {
      return isAdded('direct') ? [] : [{ id: 'direct', name: cat.name }];
    }
    return cat.items.filter(item => !isAdded(item.id));
  }, [selectedCatToAdd, categories, currentReport.activeItems, isAddingSusulan, susulanValidDate, activeType, lainItemDate, lainItemNote]);

  const activeGroups = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    const activeI = Array.isArray(currentReport.activeItems) ? currentReport.activeItems : [];
    const groups = [];

    categories.forEach((cat, index) => {
      const itemsForCat = activeI.filter(ai => ai.catId === cat.id);
      if (itemsForCat.length === 0) return;

      if (activeType === 'utama') {
        const configsForCat = [];
        itemsForCat.forEach(ai => {
          const key = ai.isSusulan ? `susulan_${ai.validDate}` : 'normal';
          if (!configsForCat.find(c => c.key === key)) {
            configsForCat.push({ key, isSusulan: !!ai.isSusulan, validDate: ai.validDate });
          }
        });

        configsForCat.forEach(config => {
          const matchedItems = itemsForCat.filter(ai => !!ai.isSusulan === config.isSusulan && (ai.validDate || '') === (config.validDate || ''));
          const displayItems = matchedItems.map(ai => {
            if (ai.itemId === 'direct') return { ...ai, id: 'direct', name: cat.name };
            const found = cat.items?.find(i => i.id === ai.itemId);
            return { ...ai, id: ai.itemId, name: found ? found.name : 'Item' };
          });

          groups.push({
            groupId: `${cat.id}_${config.key}`,
            catId: cat.id,
            name: cat.name,
            isSusulan: config.isSusulan,
            validDate: config.validDate,
            activeItems: displayItems,
            catIndex: index 
          });
        });
      } else {
        const configsForCat = [];
        itemsForCat.forEach(ai => {
          const dateKey = ai.itemDate ? `date_${ai.itemDate}` : 'nodate';
          const noteStr = ai.itemNote ? ai.itemNote.trim() : '';
          const key = `${dateKey}_note_${noteStr}`;

          if (!configsForCat.find(c => c.key === key)) {
            configsForCat.push({ key, itemDate: ai.itemDate, itemNote: noteStr });
          }
        });

        configsForCat.forEach(config => {
          const matchedItems = itemsForCat.filter(ai => 
            (ai.itemDate || '') === (config.itemDate || '') && 
            (ai.itemNote ? ai.itemNote.trim() : '') === config.itemNote
          );
          
          const displayItems = matchedItems.map(ai => {
            if (ai.itemId === 'direct') return { ...ai, id: 'direct', name: cat.name };
            const found = cat.items?.find(i => i.id === ai.itemId);
            return { ...ai, id: ai.itemId, name: found ? found.name : 'Item' };
          });

          groups.push({
            groupId: `${cat.id}_${config.key}`,
            catId: cat.id,
            name: cat.name,
            isSusulan: false,
            itemDate: config.itemDate,
            itemNote: config.itemNote,
            activeItems: displayItems,
            catIndex: index
          });
        });
      }
    });

    groups.sort((a, b) => {
      if (activeType === 'utama') {
          if (!a.isSusulan && b.isSusulan) return -1;
          if (a.isSusulan && !b.isSusulan) return 1;
          if (a.isSusulan && b.isSusulan) {
            if (a.validDate !== b.validDate) return (a.validDate || '').localeCompare(b.validDate || '');
          }
      } else {
          if (a.catIndex !== b.catIndex) return a.catIndex - b.catIndex;
          if (a.itemDate !== b.itemDate) return (a.itemDate || '').localeCompare(b.itemDate || '');
          if (a.itemNote !== b.itemNote) return (a.itemNote || '').localeCompare(b.itemNote || '');
      }
      return a.catIndex - b.catIndex;
    });

    return groups;
  }, [categories, currentReport.activeItems, activeType]);

  const { subtotals, grandTotal } = useMemo(() => {
    let gt = 0; const subs = {};
    const cForm = currentReport.formData || {};
    activeGroups.forEach(group => {
      let sub = 0;
      group.activeItems.forEach(item => { 
        const key = getActiveItemKey(group.catId, item.id, group.isSusulan, group.validDate, group.itemDate, group.itemNote);
        sub += cForm[key] || 0; 
      });
      subs[group.groupId] = sub; 
      gt += sub;
    });
    return { subtotals: subs, grandTotal: gt };
  }, [currentReport.formData, activeGroups]);

  const addCategory = () => setCategories([...(categories||[]), { id: `cat_${Date.now()}`, name: 'Kategori Baru', type: 'utama', items: [] }]);
  const updateCategory = (catId, key, value) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, [key]: value } : c));
  
  const deleteCategory = (catId) => {
    showConfirm('Hapus kategori ini? Data lama tidak akan hilang, tapi kategori tidak bisa dipilih lagi.', () => {
      setCategories((categories||[]).filter(c => c.id !== catId));
    });
  };
  
  const moveCategory = (index, direction) => {
    const newCats = [...(categories || [])];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    }
    setCategories(newCats);
  };

  const addItem = (catId) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, items: [...(c.items||[]), { id: `item_${Date.now()}`, name: 'Item Baru' }] } : c));
  const updateItemName = (catId, itemId, newName) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, items: (c.items||[]).map(i => i.id === itemId ? { ...i, name: newName } : i) } : c));
  const deleteItem = (catId, itemId) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, items: (c.items||[]).filter(i => i.id !== itemId) } : c));

  const moveItem = (catId, itemIndex, direction) => {
    const newCats = [...(categories || [])];
    const catIndex = newCats.findIndex(c => c.id === catId);
    if (catIndex > -1) {
      const newItems = [...(newCats[catIndex].items || [])];
      if (direction === 'up' && itemIndex > 0) {
        [newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]];
      } else if (direction === 'down' && itemIndex < newItems.length - 1) {
        [newItems[itemIndex + 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex + 1]];
      }
      newCats[catIndex] = { ...newCats[catIndex], items: newItems };
      setCategories(newCats);
    }
  };

  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  
  const getDaysArray = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const blanks = Array.from({length: firstDayIndex}, (_, i) => i);
    
    const days = Array.from({length: daysInMonth}, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = allReports[dateStr] || {};
      
      const utamaItems = Array.isArray(dayData.utama?.activeItems) ? dayData.utama.activeItems : [];
      const hasUtama = utamaItems.length > 0;
      const utamaSequence = dayData.utama?.sequence || '';
      
      const lainDocs = [];
      Object.keys(dayData).forEach(k => {
        if ((k === 'lain' || k.startsWith('lain_')) && Array.isArray(dayData[k].activeItems) && dayData[k].activeItems.length > 0) {
          lainDocs.push({
            key: k,
            sequence: dayData[k].sequence || ''
          });
        }
      });
      
      return { day: d, dateStr, hasUtama, utamaSequence, lainDocs, hasLain: lainDocs.length > 0 };
    });
    
    return { blanks, days };
  };
  
  const { blanks, days } = getDaysArray();

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-area');
    if (!element) return;
    if (window.html2pdf) {
      setPdfLoading(true);
      const opt = {
        margin:       [10, 10, 10, 10], 
        filename:     `Laporan_STSU_${activeType.toUpperCase()}${activeType === 'lain' ? `_Dok${activeLainIndex}` : ''}_${reportDate}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().set(opt).from(element).save().then(() => setPdfLoading(false)).catch(err => {
        console.error("Gagal buat PDF", err);
        setPdfLoading(false);
      });
    } else {
      showConfirm("Modul pembuat PDF sedang dimuat oleh sistem. Mohon tunggu 3 detik lalu coba tekan lagi.", null);
    }
  };

  const formatTanggalCetak = (dateStr) => {
    if(!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).replace(',', ', tanggal');
  };
  const formatTanggalTtd = (dateStr) => {
    if(!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: '2-digit' });
  };


  // ==========================================
  // RENDER LAYAR LOGIN JIKA BELUM MASUK
  // ==========================================
  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500 font-bold">Memuat Sistem Keamanan...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-700 to-green-900 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
              <Lock size={32} className="text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-gray-800 mb-2">Sistem Rekap STSU</h1>
          <p className="text-center text-gray-500 text-sm mb-8">Silakan login untuk mengakses brankas data STSU.</p>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100">
              <AlertCircle size={18} className="shrink-0" /> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email / Username</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                placeholder="kasir@stsu.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={isLoggingIn} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 disabled:bg-gray-400">
              {isLoggingIn ? 'Memeriksa Kredensial...' : 'Masuk ke Aplikasi'}
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-gray-400">
            Akses Terbatas &bull; Sistem Rekap STSU
          </div>
        </div>
      </div>
    );
  }


  // ==========================================
  // RENDER APLIKASI UTAMA
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-36 relative">
      <style>{`
        /* CSS DINAMIS UNTUK MODE CETAK (PDF vs DOT MATRIX NCR) */
        @media print {
          body { background-color: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          
          ${printMode === 'ncr' ? `
            .print-container { 
              width: 215mm; height: 165mm; margin: 0; padding: 0; 
              font-family: 'Courier New', Courier, monospace !important; 
              font-size: 11pt; color: black; box-shadow: none !important; border: none !important; 
            }
            @page { size: 215mm 165mm; margin: 0; }
          ` : `
            .print-container { 
              width: 100%; max-width: 100%; margin: 0; padding: 0; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 11pt; color: black; box-shadow: none !important; border: none !important; 
            }
            @page { margin: 15mm; }
          `}
        }
      `}</style>

      {/* --- SAVE TOAST NOTIFICATION --- */}
      {saveToast && (
        <div className="fixed top-20 right-4 sm:right-10 z-[9999] bg-green-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
          <CheckCircle size={20} />
          <div className="font-bold text-sm">Data berhasil disimpan ke Cloud!</div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM MODAL --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="font-bold text-xl">Konfirmasi</h3>
            </div>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDialog({isOpen: false, message: '', onConfirm: null})} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Batal</button>
              <button onClick={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({isOpen: false, message: '', onConfirm: null}); }} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md">Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT NOTE MODAL (BARU) --- */}
      {editNoteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <Edit size={28} />
              <h3 className="font-bold text-xl">Edit Uraian Dinamis</h3>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">Keterangan / Uraian:</label>
                <button 
                  onClick={async () => {
                    if (!editNoteModal.newNote) return;
                    setIsGeneratingUraian(true);
                    try {
                      const prompt = `Rapikan catatan singkat berikut menjadi satu frasa atau kalimat resmi yang baku, sopan, dan formal untuk keperluan dokumen Surat Tanda Setoran Uang (STSU) bagian keterangan. Jangan tambahkan kata pengantar atau penutup, langsung berikan hasilnya. Catatan asli: "${editNoteModal.newNote}"`;
                      const result = await callGeminiAPI(prompt, "Anda adalah asisten admin keuangan Sistem Rekap STSU.");
                      setEditNoteModal(prev => ({...prev, newNote: result.trim()}));
                    } catch (e) {
                      // ignore error or silent
                    } finally {
                      setIsGeneratingUraian(false);
                    }
                  }}
                  disabled={!editNoteModal.newNote || isGeneratingUraian}
                  className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded border border-purple-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingUraian ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  ✨ AI Rapikan
                </button>
              </div>
              <textarea 
                value={editNoteModal.newNote}
                onChange={(e) => setEditNoteModal(prev => ({...prev, newNote: e.target.value}))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 bg-gray-50 font-medium resize-none"
                placeholder="Masukkan keterangan baru..."
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditNoteModal({isOpen: false, group: null, item: null, newNote: ''})} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">Batal</button>
              <button onClick={saveEditedNote} disabled={!editNoteModal.newNote.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm disabled:opacity-50">Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {resetDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="font-bold text-xl">Konfirmasi Reset</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm font-medium">
              Apakah Anda yakin ingin <strong className="text-red-600">MENGHAPUS SEMUA DATA</strong> di form STSU {activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'} untuk tanggal ini? Data tidak dapat dikembalikan.
            </p>
            
            {resetDialog.error && (
              <div className="bg-red-50 text-red-600 p-2 rounded text-xs mb-4 border border-red-100 font-semibold">
                {resetDialog.error}
              </div>
            )}

            <form onSubmit={handleConfirmReset}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Masukkan Password ADMIN</label>
                <input 
                  type="password" 
                  value={resetDialog.password}
                  onChange={(e) => setResetDialog(prev => ({...prev, password: e.target.value}))}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-red-500 bg-gray-50 font-bold"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setResetDialog({isOpen: false, password: '', error: '', isVerifying: false})} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">Batal</button>
                <button type="submit" disabled={resetDialog.isVerifying} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm disabled:opacity-50">
                  {resetDialog.isVerifying ? 'Memeriksa...' : 'Ya, Hapus Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <nav className="bg-green-700 text-white shadow-md sticky top-0 z-50 shrink-0 no-print">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="font-bold text-lg flex items-center gap-2 mr-4 shrink-0">
            <Calculator size={24} /> <span className="hidden sm:inline">Sistem Rekap STSU</span>
            
            <div className="ml-0 sm:ml-4 flex items-center gap-1.5 text-[10px] sm:text-xs font-medium px-2.5 py-1 bg-green-800 rounded-lg shadow-inner">
              {syncStatus === 'syncing' ? <RefreshCw className="animate-spin text-white" size={14}/> :
               syncStatus === 'synced' ? <Cloud size={14} className="text-blue-300"/> : 
               <CloudOff size={14} className="text-red-300"/>}
              <span className="hidden md:inline">
                {syncStatus === 'syncing' ? 'Menyimpan...' : 
                 syncStatus === 'synced' ? 'Tersimpan' : 'Mode Offline'}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-1 sm:space-x-2 shrink-0 overflow-x-auto no-scrollbar items-center">
            <button onClick={() => { setActiveTab('dashboard'); setPrintMode('pdf'); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Calendar size={18} /> <span className="hidden md:inline">Dashboard</span></button>
            <button onClick={() => { setActiveTab('input'); setPrintMode('pdf'); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'input' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Edit size={18} /> <span className="hidden md:inline">Input</span></button>
            <button onClick={() => { setActiveTab('settings'); setPrintMode('pdf'); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Settings size={18} /> <span className="hidden md:inline">Master</span></button>
            <button onClick={() => { setActiveTab('print'); setPrintMode('pdf'); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'print' ? 'bg-green-800' : 'hover:bg-green-600'}`}><FileText size={18} /> <span className="hidden md:inline">Cetak</span></button>
            
            <div className="pl-2 border-l border-green-600 ml-1">
              <button onClick={handleLogout} className="px-2 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 transition-colors" title="Keluar Akun">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* === TAB: DASHBOARD === */}
      {activeTab === 'dashboard' && (
        <div className="max-w-4xl mx-auto px-4 py-6 no-print">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-800 p-6 text-center text-white">
              <h2 className="text-2xl font-black mb-1 drop-shadow-sm">Dashboard Rekapitulasi</h2>
              <p className="text-green-100 text-sm opacity-90">Pantau kelengkapan STSU Pendapatan dan STSU Lain-lain.</p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6 bg-gray-50 p-2 rounded-xl border border-gray-100">
                <button onClick={prevMonth} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100"><ChevronLeft size={20} className="text-gray-600"/></button>
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={nextMonth} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100"><ChevronRight size={20} className="text-gray-600"/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (<div key={day} className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{day}</div>))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {blanks.map(b => <div key={`blank-${b}`} className="h-20 sm:h-28 bg-gray-50/50 rounded-lg sm:rounded-xl"></div>)}
                {days.map(d => {
                  const isToday = d.dateStr === getLocalYMD();
                  const isActive = d.dateStr === reportDate;
                  return (
                    <button 
                      key={d.day} 
                      onClick={() => { handleDateChange(d.dateStr); setActiveTab('input'); }}
                      className={`relative h-20 sm:h-28 rounded-lg sm:rounded-xl flex flex-col justify-start items-center pt-1.5 sm:pt-3 border transition-all overflow-hidden ${(d.hasUtama || d.hasLain) ? 'bg-blue-50/30 hover:bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200'} ${isActive ? 'ring-2 ring-blue-500 transform scale-105 z-10 bg-blue-50' : ''}`}
                    >
                      <span className={`text-sm sm:text-lg font-bold ${isToday ? 'text-blue-600 bg-blue-100 px-2 rounded-full' : 'text-gray-700'}`}>{d.day}</span>
                      
                      <div className="mt-1 sm:mt-2 w-full px-1 flex flex-col gap-0.5 sm:gap-1 items-center overflow-y-auto no-scrollbar max-h-[44px] sm:max-h-[64px]">
                        {d.hasUtama && (
                          <span className="bg-green-500 text-white text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-sm w-full flex justify-between items-center shrink-0">
                            <span>SU</span>
                            {d.utamaSequence && d.utamaSequence !== '...' && <span className="bg-green-700 px-1 rounded truncate max-w-[30px] sm:max-w-none text-[8px] sm:text-[9px]">{d.utamaSequence}</span>}
                          </span>
                        )}
                        {d.lainDocs.map((lainDoc, index) => (
                          <span key={index} className="bg-purple-500 text-white text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-sm w-full flex justify-between items-center shrink-0">
                            <span>SU/L</span>
                            {lainDoc.sequence && lainDoc.sequence !== '...' && <span className="bg-purple-700 px-1 rounded truncate max-w-[30px] sm:max-w-none text-[8px] sm:text-[9px]">{lainDoc.sequence}</span>}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: SETTINGS / MASTER === */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto px-4 py-6 no-print space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2"><Edit size={20} className="text-blue-500"/> Pejabat Penandatangan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">Pihak Kiri (Penyetor)</h3>
                <div><label className="text-xs text-gray-500 uppercase">Jabatan</label><input type="text" value={signatures.leftRole || ''} onChange={(e) => setSignatures({...signatures, leftRole: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">Nama</label><input type="text" value={signatures.leftName || ''} onChange={(e) => setSignatures({...signatures, leftName: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none font-bold focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">NIP (Khusus Print NCR)</label><input type="text" value={signatures.leftNip || ''} onChange={(e) => setSignatures({...signatures, leftNip: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
              </div>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">Pihak Kanan (Bendahara)</h3>
                <div><label className="text-xs text-gray-500 uppercase">Lokasi</label><input type="text" value={signatures.location || ''} onChange={(e) => setSignatures({...signatures, location: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">Jabatan</label><input type="text" value={signatures.rightRole || ''} onChange={(e) => setSignatures({...signatures, rightRole: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">Nama</label><input type="text" value={signatures.rightName || ''} onChange={(e) => setSignatures({...signatures, rightName: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none font-bold focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">NIP (Khusus Print NCR)</label><input type="text" value={signatures.rightNip || ''} onChange={(e) => setSignatures({...signatures, rightNip: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings size={20} className="text-blue-500"/> Database Kategori</h2>
            </div>
            
            <div className="space-y-6">
              {categories.map((cat, index) => (
                <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className={`p-3 flex flex-col md:flex-row justify-between md:items-center gap-3 border-b ${cat.type === 'utama' ? 'bg-green-50 border-green-100' : 'bg-purple-50 border-purple-100'}`}>
                    
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button onClick={() => moveCategory(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"><ArrowUp size={14}/></button>
                        <button onClick={() => moveCategory(index, 'down')} disabled={index === categories.length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"><ArrowDown size={14}/></button>
                      </div>
                      <span className={`font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs text-white shrink-0 ${cat.type === 'utama' ? 'bg-green-600' : 'bg-purple-600'}`}>{index + 1}</span>
                      <input type="text" value={cat.name || ''} onChange={(e) => updateCategory(cat.id, 'name', e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1.5 w-full max-w-md font-bold text-sm outline-none" placeholder="Nama Kategori..." />
                    </div>
                    <div className="flex items-center gap-2 pl-10 md:pl-0">
                      <select value={cat.type || 'utama'} onChange={(e) => updateCategory(cat.id, 'type', e.target.value)} className={`text-xs font-bold px-2 py-1.5 rounded border outline-none ${cat.type === 'utama' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                        <option value="utama">STSU Utama (SU)</option>
                        <option value="lain">STSU Lain-lain (SU/L)</option>
                      </select>
                      <button onClick={() => deleteCategory(cat.id)} className="text-red-500 p-2 hover:bg-red-100 rounded-lg bg-white border border-red-100 shadow-sm"><Trash size={18} /></button>
                    </div>
                  </div>
                  <div className="p-3 bg-white space-y-2 pl-12 border-t border-gray-50">
                    {Array.isArray(cat.items) && cat.items.length === 0 && (
                      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 mb-2 font-medium flex items-center gap-1"><CheckCircle size={14} /> Mode Langsung Input Nominal.</div>
                    )}
                    {Array.isArray(cat.items) && cat.items.map((item, itemIdx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveItem(cat.id, itemIdx, 'up')} disabled={itemIdx === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"><ArrowUp size={14}/></button>
                          <button onClick={() => moveItem(cat.id, itemIdx, 'down')} disabled={itemIdx === cat.items.length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 p-0.5"><ArrowDown size={14}/></button>
                        </div>
                        <Tag size={14} className="text-gray-400 hidden sm:block"/>
                        <input type="text" value={item.name || ''} onChange={(e) => updateItemName(cat.id, item.id, e.target.value)} className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 flex-1 text-sm outline-none focus:border-blue-400 focus:bg-white" placeholder="Nama Tiket..." />
                        <button onClick={() => deleteItem(cat.id, item.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
                      </div>
                    ))}
                    <button onClick={() => addItem(cat.id)} className="text-sm text-blue-600 font-bold flex items-center gap-1 mt-3 hover:bg-blue-50 px-2 py-1 rounded transition-colors"><Plus size={16} /> Tambah Sub-Kategori</button>
                  </div>
                </div>
              ))}
              <button onClick={addCategory} className="w-full py-4 border-2 border-dashed border-gray-300 text-gray-600 bg-gray-50 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors"><Plus size={20} /> Buat Kategori Baru</button>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: INPUT DATA === */}
      {activeTab === 'input' && (
        <div className="max-w-4xl mx-auto px-4 py-6 no-print">
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex flex-col sm:flex-row mb-6 gap-2">
            <button onClick={() => handleTypeSwitch('utama')} className={`flex-1 py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${activeType === 'utama' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-green-600'}`}>
              <span className="text-sm uppercase tracking-wide">Input Form</span><span className="text-lg">STSU Pendapatan</span>
            </button>
            <button onClick={() => handleTypeSwitch('lain')} className={`flex-1 py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${activeType === 'lain' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-600'}`}>
              <span className="text-sm uppercase tracking-wide">Input Form</span><span className="text-lg">STSU Lain-lain</span>
            </button>
          </div>

          {activeType === 'lain' && (
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 items-center">
              {lainDocIndices.map(num => (
                <div key={num} className="relative flex-shrink-0 group">
                  <button
                    onClick={() => {
                      setActiveLainIndex(num);
                      setSelectedCatToAdd(''); setSelectedItemToAdd('');
                      setLainItemDate(''); setLainItemNote('');
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all border ${activeLainIndex === num ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                  >
                    Dokumen Ke-{num}
                  </button>
                  
                  {num > 1 && (
                    <button 
                       onClick={(e) => { e.stopPropagation(); handleRemoveLainDoc(num); }}
                       className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md z-10 hover:bg-red-600 border border-white transition-opacity ${activeLainIndex === num ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                       title="Hapus Dokumen"
                    >
                       ✕
                    </button>
                  )}
                </div>
              ))}
              
              <button 
                onClick={handleAddLainDoc}
                className="px-3 py-2 ml-1 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100 flex items-center gap-1.5 shadow-sm"
                title="Tambah Dokumen Lain-lain Baru"
              >
                <Plus size={16} /> Tambah Dokumen
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${activeType === 'utama' ? 'bg-green-500' : 'bg-purple-500'}`}>
              Dokumen {activeType === 'utama' ? 'STSU (SU)' : `Lain-lain (SU/L) - Ke ${activeLainIndex}`}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tgl Laporan (Di Atas)</label>
                <input type="date" value={reportDate} onChange={(e) => handleDateChange(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 font-bold text-gray-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tgl Cetak (Bawah/TTD)</label>
                <input type="date" value={currentReport.signatureDate} onChange={handleSignatureDateChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-blue-50 font-bold text-blue-700" title="Tanggal yang akan tercetak di atas nama Bendahara."/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Urut STSU</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="07" value={currentReport.sequence || ''} onChange={handleSequenceChange} className="w-16 sm:w-20 border border-gray-300 rounded-lg p-2.5 text-center font-bold outline-none focus:border-blue-500 bg-white shadow-inner text-lg" />
                  <div className="flex-1 border border-dashed border-gray-300 rounded-lg bg-gray-50 p-2.5 flex items-center overflow-x-auto">
                    <span className="font-mono font-bold text-gray-600 text-sm whitespace-nowrap">{computedStsuNo || 'Preview...'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="form-tambah-transaksi" className={`${activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'} rounded-xl shadow-sm border p-4 mb-6 transition-colors`}>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wide ${activeType === 'utama' ? 'text-green-800' : 'text-purple-800'}`}>
                <Plus size={18} /> Tambah Transaksi {activeType === 'utama' ? 'SU' : 'SU/L'}
              </h2>
              
              {activeType === 'utama' && (
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-yellow-700 bg-yellow-100/80 px-3 py-1.5 rounded-lg border border-yellow-300 hover:bg-yellow-200 transition-colors shadow-sm w-fit">
                  <input type="checkbox" checked={isAddingSusulan} onChange={e => setIsAddingSusulan(e.target.checked)} className="w-4 h-4 accent-yellow-600" />
                  Mode Susulan
                </label>
              )}
            </div>

            {activeType === 'utama' && isAddingSusulan && (
              <div className="mb-4 p-3 bg-yellow-100/50 border border-yellow-200 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                <AlertCircle size={18} className="text-yellow-600 shrink-0" />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-bold text-yellow-800 uppercase">Tanggal Validasi Susulan:</span>
                  <input type="date" value={susulanValidDate} onChange={e => setSusulanValidDate(e.target.value)} className="border border-yellow-300 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-yellow-500 bg-white" />
                </div>
              </div>
            )}

            {activeType === 'lain' && (
              <div className="mb-4 p-3 bg-purple-100/50 border border-purple-200 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                <Calendar size={18} className="text-purple-600 shrink-0" />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-bold text-purple-800 uppercase">Pilih Tanggal Transaksi:</span>
                  <input type="date" value={lainItemDate} onChange={e => setLainItemDate(e.target.value)} className="border border-purple-300 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white" title="Pilih tanggal jika ingin keterangan tanggal tercetak pada nota" />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Kategori</label>
                  <select value={selectedCatToAdd} onChange={(e) => handleCatChange(e.target.value)} className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Pilih Kategori --</option>
                    {filteredCategories.map(cat => <option key={cat.id} value={cat.id} className="capitalize">{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Sub-Kategori</label>
                  <select value={selectedItemToAdd} onChange={(e) => setSelectedItemToAdd(e.target.value)} disabled={!selectedCatToAdd || availableItemsToAdd.length === 0 || (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct')} className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500">
                    {!selectedCatToAdd ? <option value="">Pilih Kategori Dulu</option> : 
                     availableItemsToAdd.length === 0 ? <option value="">Semua item ditambahkan</option> :
                     (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct') ? <option value="direct">Langsung isi nominal</option> :
                     <option value="">-- Pilih Item --</option>}
                    {availableItemsToAdd.map(item => item.id !== 'direct' && <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              </div>

              {activeType === 'lain' && (
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-semibold text-purple-700">Keterangan Tambahan / Uraian Dinamis (Cetak di Judul)</label>
                    <button 
                      onClick={handleGenerateUraian}
                      disabled={!lainItemNote || isGeneratingUraian}
                      className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded border border-purple-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      title="Gunakan AI untuk merapikan bahasa"
                    >
                      {isGeneratingUraian ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      ✨ Rapikan Bahasa
                    </button>
                  </div>
                  <textarea
                    value={lainItemNote}
                    onChange={(e) => setLainItemNote(e.target.value)}
                    rows={2}
                    className="w-full border border-purple-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    placeholder="Contoh: Rombongan anak tk bintang pakai bus 20 org"
                  ></textarea>
                </div>
              )}

              <button onClick={handleAddActiveItem} disabled={!selectedCatToAdd || !selectedItemToAdd} className={`w-full mt-2 text-white p-3 rounded-lg font-bold flex justify-center items-center transition-colors shadow-sm disabled:bg-gray-300 ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>Add Transaksi</button>
            </div>
          </div>

          <div className="space-y-5">
            {activeGroups.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
                <AlertCircle size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium">Belum ada pendapatan yang dimasukkan.</p>
              </div>
            ) : (
              activeGroups.map((group, idx) => (
                <div key={group.groupId} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${group.isSusulan ? 'border-yellow-300' : 'border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b flex justify-between items-center ${group.isSusulan ? 'bg-yellow-50 border-yellow-200' : (activeType === 'utama' ? 'bg-green-50/50 border-green-100' : 'bg-purple-50/50 border-purple-100')}`}>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${group.isSusulan ? 'bg-yellow-400 text-yellow-900' : (activeType === 'utama' ? 'bg-green-200 text-green-800' : 'bg-purple-200 text-purple-800')}`}>{idx + 1}</span> 
                      {group.name}
                      {group.isSusulan && (
                        <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 shadow-sm">
                          Susulan: {formatTanggalTtd(group.validDate)}
                        </span>
                      )}
                      {activeType === 'lain' && group.itemDate && (
                        <span className="text-[10px] bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 shadow-sm">
                          Tanggal: {formatTanggalTtd(group.itemDate)}
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {group.activeItems.map(item => {
                      const inputKey = getActiveItemKey(group.catId, item.id, group.isSusulan, group.validDate, group.itemDate, item.itemNote);
                      return (
                        <div key={inputKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start gap-2 sm:w-1/2">
                            <button onClick={() => handleRemoveActiveItem(item)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm mt-0.5 shrink-0"><Trash size={18} /></button>
                            <div className="flex flex-col w-full">
                              <label className="text-gray-700 font-medium">
                                 {item.id === 'direct' ? 'Nominal Pemasukan' : item.name}
                              </label>
                              
                              {/* 🔴 TOMBOL EDIT URAIAN MUNCUL DI SINI JIKA ADA NOTE 🔴 */}
                              {item.itemNote && (
                                <div className="flex items-center gap-2 mt-1 group/note w-full">
                                  <span className="text-xs text-purple-600 whitespace-pre-wrap font-medium flex-1">{item.itemNote}</span>
                                  <button onClick={() => openEditNote(group, item)} className="text-gray-400 hover:text-blue-600 opacity-50 group-hover/note:opacity-100 transition-opacity bg-gray-50 p-1 rounded-md shrink-0" title="Edit Uraian">
                                    <Edit size={14} />
                                  </button>
                                </div>
                              )}

                            </div>
                          </div>
                          <div className="relative w-full sm:w-1/2 md:w-2/5 shrink-0 mt-2 sm:mt-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                            <input 
                              id={`input_${inputKey}`}
                              type="text" inputMode="numeric" 
                              value={currentReport.formData[inputKey] ? formatRp(currentReport.formData[inputKey]) : ''} 
                              onChange={(e) => handleInputChange(inputKey, e.target.value)} 
                              className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-right font-bold focus:ring-2 outline-none ${group.isSusulan ? 'border-yellow-300 focus:ring-yellow-500' : 'border-gray-300 focus:ring-green-500'}`} 
                              placeholder="0" 
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-2 border-t border-dashed border-gray-300 flex justify-between items-center text-sm font-bold text-gray-600">
                      <span>Sub Total:</span><span className="text-gray-800 text-base">Rp {formatRp(subtotals[group.groupId])}</span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {activeGroups.length > 0 && (
              <div className="flex justify-center mt-6 mb-8 pb-4">
                <button
                  onClick={() => {
                    const el = document.getElementById('form-tambah-transaksi');
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <ArrowUp size={20} /> Ke Atas (Tambah Data Lain)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const el = document.getElementById('form-tambah-transaksi');
              if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="fixed bottom-28 right-4 sm:right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all z-40 group no-print border-2 border-white flex items-center justify-center"
            title="Kembali Ke Atas (Tambah Kategori)"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </button>

          {/* Baris Bawah Mengambang (Diperbarui dengan Tombol Simpan Data) */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] p-4 z-40 no-print">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex-1 w-full flex items-center justify-between sm:justify-start gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Grand Total ({activeType === 'utama' ? 'SU' : 'SU/L'})</p>
                  <p className={`text-2xl font-black leading-none mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Rp {formatRp(grandTotal)}</p>
                  <p className="text-xs text-gray-500 italic hidden sm:block">"{terbilang(grandTotal)} rupiah"</p>
                </div>
              </div>
              
              <div className="flex w-full sm:w-auto gap-2">
                <button onClick={clearCurrentReport} className="px-4 py-3 text-red-500 hover:bg-red-50 font-bold rounded-xl transition-colors text-sm border border-transparent hover:border-red-200" title="Kosongkan Form">Reset</button>
                
                {/* 🔴 TOMBOL MANUAL SAVE 🔴 */}
                <button onClick={handleForceSave} className="px-4 py-3 text-blue-600 hover:bg-blue-50 font-bold rounded-xl transition-colors text-sm border border-blue-200 hover:border-blue-300 flex items-center gap-1.5 bg-white shadow-sm">
                  <Save size={18} /> <span className="hidden sm:inline">Simpan</span>
                </button>

                <button onClick={() => { setActiveTab('print'); setPrintMode('pdf'); }} disabled={activeGroups.length === 0} className={`flex-1 sm:flex-none text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-sm disabled:bg-gray-300 ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}><FileText size={20} /> Lihat Draft Cetak</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: CETAK (MODE PDF & MODE NCR DOT MATRIX) === */}
      {activeTab === 'print' && (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
             <div>
               <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                 {printMode === 'pdf' ? (
                   <><FileText size={20} className={activeType === 'utama' ? 'text-green-600' : 'text-purple-600'}/> Preview & Download Laporan Gabungan</>
                 ) : (
                   <><Printer size={20} className="text-purple-600"/> Mode Cetak NCR: {selectedNcrGroup?.name}</>
                 )}
               </h2>
               {printMode === 'ncr' && <p className="text-xs text-gray-500 mt-1">Pastikan kertas rangkap 3 sudah masuk ke printer Epson Dot Matrix Bapak.</p>}
             </div>
             
             <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
               {printMode === 'pdf' ? (
                 <>
                   <button onClick={() => setActiveTab('input')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex-1 sm:flex-none hover:bg-gray-200 transition-colors">Kembali Edit</button>
                   <button onClick={handleDownloadPDF} disabled={pdfLoading} className={`px-4 py-2 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} disabled:opacity-50 transition-colors`}>
                     {pdfLoading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                     {pdfLoading ? 'Memproses...' : 'Unduh PDF'}
                   </button>
                   <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md transition-colors">
                     <Printer size={18} /> Cetak Printer
                   </button>
                 </>
               ) : (
                 <>
                   <button onClick={() => { setPrintMode('pdf'); setSelectedNcrGroup(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex-1 sm:flex-none hover:bg-gray-200 transition-colors">Kembali ke PDF</button>
                   <button onClick={handlePrint} className="px-6 py-2 bg-purple-700 hover:bg-purple-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md transition-colors">
                     <Printer size={18} /> Print Kertas NCR
                   </button>
                 </>
               )}
             </div>
          </div>

          {printMode === 'pdf' && activeGroups.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6 no-print">
               <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2 text-sm"><Printer size={16}/> Cetak NCR Kertas Rangkap 3 (Per Kategori)</h3>
               <p className="text-xs text-purple-700 mb-3">Klik kategori di bawah ini untuk beralih ke mode cetak posisi absolut di atas blangko NCR.</p>
               <div className="flex flex-wrap gap-2">
                 {activeGroups.map(group => (
                    <button 
                       key={group.groupId} 
                       onClick={() => { setSelectedNcrGroup(group); setPrintMode('ncr'); }} 
                       className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-transform hover:scale-105"
                    >
                       🖨️ Kategori: {group.name}
                    </button>
                 ))}
               </div>
            </div>
          )}

          {printMode === 'pdf' ? (
            
            <div id="printable-area" className="print-container bg-white p-6 sm:p-10 shadow-lg min-h-[297mm] mx-auto border border-gray-200 text-black relative print:border-none print:shadow-none print:p-0">
              <div className="absolute top-10 right-10 text-gray-200 font-bold text-3xl opacity-50 uppercase tracking-widest print:opacity-0 pointer-events-none">
                DRAFT {activeType === 'utama' ? 'SU' : 'SU/L'}
              </div>

              <div className="font-bold underline mb-8 text-[11pt]">No. {computedStsuNo}</div>

              <div className="mb-6 text-[11pt]">
                Diterima uang hasil pendapatan {formatTanggalCetak(reportDate)} sebagai berikut;
              </div>

              <div className="space-y-2">
                {activeGroups.map((group, index) => {
                  if (subtotals[group.groupId] === 0) return null;
                  const isDirect = Array.isArray(group.activeItems) && group.activeItems.length === 1 && group.activeItems[0].id === 'direct';
                  
                  let groupTitle = group.name;
                  if (activeType === 'utama' && group.isSusulan) {
                    groupTitle = `${group.name} susulan (validasi ${formatTanggalTtd(group.validDate)})`;
                  } else if (activeType === 'lain') {
                    let parts = [group.name];
                    if (group.itemNote) parts.push(`dari ${group.itemNote.replace(/\n/g, ' ')}`);
                    if (group.itemDate) parts.push(`tanggal ${formatTanggalTtd(group.itemDate)}`);
                    groupTitle = parts.join(' ');
                  }

                  return (
                    <div key={group.groupId} className="text-[11pt] pb-3">
                      <div className="font-bold mb-1 leading-relaxed">
                        {index + 1}. Diterima uang hasil pendapatan {groupTitle}, sebagai berikut :
                      </div>
                      
                      <div className="w-full">
                        {!isDirect && group.activeItems.map(item => {
                          const inputKey = getActiveItemKey(group.catId, item.id, group.isSusulan, group.validDate, group.itemDate, item.itemNote);
                          const val = currentReport.formData[inputKey] || 0;
                          if (val === 0) return null;

                          return (
                            <div key={inputKey} className="flex w-full max-w-[450px] mb-0.5 pl-4 sm:pl-6">
                              <div className="flex-1 pr-2 font-normal">
                                 {item.name}
                              </div>
                              <span className="w-[40px] text-left">Rp.</span>
                              <span className="w-[100px] text-right">{formatRp(val)}</span>
                            </div>
                          );
                        })}
                        
                        <div className={`flex w-full font-bold ${isDirect ? '' : 'mt-1 pt-1'}`}>
                          <span className="flex-1 text-right pr-6">{isDirect ? 'Nominal' : 'Sub Total'}</span>
                          <span className="w-[40px] text-left">Rp.</span>
                          <span className="w-[120px] text-right">{formatRp(subtotals[group.groupId])}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex w-full mt-6 border-t border-b-2 border-black py-2 mb-6 font-bold text-[11pt]">
                 <span className="flex-1 text-right pr-6">Jumlah Total</span>
                 <span className="w-[40px] text-left">Rp.</span>
                 <span className="w-[120px] text-right">{formatRp(grandTotal)}</span>
              </div>

              <div className="mt-8 text-[11pt]">
                <p className="mb-4"><strong>Terbilang : </strong> <i className="capitalize">{terbilang(grandTotal)} rupiah</i></p>
                <p className="text-justify leading-relaxed">
                  Disetor uang kebendahara penerimaan hasil retribusi layanan masuk tempat rekreasi dan pemakaian fasilitas Pada hari {formatTanggalCetak(reportDate)} dengan STSU No. {computedStsuNo} dengan uang sebesar Rp. {formatRp(grandTotal)}
                </p>
              </div>

              <div className="flex justify-between mt-16 text-center text-[11pt]">
                <div className="w-[45%] flex flex-col justify-between">
                  <div>Mengetahui,<br/>{signatures.leftRole}</div>
                  <div className="mt-28 font-bold underline">({signatures.leftName})</div>
                </div>
                <div className="w-[45%] flex flex-col justify-between">
                  <div>{signatures.location}, {formatTanggalTtd(currentReport.signatureDate)}<br/>{signatures.rightRole}</div>
                  <div className="mt-24 font-bold underline">({signatures.rightName})</div>
                </div>
              </div>
            </div>

          ) : (

            <div id="printable-area-ncr" className="print-container bg-white mx-auto relative overflow-hidden shadow-lg border border-gray-300 print:border-none print:shadow-none" style={{ minHeight: '165mm', width: '210mm' }}>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-100 font-black text-6xl opacity-30 uppercase tracking-widest print:opacity-0 pointer-events-none -rotate-45 whitespace-nowrap">
                PREVIEW NCR DOT MATRIX
              </div>

              {selectedNcrGroup && (() => {
                 const ncrTotal = subtotals[selectedNcrGroup.groupId] || 0;
                 const isDirect = Array.isArray(selectedNcrGroup.activeItems) && selectedNcrGroup.activeItems.length === 1 && selectedNcrGroup.activeItems[0].id === 'direct';
                 
                 let itemsToPrint = selectedNcrGroup.activeItems.filter(i => {
                   const key = getActiveItemKey(selectedNcrGroup.catId, i.id, selectedNcrGroup.isSusulan, selectedNcrGroup.validDate, selectedNcrGroup.itemDate, i.itemNote);
                   return (currentReport.formData[key] || 0) > 0;
                 });

                 let ncrItemsString = '';
                 if (isDirect) {
                   const note = selectedNcrGroup.activeItems[0].itemNote;
                   ncrItemsString = note ? note.replace(/\n/g, ', ') : '';
                 } else {
                   ncrItemsString = itemsToPrint.map(i => {
                     let text = i.name;
                     if (i.itemNote) text += ` (${i.itemNote.replace(/\n/g, ' ')})`;
                     return text;
                   }).join(', ');
                 }

                 return (
                   <>
                      <div className="absolute font-bold" style={{ top: '37mm', left: '75mm' }}>
                        {getDayName(reportDate)}
                      </div>
                      <div className="absolute font-bold" style={{ top: '37mm', left: '110mm' }}>
                        {reportDate}
                      </div>

                      <div className="absolute font-bold text-center" style={{ top: '53mm', left: '75mm', width: '80mm' }}>
                        {selectedNcrGroup.name}
                      </div>

                      <div className="absolute" style={{ top: '58mm', left: '20mm', right: '10mm', lineHeight: '1.5' }}>
                         {ncrItemsString}
                      </div>

                      <div className="absolute" style={{ top: '69mm', left: '75mm' }}>
                        DARI : Seksi Pelayanan dan Informasi
                      </div>

                      <div className="absolute font-bold text-lg" style={{ top: '79mm', left: '75mm' }}>
                        {formatRp(ncrTotal)}
                      </div>

                      <div className="absolute italic font-bold capitalize" style={{ top: '84mm', left: '20mm', right: '10mm', lineHeight: '1.5' }}>
                        # {terbilang(ncrTotal)} rupiah #
                      </div>

                      <div className="absolute" style={{ top: '100mm', left: '130mm' }}>
                        {currentReport.signatureDate.split('-')[2]} {new Date(currentReport.signatureDate).toLocaleDateString('id-ID', {month: 'long'})} {currentReport.signatureDate.split('-')[0]}
                      </div>

                      {/* Baris 21: NOMINAL TOTAL (BAWAH) */}
                      <div className="absolute font-bold text-lg" style={{ top: '105mm', left: '130mm' }}>
                        {formatRp(ncrTotal)}
                      </div>

                      {/* Baris 27 & 28: NAMA & NIP PEJABAT */}
                      <div className="absolute w-full" style={{ top: '137mm', left: '0' }}>
                         <div className="flex justify-between w-full" style={{ paddingLeft: '15mm', paddingRight: '15mm' }}>
                            <div className="text-center w-[80mm]">
                              <div className="font-bold underline">{signatures.leftName}</div>
                              {signatures.leftNip ? <div>NIP {signatures.leftNip}</div> : <div>NIP ..............................</div>}
                            </div>
                            
                            <div className="text-center w-[80mm]">
                              <div className="font-bold underline">{signatures.rightName}</div>
                              {signatures.rightNip ? <div>NIP {signatures.rightNip}</div> : <div>NIP ..............................</div>}
                            </div>
                         </div>
                      </div>
                   </>
                 );
              })()}
            </div>

          )}

        </div>
      )}

    </div>
  );
}
