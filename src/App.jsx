import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock, Sparkles, Save, Database, CloudDownload, Table, FileSpreadsheet, User } from 'lucide-react';
import RekonBankTab from './RekonBankTab';
import TargetManager from './TargetManager';
import TransitModal from './components/transit/TransitModal';
import PrintPreviewTab from './components/print/PrintPreviewTab';
import RekapExcelTab from './components/dashboard/RekapExcelTab';
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
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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

  const prevReportsRef = useRef(allReports);
  const prevBankRowsRef = useRef(bankRows);
  const prevSigsRef = useRef(signatures);
  const prevCatsRef = useRef(categories);
  const prevTargetsRef = useRef(targets);
  const lastLocalUpdatedRef = useRef('');
  const lastLocalSaveTimeRef = useRef(0);
  const latestReportsRef = useRef(allReports);
  const inputSaveTimerRef = useRef(null);

  const getDocRef = () => { return doc(db, 'tmr_data', user ? user.uid : 'demo_rekapitulasi_laporan'); };

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
            const serverUpdated = data.lastUpdated || '';

            if (!isFirst) {
                // Selama aplikasi berjalan normal:
                // 1. Abaikan snapshot jika masih ada pending writes (penulisan lokal yang sedang dikirim)
                const hasPending = docSnap.metadata?.hasPendingWrites;
                if (hasPending) {
                    return;
                }
                // 2. Abaikan snapshot jika client ini baru saja melakukan simpan lokal atau mengetik (< 3 detik yang lalu)
                if (Date.now() - lastLocalSaveTimeRef.current < 3000) {
                    return;
                }
                // 3. Abaikan snapshot jika timestamp server lebih lama atau sama dengan timestamp perubahan lokal
                if (lastLocalUpdatedRef.current && serverUpdated && serverUpdated <= lastLocalUpdatedRef.current) {
                    console.log("Ignoring outdated Firestore snapshot (server:", serverUpdated, "<= local:", lastLocalUpdatedRef.current, ")");
                    return;
                }
                // 4. Abaikan snapshot jika user sedang aktif berinteraksi dengan input / textarea
                if (typeof document !== 'undefined' && document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                    console.log("Ignoring Firestore snapshot while user is actively typing in input field");
                    return;
                }
            }

            const loadedSigs = data.signatures || {};
            const loadedCats = data.categories || [];
            const loadedTargets = data.targets || {};
            const loadedReports = data.allReports || {};
            let loadedBankRows = data.bankRows || [];

            // PENGAMAN KRUSIAL: Jika server mengembalikan bankRows kosong, tetapi lokal browser memiliki bankRows (misal user baru upload CSV):
            // JANGAN TIMPA DENGAN KOSONG! Pertahankan data lokal dan sinkronkan segera ke server.
            const localBankRows = getInitialState('tmr_v19_bankRows', []);
            if (loadedBankRows.length === 0 && Array.isArray(localBankRows) && localBankRows.length > 0) {
                console.log("Preserving local bankRows (count:", localBankRows.length, ") as server has none. Resyncing to cloud...");
                loadedBankRows = localBankRows;
                setDoc(getDocRef(), sanitizeForFirestore({
                    ...data,
                    bankRows: localBankRows,
                    lastUpdated: new Date().toISOString()
                })).catch(err => console.error("Cloud push bankRows error:", err));
            } else if (Array.isArray(localBankRows) && localBankRows.length > loadedBankRows.length) {
                // Jika lokal memiliki data yang belum ada di server (misal baru upload CSV sebelum sempat sync):
                const existingKeys = new Set(loadedBankRows.map(r => `${r.date}_${r.amount}_${r.description}`));
                const merged = [...loadedBankRows];
                localBankRows.forEach(r => {
                    const key = `${r.date}_${r.amount}_${r.description}`;
                    if (!existingKeys.has(key)) {
                        existingKeys.add(key);
                        merged.push(r);
                    }
                });
                if (merged.length > loadedBankRows.length) {
                    console.log("Merged additional local bankRows into server data (new count:", merged.length, ")");
                    loadedBankRows = merged;
                    setDoc(getDocRef(), sanitizeForFirestore({
                        ...data,
                        bankRows: merged,
                        lastUpdated: new Date().toISOString()
                    })).catch(err => console.error("Cloud push merged bankRows error:", err));
                }
            }

            // Sinkronkan ke penyimpanan lokal seketika
            safeSetLocalStorage('tmr_v19_allReports', loadedReports);
            safeSetLocalStorage('tmr_v19_bankRows', loadedBankRows);
            if (serverUpdated) safeSetLocalStorage('tmr_v19_lastUpdated', serverUpdated);

            latestReportsRef.current = loadedReports;
            prevReportsRef.current = loadedReports;
            prevBankRowsRef.current = loadedBankRows;
            prevSigsRef.current = loadedSigs;
            prevCatsRef.current = loadedCats;
            prevTargetsRef.current = loadedTargets;

            // Update state HANYA jika data berubah (mencegah infinite loop dengan saveData)
            setSignatures(prev => {
                const newStr = JSON.stringify(loadedSigs);
                return JSON.stringify(prev) === newStr ? prev : loadedSigs;
            });
            
            setCategories(prev => {
                const newStr = JSON.stringify(loadedCats);
                return JSON.stringify(prev) === newStr ? prev : loadedCats;
            });
            
            setTargets(prev => {
                const newStr = JSON.stringify(loadedTargets);
                return JSON.stringify(prev) === newStr ? prev : loadedTargets;
            });
            
            setAllReports(prev => {
                const newStr = JSON.stringify(loadedReports);
                return JSON.stringify(prev) === newStr ? prev : loadedReports;
            });
            
            setBankRows(prev => {
                const newStr = JSON.stringify(loadedBankRows);
                return JSON.stringify(prev) === newStr ? prev : loadedBankRows;
            });
        } else {
            console.log("No remote doc found. Cloud connection ready.");
        }
        setSyncStatus('synced');
    }, (error) => {
        console.error("Firebase Snapshot Error:", error);
        setDbReady(true);
        setSyncStatus('offline');
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;
    
    // Cegah sinkronisasi jika tidak ada perubahan sama sekali dari iterasi sebelumnya
    if (
      allReports === prevReportsRef.current &&
      bankRows === prevBankRowsRef.current &&
      signatures === prevSigsRef.current &&
      categories === prevCatsRef.current &&
      targets === prevTargetsRef.current
    ) {
        return;
    }

    setSyncStatus('syncing');
    const saveData = async () => {
      try { 
        const nowIso = new Date().toISOString();
        lastLocalUpdatedRef.current = nowIso;
        lastLocalSaveTimeRef.current = Date.now();
        const currentReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
          ? latestReportsRef.current
          : allReports;
        const currentBank = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0)
          ? prevBankRowsRef.current
          : bankRows;
        const payload = sanitizeForFirestore({ 
          signatures, 
          categories, 
          targets, 
          allReports: currentReports, 
          bankRows: currentBank, 
          lastUpdated: nowIso 
        });

        // Simpan juga ke localStorage
        safeSetLocalStorage('tmr_v19_allReports', currentReports);
        safeSetLocalStorage('tmr_v19_bankRows', currentBank);
        safeSetLocalStorage('tmr_v19_lastUpdated', nowIso);

        await setDoc(getDocRef(), payload);
        
        // Update refs
        latestReportsRef.current = currentReports;
        prevReportsRef.current = currentReports;
        prevBankRowsRef.current = currentBank;
        prevSigsRef.current = signatures;
        prevCatsRef.current = categories;
        prevTargetsRef.current = targets;

        setSyncStatus('synced'); 
      } catch(e) { 
        console.error("Save Database Error:", e);
        setSyncStatus('offline'); 
      }
    };
    
    const timer = setTimeout(saveData, 250);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatures, categories, targets, allReports, bankRows, user]);

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

        latestReportsRef.current = loadedReports;
        prevReportsRef.current = loadedReports;
        prevBankRowsRef.current = loadedBankRows;
        prevSigsRef.current = loadedSigs;
        prevCatsRef.current = loadedCats;
        prevTargetsRef.current = loadedTargets;
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

  const handleForceSave = async () => {
    if (!user || !db) return;
    setSyncStatus('syncing');
    try { 
      const nowIso = new Date().toISOString();
      lastLocalUpdatedRef.current = nowIso;
      lastLocalSaveTimeRef.current = Date.now();
      const currentReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
        ? latestReportsRef.current
        : allReports;
      const currentBank = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0)
        ? prevBankRowsRef.current
        : bankRows;
      const payload = sanitizeForFirestore({ 
        signatures, 
        categories, 
        targets, 
        allReports: currentReports, 
        bankRows: currentBank, 
        lastUpdated: nowIso 
      });

      safeSetLocalStorage('tmr_v19_allReports', currentReports);
      safeSetLocalStorage('tmr_v19_bankRows', currentBank);
      safeSetLocalStorage('tmr_v19_lastUpdated', nowIso);

      await setDoc(getDocRef(), payload); 
      
      latestReportsRef.current = currentReports;
      prevReportsRef.current = currentReports;
      prevBankRowsRef.current = currentBank;
      prevSigsRef.current = signatures;
      prevCatsRef.current = categories;
      prevTargetsRef.current = targets;
      
      setSyncStatus('synced'); 
      showToast('Data berhasil disimpan ke Cloud!'); 
    } catch(e) { 
      console.error("Force Save Error:", e);
      setSyncStatus('offline'); 
      alert("Gagal menyimpan ke Cloud: " + (e.message || e));
    }
  };

  const saveToFirebaseDirectly = async (newAllReports, newBankRows) => {
    const finalReports = newAllReports || (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0 ? latestReportsRef.current : allReports);
    const finalBankRows = newBankRows || (prevBankRowsRef.current && prevBankRowsRef.current.length > 0 ? prevBankRowsRef.current : bankRows);
    const nowIso = new Date().toISOString();

    lastLocalUpdatedRef.current = nowIso;
    lastLocalSaveTimeRef.current = Date.now();

    // 1. SIMPAN SEGERA KE LOCALSTORAGE (0.1ms sinkron - tahan refresh instan)
    safeSetLocalStorage('tmr_v19_allReports', finalReports);
    safeSetLocalStorage('tmr_v19_bankRows', finalBankRows);
    safeSetLocalStorage('tmr_v19_lastUpdated', nowIso);

    // 2. Sinkronkan ref segera secara synchronous untuk mencegah bentrok/debounce timer
    latestReportsRef.current = finalReports;
    prevReportsRef.current = finalReports;
    prevBankRowsRef.current = finalBankRows;
    prevSigsRef.current = signatures;
    prevCatsRef.current = categories;
    prevTargetsRef.current = targets;

    if (!user || !db) return;

    setSyncStatus('syncing');
    try {
      const payload = sanitizeForFirestore({ 
          signatures, 
          categories, 
          targets, 
          allReports: finalReports, 
          bankRows: finalBankRows, 
          lastUpdated: nowIso 
      });
      await setDoc(getDocRef(), payload);
      setSyncStatus('synced');
    } catch (e) {
      console.error("Instant Save Error:", e);
      setSyncStatus('offline');
      alert("Peringatan Cloud: Gagal menyimpan data ke Cloud (" + (e.message || e) + "). Data tetap tersimpan aman di browser.");
    }
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
    if (inputSaveTimerRef.current) {
      clearTimeout(inputSaveTimerRef.current);
      inputSaveTimerRef.current = null;
      saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows);
    }
    const nextIndex = Math.max(...lainDocIndices) + 1; const nextKey = `lain_${nextIndex}`;
    const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
      ? latestReportsRef.current
      : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
    const dayData = baseReports[reportDate] || {};
    const newReports = {
      ...baseReports,
      [reportDate]: {
        ...dayData,
        [nextKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} }
      }
    };
    latestReportsRef.current = newReports;
    setAllReports(newReports);
    saveToFirebaseDirectly(newReports, bankRows);
    setActiveLainIndex(nextIndex); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setLainItemDate(''); setLainItemNote('');
  };

  const handleRemoveLainDoc = (indexToRemove) => {
    showConfirm(`Hapus Dokumen Ke-${indexToRemove}? Semua data di dalam dokumen ini akan ikut terhapus.`, () => {
      const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
        ? latestReportsRef.current
        : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
      const dayData = { ...(baseReports[reportDate] || {}) };
      const keyToRemove = indexToRemove === 1 ? 'lain' : `lain_${indexToRemove}`;
      delete dayData[keyToRemove];
      const newReports = { ...baseReports, [reportDate]: dayData };
      latestReportsRef.current = newReports;
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
    setAllReports(prev => {
      const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
        ? latestReportsRef.current
        : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : prev);
      const dayData = baseReports[reportDate] || {}; const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
      const updatedTypeData = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
      const newReports = { ...baseReports, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
      latestReportsRef.current = newReports;
      safeSetLocalStorage('tmr_v19_allReports', newReports);
      lastLocalSaveTimeRef.current = Date.now();
      return newReports;
    });
  };

  const handleUpdateRekonRow = (dateStr, isSusulan, susulanKeys, field, value) => {
    const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
      ? latestReportsRef.current
      : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
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
      latestReportsRef.current = newReports;
      setAllReports(newReports);
      saveToFirebaseDirectly(newReports, bankRows);
    }
  };

  const handleSequenceChange = (e) => updateCurrentReport({ sequence: e.target.value });
  const handleSignatureDateChange = (e) => updateCurrentReport({ signatureDate: e.target.value });

  const handleDateChange = (newDateStr) => {
    if (inputSaveTimerRef.current) {
      clearTimeout(inputSaveTimerRef.current);
      inputSaveTimerRef.current = null;
      saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows);
    }
    setReportDate(newDateStr); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setIsAddingSusulan(false); setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleTypeSwitch = (type) => {
    if (inputSaveTimerRef.current) {
      clearTimeout(inputSaveTimerRef.current);
      inputSaveTimerRef.current = null;
      saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows);
    }
    setActiveType(type); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setIsAddingSusulan(false); setSusulanValidDate(''); setLainItemDate(''); setLainItemNote(''); setActiveLainIndex(1); setPrintMode('pdf');
  };

  const handleTabSwitch = (newTab) => {
    if (inputSaveTimerRef.current) {
      clearTimeout(inputSaveTimerRef.current);
      inputSaveTimerRef.current = null;
      saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows);
    }
    setActiveTab(newTab);
    setPrintMode('pdf');
  };

  const clearCurrentReport = () => { setResetDialog({ isOpen: true, password: '', error: '', isVerifying: false }); };

  const handleConfirmReset = async (e) => {
    e.preventDefault(); setResetDialog(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
        ? latestReportsRef.current
        : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
      const dayData = baseReports[reportDate] || {};
      const newReports = {
        ...baseReports,
        [reportDate]: {
          ...dayData,
          [activeTypeKey]: { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} }
        }
      };
      latestReportsRef.current = newReports;
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
    
    const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
      ? latestReportsRef.current
      : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
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
      latestReportsRef.current = newReports;
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
    const baseBankRows = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0)
        ? prevBankRowsRef.current
        : bankRows;
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
    
    const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
        ? latestReportsRef.current
        : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
    const dayData = baseReports[reportDate] || {}; 
    const typeData = dayData[activeTypeKey] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
    const newActive = (typeData.activeItems || []).filter(i => getActiveItemKey(i.catId, i.itemId || i.id, i.isSusulan, i.validDate, i.itemDate, i.itemNote) !== keyToRemove);
    const newFormData = { ...(typeData.formData || {}) }; 
    delete newFormData[keyToRemove];
    
    const updatedTypeData = { ...typeData, activeItems: newActive, formData: newFormData };
    const newReports = { ...baseReports, [reportDate]: { ...dayData, [activeTypeKey]: updatedTypeData } };
    
    latestReportsRef.current = newReports;
    setAllReports(newReports);
    saveToFirebaseDirectly(newReports, newBankRows);
    showToast('Item berhasil dihapus!');
  };

  const handleInputChange = (inputKey, value) => {
    const rawValue = value.replace(/[^0-9]/g, '');
    const numVal = Number(rawValue) || 0;
    const nowIso = new Date().toISOString();
    
    lastLocalUpdatedRef.current = nowIso;
    lastLocalSaveTimeRef.current = Date.now();
    
    const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
      ? latestReportsRef.current
      : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
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
    
    latestReportsRef.current = newReports;
    setAllReports(newReports);
    safeSetLocalStorage('tmr_v19_allReports', newReports);
    safeSetLocalStorage('tmr_v19_lastUpdated', nowIso);

    // Otomatis simpan ke Cloud Firestore dengan debounce 500ms
    if (inputSaveTimerRef.current) clearTimeout(inputSaveTimerRef.current);
    inputSaveTimerRef.current = setTimeout(() => {
      saveToFirebaseDirectly(latestReportsRef.current || newReports, bankRows);
    }, 500);
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
      
      const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
        ? latestReportsRef.current
        : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
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
      latestReportsRef.current = newReports;
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
    const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0)
      ? latestReportsRef.current
      : ((prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports);
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
    
    latestReportsRef.current = newReports;
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

  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const getDaysArray = () => {
    const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayIndex = new Date(year, month, 1).getDay();
    const blanks = Array.from({length: firstDayIndex}, (_, i) => i);
    const days = Array.from({length: daysInMonth}, (_, i) => {
      const d = i + 1; const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = allReports[dateStr] || {};
      const utamaItems = Array.isArray(dayData.utama?.activeItems) ? dayData.utama.activeItems : [];
      const hasUtama = utamaItems.length > 0;
      const utamaSequence = dayData.utama?.sequence || '';
      const utamaTotal = hasUtama && dayData.utama?.formData ? Object.values(dayData.utama.formData).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
      const lainDocs = [];
      Object.keys(dayData).forEach(k => {
        if ((k === 'lain' || k.startsWith('lain_')) && Array.isArray(dayData[k].activeItems) && dayData[k].activeItems.length > 0) {
          lainDocs.push({ key: k, sequence: dayData[k].sequence || '', total: dayData[k].formData ? Object.values(dayData[k].formData).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0 });
        }
      });
      return { day: d, dateStr, hasUtama, utamaSequence, utamaTotal, lainDocs, hasLain: lainDocs.length > 0 };
    });
    return { blanks, days };
  };
  const { blanks, days } = getDaysArray();

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

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4"><AlertCircle size={28} /><h3 className="font-bold text-xl">Konfirmasi</h3></div>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{safeString(confirmDialog.message)}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDialog({isOpen: false, message: '', onConfirm: null})} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Batal</button>
              <button onClick={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({isOpen: false, message: '', onConfirm: null}); }} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md">Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {editNoteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-blue-600 mb-4"><Edit size={28} /><h3 className="font-bold text-xl">Edit Uraian Dinamis</h3></div>
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
                    } catch (e) {} finally { setIsGeneratingUraian(false); }
                  }}
                  disabled={!editNoteModal.newNote || isGeneratingUraian}
                  className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded border border-purple-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >{isGeneratingUraian ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} ✨ AI Rapikan</button>
              </div>
              <textarea 
                value={editNoteModal.newNote} onChange={(e) => setEditNoteModal(prev => ({...prev, newNote: e.target.value}))} rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 bg-gray-50 font-medium resize-none" placeholder="Masukkan keterangan baru..." autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditNoteModal({isOpen: false, group: null, item: null, newNote: ''})} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">Batal</button>
              <button onClick={saveEditedNote} disabled={!editNoteModal.newNote.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm disabled:opacity-50">Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {resetDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4"><AlertCircle size={28} /><h3 className="font-bold text-xl">Konfirmasi Reset</h3></div>
            <p className="text-gray-600 mb-4 text-sm font-medium">Apakah Anda yakin ingin <strong className="text-red-600">MENGHAPUS SEMUA DATA</strong> di form STSU {activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'} untuk tanggal ini? Data tidak dapat dikembalikan.</p>
            {resetDialog.error && <div className="bg-red-50 text-red-600 p-2 rounded text-xs mb-4 border border-red-100 font-semibold">{safeString(resetDialog.error)}</div>}
            <form onSubmit={handleConfirmReset}>
              <div className="mb-6"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Masukkan Password ADMIN</label><input type="password" value={resetDialog.password} onChange={(e) => setResetDialog(prev => ({...prev, password: e.target.value}))} placeholder="••••••••" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-red-500 bg-gray-50 font-bold" required autoFocus /></div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setResetDialog({isOpen: false, password: '', error: '', isVerifying: false})} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">Batal</button>
                <button type="submit" disabled={resetDialog.isVerifying} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm disabled:opacity-50">{resetDialog.isVerifying ? 'Memeriksa...' : 'Ya, Hapus Data'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
      {/* 🔴 TAB: DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'kalender' && (
<div className="max-w-6xl mx-auto px-4 py-6 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-center text-white">
              <h2 className="text-2xl font-black mb-1 drop-shadow-sm">Kalender Status STSU</h2>
              <p className="text-blue-100 text-sm opacity-90">Pantau kelengkapan STSU Pendapatan dan STSU Lain-lain.</p>
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
                {blanks.map(b => <div key={`blank-${b}`} className="h-28 sm:h-36 bg-gray-50/50 rounded-lg sm:rounded-xl"></div>)}
                {days.map(d => {
                  const isToday = d.dateStr === getLocalYMD();
                  const isActive = d.dateStr === reportDate;
                  return (
                    <button 
                      key={d.day} 
                      onClick={() => { handleDateChange(d.dateStr); setActiveTab('input'); setTopLevelRoute('operasional'); }}
                      className={`relative h-28 sm:h-36 rounded-lg sm:rounded-xl flex flex-col justify-start items-center pt-1.5 sm:pt-2 border transition-all overflow-hidden ${(d.hasUtama || d.hasLain) ? 'bg-blue-50/30 hover:bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200'} ${isActive ? 'ring-2 ring-blue-500 transform scale-105 z-10 bg-blue-50' : ''}`}
                    >
                      <span className={`text-sm sm:text-lg font-bold ${isToday ? 'text-blue-600 bg-blue-100 px-2 rounded-full' : 'text-gray-700'}`}>{d.day}</span>
                      <div className="mt-1 w-full px-1 flex flex-col gap-1 items-center overflow-y-auto no-scrollbar pb-1">
                        {d.hasUtama && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateChange(d.dateStr);
                              setActiveType('utama');
                              setActiveTab('input');
                              setTopLevelRoute('operasional');
                            }}
                            className="w-full bg-green-50 border border-green-200 rounded shadow-sm flex flex-col overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                            title="Klik untuk membuka dokumen STSU Utama (SU)"
                          >
                            <div className="bg-green-500 text-white flex justify-between items-center px-1.5 py-0.5"><span className="text-[9px] font-bold">SU</span>{d.utamaSequence && d.utamaSequence !== '...' && <span className="text-[9px] font-bold">{safeString(d.utamaSequence)}</span>}</div>
                            <div className="text-[9px] sm:text-[10px] font-black text-green-800 text-right px-1.5 py-0.5 truncate" title={`Rp ${formatRp(d.utamaTotal)}`}>Rp {formatRp(d.utamaTotal)}</div>
                          </div>
                        )}
                        {d.lainDocs.map((lainDoc, index) => {
                          const docNum = lainDoc.key === 'lain' ? 1 : (parseInt(lainDoc.key.split('_')[1], 10) || (index + 1));
                          return (
                            <div 
                              key={index} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateChange(d.dateStr);
                                setActiveType('lain');
                                setActiveLainIndex(docNum);
                                setActiveTab('input');
                                setTopLevelRoute('operasional');
                              }}
                              className="w-full bg-purple-50 border border-purple-200 rounded shadow-sm flex flex-col overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                              title={`Klik untuk membuka Dokumen Lain-lain (SU/L) Ke-${docNum}`}
                            >
                              <div className="bg-purple-500 text-white flex justify-between items-center px-1.5 py-0.5"><span className="text-[9px] font-bold">SU/L {docNum > 1 ? `Ke-${docNum}` : ''}</span>{lainDoc.sequence && lainDoc.sequence !== '...' && <span className="text-[9px] font-bold">{safeString(lainDoc.sequence)}</span>}</div>
                              <div className="text-[9px] sm:text-[10px] font-black text-purple-800 text-right px-1.5 py-0.5 truncate" title={`Rp ${formatRp(lainDoc.total)}`}>Rp {formatRp(lainDoc.total)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
</div>
)}

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
                     const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0) ? latestReportsRef.current : allReports;
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
                         const baseReports = (latestReportsRef.current && Object.keys(latestReportsRef.current).length > 0) ? latestReportsRef.current : allReports;
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

                          const baseBankRows = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0) ? prevBankRowsRef.current : bankRows;
                          const newBankRows = baseBankRows.map(r => r.id === bankRow.id ? { 
                              ...r, 
                              status: 'matched', 
                              matchedTo: targetSummary,
                              linkedTo: { date: ymd, groupName: targetSummary, proofUrl: matchedProofUrl || r.proofUrl || '' },
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
                         const baseReports = (prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports;
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

                          const baseBankRows = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0) ? prevBankRowsRef.current : bankRows;
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
                     const baseBankRows = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0) ? prevBankRowsRef.current : bankRows;
                     const newBankRows = baseBankRows.map(r => r.id === rowId ? { ...r, ...updates } : r);
                     setBankRows(newBankRows);
                     saveToFirebaseDirectly(latestReportsRef.current || allReports, newBankRows);
                 }}
                 onUnlinkBankRow={(bankRow) => {
                     try {
                         const baseReports = (prevReportsRef.current && Object.keys(prevReportsRef.current).length > 0) ? prevReportsRef.current : allReports;
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

                         const baseBankRows = (prevBankRowsRef.current && prevBankRowsRef.current.length > 0) ? prevBankRowsRef.current : bankRows;
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
      {activeTab === 'input' && (
        <div className="max-w-4xl mx-auto px-4 py-6 no-print">
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1.5 flex flex-col sm:flex-row w-full sm:w-auto">
              <button onClick={() => handleTypeSwitch('utama')} className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all ${activeType === 'utama' ? 'bg-green-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-green-50 hover:text-green-600'}`}>
                STSU Pendapatan
              </button>
              <button onClick={() => handleTypeSwitch('lain')} className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl font-bold flex items-center justify-center transition-all ${activeType === 'lain' ? 'bg-purple-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-purple-50 hover:text-purple-600'}`}>
                STSU Lain-lain
              </button>
            </div>
            
            {/* PANEL DUA TOMBOL ROBOT (3A & IWM) */}
            {activeType === 'utama' && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleOpenTransit3A}
                  className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm rounded-xl px-4 py-2.5 font-bold flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all group"
                >
                  <CloudDownload size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                  <span>Tarik 3A</span>
                </button>
                <button 
                  onClick={handleOpenTransitIWM}
                  className="bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 shadow-sm rounded-xl px-4 py-2.5 font-bold flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all group"
                >
                  <CloudDownload size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                  <span>Tarik IWM</span>
                </button>
              </div>
            )}
          </div>

          {activeType === 'lain' && (
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 items-center">
              {lainDocIndices.map(num => (
                <div key={num} className="relative flex-shrink-0 group">
                  <button
                    onClick={() => { 
                      if (inputSaveTimerRef.current) {
                        clearTimeout(inputSaveTimerRef.current);
                        inputSaveTimerRef.current = null;
                        saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows);
                      }
                      setActiveLainIndex(num); setSelectedCatToAdd(''); setSelectedItemToAdd(''); setManualNominalToAdd(''); setLainItemDate(''); setLainItemNote(''); 
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all border ${activeLainIndex === num ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                  >Dokumen Ke-{num}</button>
                  {num > 1 && <button onClick={(e) => { e.stopPropagation(); handleRemoveLainDoc(num); }} className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md z-10 hover:bg-red-600 border border-white transition-opacity ${activeLainIndex === num ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} title="Hapus Dokumen">✕</button>}
                </div>
              ))}
              <button onClick={handleAddLainDoc} className="px-3 py-2 ml-1 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100 flex items-center gap-1.5 shadow-sm"><Plus size={16} /> Tambah Dokumen</button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${activeType === 'utama' ? 'bg-green-500' : 'bg-purple-500'}`}>Dokumen {activeType === 'utama' ? 'STSU (SU)' : `Lain-lain (SU/L) - Ke ${activeLainIndex}`}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-3">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tgl Laporan (Di Atas)</label><input type="date" value={reportDate} onChange={(e) => handleDateChange(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 font-bold text-gray-700" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tgl Cetak (Bawah/TTD)</label><input type="date" value={currentReport.signatureDate} onChange={handleSignatureDateChange} onBlur={() => saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-blue-50 font-bold text-blue-700" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Urut STSU</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="07" value={currentReport.sequence || ''} onChange={handleSequenceChange} onBlur={() => saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows)} className="w-16 border border-gray-300 rounded-lg p-2.5 text-center font-bold outline-none focus:border-blue-500 bg-white shadow-inner text-lg" />
                  <div className="flex-1 border border-dashed border-gray-300 rounded-lg bg-gray-50 p-2 flex items-center overflow-x-auto min-w-0"><span className="font-mono font-bold text-gray-600 text-xs sm:text-sm whitespace-nowrap truncate">{safeString(computedStsuNo || 'Preview...')}</span></div>
                </div>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col justify-center shadow-inner items-end ${activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${activeType === 'utama' ? 'text-green-600' : 'text-purple-600'}`}>Total {activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'}</span>
                <span className={`text-lg sm:text-xl font-black truncate max-w-full ${activeType === 'utama' ? 'text-green-800' : 'text-purple-800'}`} title={`Rp ${formatRp(grandTotal)}`}>Rp {formatRp(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div id="form-tambah-transaksi" className={`${activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'} rounded-xl shadow-sm border p-4 mb-6 transition-colors`}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wide ${activeType === 'utama' ? 'text-green-800' : 'text-purple-800'}`}><Plus size={18} /> Tambah Transaksi Manual</h2>
              {activeType === 'utama' && (
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-yellow-700 bg-yellow-100/80 px-3 py-1.5 rounded-lg border border-yellow-300 hover:bg-yellow-200 transition-colors shadow-sm w-fit">
                  <input type="checkbox" checked={isAddingSusulan} onChange={e => setIsAddingSusulan(e.target.checked)} className="w-4 h-4 accent-yellow-600" /> Mode Susulan
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
                  <input type="date" value={lainItemDate} onChange={e => setLainItemDate(e.target.value)} className="border border-purple-300 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Kategori</label>
                  <select value={selectedCatToAdd} onChange={(e) => handleCatChange(e.target.value)} className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Pilih Kategori --</option>
                    {filteredCategories.map(cat => <option key={cat.id} value={cat.id} className="capitalize">{safeString(cat.name)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Sub-Kategori</label>
                  <select value={selectedItemToAdd} onChange={(e) => setSelectedItemToAdd(e.target.value)} disabled={!selectedCatToAdd || availableItemsToAdd.length === 0 || (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct')} className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500">
                    {!selectedCatToAdd ? <option value="">Pilih Kategori Dulu</option> : availableItemsToAdd.length === 0 ? <option value="">Semua item ditambahkan</option> : (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct') ? <option value="direct">Langsung isi nominal</option> : <option value="">-- Pilih Item --</option>}
                    {availableItemsToAdd.map(item => item.id !== 'direct' && <option key={item.id} value={item.id}>{safeString(item.name)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Nominal (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">Rp</span>
                    <input 
                      type="text" 
                      inputMode="numeric" 
                      placeholder="0" 
                      value={manualNominalToAdd ? formatRp(manualNominalToAdd) : ''} 
                      onChange={(e) => setManualNominalToAdd(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="w-full border border-gray-300 bg-white rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 text-right shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {activeType === 'lain' && (
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-semibold text-purple-700">Keterangan Tambahan / Uraian Dinamis (Cetak di Judul)</label>
                    <button onClick={handleGenerateUraian} disabled={!lainItemNote || isGeneratingUraian} className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded border border-purple-200 flex items-center gap-1 disabled:opacity-50 transition-colors">
                      {isGeneratingUraian ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} ✨ Rapikan Bahasa
                    </button>
                  </div>
                  <textarea value={lainItemNote} onChange={(e) => setLainItemNote(e.target.value)} rows={2} className="w-full border border-purple-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" placeholder="Contoh: Rombongan anak tk bintang pakai bus 20 org"></textarea>
                </div>
              )}
              <button onClick={handleAddActiveItem} disabled={!selectedCatToAdd || !selectedItemToAdd} className={`w-full mt-2 text-white p-3 rounded-lg font-bold flex justify-center items-center transition-colors shadow-sm disabled:bg-gray-300 ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>Add Transaksi</button>
            </div>
          </div>

          <div className="space-y-5">
            {activeGroups.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl"><AlertCircle size={40} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500 font-medium">Belum ada pendapatan yang dimasukkan.</p></div>
            ) : (
              activeGroups.map((group, idx) => (
                <div key={group.groupId} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${group.isSusulan ? 'border-yellow-300' : 'border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b flex justify-between items-center ${group.isSusulan ? 'bg-yellow-50 border-yellow-200' : (activeType === 'utama' ? 'bg-green-50/50 border-green-100' : 'bg-purple-50/50 border-purple-100')}`}>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${group.isSusulan ? 'bg-yellow-400 text-yellow-900' : (activeType === 'utama' ? 'bg-green-200 text-green-800' : 'bg-purple-200 text-purple-800')}`}>{idx + 1}</span> 
                      {safeString(group.name)}
                      {group.isSusulan && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 shadow-sm">Susulan: {formatTanggalTtd(group.validDate)}</span>}
                      {activeType === 'lain' && group.itemDate && <span className="text-[10px] bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 shadow-sm">Tanggal: {formatTanggalTtd(group.itemDate)}</span>}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {group.activeItems.map(item => {
                      const inputKey = getActiveItemKey(group.catId, item.id, group.isSusulan, group.validDate, group.itemDate, item.itemNote);
                      return (
                        <div key={inputKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start gap-2 sm:w-1/2">
                            <button onClick={() => handleRemoveActiveItem(item, inputKey)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm mt-0.5 shrink-0"><Trash size={18} /></button>
                            <div className="flex flex-col w-full">
                              <label className="text-gray-700 font-medium">
                                {item.id === 'direct' ? 'Nominal Pemasukan' : safeString(item.name)}
                              </label>
                              <div className="flex items-center gap-2 mt-1 group/note w-full">
                                {item.itemNote ? (
                                  <>
                                    <span className="text-xs text-purple-600 whitespace-pre-wrap font-medium flex-1">{safeString(item.itemNote)}</span>
                                    <button onClick={() => openEditNote(group, item)} className="text-gray-400 hover:text-blue-600 opacity-50 group-hover/note:opacity-100 transition-opacity bg-gray-50 p-1 rounded-md shrink-0" title="Edit Keterangan"><Edit size={14} /></button>
                                  </>
                                ) : (
                                  <button onClick={() => openEditNote(group, item)} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"><Edit size={12} /> Tambah Keterangan</button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="relative w-full sm:w-1/2 md:w-2/5 shrink-0 mt-2 sm:mt-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                            <input 
                              id={`input_${inputKey}`} type="text" inputMode="numeric" 
                              value={currentReport.formData[inputKey] ? formatRp(currentReport.formData[inputKey]) : ''} 
                              onChange={(e) => handleInputChange(inputKey, e.target.value)} 
                              onBlur={() => {
                                if (inputSaveTimerRef.current) clearTimeout(inputSaveTimerRef.current);
                                saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows);
                              }}
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') { 
                                  e.target.blur(); 
                                  if (inputSaveTimerRef.current) clearTimeout(inputSaveTimerRef.current);
                                  saveToFirebaseDirectly(latestReportsRef.current || allReports, bankRows); 
                                } 
                              }}
                              className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-right font-bold focus:ring-2 outline-none ${group.isSusulan ? 'border-yellow-300 focus:ring-yellow-500' : 'border-gray-300 focus:ring-green-500'}`} placeholder="0" 
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-2 border-t border-dashed border-gray-300 flex justify-between items-end text-sm font-bold text-gray-600">
                      <div className="flex flex-col gap-1.5">
                        <span>Sub Total:</span>
                        {group.activeItems.some(i => i.bankMatched) && (
                          <span className="text-[11px] font-bold text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-full w-max flex items-center gap-1 shadow-sm">
                            <CheckCircle size={12}/> Masuk Bank: {group.activeItems.find(i => i.bankMatched)?.bankMatchDate}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-800 text-base leading-none pb-1">Rp {formatRp(subtotals[group.groupId])}</span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {activeGroups.length > 0 && (
              <div className="flex justify-center mt-6 mb-8 pb-4">
                <button
                  onClick={() => { const el = document.getElementById('form-tambah-transaksi'); if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); } }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                ><ArrowUp size={20} /> Ke Atas (Tambah Data Lain)</button>
              </div>
            )}
          </div>

          <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="fixed bottom-28 right-4 sm:right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all z-40 group no-print border-2 border-white flex items-center justify-center">
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </button>

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
                <button onClick={clearCurrentReport} className="px-4 py-3 text-red-500 hover:bg-red-50 font-bold rounded-xl transition-colors text-sm border border-transparent hover:border-red-200">Reset</button>
                <button onClick={handleForceSave} className="px-4 py-3 text-blue-600 hover:bg-blue-50 font-bold rounded-xl transition-colors text-sm border border-blue-200 hover:border-blue-300 flex items-center gap-1.5 bg-white shadow-sm"><Save size={18} /> <span className="hidden sm:inline">Simpan</span></button>
                <button onClick={() => { setActiveTab('print'); setPrintMode('pdf'); }} disabled={activeGroups.length === 0} className={`flex-1 sm:flex-none text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-sm disabled:bg-gray-300 ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}><FileText size={20} /> Lihat Draft Cetak</button>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* ============================================================== */}
      {/* 🔴 TAB: SETTINGS (MASTER) */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto px-4 py-6 no-print space-y-6">
          
          {activeMasterMenu === 'menu' && (
            <div className="flex flex-col items-center mt-10">
               <h1 className="text-3xl font-black text-gray-800 mb-2">Master Menu Admin</h1>
               <p className="text-gray-500 mb-10">Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan</p>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                  
                  <button onClick={() => setActiveMasterMenu('kategori')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group">
                     <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Database size={32}/></div>
                     <div>
                        <h3 className="font-bold text-gray-800 text-lg mb-1">Database Kategori</h3>
                        <p className="text-xs text-gray-500">Kelola master data pos STSU utama & lain-lain.</p>
                     </div>
                  </button>

                  <button onClick={() => setActiveMasterMenu('pejabat')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group">
                     <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Edit size={32}/></div>
                     <div>
                        <h3 className="font-bold text-gray-800 text-lg mb-1">Pejabat Penandatangan</h3>
                        <p className="text-xs text-gray-500">Atur pejabat pencetak resi NCR dan laporan.</p>
                     </div>
                  </button>
                  
                  <button onClick={() => setActiveMasterMenu('koneksi')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4 group">
                     <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Cloud size={32}/></div>
                     <div>
                        <h3 className="font-bold text-gray-800 text-lg mb-1">Koneksi Server</h3>
                        <p className="text-xs text-gray-500">Konfigurasi alamat IP Address Bot Integrasi.</p>
                     </div>
                  </button>
               </div>
            </div>
          )}

          {activeMasterMenu !== 'menu' && (
            <div>
              <button onClick={() => setActiveMasterMenu('menu')} className="mb-6 text-gray-600 hover:text-gray-900 font-bold flex items-center gap-2 text-sm bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-colors hover:bg-gray-50 w-max">
                 <ChevronLeft size={16}/> Kembali ke Menu Master
              </button>

              {activeMasterMenu === 'koneksi' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2"><Cloud size={20} className="text-blue-500"/> Koneksi Server Bot Integrasi</h2>
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">IP Address / Hostname Komputer Server</label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <input type="text" value={apiIpAddress} onChange={e => setApiIpAddress(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-mono font-bold text-blue-700" placeholder="Contoh: localhost atau 192.168.1.5" />
                  </div>
                  <Database className="text-gray-400 shrink-0 hidden sm:block" size={24} />
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">Isi dengan <strong className="text-gray-700">localhost</strong> jika Bot Python berjalan di PC yang sama dengan Web App ini. Atau isi dengan <strong className="text-gray-700">demo</strong> untuk mode simulasi data sesungguhnya.</p>
                <div className="mt-3 text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-200 inline-block font-mono">
                  Sistem otomatis menembak Port <strong className="text-blue-600">5000 (3A)</strong> dan Port <strong className="text-purple-600">5001 (IWM)</strong> berdasarkan port standar Bot.
                </div>
              </div>
            </div>
          )}

              {activeMasterMenu === 'pejabat' && (
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
          )}
          
          {activeMasterMenu === 'kategori' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-5"><h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings size={20} className="text-blue-500"/> Database Kategori</h2></div>
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
                    {Array.isArray(cat.items) && cat.items.length === 0 && <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 mb-2 font-medium flex items-center gap-1"><CheckCircle size={14} /> Mode Langsung Input Nominal.</div>}
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
          )}
        </div>
        )}
      </div>
      )}

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
