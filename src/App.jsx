import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock, Sparkles, Save, Database, ArrowRight } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
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

let isCanvasEnv = false;
let finalConfig = myFirebaseConfig;
try {
  // eslint-disable-next-line no-undef
  if (typeof __firebase_config !== 'undefined') {
    isCanvasEnv = true;
    // eslint-disable-next-line no-undef
    finalConfig = JSON.parse(__firebase_config);
  }
} catch (error) {
  // Abaikan error pada build environment
}

let app, auth, db;
try {
  app = initializeApp(finalConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

// --- MAPPING NAMA KATEGORI 3A (Sesuai Permintaan Bapak Fatah) ---
const NAME_MAPPING_3A = {
  "1": "Tiket Dewasa",
  "2": "Tiket Anak",
  "3": "Tiket Rombongan",
  "4": "Tiket Lainnya",
  "5": "Satwa Kuda",
  "6": "Satwa Unta",
  "7": "Satwa Gajah",
  "8": "Satwa TSA",
  "9": "Schmutzer Dewasa Biasa",
  "10": "Schmutzer Anak Biasa",
  "11": "Schmutzer Dewasa Libur",
  "12": "Schmutzer Anak Libur",
  "13": "Schmutzer Biasa (Lain)",
  "14": "Schmutzer Biasa (Extra)",
  "15": "Schmutzer Libur (Lain)",
  "16": "Schmutzer Libur (Extra)",
  "17": "Kendaraan Bus",
  "18": "Kendaraan Mobil",
  "19": "Kendaraan Motor",
  "20": "Kendaraan Sepeda",
  "21": "Kendaraan Lainnya"
};

// --- FUNGSI FORMATTING ---
function terbilang(angka) {
  angka = Math.floor(Math.abs(angka));
  if (angka === 0) return "nol";
  const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let divide = 0; let word = "";
  if (angka < 12) return huruf[angka];
  else if (angka < 20) return terbilang(angka - 10) + " belas";
  else if (angka < 100) { divide = Math.floor(angka / 10); word = huruf[divide] + " puluh"; let rem = angka % 10; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 200) { let rem = angka - 100; return rem > 0 ? "seratus " + terbilang(rem) : "seratus"; }
  else if (angka < 1000) { divide = Math.floor(angka / 100); word = huruf[divide] + " ratus"; let rem = angka % 100; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 2000) { let rem = angka - 1000; return rem > 0 ? "seribu " + terbilang(rem) : "seribu"; }
  else if (angka < 1000000) { divide = Math.floor(angka / 1000); word = terbilang(divide) + " ribu"; let rem = angka % 1000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 1000000000) { divide = Math.floor(angka / 1000000); word = terbilang(divide) + " juta"; let rem = angka % 1000000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 1000000000000) { divide = Math.floor(angka / 1000000000); word = terbilang(divide) + " miliar"; let rem = angka % 1000000000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  return "";
}

const formatRp = (angka) => { if (!angka) return "0"; return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
const getLocalYMD = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const getDayName = (dateStr) => { if (!dateStr) return ""; const d = new Date(dateStr); const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; return days[d.getDay()]; };

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
    } catch (err) { if (i === 4) throw new Error("Gagal menghubungi AI."); await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000)); }
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [resetDialog, setResetDialog] = useState({ isOpen: false, password: '', error: '', isVerifying: false });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editNoteModal, setEditNoteModal] = useState({ isOpen: false, group: null, item: null, newNote: '' });
  const [saveToast, setSaveToast] = useState({ show: false, message: '' }); 

  // --- STATE RUANG TRANSIT ---
  const [transitModal, setTransitModal] = useState({ isOpen: false, step: 1, ipAddress: '', isLoading: false, data: [], error: '' });

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
    const unsub = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setAuthReady(true); });
    return () => unsub();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setIsLoggingIn(true);
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err) { setLoginError('Akses Ditolak! Email atau Password salah.'); } 
    finally { setIsLoggingIn(false); }
  };

  const handleDemoLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setIsLoggingIn(true);
    try { await signInAnonymously(auth); } catch (err) { setLoginError('Gagal masuk mode demo: ' + err.message); } finally { setIsLoggingIn(false); }
  };

  const handleLogout = async () => { showConfirm("Anda yakin ingin keluar?", async () => { await signOut(auth); }); };

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
    { id: 'cat_1', name: 'pemakaian fasilitas', type: 'utama', items: [{ id: 'item_1a', name: 'Promo Penjualan Produk' }, { id: 'item_1b', name: 'Penempatan banner promosi' }, { id: 'item_1c', name: 'Panggung' }] },
    { id: 'cat_2', name: 'Retribusi Pedagang', type: 'utama', items: [{ id: 'item_2a', name: 'Retribusi pedagang Hari Biasa' }, { id: 'item_2b', name: 'Retribusi pedagang Hari Besar' }] },
    { id: 'cat_3', name: 'Pendapatan Retribusi Juru Foto', type: 'utama', items: [] },
    { id: 'cat_4', name: 'Penyediaan satwa jinak untuk berfoto', type: 'utama', items: [] },
    { id: 'cat_5', name: 'E-ticketing', type: 'utama', items: [{ id: 'item_5a', name: 'Dewasa' }, { id: 'item_5b', name: 'Anak' }, { id: 'item_5c', name: 'Taman Satwa Anak' }] },
    { id: 'cat_6', name: 'Ticket online', type: 'utama', items: [{ id: 'item_6a', name: 'Dewasa' }, { id: 'item_6b', name: 'Anak' }, { id: 'item_6c', name: 'Taman Satwa Anak' }] }
  ]));

  const [allReports, setAllReports] = useState(() => getInitialState('tmr_v19_allReports', {}));
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

  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem('tmr_v19_signatures', JSON.stringify(signatures)); }, [signatures]);
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem('tmr_v19_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem('tmr_v19_allReports', JSON.stringify(allReports)); }, [allReports]);

  const getDocRef = () => doc(db, 'tmr_data', 'rekapitulasi_laporan');

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
        setDbReady(true); setSyncStatus('synced');
      } catch (e) { setSyncStatus('offline'); }
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !dbReady || !db) return;
    setSyncStatus('syncing');
    const saveData = async () => {
      try { await setDoc(getDocRef(), { signatures, categories, allReports, lastUpdated: new Date().toISOString() }); setSyncStatus('synced'); } 
      catch(e) { setSyncStatus('offline'); }
    };
    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatures, categories, allReports, user, dbReady]);

  const handleForceSave = async () => {
    if (!user || !dbReady) return;
    setSyncStatus('syncing');
    try { await setDoc(getDocRef(), { signatures, categories, allReports, lastUpdated: new Date().toISOString() }); setSyncStatus('synced'); showToast('Data berhasil disimpan!'); } 
    catch(e) { setSyncStatus('offline'); }
  };

  const showToast = (message) => { setSaveToast({ show: true, message }); setTimeout(() => setSaveToast({ show: false, message: '' }), 3000); };
  const showConfirm = (message, onConfirmAction) => { setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction }); };

  const activeTypeKey = useMemo(() => {
    if (activeType === 'utama') return 'utama';
    return activeLainIndex === 1 ? 'lain' : `lain_${activeLainIndex}`;
  }, [activeType, activeLainIndex]);

  const currentReport = useMemo(() => {
    const dayData = allReports[reportDate] || {};
    const typeData = dayData[activeTypeKey] || {};
    return { sequence: typeData.sequence || '', signatureDate: typeData.signatureDate || reportDate, activeItems: Array.isArray(typeData.activeItems) ? typeData.activeItems : [], formData: typeData.formData || {} };
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
    setReportDate(newDateStr); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setIsAddingSusulan(false);
    setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleTypeSwitch = (type) => {
    setActiveType(type); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setIsAddingSusulan(false);
    setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault(); setResetDialog(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      updateCurrentReport({ sequence: '', signatureDate: reportDate, activeItems: [], formData: {} });
      setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false });
    } catch (error) { setResetDialog(prev => ({ ...prev, isVerifying: false, error: 'Password salah!' })); }
  };

  const getActiveItemKey = (catId, itemId, isSus, validDate, itemDate, itemNote) => {
    let key = `${catId}_${itemId}`;
    if (isSus) key += `_susulan_${validDate}`;
    if (itemDate) key += `_date_${itemDate}`;
    if (itemNote) { let hash = 0; for (let i = 0; i < itemNote.length; i++) { hash = ((hash << 5) - hash) + itemNote.charCodeAt(i); hash = hash & hash; } key += `_note_${Math.abs(hash)}`; }
    return key;
  };

  const handleAddActiveItem = () => {
    if (!selectedCatToAdd || !selectedItemToAdd) return;
    const newItem = { catId: selectedCatToAdd, itemId: selectedItemToAdd };
    if (activeType === 'utama' && isAddingSusulan) { if (!susulanValidDate) { showConfirm("Pilih Tanggal Validasi!", null); return; } newItem.isSusulan = true; newItem.validDate = susulanValidDate; }
    else if (activeType === 'lain') { if (lainItemDate) newItem.itemDate = lainItemDate; if (lainItemNote.trim()) newItem.itemNote = lainItemNote.trim(); }

    const inputKey = getActiveItemKey(newItem.catId, newItem.itemId, newItem.isSusulan, newItem.validDate, newItem.itemDate, newItem.itemNote);
    updateCurrentReport(prev => {
      const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
      const currentForm = prev.formData || {};
      if (currentItems.find(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === inputKey)) return prev;
      return { ...prev, activeItems: [...currentItems, newItem], formData: { ...currentForm, [inputKey]: 0 } };
    });
    setSelectedItemToAdd(''); setLainItemNote('');
  };

  const handleRemoveActiveItem = (itemToRemove) => {
    const inputKeyToRemove = getActiveItemKey(itemToRemove.catId, itemToRemove.itemId, itemToRemove.isSusulan, itemToRemove.validDate, itemToRemove.itemDate, itemToRemove.itemNote);
    updateCurrentReport(prev => {
      const newActive = prev.activeItems.filter(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) !== inputKeyToRemove);
      const newFormData = { ...(prev.formData || {}) }; delete newFormData[inputKeyToRemove];
      return { ...prev, activeItems: newActive, formData: newFormData };
    });
  };

  // ==========================================
  // 🔴 🔴 FUNGSI: HANDLE FETCH 3A (BOT API) 🔴 🔴
  // ==========================================
  const handleFetch3A = async (e) => {
    if (e) e.preventDefault();
    setTransitModal(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const ip = transitModal.ipAddress.trim().toLowerCase();
      let rawData;

      if (ip === 'demo') {
        await new Promise(r => setTimeout(r, 1200));
        // Contoh struktur data bot asli yang sudah diagregasi (Simulasi)
        rawData = {
          "GATE": { "1": 5000000, "2": 1500000, "17": 250000 },
          "TVM": { "1": 2000000, "18": 150000 },
          "MERCHANT_PAGE": { "5": 500000 }
        };
      } else {
        // Otomatisasi URL: http://[IP]:5000
        let targetHost = ip;
        if (!targetHost.includes(':')) targetHost += ':5000';
        const url = `http://${targetHost}/api/tarik_rekon_3a?tanggal=${reportDate}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Response Bot Error');
        rawData = await res.json();
      }

      // 🔴 LOGIKA AGREGASI (Menjumlahkan semua channel)
      const aggregatedTotals = {};
      Object.keys(rawData).forEach(channel => {
        Object.keys(rawData[channel]).forEach(index => {
          const amount = Number(rawData[channel][index]) || 0;
          aggregatedTotals[index] = (aggregatedTotals[index] || 0) + amount;
        });
      });

      // 🔴 LOGIKA AUTO-MAPPING
      const finalTransitData = Object.keys(aggregatedTotals).map(index => {
        const nameFromBot = NAME_MAPPING_3A[index] || `Indeks ${index}`;
        const totalAmount = aggregatedTotals[index];
        
        // Tebak Kategori STSU
        let guessCat = ''; let guessItem = '';
        if (Number(index) >= 1 && Number(index) <= 4) { guessCat = 'cat_6'; guessItem = index === '1' ? 'item_6a' : (index === '2' ? 'item_6b' : 'item_6c'); }
        else if (Number(index) >= 5 && Number(index) <= 8) { guessCat = 'cat_5'; guessItem = 'direct'; } // Contoh mapping lain

        return {
          id: `idx_${index}`,
          name3A: nameFromBot,
          amount: totalAmount,
          mappedCat: guessCat,
          mappedItem: guessItem
        };
      });

      setTransitModal(prev => ({ ...prev, step: 2, data: finalTransitData, isLoading: false }));
    } catch (err) {
      setTransitModal(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Koneksi Gagal! Pastikan Server_Robot_3A.exe sudah menyala di komputer lokal Bapak dan IP sudah benar.' 
      }));
    }
  };

  const confirmTransitInjection = () => {
    updateCurrentReport(prev => {
      const newItems = [...(prev.activeItems || [])];
      const newFormData = { ...(prev.formData || {}) };
      transitModal.data.forEach(t => {
        if (t.mappedCat && t.mappedItem) {
          const key = getActiveItemKey(t.mappedCat, t.mappedItem, isAddingSusulan, susulanValidDate, lainItemDate, lainItemNote);
          if (!newItems.find(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === key)) {
            newItems.push({ catId: t.mappedCat, itemId: t.mappedItem, isSusulan: isAddingSusulan, validDate: susulanValidDate, itemDate: lainItemDate, itemNote: lainItemNote });
          }
          newFormData[key] = (newFormData[key] || 0) + t.amount;
        }
      });
      return { ...prev, activeItems: newItems, formData: newFormData };
    });
    setTransitModal({ isOpen: false, step: 1, ipAddress: '', isLoading: false, data: [], error: '' });
    showToast('Data 3A Berhasil Disuntikkan!');
  };

  const computedStsuNo = useMemo(() => {
    const [y, m, d] = reportDate.split('-');
    const typeCode = activeType === 'lain' ? 'SU/L' : 'SU';
    return `${currentReport.sequence || '...'}/${d}/${m}/${typeCode}/${y}`;
  }, [reportDate, activeType, currentReport.sequence]);

  const activeGroups = useMemo(() => {
    const groups = [];
    categories.forEach((cat, idx) => {
      const itemsForCat = currentReport.activeItems.filter(ai => ai.catId === cat.id);
      if (itemsForCat.length === 0) return;
      
      const configs = [];
      itemsForCat.forEach(ai => {
        const key = activeType === 'utama' ? `sus_${ai.isSusulan}_${ai.validDate}` : `dt_${ai.itemDate}_nt_${ai.itemNote}`;
        if (!configs.find(c => c.key === key)) configs.push({ key, isSusulan: ai.isSusulan, validDate: ai.validDate, itemDate: ai.itemDate, itemNote: ai.itemNote });
      });

      configs.forEach(cfg => {
        const matched = itemsForCat.filter(ai => activeType === 'utama' ? (!!ai.isSusulan === !!cfg.isSusulan && ai.validDate === cfg.validDate) : (ai.itemDate === cfg.itemDate && ai.itemNote === cfg.itemNote));
        groups.push({
          groupId: `${cat.id}_${cfg.key}`, catId: cat.id, name: cat.name, isSusulan: cfg.isSusulan, validDate: cfg.validDate, 
          itemDate: cfg.itemDate, itemNote: cfg.itemNote, catIndex: idx,
          activeItems: matched.map(ai => ({ ...ai, id: ai.itemId, name: ai.itemId === 'direct' ? cat.name : cat.items?.find(i => i.id === ai.itemId)?.name || 'Item' }))
        });
      });
    });
    return groups.sort((a,b) => a.catIndex - b.catIndex);
  }, [categories, currentReport.activeItems, activeType]);

  const { subtotals, grandTotal } = useMemo(() => {
    let gt = 0; const subs = {};
    activeGroups.forEach(g => {
      let s = 0;
      g.activeItems.forEach(i => { const k = getActiveItemKey(g.catId, i.id, g.isSusulan, g.validDate, g.itemDate, i.itemNote); s += currentReport.formData[k] || 0; });
      subs[g.groupId] = s; gt += s;
    });
    return { subtotals: subs, grandTotal: gt };
  }, [currentReport.formData, activeGroups]);

  const getDaysArray = () => {
    const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const blanks = Array.from({length: firstDayIndex}, (_, i) => i);
    const days = Array.from({length: daysInMonth}, (_, i) => {
      const d = i + 1; const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = allReports[dateStr] || {};
      const utTotal = dayData.utama?.formData ? Object.values(dayData.utama.formData).reduce((s,v) => s + (Number(v)||0), 0) : 0;
      const lnDocs = [];
      Object.keys(dayData).forEach(k => { if (k === 'lain' || k.startsWith('lain_')) {
        const total = dayData[k].formData ? Object.values(dayData[k].formData).reduce((s,v) => s + (Number(v)||0),0) : 0;
        if ((dayData[k].activeItems || []).length > 0) lnDocs.push({ sequence: dayData[k].sequence || '', total });
      }});
      return { day: d, dateStr, hasUtama: (dayData.utama?.activeItems || []).length > 0, utamaTotal: utTotal, utamaSequence: dayData.utama?.sequence || '', lainDocs: lnDocs };
    });
    return { blanks, days };
  };
  const { blanks, days } = getDaysArray();

  if (!authReady) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">Menyiapkan Brankas Data...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-700 to-green-900 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><Lock size={32} className="text-green-600" /></div></div>
          <h1 className="text-2xl font-black text-center text-gray-800 mb-8">Sistem Rekap STSU</h1>
          {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex gap-2 border border-red-100"><AlertCircle size={18}/> {loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3" placeholder="Email / Username" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3" placeholder="Password" />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl">{isLoggingIn ? 'Memeriksa...' : 'Masuk Aplikasi'}</button>
            {isCanvasEnv && <button type="button" onClick={handleDemoLogin} className="w-full bg-blue-50 text-blue-700 font-bold py-3.5 rounded-xl border border-blue-200 mt-2">Masuk Mode Demo</button>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 pb-36 relative">
      <style>{`@media print {.no-print { display: none !important; }.print-container { width: 100%; font-family: 'Times New Roman'; font-size: 11pt; color: black; border: none !important; }@page { margin: 15mm; }}`}</style>
      {saveToast.show && <div className="fixed top-20 right-4 z-[9999] bg-green-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5"> <CheckCircle size={20} /> <div className="font-bold text-sm">{saveToast.message}</div></div>}

      {/* --- TRANSIT MODAL --- */}
      {transitModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden ${transitModal.step === 1 ? 'max-w-md' : 'max-w-4xl max-h-[90vh]'}`}>
            <div className="bg-blue-800 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3"><Database size={24} /><div><h3 className="font-bold text-lg">Server Robot 3A</h3><p className="text-xs text-blue-200">Port 5000 - Agregasi Channel</p></div></div>
              <button onClick={() => setTransitModal({ isOpen: false, step: 1, ipAddress: '', isLoading: false, data: [], error: '' })}>✕</button>
            </div>
            <div className="p-6 bg-gray-50 flex-1 overflow-y-auto">
              {transitModal.step === 1 ? (
                <form onSubmit={handleFetch3A} className="space-y-4">
                  {transitModal.error && <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm flex gap-2"><AlertCircle size={18}/>{transitModal.error}</div>}
                  <input type="text" value={transitModal.ipAddress} onChange={(e) => setTransitModal(prev => ({...prev, ipAddress: e.target.value}))} placeholder="Masukkan IP (Misal: 127.0.0.1)" className="w-full border rounded-xl p-3 font-bold" required autoFocus />
                  <button type="submit" disabled={transitModal.isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"> {transitModal.isLoading ? <RefreshCw className="animate-spin" /> : <Database />} {transitModal.isLoading ? 'Menarik Data Robot...' : 'Tarik Data 3A (Port 5000)'} </button>
                </form>
              ) : (
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gray-200 p-3 rounded-lg font-bold text-xs uppercase hidden md:grid">
                      <div className="col-span-5">Data Bot (GATE+TVM+WEB)</div> <div className="col-span-7">Mapping Kategori STSU</div>
                   </div>
                   <div className="divide-y divide-gray-100 bg-white rounded-xl border overflow-hidden">
                     {transitModal.data.map(item => (
                       <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center">
                         <div className="col-span-5 flex flex-col"><span className="font-bold text-sm">{item.name3A}</span><span className="text-blue-600 font-black text-lg">Rp {formatRp(item.amount)}</span></div>
                         <div className="col-span-7 flex gap-2">
                           <select value={item.mappedCat} onChange={(e) => { const nc = e.target.value; setTransitModal(prev => ({...prev, data: prev.data.map(d => d.id === item.id ? {...d, mappedCat: nc, mappedItem: ''} : d)})); }} className="flex-1 border rounded p-2 text-sm">
                             <option value="">Kategori...</option> {categories.filter(c => c.type === activeType).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                           <select value={item.mappedItem} disabled={!item.mappedCat} onChange={(e) => { const ni = e.target.value; setTransitModal(prev => ({...prev, data: prev.data.map(d => d.id === item.id ? {...d, mappedItem: ni} : d)})); }} className="flex-1 border rounded p-2 text-sm">
                             <option value="">Item...</option> {item.mappedCat && (categories.find(c => c.id === item.mappedCat).items.length === 0 ? <option value="direct">Isi Nominal</option> : categories.find(c => c.id === item.mappedCat).items.map(s => <option key={s.id} value={s.id}>{s.name}</option>))}
                           </select>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
            {transitModal.step === 2 && <div className="bg-white p-4 border-t flex justify-between"> <button onClick={() => setTransitModal(p => ({...p, step: 1}))} className="px-5 py-2.5 font-bold">Kembali</button> <button onClick={confirmTransitInjection} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2"><Save size={18}/> Injeksi ke STSU</button></div>}
          </div>
        </div>
      )}

      {/* --- CONFIRM DIALOG --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full"><h3 className="font-bold text-xl mb-4">Konfirmasi</h3><p className="text-gray-600 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end"><button onClick={() => setConfirmDialog({isOpen: false})} className="px-5 py-2.5 font-bold">Batal</button><button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({isOpen: false}); }} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl">Lanjutkan</button></div>
          </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <nav className="bg-green-700 text-white shadow-md sticky top-0 z-50 no-print h-16 flex items-center">
        <div className="max-w-5xl mx-auto px-4 w-full flex justify-between items-center">
          <div className="font-bold flex items-center gap-2"><Calculator /> Sistem Rekap STSU <span className="bg-green-800 text-[10px] px-2 py-1 rounded ml-2">{syncStatus === 'synced' ? 'CLOUD READY' : 'OFFLINE'}</span></div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded ${activeTab === 'dashboard' ? 'bg-green-800' : ''}`}><Calendar size={20}/></button>
            <button onClick={() => setActiveTab('input')} className={`p-2 rounded ${activeTab === 'input' ? 'bg-green-800' : ''}`}><Edit size={20}/></button>
            <button onClick={() => setActiveTab('settings')} className={`p-2 rounded ${activeTab === 'settings' ? 'bg-green-800' : ''}`}><Settings size={20}/></button>
            <button onClick={handleLogout} className="p-2 rounded hover:bg-red-600"><LogOut size={20}/></button>
          </div>
        </div>
      </nav>

      {/* === TAB DASHBOARD === */}
      {activeTab === 'dashboard' && (
        <div className="max-w-4xl mx-auto p-4 no-print">
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="bg-green-700 p-6 text-white text-center"><h2 className="text-xl font-bold">Dashboard STSU</h2></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                 <button onClick={prevMonth} className="p-2 border rounded"><ChevronLeft/></button>
                 <span className="font-bold uppercase">{calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                 <button onClick={nextMonth} className="p-2 border rounded"><ChevronRight/></button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map(d => <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>)}
                {blanks.map(b => <div key={b} className="h-28 bg-gray-50 rounded-xl"></div>)}
                {days.map(d => (
                  <button key={d.day} onClick={() => handleDateChange(d.dateStr)} className={`h-28 border rounded-xl flex flex-col p-1 transition-all ${d.dateStr === reportDate ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                    <span className={`text-sm font-bold ${d.dateStr === getLocalYMD() ? 'text-blue-600' : ''}`}>{d.day}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto no-scrollbar pb-1">
                      {d.hasUtama && <div className="bg-green-500 text-white text-[8px] p-0.5 rounded flex justify-between"><span>SU</span> <span>{formatRp(d.utamaTotal)}</span></div>}
                      {d.lainDocs.map((l, i) => <div key={i} className="bg-purple-500 text-white text-[8px] p-0.5 rounded flex justify-between"><span>SU/L</span> <span>{formatRp(l.total)}</span></div>)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB INPUT === */}
      {activeTab === 'input' && (
        <div className="max-w-4xl mx-auto p-4 no-print space-y-6">
          <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-2xl shadow">
             <button onClick={() => handleTypeSwitch('utama')} className={`py-3 rounded-xl font-bold ${activeType === 'utama' ? 'bg-green-600 text-white' : 'bg-gray-50'}`}>STSU PENDAPATAN</button>
             <button onClick={() => handleTypeSwitch('lain')} className={`py-3 rounded-xl font-bold ${activeType === 'lain' ? 'bg-purple-600 text-white' : 'bg-gray-50'}`}>STSU LAIN-LAIN</button>
          </div>

          <button onClick={() => setTransitModal(p => ({...p, isOpen: true}))} className="w-full bg-blue-600 text-white py-4 rounded-2xl shadow-lg font-bold flex items-center justify-center gap-3">
             <Database /> Tarik Data dari Server 3A (Bot Lokal)
          </button>

          <div className="bg-white p-6 rounded-2xl shadow border grid grid-cols-1 md:grid-cols-4 gap-4">
             <div><label className="text-[10px] font-bold text-gray-400">TGL LAPORAN</label><input type="date" value={reportDate} onChange={e => handleDateChange(e.target.value)} className="w-full border rounded p-2 font-bold" /></div>
             <div><label className="text-[10px] font-bold text-gray-400">NO STSU</label><input type="text" value={currentReport.sequence} onChange={handleSequenceChange} className="w-full border rounded p-2 font-bold text-center" /></div>
             <div className="md:col-span-2 bg-gray-50 p-2 rounded-xl border-dashed border-2 flex flex-col justify-center items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">GRAND TOTAL STSU</span>
                <span className="text-2xl font-black text-green-700">Rp {formatRp(grandTotal)}</span>
             </div>
          </div>

          <div className="bg-green-50 p-6 rounded-2xl border border-green-200 space-y-4">
             <h3 className="font-bold text-green-800 flex items-center gap-2"><Plus size={18}/> TAMBAH DATA</h3>
             <div className="grid grid-cols-2 gap-2">
                <select value={selectedCatToAdd} onChange={e => handleCatChange(e.target.value)} className="border rounded p-2.5 text-sm">
                   <option value="">Pilih Kategori...</option> {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={selectedItemToAdd} disabled={!selectedCatToAdd} onChange={e => setSelectedItemToAdd(e.target.value)} className="border rounded p-2.5 text-sm">
                   <option value="">Pilih Item...</option> {availableItemsToAdd.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
             </div>
             {activeType === 'lain' && <textarea value={lainItemNote} onChange={e => setLainItemNote(e.target.value)} placeholder="Keterangan dinamis..." className="w-full border rounded p-2 text-sm h-16" />}
             <button onClick={handleAddActiveItem} disabled={!selectedCatToAdd || !selectedItemToAdd} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md">Add Transaksi</button>
          </div>

          <div className="space-y-4">
             {activeGroups.map((g, idx) => (
               <div key={g.groupId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="bg-gray-50 p-4 border-b font-bold flex justify-between items-center uppercase text-xs tracking-wider">
                   <span>{idx + 1}. {g.name}</span>
                   <span className="text-green-700">SUB: Rp {formatRp(subtotals[g.groupId])}</span>
                 </div>
                 <div className="p-4 space-y-3">
                    {g.activeItems.map(item => {
                      const key = getActiveItemKey(g.catId, item.id, g.isSusulan, g.validDate, g.itemDate, item.itemNote);
                      return (
                        <div key={key} className="flex items-center gap-3 border-b pb-3 last:border-0">
                           <button onClick={() => handleRemoveActiveItem(item)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash size={18}/></button>
                           <div className="flex-1">
                              <div className="text-sm font-bold text-gray-700">{item.name}</div>
                              {item.itemNote && <div className="text-[10px] text-purple-600 italic">"{item.itemNote}"</div>}
                           </div>
                           <div className="relative w-40">
                              <span className="absolute left-2 top-2 text-[10px] font-bold text-gray-400">Rp</span>
                              <input type="text" value={currentReport.formData[key] ? formatRp(currentReport.formData[key]) : ''} onChange={e => handleInputChange(key, e.target.value)} className="w-full border rounded p-2 text-right font-black" />
                           </div>
                        </div>
                      )
                    })}
                 </div>
               </div>
             ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-2xl z-40">
             <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400">GRAND TOTAL</span><span className="text-xl font-black text-green-700">Rp {formatRp(grandTotal)}</span></div>
             <div className="flex gap-2">
                <button onClick={handleForceSave} className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Save/></button>
                <button onClick={() => setActiveTab('print')} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"><Printer size={18}/> CETAK LAPORAN</button>
             </div>
          </div>
        </div>
      )}

      {/* === TAB CETAK === */}
      {activeTab === 'print' && (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
           <div className="bg-white p-4 rounded-xl shadow border no-print flex justify-between items-center">
              <button onClick={() => setActiveTab('input')} className="font-bold text-gray-500">KEMBALI EDIT</button>
              <div className="flex gap-2">
                 <button onClick={handlePrint} className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg flex items-center gap-2"><Printer size={18}/> CETAK PRINTER</button>
              </div>
           </div>

           <div id="printable-area" className="print-container bg-white p-12 min-h-[297mm] mx-auto shadow-xl border border-gray-100">
              <div className="font-bold underline mb-8">No. {computedStsuNo}</div>
              <div className="mb-6">Diterima uang hasil pendapatan {formatTanggalCetak(reportDate)} sebagai berikut;</div>
              <div className="space-y-4">
                {activeGroups.map((g, idx) => (
                  <div key={g.groupId} className="pb-2">
                    <div className="font-bold mb-1">{idx+1}. Diterima uang hasil pendapatan {g.name} {g.itemNote ? `(${g.itemNote})` : ''} sebagai berikut :</div>
                    {g.activeItems.length > 1 && g.activeItems.map(item => {
                       const key = getActiveItemKey(g.catId, item.id, g.isSusulan, g.validDate, g.itemDate, item.itemNote);
                       if (!currentReport.formData[key]) return null;
                       return (
                         <div key={key} className="flex w-full pl-8 max-w-md">
                           <span className="flex-1">{item.name}</span>
                           <span className="w-10 text-left">Rp.</span>
                           <span className="w-32 text-right">{formatRp(currentReport.formData[key])}</span>
                         </div>
                       )
                    })}
                    <div className="flex w-full font-bold mt-1">
                       <span className="flex-1 text-right pr-8">{g.activeItems.length > 1 ? 'Sub Total' : 'Nominal'}</span>
                       <span className="w-10 text-left">Rp.</span>
                       <span className="w-32 text-right">{formatRp(subtotals[g.groupId])}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex w-full border-t-2 border-b-2 border-black font-bold py-2 mt-6">
                <span className="flex-1 text-right pr-8 text-lg">JUMLAH TOTAL</span>
                <span className="w-10 text-left">Rp.</span>
                <span className="w-32 text-right text-lg">{formatRp(grandTotal)}</span>
              </div>
              <div className="mt-8 text-sm italic"><strong>Terbilang : </strong> {terbilang(grandTotal)} rupiah</div>
              <div className="flex justify-between mt-16 text-center">
                 <div className="w-1/3 flex flex-col justify-between">
                    <div>Mengetahui,<br/>{signatures.leftRole}</div>
                    <div className="mt-20 font-bold underline">({signatures.leftName})</div>
                 </div>
                 <div className="w-1/3 flex flex-col justify-between">
                    <div>{signatures.location}, {formatTanggalTtd(currentReport.signatureDate)}<br/>{signatures.rightRole}</div>
                    <div className="mt-20 font-bold underline">({signatures.rightName})</div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
