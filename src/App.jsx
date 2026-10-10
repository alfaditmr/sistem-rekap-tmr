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
  onSnapshot
} from './services/firebase';
import {
  safeString,
  sanitizeForFirestore,
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
      return saved ? JSON.parse(saved) : [];
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
  const [allReports, setAllReports] = useState(() => getInitialState('tmr_v19_allReports', {}));
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
  useEffect(() => { safeSetLocalStorage('tmr_v19_allReports', allReports); }, [allReports]);
  useEffect(() => { safeSetLocalStorage('tmr_v19_api_ip', apiIpAddress); }, [apiIpAddress]);

  const CLIENT_ID = useRef('tmr_' + Math.random().toString(36).substring(2, 10)).current;
  const stateRef = useRef({
    allReports,
    bankRows,
    signatures,
    categories,
    targets
  });
  stateRef.current = {
    allReports,
    bankRows,
    signatures,
    categories,
    targets
  };

  const lastLocalUpdatedRef = useRef('');
  const lastLocalSaveTimeRef = useRef(0);
  const cloudSaveTimerRef = useRef(null);

  const getDocRef = () => { return doc(db, 'tmr_data', user ? user.uid : 'demo_rekapitulasi_laporan'); };

  // ==============================================================
  // 🔴 METODE PENYIMPANAN TERPUSAT & HANDAL (SINGLE AUTHORITATIVE WRITER)
  // ==============================================================
  const saveState = async (updates = {}, options = { immediate: false, showToastMessage: null }) => {
    const current = stateRef.current;
    const nextReports = updates.allReports !== undefined ? updates.allReports : current.allReports;
    const nextBankRows = updates.bankRows !== undefined ? updates.bankRows : current.bankRows;
    const nextSigs = updates.signatures !== undefined ? updates.signatures : current.signatures;
    const nextCats = updates.categories !== undefined ? updates.categories : current.categories;
    const nextTargets = updates.targets !== undefined ? updates.targets : current.targets;

    // 1. Sinkronkan stateRef secara instan (0ms)
    stateRef.current = {
      allReports: nextReports,
      bankRows: nextBankRows,
      signatures: nextSigs,
      categories: nextCats,
      targets: nextTargets
    };

    // 2. Sinkronkan React state
    if (updates.allReports !== undefined) setAllReports(nextReports);
    if (updates.bankRows !== undefined) setBankRows(nextBankRows);
    if (updates.signatures !== undefined) setSignatures(nextSigs);
    if (updates.categories !== undefined) setCategories(nextCats);
    if (updates.targets !== undefined) setTargets(nextTargets);

    const nowIso = new Date().toISOString();
    lastLocalUpdatedRef.current = nowIso;
    lastLocalSaveTimeRef.current = Date.now();

    // 3. Simpan ke LocalStorage seketika (0ms tahan refresh & offline)
    if (updates.allReports !== undefined) safeSetLocalStorage('tmr_v19_allReports', nextReports);
    if (updates.bankRows !== undefined) safeSetLocalStorage('tmr_v19_bankRows', nextBankRows);
    if (updates.signatures !== undefined) safeSetLocalStorage('tmr_v19_signatures', nextSigs);
    if (updates.categories !== undefined) safeSetLocalStorage('tmr_v19_categories', nextCats);
    if (updates.targets !== undefined) safeSetLocalStorage('tmr_v19_targets', nextTargets);
    safeSetLocalStorage('tmr_v19_lastUpdated', nowIso);

    if (options.showToastMessage) {
      showToast(options.showToastMessage);
    }

    if (!user || !db) return;

    // 4. Sinkronkan ke Firestore Cloud
    const pushToFirestore = async () => {
      setSyncStatus('syncing');
      try {
        const payload = sanitizeForFirestore({
          signatures: stateRef.current.signatures,
          categories: stateRef.current.categories,
          targets: stateRef.current.targets,
          allReports: stateRef.current.allReports,
          bankRows: stateRef.current.bankRows,
          lastWriterId: CLIENT_ID,
          lastUpdated: nowIso
        });
        await setDoc(getDocRef(), payload);
        setSyncStatus('synced');
      } catch (err) {
        console.error("Firestore push error:", err);
        setSyncStatus('offline');
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

  const saveToFirebaseDirectly = (newReports, newBankRows) => {
    return saveState({
      ...(newReports !== undefined ? { allReports: newReports } : {}),
      ...(newBankRows !== undefined ? { bankRows: newBankRows } : {})
    }, { immediate: true });
  };

  const handleForceSave = () => {
    return saveState({}, { immediate: true, showToastMessage: 'Data berhasil disimpan ke Cloud!' });
  };

  const flushPendingSave = () => {
    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
      saveState({}, { immediate: true });
    }
  };

  // ==============================================================
  // 🔴 LISTENER REAL-TIME FIRESTORE (DENGAN PROTEKSI CLIENT_ID)
  // ==============================================================
  useEffect(() => {
    if (!user || !db) return;
    setSyncStatus('syncing');
    
    let isInitialLoad = true;
    
    const unsubscribe = onSnapshot(getDocRef(), (docSnap) => {
        const isFirst = isInitialLoad;
        if (isInitialLoad) {
            isInitialLoad = false;
            setDbReady(true);
        }

        if (docSnap.exists()) {
            const data = docSnap.data();

            if (!isFirst) {
                // PENGAMAN UTAMA: Jika snapshot ini berasal dari penulisan client/tab ini sendiri,
                // ABAIKAN SEPENUHNYA! State lokal sudah paling mutakhir dan tidak boleh ditimpa.
                if (data.lastWriterId === CLIENT_ID) {
                    return;
                }
                // Abaikan jika client ini baru saja melakukan simpan lokal (< 2.5 detik lalu)
                if (Date.now() - lastLocalSaveTimeRef.current < 2500) {
                    return;
                }
                // Abaikan jika masih ada penulisan lokal yang sedang dikirim
                if (docSnap.metadata?.hasPendingWrites) {
                    return;
                }
            }

            const loadedSigs = data.signatures || {};
            const loadedCats = data.categories || [];
            const loadedTargets = data.targets || {};
            let loadedReports = data.allReports || {};
            let loadedBankRows = data.bankRows || [];

            if (isFirst) {
                const localBank = getInitialState('tmr_v19_bankRows', []);
                if (loadedBankRows.length === 0 && Array.isArray(localBank) && localBank.length > 0) {
                    loadedBankRows = localBank;
                }
                const localRep = getInitialState('tmr_v19_allReports', {});
                if (Object.keys(loadedReports).length === 0 && Object.keys(localRep).length > 0) {
                    loadedReports = localRep;
                }
            }

            stateRef.current = {
                allReports: loadedReports,
                bankRows: loadedBankRows,
                signatures: loadedSigs,
                categories: loadedCats,
                targets: loadedTargets
            };

            safeSetLocalStorage('tmr_v19_allReports', loadedReports);
            safeSetLocalStorage('tmr_v19_bankRows', loadedBankRows);
            safeSetLocalStorage('tmr_v19_signatures', loadedSigs);
            safeSetLocalStorage('tmr_v19_categories', loadedCats);
            safeSetLocalStorage('tmr_v19_targets', loadedTargets);
            if (data.lastUpdated) safeSetLocalStorage('tmr_v19_lastUpdated', data.lastUpdated);

            setSignatures(loadedSigs);
            setCategories(loadedCats);
            setTargets(loadedTargets);
            setAllReports(loadedReports);
            setBankRows(loadedBankRows);
        }
        setSyncStatus('synced');
    }, (error) => {
        console.error("Firebase Snapshot Error:", error);
        setDbReady(true);
        setSyncStatus('offline');
    });

    return () => unsubscribe();
  }, [user]);

    const pullLatestFromCloud = async (showNotification = false) => {
    if (!user || !db) return;

    // Proteksi: Jangan lakukan penimpaan otomatis jika user baru saja mengedit/menyimpan (< 2 detik lalu)
    if (!showNotification && Date.now() - lastLocalSaveTimeRef.current < 2000) {
      console.log("Skipping pullLatestFromCloud: local changes in progress");
      return;
    }

    setSyncStatus('syncing');
    try {
      const docSnap = await getDoc(getDocRef());
      if (docSnap.exists()) {
        const data = docSnap.data();
        const serverUpdated = data.lastUpdated || '';
        
        const loadedSigs = data.signatures || {};
        const loadedCats = data.categories || [];
        const loadedTargets = data.targets || {};
        const loadedReports = data.allReports || {};
        let loadedBankRows = data.bankRows || [];

        safeSetLocalStorage('tmr_v19_allReports', loadedReports);
        safeSetLocalStorage('tmr_v19_bankRows', loadedBankRows);
        if (serverUpdated) safeSetLocalStorage('tmr_v19_lastUpdated', serverUpdated);

                                        stateRef.current = {
          allReports: loadedReports,
          bankRows: loadedBankRows,
          signatures: loadedSigs,
          categories: loadedCats,
          targets: loadedTargets
        };
        lastLocalUpdatedRef.current = serverUpdated;

        setSignatures(loadedSigs);
        setCategories(loadedCats);
        setTargets(loadedTargets);
        setAllReports(loadedReports);
        setBankRows(loadedBankRows);
        
        setSyncStatus('synced');
        if (showNotification) showToast("Data terbaru berhasil disinkronkan dari Cloud!");
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error("Error pulling latest from cloud:", err);
      setSyncStatus('offline');
      if (showNotification) alert("Gagal menyinkronkan data: " + (err.message || err));
    }
  };

  useEffect(() => {
    const handleWakeup = () => {
      // Hanya sinkronkan saat tab kembali aktif dan user tidak sedang aktif menyimpan
      if (document.visibilityState === 'visible' && user && db && (Date.now() - lastLocalSaveTimeRef.current > 4000)) {
        pullLatestFromCloud(false);
      }
    };
    document.addEventListener('visibilitychange', handleWakeup);
    return () => {
      document.removeEventListener('visibilitychange', handleWakeup);
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
    saveToFirebaseDirectly(newReports, bankRows);
    setActiveLainIndex(nextIndex); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setLainItemDate(''); setLainItemNote('');
  };

  const handleRemoveLainDoc = (indexToRemove) => {
    showConfirm(`Hapus Dokumen Ke-${indexToRemove}? Semua data di dalam dokumen ini akan ikut terhapus.`, () => {
      const baseReports = stateRef.current.allReports;
      const dayData = { ...(baseReports[reportDate] || {}) };
      const keyToRemove = indexToRemove === 1 ? 'lain' : `lain_${indexToRemove}`;
      delete dayData[keyToRemove];
      const newReports = { ...baseReports, [reportDate]: dayData };
            setAllReports(newReports);
      saveToFirebaseDirectly(newReports, bankRows);
      if (activeLainIndex === indexToRemove) setActiveLainIndex(1);
    });
  };

  const currentReport = useMemo(() => {
    const typeData = (allReports[reportDate] || {})[activeTypeKey] || {};
    return { sequence: typeData.sequence || '', signatureDate: typeData.signatureDate || reportDate, activeItems: Array.isArray(typeData.activeItems) ? typeData.activeItems : [], formData: typeData.formData || {} };
  }, [allReports, reportDate, activeTypeKey]);

  const updateCurrentReport = (updater) => {
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[reportDate] || {};
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const updatedTypeData = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
    const newReports = { ...baseReports, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    saveState({ allReports: newReports }, { immediate: false });
  };

  const handleUpdateRekonRow = (dateStr, isSusulan, susulanKeys, field, value) => {
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[dateStr] || {};
    const typeData = dayData['utama'] || { sequence: '', signatureDate: dateStr, activeItems: [], formData: {} };
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
               ['utama']: {
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
                ['utama']: {
                    ...typeData,
                    [field]: value
                }
            }
        };
    }
    if (newReports) {
            setAllReports(newReports);
      saveToFirebaseDirectly(newReports, bankRows);
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

  const clearCurrentReport = () => { setResetDialog({ isOpen: true, password: '', error: '', isVerifying: false }); };

  const handleConfirmReset = async (e) => {
    e.preventDefault(); setResetDialog(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      const baseReports = stateRef.current.allReports;
      const dayData = baseReports[reportDate] || {};
      const newReports = {
        ...baseReports,
        [reportDate]: {
          ...dayData,
          [activeTypeKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} }
        }
      };
            setAllReports(newReports);
      saveToFirebaseDirectly(newReports, bankRows);
      setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false });
    } catch (error) { setResetDialog(prev => ({ ...prev, isVerifying: false, error: 'Password salah! Penghapusan dibatalkan.' })); }
  };

  const filteredCategories = useMemo(() => { return Array.isArray(categories) ? categories.filter(c => c.type === activeType) : []; }, [categories, activeType]);

  const handleCatChange = (catId) => {
    setSelectedCatToAdd(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedItemToAdd('direct'); else setSelectedItemToAdd('');
  };

  const handleAddActiveItem = () => {
    if (!selectedCatToAdd || !selectedItemToAdd) return;
    const newItem = { catId: selectedCatToAdd, itemId: selectedItemToAdd };
    if (activeType === 'utama' && isAddingSusulan) { if (!susulanValidDate) { showConfirm("Mohon pilih Tanggal Validasi untuk pendapatan susulan!", null); return; } newItem.isSusulan = true; newItem.validDate = susulanValidDate; }
    else if (activeType === 'lain') { if (lainItemDate) newItem.itemDate = lainItemDate; if (lainItemNote.trim()) newItem.itemNote = lainItemNote.trim(); }

    const inputKey = getActiveItemKey(newItem.catId, newItem.itemId, newItem.isSusulan, newItem.validDate, newItem.itemDate, newItem.itemNote);
    const initialNominal = Number(String(manualNominalToAdd).replace(/[^0-9]/g, '')) || 0;
    
    const baseReports = stateRef.current.allReports;
    const dayData = baseReports[reportDate] || {};
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const currentItems = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];
    
    if (!currentItems.find(i => getActiveItemKey(i.catId, i.itemId, i.isSusulan, i.validDate, i.itemDate, i.itemNote) === inputKey)) {
      const updatedTypeData = {
        ...typeData,
        activeItems: [...currentItems, newItem],
        formData: { ...(typeData.formData || {}), [inputKey]: initialNominal }
      };
      const newReports = {
        ...baseReports,
        [reportDate]: {
          ...dayData,
          [activeTypeKey]: updatedTypeData
        }
      };
            setAllReports(newReports);
      saveToFirebaseDirectly(newReports, bankRows);
    }
    
    const cat = categories.find(c => c.id === selectedCatToAdd);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedCatToAdd('');
    setSelectedItemToAdd(''); 
    setManualNominalToAdd('');
    setLainItemNote('');
    setTimeout(() => { if (typeof document !== 'undefined') { const inputElement = document.getElementById(`input_${inputKey}`); if (inputElement) inputElement.focus(); } }, 100);
  };

  const handleRemoveActiveItem = (itemToRemove, providedKey) => {
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
    
    const updatedTypeData = { ...typeData, activeItems: newActive, formData: newFormData };
    const newReports = { ...baseReports, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    
        setAllReports(newReports);
    saveToFirebaseDirectly(newReports, newBankRows);
    showToast('Item berhasil dihapus!');
  };

  const handleInputChange = (inputKey, value) => {
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
      saveToFirebaseDirectly(newReports, bankRows);
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
    const baseReports = stateRef.current.allReports;
    const newReports = JSON.parse(JSON.stringify(baseReports));
    const dayData = newReports[reportDate] || {}; 
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    
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
    saveToFirebaseDirectly(newReports, bankRows);
    
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

  const addCategory = () => setCategories([...(categories||[]), { id: `cat_${Date.now()}`, name: 'Kategori Baru', type: 'utama', items: [] }]);
  const updateCategory = (catId, key, value) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, [key]: value } : c));
  const deleteCategory = (catId) => { showConfirm('Hapus kategori ini? Data lama tidak akan hilang, tapi kategori tidak bisa dipilih lagi.', () => { setCategories((categories||[]).filter(c => c.id !== catId)); }); };
  const moveCategory = (index, direction) => { const newCats = [...(categories || [])]; if (direction === 'up' && index > 0) [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]]; else if (direction === 'down' && index < newCats.length - 1) [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]]; setCategories(newCats); };

  const addItem = (catId) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, items: [...(c.items||[]), { id: `item_${Date.now()}`, name: 'Item Baru' }] } : c));
  const updateItemName = (catId, itemId, newName) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, items: (c.items||[]).map(i => i.id === itemId ? { ...i, name: newName } : i) } : c));
  const deleteItem = (catId, itemId) => setCategories((categories||[]).map(c => c.id === catId ? { ...c, items: (c.items||[]).filter(i => i.id !== itemId) } : c));
  const moveItem = (catId, itemIndex, direction) => { const newCats = [...(categories || [])]; const catIndex = newCats.findIndex(c => c.id === catId); if (catIndex > -1) { const newItems = [...(newCats[catIndex].items || [])]; if (direction === 'up' && itemIndex > 0) [newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]]; else if (direction === 'down' && itemIndex < newItems.length - 1) [newItems[itemIndex + 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex + 1]]; newCats[catIndex] = { ...newCats[catIndex], items: newItems }; setCategories(newCats); } };



  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };
  const handleDownloadPDF = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return; const element = document.getElementById('printable-area'); if (!element) return;
    if (window.html2pdf) {
      setPdfLoading(true);
      window.html2pdf().set({ margin: [10, 10, 10, 10], filename: `Laporan_STSU_${activeType.toUpperCase()}${activeType === 'lain' ? `_Dok${activeLainIndex}` : ''}_${reportDate}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save().then(() => setPdfLoading(false)).catch(err => { setPdfLoading(false); });
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

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-36 relative">
      <style>{`
        @media print {
          body { background-color: white; margin: 0; padding: 0; }
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
            .print-container { width: 100%; max-width: 100%; margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: black; box-shadow: none !important; border: none !important; }
            @page { margin: 15mm; }
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
            <button 
              type="button" 
              onClick={() => pullLatestFromCloud(true)} 
              className="ml-0 sm:ml-4 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-2.5 py-1 bg-green-800 hover:bg-green-900 border border-green-600 rounded-lg shadow-inner cursor-pointer transition-all hover:scale-105 active:scale-95" 
              title="Klik untuk menyinkronkan data terbaru dari Cloud secara instan"
            >
              {syncStatus === 'syncing' ? <RefreshCw className="animate-spin text-white" size={14}/> : syncStatus === 'synced' ? <Cloud size={14} className="text-blue-300"/> : <CloudOff size={14} className="text-red-300"/>}
              <span className="hidden md:inline">{syncStatus === 'syncing' ? 'Menyinkronkan...' : syncStatus === 'synced' ? 'Tersimpan (Klik Sync)' : 'Mode Offline'}</span>
            </button>
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
                 onRefreshCloud={() => pullLatestFromCloud(true)}
                 bankRows={bankRows}
                 setBankRows={setBankRows}
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
                         
                         allocations.forEach(alloc => {
                             const allocYmd = alloc.targetDate || ymd;
                             const dayData = newReports[allocYmd] || {};
                             
                             const cat = categories.find(c => c.id === alloc.categoryId);
                             if (!cat) return; // Kategori wajib
                             
                             let theItemId = alloc.itemId;
                             if (!theItemId || !cat.items || cat.items.length === 0) {
                                 theItemId = 'direct';
                             }

                             let docKey = 'utama'; 
                             if (cat.type === 'lain') {
                                 docKey = 'lain'; 
                             }

                             if (!dayData[docKey]) {
                                 dayData[docKey] = { sequence: '', signatureDate: allocYmd, activeItems: [], formData: {} };
                             }
                             if (!dayData[docKey].formData) dayData[docKey].formData = {};
                             if (!Array.isArray(dayData[docKey].activeItems)) dayData[docKey].activeItems = [];

                             const typeData = dayData[docKey];
                             
                             const newItem = { catId: cat.id, itemId: theItemId };
                             if (docKey === 'lain') {
                                 newItem.itemDate = allocYmd; 
                                 if (alloc.description) newItem.itemNote = alloc.description.trim();
                             }

                             let itemKey = `${newItem.catId}_${newItem.itemId}`;
                             if (newItem.itemDate) itemKey += `_date_${newItem.itemDate}`;
                             if (newItem.itemNote) { 
                                 let hash = 0; 
                                 for (let i = 0; i < newItem.itemNote.length; i++) { 
                                     hash = ((hash << 5) - hash) + newItem.itemNote.charCodeAt(i); 
                                     hash = hash & hash; 
                                 } 
                                 itemKey += `_note_${Math.abs(hash)}`; 
                             }
                             
                             const currentAmount = typeData.formData[itemKey] || 0;
                             typeData.formData[itemKey] = currentAmount + Number(alloc.amount || 0);

                             const existingIndex = typeData.activeItems.findIndex(i => {
                                 if (!i || typeof i !== 'object') return false;
                                 let k = `${i.catId}_${i.itemId || i.id}`;
                                 if (i.itemDate) k += `_date_${i.itemDate}`;
                                 if (i.itemNote && typeof i.itemNote === 'string') {
                                     let h = 0; for (let j=0; j<i.itemNote.length; j++) { h=((h<<5)-h)+i.itemNote.charCodeAt(j); h=h&h; }
                                     k += `_note_${Math.abs(h)}`;
                                 }
                                 return k === itemKey;
                             });

                             if (existingIndex === -1) {
                                 newItem.bankMatched = true;
                                 newItem.bankMatchRowId = bankRow.id;
                                 newItem.bankMatchDate = bankRow.date;
                                 newItem.bankMatchRowIds = [bankRow.id];
                                 typeData.activeItems.push(newItem);
                             } else {
                                 const item = typeData.activeItems[existingIndex];
                                 item.bankMatched = true;
                                 item.bankMatchRowId = bankRow.id;
                                 item.bankMatchDate = bankRow.date;
                                 if (!Array.isArray(item.bankMatchRowIds)) {
                                     item.bankMatchRowIds = item.bankMatchRowId ? [item.bankMatchRowId] : [];
                                 }
                                 if (!item.bankMatchRowIds.includes(bankRow.id)) {
                                     item.bankMatchRowIds.push(bankRow.id);
                                 }
                             }
                             
                             if (alloc.apiRefId) {
                                 const apiItem = apis.find(a => a.id === alloc.apiRefId);
                                 const proofUrl = apiItem?.buktiTransferUrl || apiItem?.buktiTransferDocUrl || apiItem?.pksDriveUrl || '';
                                 if (existingIndex === -1) {
                                     newItem.apiRefId = alloc.apiRefId;
                                     if (proofUrl) newItem.proofUrl = proofUrl;
                                 } else {
                                     typeData.activeItems[existingIndex].apiRefId = alloc.apiRefId;
                                     if (proofUrl) typeData.activeItems[existingIndex].proofUrl = proofUrl;
                                 }
                                 if (proofUrl) {
                                     typeData.formData[itemKey + '_buktiUrl'] = proofUrl;
                                 }
                             }
                             
                             newReports[allocYmd] = dayData;
                         });

                         let matchedProofUrl = '';
                          let matchedApiRefIds = [];
                          allocations.forEach(alloc => {
                              if (alloc.apiRefId) {
                                  matchedApiRefIds.push(alloc.apiRefId);
                                  const apiItem = apis.find(a => a.id === alloc.apiRefId);
                                  const url = apiItem?.buktiTransferUrl || apiItem?.buktiTransferDocUrl || apiItem?.pksDriveUrl || '';
                                  if (url) matchedProofUrl = url;
                              }
                          });

                          const baseBankRows = stateRef.current.bankRows;
                          const newBankRows = baseBankRows.map(r => r.id === bankRow.id ? { 
                              ...r, 
                              status: 'matched', 
                              matchedTo: targetSummary,
                              linkedTo: { date: primaryTargetDate, dates: distinctTargetDates, groupName: targetSummary, proofUrl: matchedProofUrl || r.proofUrl || '' },
                              proofUrl: matchedProofUrl || r.proofUrl || '',
                              apiRefId: matchedApiRefIds[0] || r.apiRefId || '',
                              apiRefIds: matchedApiRefIds.length > 0 ? matchedApiRefIds : (r.apiRefIds || [])
                          } : r);
                         
                         setAllReports(newReports);
                         setBankRows(newBankRows);
                         
                         saveToFirebaseDirectly(newReports, newBankRows);
                         showToast(`Berhasil menyimpan data rekon ke laporan tanggal ${ymd}!`);
                     } catch (err) {
                         console.error("Error in onSaveRekon:", err);
                         alert("Terjadi kesalahan saat menyimpan alokasi: " + err.message);
                     }
                 }}
                 onLinkRekon={async (bankRow, targetDate, targetType, targetGroupInfo) => {
                     try {
                         // 1. Construct new reports
                         const baseReports = stateRef.current.allReports;
                          const newReports = { ...baseReports };
                         const dayData = { ...(newReports[targetDate] || {}) };
                         const typeData = { ...(dayData[targetType] || { formData: {}, activeItems: [] }) };
                         const safeActiveItems = Array.isArray(typeData.activeItems) ? typeData.activeItems : [];
                         const newActiveItems = [...safeActiveItems];
                         
                         targetGroupInfo.itemIndices.forEach(idx => {
                             if (newActiveItems[idx]) {
                                 newActiveItems[idx] = { 
                                     ...newActiveItems[idx], 
                                     bankMatched: true, 
                                     bankMatchDate: bankRow.date,
                                     bankMatchRowId: bankRow.id 
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

                          const baseBankRows = stateRef.current.bankRows;
                          const newBankRows = baseBankRows.map(r => r.id === bankRow.id ? { 
                              ...r, 
                              status: 'linked', 
                              linkedTo: { date: targetDate, groupName: targetGroupInfo.name, proofUrl: linkedProofUrl || r.proofUrl || '' },
                              proofUrl: linkedProofUrl || r.proofUrl || ''
                          } : r);

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
                     const baseBankRows = stateRef.current.bankRows;
                     const newBankRows = baseBankRows.map(r => r.id === rowId ? { ...r, ...updates } : r);
                     setBankRows(newBankRows);
                     saveToFirebaseDirectly(stateRef.current.allReports, newBankRows);
                 }}
                 onUnlinkBankRow={(bankRow) => {
                     try {
                         const baseReports = stateRef.current.allReports;
                         const newReports = JSON.parse(JSON.stringify(baseReports));
                         Object.keys(newReports).forEach(date => {
                             Object.keys(newReports[date]).forEach(type => {
                                 if (newReports[date][type] && Array.isArray(newReports[date][type].activeItems)) {
                                     newReports[date][type].activeItems = newReports[date][type].activeItems.map(item => {
                                         if (item) {
                                             if (Array.isArray(item.bankMatchRowIds)) {
                                                 item.bankMatchRowIds = item.bankMatchRowIds.filter(id => id !== bankRow.id);
                                                 if (item.bankMatchRowIds.length === 0) {
                                                     delete item.bankMatched;
                                                     delete item.bankMatchDate;
                                                     delete item.bankMatchRowId;
                                                 } else {
                                                     item.bankMatchRowId = item.bankMatchRowIds[item.bankMatchRowIds.length - 1];
                                                 }
                                             } else if (item.bankMatchRowId === bankRow.id) {
                                                 const newItem = { ...item };
                                                 delete newItem.bankMatched;
                                                 delete newItem.bankMatchDate;
                                                 delete newItem.bankMatchRowId;
                                                 return newItem;
                                             }
                                         }
                                         return item;
                                     });
                                 }
                             });
                         });

                         const baseBankRows = stateRef.current.bankRows;
                         const newBankRows = baseBankRows.map(r => {
                             if (r.id === bankRow.id) {
                                 const updated = { ...r, status: 'pending' };
                                 delete updated.linkedTo;
                                 delete updated.matchedTo;
                                 return updated;
                             }
                             return r;
                         });
                         
                         setAllReports(newReports);
                         setBankRows(newBankRows);
                         
                         saveToFirebaseDirectly(newReports, newBankRows);
                         showToast('Status pasangan mutasi bank berhasil dibatalkan!');
                     } catch (err) {
                         console.error("Error unlinking:", err);
                         alert("Gagal membatalkan pasangan: " + err.message);
                     }
                 }}
                 allReports={allReports}
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
        setSignatures={setSignatures}
        categories={categories}
        moveCategory={moveCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        moveItem={moveItem}
        updateItemName={updateItemName}
        deleteItem={deleteItem}
        addItem={addItem}
        addCategory={addCategory}
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
