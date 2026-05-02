import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock, Sparkles, Save, Database, ArrowRight, CloudDownload } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ==========================================
// 🔴 KONFIGURASI DATABASE FIREBASE
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
} catch (error) {}

let app, auth, db;
try {
  app = initializeApp(finalConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

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
  else if (angka < 1000) { divide = Math.floor(angka / 100); word = huruf[divide] + " ratus"; let rem = angka % 1000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 2000) { let rem = angka - 1000; return rem > 0 ? "seribu " + terbilang(rem) : "seribu"; }
  else if (angka < 1000000) { divide = Math.floor(angka / 1000); word = terbilang(divide) + " ribu"; let rem = angka % 1000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 1000000000) { divide = Math.floor(angka / 1000000); word = terbilang(divide) + " juta"; let rem = angka % 1000000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  else if (angka < 1000000000000) { divide = Math.floor(angka / 1000000000); word = terbilang(divide) + " miliar"; let rem = angka % 1000000000; return rem > 0 ? word + " " + terbilang(rem) : word; }
  return "";
}

const formatRp = (angka) => {
  if (!angka) return "0";
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getLocalYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDayName = (dateStr) => {
  if (!dateStr) return "";
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(dateStr).getDay()];
};

// ==========================================
// 🔴 KOMPONEN DRAGGABLE UNTUK MODE CETAK NCR
// ==========================================
const DraggableElement = ({ defaultTop, defaultLeft, children, className }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setStartPos({
      x: clientX - pos.x,
      y: clientY - pos.y
    });
    e.stopPropagation();
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setPos({
        x: clientX - startPos.x,
        y: clientY - startPos.y
      });
    };
    const handlePointerUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove, { passive: false });
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, startPos]);

  return (
    <div
      className={`absolute cursor-move hover:outline hover:outline-1 hover:outline-blue-400 hover:bg-blue-50/20 print:hover:outline-none print:hover:bg-transparent ${className || ''}`}
      style={{ top: defaultTop, left: defaultLeft, transform: `translate(${pos.x}px, ${pos.y}px)`, touchAction: 'none' }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      {children}
    </div>
  );
};

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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [resetDialog, setResetDialog] = useState({ isOpen: false, password: '', error: '', isVerifying: false });
  const [pdfLoading, setPdfLoading] = useState(false);

  const [editNoteModal, setEditNoteModal] = useState({ isOpen: false, group: null, item: null, newNote: '' });
  const [saveToast, setSaveToast] = useState({ show: false, message: '' }); 

  // --- STATE RUANG TRANSIT ---
  const [transitModal, setTransitModal] = useState({ 
    isOpen: false, step: 'confirm_date', source: '3a', // '3a' or 'iwm'
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
    const initAuth = async () => {
      // eslint-disable-next-line no-undef
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          // eslint-disable-next-line no-undef
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          console.error("Auth Token Error", e);
        }
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(''); setIsLoggingIn(true);
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err) { setLoginError('Akses Ditolak! Email atau Password salah.'); } 
    finally { setIsLoggingIn(false); }
  };

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    setLoginError(''); setIsLoggingIn(true);
    try { await signInAnonymously(auth); } 
    catch (err) { setLoginError('Gagal masuk mode demo: ' + err.message); } 
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
    { id: 'cat_3', name: 'E-Ticketing New Gate', type: 'utama', items: [{ id: 'item_3a', name: 'Tiket Masuk Dewasa' }, { id: 'item_3b', name: 'Tiket Masuk Anak' }, { id: 'item_3c', name: 'Taman Satwa Anak' }, { id: 'item_3d', name: 'Pusat Primata (Hari Biasa)' }, { id: 'item_3e', name: 'Pusat Primata (Weekend)' }, { id: 'item_3f', name: 'Kendaraan Motor' }, { id: 'item_3g', name: 'Kendaraan Gol 3 / Mobil' }, { id: 'item_3h', name: 'Kendaraan Gol 2' }, { id: 'item_3i', name: 'Kendaraan Gol 1' }, { id: 'item_3j', name: 'Kendaraan Sepeda' }, { id: 'item_3k', name: 'Rombongan' }] },
    { id: 'cat_4', name: 'Ticket Online', type: 'utama', items: [{ id: 'item_4a', name: 'Tiket Masuk Dewasa' }, { id: 'item_4b', name: 'Tiket Masuk Anak' }, { id: 'item_4c', name: 'Taman Satwa Anak' }, { id: 'item_4d', name: 'Pusat Primata (Hari Biasa)' }, { id: 'item_4e', name: 'Pusat Primata (Weekend)' }, { id: 'item_4f', name: 'Kendaraan Motor' }, { id: 'item_4g', name: 'Kendaraan Gol 3 / Mobil' }] },
    { id: 'cat_5', name: 'Ticket Vending Machine (TVM)', type: 'utama', items: [{ id: 'item_5a', name: 'Tiket Masuk Dewasa' }, { id: 'item_5b', name: 'Tiket Masuk Anak' }, { id: 'item_5c', name: 'Taman Satwa Anak' }] },
    { id: 'cat_6', name: 'E-Ticketing Old Gate', type: 'utama', items: [{ id: 'item_6a', name: 'Tiket Masuk Dewasa' }, { id: 'item_6b', name: 'Tiket Masuk Anak' }, { id: 'item_6c', name: 'Taman Satwa Anak' }, { id: 'item_6d', name: 'Pusat Primata Dewasa (Hari Biasa)' }, { id: 'item_6e', name: 'Pusat Primata Anak (Hari Biasa)' }, { id: 'item_6f', name: 'Pusat Primata Dewasa (Weekend)' }, { id: 'item_6g', name: 'Pusat Primata Anak (Weekend)' }, { id: 'item_6h', name: 'Kendaraan Motor' }, { id: 'item_6i', name: 'Kendaraan Gol 3 / Mobil' }, { id: 'item_6j', name: 'Kendaraan Gol 2' }, { id: 'item_6k', name: 'Kendaraan Gol 1' }, { id: 'item_6l', name: 'Kendaraan Sepeda' }, { id: 'item_6m', name: 'Rombongan' }] }
  ]));

  const [allReports, setAllReports] = useState(() => getInitialState('tmr_v19_allReports', {}));
  const [apiIpAddress, setApiIpAddress] = useState(() => getInitialState('tmr_v19_api_ip', 'localhost'));

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
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem('tmr_v19_api_ip', JSON.stringify(apiIpAddress)); }, [apiIpAddress]);

  const getDocRef = () => { return doc(db, 'tmr_data', user ? user.uid : 'demo_rekapitulasi_laporan'); };

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
    try { await setDoc(getDocRef(), { signatures, categories, allReports, lastUpdated: new Date().toISOString() }); setSyncStatus('synced'); showToast('Data berhasil disimpan ke Cloud!'); } 
    catch(e) { setSyncStatus('offline'); }
  };

  const showToast = (message) => { setSaveToast({ show: true, message }); setTimeout(() => setSaveToast({ show: false, message: '' }), 3000); };
  const showConfirm = (message, onConfirmAction) => { setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction }); };

  const activeTypeKey = useMemo(() => { return activeType === 'utama' ? 'utama' : (activeLainIndex === 1 ? 'lain' : `lain_${activeLainIndex}`); }, [activeType, activeLainIndex]);

  const lainDocIndices = useMemo(() => {
    const dayData = allReports[reportDate] || {}; const indices = [1]; 
    Object.keys(dayData).forEach(k => { if (k.startsWith('lain_')) { const num = parseInt(k.split('_')[1], 10); if (!isNaN(num) && !indices.includes(num)) indices.push(num); } });
    return indices.sort((a, b) => a - b);
  }, [allReports, reportDate]);

  const handleAddLainDoc = () => {
    const nextIndex = Math.max(...lainDocIndices) + 1; const nextKey = `lain_${nextIndex}`;
    setAllReports(prev => ({ ...prev, [reportDate]: { ...(prev[reportDate] || {}), [nextKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} } } }));
    setActiveLainIndex(nextIndex); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setLainItemDate(''); setLainItemNote('');
  };

  const handleRemoveLainDoc = (indexToRemove) => {
    showConfirm(`Hapus Dokumen Ke-${indexToRemove}? Semua data di dalam dokumen ini akan ikut terhapus.`, () => {
      setAllReports(prev => { const dayData = { ...(prev[reportDate] || {}) }; const keyToRemove = indexToRemove === 1 ? 'lain' : `lain_${indexToRemove}`; delete dayData[keyToRemove]; return { ...prev, [reportDate]: dayData }; });
      if (activeLainIndex === indexToRemove) setActiveLainIndex(1);
    });
  };

  const currentReport = useMemo(() => {
    const typeData = (allReports[reportDate] || {})[activeTypeKey] || {};
    return { sequence: typeData.sequence || '', signatureDate: typeData.signatureDate || reportDate, activeItems: Array.isArray(typeData.activeItems) ? typeData.activeItems : [], formData: typeData.formData || {} };
  }, [allReports, reportDate, activeTypeKey]);

  const updateCurrentReport = (updater) => {
    setAllReports(prev => {
      const dayData = prev[reportDate] || {}; const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
      const updatedTypeData = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
      return { ...prev, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    });
  };

  const handleSequenceChange = (e) => updateCurrentReport({ sequence: e.target.value });
  const handleSignatureDateChange = (e) => updateCurrentReport({ signatureDate: e.target.value });

  const handleDateChange = (newDateStr) => {
    setReportDate(newDateStr); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setIsAddingSusulan(false); setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleTypeSwitch = (type) => {
    setActiveType(type); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setIsAddingSusulan(false); setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const clearCurrentReport = () => { setResetDialog({ isOpen: true, password: '', error: '', isVerifying: false }); };

  const handleConfirmReset = async (e) => {
    e.preventDefault(); setResetDialog(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      updateCurrentReport({ sequence: '', signatureDate: reportDate, activeItems: [], formData: {} });
      setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false });
    } catch (error) { setResetDialog(prev => ({ ...prev, isVerifying: false, error: 'Password salah! Penghapusan dibatalkan.' })); }
  };

  const filteredCategories = useMemo(() => { return Array.isArray(categories) ? categories.filter(c => c.type === activeType) : []; }, [categories, activeType]);

  const handleCatChange = (catId) => {
    setSelectedCatToAdd(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedItemToAdd('direct'); else setSelectedItemToAdd('');
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
    if (activeType === 'utama' && isAddingSusulan) { if (!susulanValidDate) { showConfirm("Mohon pilih Tanggal Validasi untuk pendapatan susulan!", null); return; } newItem.isSusulan = true; newItem.validDate = susulanValidDate; }
    else if (activeType === 'lain') { if (lainItemDate) newItem.itemDate = lainItemDate; if (lainItemNote.trim()) newItem.itemNote = lainItemNote.trim(); }

    const inputKey = getActiveItemKey(newItem.catId, newItem.itemId, newItem.isSusulan, newItem.validDate, newItem.itemDate, newItem.itemNote);
    updateCurrentReport(prev => {
      const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
      if (currentItems.find(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === inputKey)) return prev;
      return { ...prev, activeItems: [...currentItems, newItem], formData: { ...(prev.formData || {}), [inputKey]: 0 } };
    });
    
    const cat = categories.find(c => c.id === selectedCatToAdd);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedCatToAdd('');
    setSelectedItemToAdd(''); setLainItemNote('');
    setTimeout(() => { if (typeof document !== 'undefined') { const inputElement = document.getElementById(`input_${inputKey}`); if (inputElement) inputElement.focus(); } }, 100);
  };

  const handleRemoveActiveItem = (itemToRemove) => {
    const keyToRemove = getActiveItemKey(itemToRemove.catId, itemToRemove.itemId, itemToRemove.isSusulan, itemToRemove.validDate, itemToRemove.itemDate, itemToRemove.itemNote);
    updateCurrentReport(prev => {
      const newActive = (prev.activeItems || []).filter(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) !== keyToRemove);
      const newFormData = { ...(prev.formData || {}) }; delete newFormData[keyToRemove];
      return { ...prev, activeItems: newActive, formData: newFormData };
    });
  };

  const handleInputChange = (inputKey, value) => {
    const rawValue = value.replace(/[^0-9]/g, '');
    updateCurrentReport(prev => ({ ...prev, formData: { ...(prev.formData || {}), [inputKey]: Number(rawValue) || 0 } }));
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
      updateCurrentReport(prev => {
        const newActive = (prev.activeItems || []).map(i => {
          if (i.catId === group.catId && i.itemId === (item.itemId || item.id) && !!i.isSusulan === !!group.isSusulan && (i.validDate || '') === (group.validDate || '') && (i.itemDate || '') === (group.itemDate || '') && (i.itemNote || '') === oldNote) return { ...i, itemNote: trimmedNew };
          return i;
        });
        const newFormData = { ...(prev.formData || {}) };
        if (newFormData[oldKey] !== undefined) { newFormData[newKey] = newFormData[oldKey]; delete newFormData[oldKey]; }
        return { ...prev, activeItems: newActive, formData: newFormData };
      });
    }
    setEditNoteModal({ isOpen: false, group: null, item: null, newNote: '' });
  };

  // ==========================================
  // 🔴 FUNGSI: MENGAMBIL DATA DARI BOT PYTHON
  // ==========================================
  const handleOpenTransit3A = () => {
    setTransitModal({
      isOpen: true, step: 'confirm_date', source: '3a', targetDate: reportDate,
      isLoading: false, data: [], error: '', isOverwriting: false, iwmDiskon: []
    });
  };

  const handleOpenTransitIWM = () => {
    setTransitModal({
      isOpen: true, step: 'confirm_date', source: 'iwm', targetDate: reportDate,
      isLoading: false, data: [], error: '', isOverwriting: false, iwmDiskon: []
    });
  };

  const closeTransitModal = () => {
    setTransitModal(prev => ({ ...prev, isOpen: false, iwmDiskon: [] }));
  };

  const getPrimataLabel = (amount) => {
    if (!amount || amount <= 0) return "";
    const isHariBiasa = amount % 6000 === 0;
    const isWeekend = amount % 7500 === 0;
    if (isHariBiasa && !isWeekend) return " (Hari Biasa)";
    if (isWeekend && !isHariBiasa) return " (Weekend)";
    if (isHariBiasa && isWeekend) return " (Hari Biasa / Weekend)";
    return "";
  };

  // --- Fungsi AI Matcher Internal (Pencocokan Cerdas) ---
  const smartMappingAI = (nameAPI, apiSource) => {
    let guessCat = '';
    let guessItem = '';
    const lowerName = (nameAPI || '').toLowerCase();

    // 1. CARI KATEGORI (BERDASARKAN KEYWORD API)
    if (apiSource === 'iwm') {
      const cat = categories.find(c => c.name.toLowerCase().includes('old gate') || c.name.toLowerCase().includes('iwm'));
      if (cat) guessCat = cat.id;
    } else {
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

    // 2. CARI SUB KATEGORI MENGGUNAKAN SCORING SYSTEM (AI Logic)
    if (guessCat) {
      const targetCat = categories.find(c => c.id === guessCat);
      if (targetCat && targetCat.items && targetCat.items.length > 0) {
        let bestScore = 0;
        
        targetCat.items.forEach(sub => {
          const subName = sub.name.toLowerCase();
          let score = 0;
          
          // NORMALISASI: Ubah angka Romawi dan potensi Typo menjadi standar
          const normApiName = lowerName
            .replace(/sepededa/g, 'sepeda')
            .replace(/gol iii/g, 'gol 3')
            .replace(/gol ii/g, 'gol 2')
            .replace(/gol i\b/g, 'gol 1');
            
          const normSubName = subName
            .replace(/sepededa/g, 'sepeda')
            .replace(/gol iii/g, 'gol 3')
            .replace(/gol ii/g, 'gol 2')
            .replace(/gol i\b/g, 'gol 1');
          
          // Deteksi Kata Kunci Umum
          const isDewasa = normApiName.includes('dewasa');
          const isAnak = normApiName.includes('anak');
          const isTSA = normApiName.includes('satwa') || normApiName.includes('tsa') || normApiName.includes('children');
          const isRombongan = normApiName.includes('rombongan') || normApiName.includes('romb');
          const isPrimata = normApiName.includes('primata') || normApiName.includes('schmutzer');
          const isWD = normApiName.includes('wd') || normApiName.includes('biasa') || normApiName.includes('hari biasa');
          const isWE = normApiName.includes('we') || normApiName.includes('libur') || normApiName.includes('besar') || normApiName.includes('weekend');
          
          // Penilaian Tepat Sasaran
          if (isDewasa && normSubName.includes('dewasa')) score += 10;
          if (isAnak && normSubName.includes('anak') && !isTSA && !normSubName.includes('satwa')) score += 10; 
          if (isTSA && (normSubName.includes('satwa') || normSubName.includes('children'))) score += 15;
          if (isRombongan && normSubName.includes('rombongan')) score += 15;
          if (isPrimata && (normSubName.includes('primata') || normSubName.includes('schmutzer'))) score += 10;

          // Bobot ekstra untuk WD / WE pada Pusat Primata
          if (isWD && (normSubName.includes('wd') || normSubName.includes('biasa') || normSubName.includes('weekday'))) score += 5;
          if (isWE && (normSubName.includes('we') || normSubName.includes('libur') || normSubName.includes('besar') || normSubName.includes('weekend'))) score += 5;

          // Kendaraan
          if (normApiName.includes('sepeda') && normSubName.includes('sepeda')) score += 30;
          if (normApiName.includes('motor') && normSubName.includes('motor')) score += 30;
          if (normApiName.includes('gol 1') && normSubName.includes('gol 1')) score += 30;
          if (normApiName.includes('gol 2') && normSubName.includes('gol 2')) score += 30;
          
          const isApiMobilOrGol3 = normApiName.includes('gol 3') || normApiName.includes('mobil');
          const isSubMobilOrGol3 = normSubName.includes('gol 3') || normSubName.includes('mobil');
          if (isApiMobilOrGol3 && isSubMobilOrGol3) score += 30;

          if (score > bestScore) {
            bestScore = score;
            guessItem = sub.id;
          }
        });
      }
    }

    return { mappedCat: guessCat, mappedItem: guessItem };
  };

  const executeFetchData = async (isOverwrite) => {
    setTransitModal(prev => ({ ...prev, step: 'loading', isOverwriting: isOverwrite, error: '' }));
    
    try {
      let fetchedData = [];
      let diskonData = [];
      const ip = apiIpAddress.trim().toLowerCase();
      const targetDate = transitModal.targetDate;
      const source = transitModal.source;

      const stsuNames3A = {
        "1": "Karcis Dewasa", "2": "Karcis Anak", "3": "Romb. Dewasa 25%", "4": "Romb. Anak 25%",
        "5": "Kuda Tunggang", "6": "Unta Tunggang", "7": "Gajah Tunggang", "8": "Taman Satwa Anak",
        "9": "Schmutzer WD Dewasa", "10": "Schmutzer WD Anak", "11": "Schmutzer Romb WD Dws", "12": "Schmutzer Romb WD Ank",
        "13": "Schmutzer WE Dewasa", "14": "Schmutzer WE Anak", "15": "Schmutzer Romb WE Ank", "16": "Schmutzer Romb WE Dws",
        "17": "Parkir Gol I (Bus Besar)", "18": "Parkir Gol II (Bus Kecil)", "19": "Parkir Gol III (Mobil)", "20": "Parkir Motor", "21": "Parkir Sepeda"
      };

      if (source === '3a') {
        if (ip === 'demo') {
          await new Promise(r => setTimeout(r, 1200)); 
          fetchedData = [
            { id: 't1', nameAPI: '[MERCHANT_PAGE] Karcis Dewasa (Qty: 387)', amount: 15480000 },
            { id: 't2', nameAPI: '[GATE] Karcis Anak (Qty: 150)', amount: 4500000 },
            { id: 't3', nameAPI: '[TVM] Taman Satwa Anak (Qty: 800)', amount: 2000000 },
            { id: 't4', nameAPI: '[GATE] Parkir Gol I (Bus Besar) (Qty: 5)', amount: 250000 }
          ];
        } else {
          const baseUrl = ip.startsWith('http') ? ip : `http://${ip}:5000`;
          const endpoint = `${baseUrl}/api/tarik_rekon_3a?tanggal=${targetDate}`;
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          const responseJson = await res.json();
          if (responseJson.status !== 'success') throw new Error(responseJson.message);
          
          if (responseJson.rekon_data) {
            Object.keys(responseJson.rekon_data).forEach(channel => {
              const channelData = responseJson.rekon_data[channel];
              Object.keys(channelData).forEach(idx => {
                const nominal = channelData[idx].nominal;
                const qty = channelData[idx].qty;
                if (nominal > 0) {
                  fetchedData.push({
                    id: `${channel}_${idx}`,
                    nameAPI: `[${channel}] ${stsuNames3A[idx] || 'Item '+idx} (Qty: ${qty})`,
                    amount: nominal
                  });
                }
              });
            });
          }
        }
      } 
      else if (source === 'iwm') {
        if (ip === 'demo') {
          await new Promise(r => setTimeout(r, 1200)); 
          diskonData = [
            { lokasi: 'Pintu Utara 3', nama_rombongan: 'SD SWASTA MARSUDIRINI', masuk_anak: 65, masuk_dewasa: 0, pendapatan_rp: 146250 }
          ];
          fetchedData = [
            { id: 'i1', nameAPI: '[IWM] Pusat Primata - Dewasa (Reguler) (Hari Biasa)', amount: 582000 },
            { id: 'i2', nameAPI: '[IWM] Pusat Primata - Anak (Reguler) (Hari Biasa)', amount: 24000 },
            { id: 'i3', nameAPI: '[IWM] Pintu Masuk - Dewasa (Reguler)', amount: 2528000 },
            { id: 'i4', nameAPI: '[IWM] Kendaraan Gol III', amount: 35000 }, 
            { id: 'i5', nameAPI: '[IWM] Kendaraan - Sepededa', amount: 15000 },
            { id: 'i6', nameAPI: '[IWM] Rombongan - SD SWASTA MARSUDIRINI', amount: 146250, itemNote: 'SD SWASTA MARSUDIRINI' }
          ];
        } else {
          const baseUrl = ip.startsWith('http') ? ip : `http://${ip}:5001`;
          const endpoint = `${baseUrl}/api/tarik_rekon_iwm?tanggal=${targetDate}`;
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          const responseJson = await res.json();
          if (responseJson.status !== 'success') throw new Error(responseJson.message);
          
          const iData = responseJson.data;
          
          diskonData = iData.laporan_diskon || [];
          
          let deductAlAnak = 0;
          let deductAlDewasa = 0;
          let deductPrmAnak = 0;
          let deductPrmDewasa = 0;
          
          diskonData.forEach(d => {
            const anak = Number(d.masuk_anak) || 0;
            const dewasa = Number(d.masuk_dewasa) || 0;
            const totalRp = Number(d.pendapatan_rp) || 0;
            
            const isPrimata = /primata|schmutzer/i.test(d.lokasi || '') || /primata|schmutzer/i.test(d.nama_rombongan || '');
            
            if (anak > 0 && dewasa === 0) {
               if (isPrimata) deductPrmAnak += totalRp; else deductAlAnak += totalRp;
            } else if (dewasa > 0 && anak === 0) {
               if (isPrimata) deductPrmDewasa += totalRp; else deductAlDewasa += totalRp;
            } else if (anak > 0 && dewasa > 0) {
               const porsiAnak = isPrimata ? anak * 1 : anak * 2250;
               const porsiDewasa = isPrimata ? dewasa * 1 : dewasa * 3000;
               const totalPorsi = porsiAnak + porsiDewasa;
               if (totalPorsi > 0) {
                 const calcAnak = Math.round((porsiAnak / totalPorsi) * totalRp);
                 const calcDewasa = Math.round((porsiDewasa / totalPorsi) * totalRp);
                 if (isPrimata) {
                     deductPrmAnak += calcAnak;
                     deductPrmDewasa += calcDewasa;
                 } else {
                     deductAlAnak += calcAnak;
                     deductAlDewasa += calcDewasa;
                 }
               }
            }
          });

          if (iData.pusat_primata) {
            const netPrmDewasa = Math.max(0, (iData.pusat_primata.dewasa || 0) - deductPrmDewasa);
            const netPrmAnak = Math.max(0, (iData.pusat_primata.anak || 0) - deductPrmAnak);
            if (netPrmDewasa > 0) fetchedData.push({ id: 'prm_dws', nameAPI: `[IWM] Pusat Primata - Dewasa (Reguler)${getPrimataLabel(netPrmDewasa)}`, amount: netPrmDewasa });
            if (netPrmAnak > 0) fetchedData.push({ id: 'prm_ank', nameAPI: `[IWM] Pusat Primata - Anak (Reguler)${getPrimataLabel(netPrmAnak)}`, amount: netPrmAnak });
          }
          
          if (iData.children_zoo && iData.children_zoo.total > 0) {
            fetchedData.push({ id: 'cz_tot', nameAPI: '[IWM] Children Zoo (Total)', amount: iData.children_zoo.total });
          }

          if (iData.area_lainnya) {
            const al = iData.area_lainnya;
            const netDewasa = Math.max(0, (al.dewasa || 0) - deductAlDewasa);
            const netAnak = Math.max(0, (al.anak || 0) - deductAlAnak);

            if (netDewasa > 0) fetchedData.push({ id: 'al_dws', nameAPI: '[IWM] Pintu Masuk - Dewasa (Reguler)', amount: netDewasa });
            if (netAnak > 0) fetchedData.push({ id: 'al_ank', nameAPI: '[IWM] Pintu Masuk - Anak (Reguler)', amount: netAnak });
            if (al.gol_i > 0) fetchedData.push({ id: 'al_g1', nameAPI: '[IWM] Kendaraan Gol I', amount: al.gol_i });
            if (al.gol_ii > 0) fetchedData.push({ id: 'al_g2', nameAPI: '[IWM] Kendaraan Gol II', amount: al.gol_ii });
            if (al.gol_iii > 0) fetchedData.push({ id: 'al_g3', nameAPI: '[IWM] Kendaraan Gol III', amount: al.gol_iii });
            if (al.motor > 0) fetchedData.push({ id: 'al_mtr', nameAPI: '[IWM] Kendaraan - Motor', amount: al.motor });
            if (al.sepeda > 0) fetchedData.push({ id: 'al_spd', nameAPI: '[IWM] Kendaraan - Sepeda', amount: al.sepeda });
          }
          
          // 🔥 PERBAIKAN LOGIK IWM ROMBONGAN: Menyertakan nama_rombongan ke dalam itemNote di Mode API Live
          diskonData.forEach((d, idx) => {
            const amt = Number(d.pendapatan_rp) || 0;
            if (amt !== 0) {
              const isPrm = /primata|schmutzer/i.test(d.lokasi || '') || /primata|schmutzer/i.test(d.nama_rombongan || '');
              const rombName = d.nama_rombongan || d.lokasi || `Rombongan ${idx + 1}`;
              const finalNote = isPrm ? `${rombName} (Pusat Primata)` : rombName;
              fetchedData.push({ 
                id: `iwm_romb_${idx}`, 
                nameAPI: `[IWM] Rombongan - ${rombName}${isPrm ? ' (Primata)' : ''}`, 
                amount: Math.abs(amt),
                itemNote: finalNote
              });
            }
          });
        }
      }

      const mappedData = fetchedData.map(item => {
        const { mappedCat, mappedItem } = smartMappingAI(item.nameAPI, source);
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

  const confirmTransitInjection = () => {
    updateCurrentReport(prev => {
      let newItems = transitModal.isOverwriting ? [] : [...(prev.activeItems || [])];
      let newFormData = transitModal.isOverwriting ? {} : { ...(prev.formData || {}) };

      transitModal.data.forEach(t => {
        if (t.mappedCat && t.mappedItem) {
          const finalNote = t.itemNote || lainItemNote;
          const key = getActiveItemKey(t.mappedCat, t.mappedItem, isAddingSusulan, susulanValidDate, lainItemDate, finalNote);
          const exists = newItems.find(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === key);
          
          if (!exists) {
            newItems.push({ catId: t.mappedCat, itemId: t.mappedItem, isSusulan: isAddingSusulan, validDate: susulanValidDate, itemDate: lainItemDate, itemNote: finalNote });
          }
          newFormData[key] = (newFormData[key] || 0) + Number(t.amount);
        }
      });
      return { ...prev, activeItems: newItems, formData: newFormData };
    });
    
    const is3a = transitModal.source === '3a';
    closeTransitModal();
    showToast(`Berhasil! Data dari Bot ${is3a ? '3A' : 'IWM'} telah disuntikkan ke STSU.`);
  };

  const computedStsuNo = useMemo(() => {
    if (!reportDate) return ''; const [y, m, d] = reportDate.split('-'); const typeCode = activeType === 'lain' ? 'SU/L' : 'SU'; const seq = currentReport.sequence || '...'; return `${seq}/${d}/${m}/${typeCode}/${y}`;
  }, [reportDate, activeType, currentReport.sequence]);

  const availableItemsToAdd = useMemo(() => {
    if (!selectedCatToAdd) return []; const cat = categories.find(c => c.id === selectedCatToAdd); if (!cat) return [];
    const activeI = Array.isArray(currentReport.activeItems) ? currentReport.activeItems : [];
    
    // 🔥 PERBAIKAN LOGIK IS-ADDED: Agar item dari dropdown tetap bisa di-add (meski item yang sama versi note hasil injek IWM sudah ada)
    const isAdded = (iId) => {
      if (activeType === 'utama') return activeI.some(a => a.catId === selectedCatToAdd && a.itemId === iId && !!a.isSusulan === isAddingSusulan && (a.validDate || '') === (susulanValidDate || '') && !a.itemNote);
      else return activeI.some(a => a.catId === selectedCatToAdd && a.itemId === iId && (a.itemDate || '') === (lainItemDate || '') && (a.itemNote || '') === (lainItem
