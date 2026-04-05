import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock } from 'lucide-react';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [pdfLoading, setPdfLoading] = useState(false);

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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // --- CEK STATUS LOGIN ---
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // --- FUNGSI LOGIN & LOGOUT ---
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

  const [signatures, setSignatures] = useState(() => getInitialState('tmr_v17_signatures', {
    leftRole: 'Kepala Seksi Pelayanan dan Informasi',
    leftName: 'Afriana Pulungan S.Si. MAP',
    rightRole: 'Bendahara Penerimaan',
    rightName: 'Evi Irmawati',
    location: 'Jakarta'
  }));

  const [categories, setCategories] = useState(() => getInitialState('tmr_v17_categories', [
    { id: 'cat_1', name: 'pemakaian fasilitas TMR', type: 'utama', items: [{ id: 'item_1a', name: 'Promo Penjualan Produk' }, { id: 'item_1b', name: 'Penempatan banner promosi' }, { id: 'item_1c', name: 'Panggung' }] },
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

  const [allReports, setAllReports] = useState(() => getInitialState('tmr_v17_allReports', { [getLocalYMD()]: defaultReportData }));

  const [reportDate, setReportDate] = useState(getLocalYMD());
  const [activeType, setActiveType] = useState('utama'); 
  const [selectedCatToAdd, setSelectedCatToAdd] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => { localStorage.setItem('tmr_v17_signatures', JSON.stringify(signatures)); }, [signatures]);
  useEffect(() => { localStorage.setItem('tmr_v17_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('tmr_v17_allReports', JSON.stringify(allReports)); }, [allReports]);

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
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [signatures, categories, allReports, user, dbReady]);


  const showConfirm = (message, onConfirmAction) => {
    setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction });
  };

  const currentReport = useMemo(() => {
    const dayData = allReports[reportDate] || {};
    const typeData = dayData[activeType] || {};
    return {
      sequence: typeData.sequence || '',
      signatureDate: typeData.signatureDate || reportDate,
      activeItems: Array.isArray(typeData.activeItems) ? typeData.activeItems : [],
      formData: typeData.formData || {}
    };
  }, [allReports, reportDate, activeType]);

  const updateCurrentReport = (updater) => {
    setAllReports(prev => {
      const dayData = prev[reportDate] || {};
      const typeData = dayData[activeType] || { sequence: '', signatureDate: reportDate, activeItems: [], formData: {} };
      const updatedTypeData = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
      return { ...prev, [reportDate]: { ...dayData, [activeType]: updatedTypeData } };
    });
  };

  const handleSequenceChange = (e) => updateCurrentReport({ sequence: e.target.value });
  const handleSignatureDateChange = (e) => updateCurrentReport({ signatureDate: e.target.value });

  const handleDateChange = (newDateStr) => {
    setReportDate(newDateStr);
    setSelectedCatToAdd(''); setSelectedItemToAdd('');
  };

  const handleTypeSwitch = (type) => {
    setActiveType(type);
    setSelectedCatToAdd(''); setSelectedItemToAdd('');
  };

  const clearCurrentReport = () => {
    showConfirm(`Kosongkan form STSU ${activeType === 'utama' ? 'Pendapatan' : 'Lain-lain'} untuk tanggal ini?`, () => {
      updateCurrentReport({ sequence: '', signatureDate: reportDate, activeItems: [], formData: {} });
    });
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

  const handleAddActiveItem = () => {
    if (!selectedCatToAdd || !selectedItemToAdd) return;
    const catIdToFocus = selectedCatToAdd;
    const itemIdToFocus = selectedItemToAdd;

    updateCurrentReport(prev => {
      const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
      const currentForm = prev.formData || {};
      const exists = currentItems.find(i => i.catId === selectedCatToAdd && i.itemId === selectedItemToAdd);
      if (exists) return prev;
      return {
        ...prev,
        activeItems: [...currentItems, { catId: selectedCatToAdd, itemId: selectedItemToAdd }],
        formData: { ...currentForm, [`${selectedCatToAdd}_${selectedItemToAdd}`]: 0 }
      };
    });
    
    const cat = categories.find(c => c.id === selectedCatToAdd);
    if (cat && Array.isArray(cat.items) && cat.items.length === 0) setSelectedCatToAdd('');
    setSelectedItemToAdd('');

    setTimeout(() => {
      const inputElement = document.getElementById(`input_${catIdToFocus}_${itemIdToFocus}`);
      if (inputElement) inputElement.focus();
    }, 100);
  };

  const handleRemoveActiveItem = (catId, itemId) => {
    updateCurrentReport(prev => {
      const currentItems = Array.isArray(prev.activeItems) ? prev.activeItems : [];
      const newActive = currentItems.filter(i => !(i.catId === catId && i.itemId === itemId));
      const newFormData = { ...(prev.formData || {}) };
      delete newFormData[`${catId}_${itemId}`];
      return { ...prev, activeItems: newActive, formData: newFormData };
    });
  };

  const handleInputChange = (catId, itemId, value) => {
    const rawValue = value.replace(/[^0-9]/g, '');
    updateCurrentReport(prev => ({
      ...prev, formData: { ...(prev.formData || {}), [`${catId}_${itemId}`]: Number(rawValue) || 0 }
    }));
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
    if (!Array.isArray(cat.items) || cat.items.length === 0) {
      const isAlreadyActive = activeI.some(a => a.catId === selectedCatToAdd && a.itemId === 'direct');
      return isAlreadyActive ? [] : [{ id: 'direct', name: cat.name }];
    }
    return cat.items.filter(item => !activeI.some(a => a.catId === selectedCatToAdd && a.itemId === item.id));
  }, [selectedCatToAdd, categories, currentReport.activeItems]);

  const activeCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    const activeI = Array.isArray(currentReport.activeItems) ? currentReport.activeItems : [];
    return categories.map(cat => {
      const itemsForThisCat = [];
      if (!Array.isArray(cat.items) || cat.items.length === 0) {
        if (activeI.some(a => a.catId === cat.id && a.itemId === 'direct')) itemsForThisCat.push({ id: 'direct', name: cat.name });
      } else {
        cat.items.forEach(item => {
           if (activeI.some(a => a.catId === cat.id && a.itemId === item.id)) itemsForThisCat.push(item);
        });
      }
      return { ...cat, activeItems: itemsForThisCat };
    }).filter(cat => cat.activeItems.length > 0);
  }, [categories, currentReport.activeItems]);

  const { subtotals, grandTotal } = useMemo(() => {
    let gt = 0; const subs = {};
    const cForm = currentReport.formData || {};
    activeCategories.forEach(cat => {
      let sub = 0;
      cat.activeItems.forEach(item => { sub += cForm[`${cat.id}_${item.id}`] || 0; });
      subs[cat.id] = sub; gt += sub;
    });
    return { subtotals: subs, grandTotal: gt };
  }, [currentReport.formData, activeCategories]);

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
      const lainItems = Array.isArray(dayData.lain?.activeItems) ? dayData.lain.activeItems : [];
      return { day: d, dateStr, hasUtama: utamaItems.length > 0, hasLain: lainItems.length > 0 };
    });
    return { blanks, days };
  };
  const { blanks, days } = getDaysArray();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-area');
    if (!element) return;

    if (window.html2pdf) {
      setPdfLoading(true);
      const opt = {
        margin:       [10, 10, 10, 10], 
        filename:     `Laporan_TMR_${activeType.toUpperCase()}_${reportDate}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      window.html2pdf().set(opt).from(element).save().then(() => {
        setPdfLoading(false);
      }).catch(err => {
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
          <h1 className="text-2xl font-black text-center text-gray-800 mb-2">Sistem Laporan TMR</h1>
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
                placeholder="kasir@tmr.com"
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
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 disabled:bg-gray-400"
            >
              {isLoggingIn ? 'Memeriksa Kredensial...' : 'Masuk ke Aplikasi'}
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-gray-400">
            Akses Terbatas &bull; TMR Jakarta
          </div>
        </div>
      </div>
    );
  }


  // ==========================================
  // RENDER APLIKASI UTAMA JIKA SUDAH LOGIN
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-36 relative">
      <style>{`
        @media print {
          body { background-color: white; }
          .no-print { display: none !important; }
          .print-container { width: 100%; max-width: 100%; margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: black; box-shadow: none; border: none; }
          @page { margin: 15mm; }
        }
      `}</style>

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

      {/* --- NAVBAR --- */}
      <nav className="bg-green-700 text-white shadow-md sticky top-0 z-50 shrink-0 no-print">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="font-bold text-lg flex items-center gap-2 mr-4 shrink-0">
            <Calculator size={24} /> <span className="hidden sm:inline">Sistem TMR</span>
            
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
            <button onClick={() => setActiveTab('dashboard')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Calendar size={18} /> <span className="hidden md:inline">Dashboard</span></button>
            <button onClick={() => setActiveTab('input')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'input' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Edit size={18} /> <span className="hidden md:inline">Input</span></button>
            <button onClick={() => setActiveTab('settings')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Settings size={18} /> <span className="hidden md:inline">Master</span></button>
            <button onClick={() => setActiveTab('print')} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'print' ? 'bg-green-800' : 'hover:bg-green-600'}`}><FileText size={18} /> <span className="hidden md:inline">Cetak</span></button>
            
            {/* TOMBOL LOGOUT BARU */}
            <div className="pl-2 border-l border-green-600 ml-1">
              <button onClick={handleLogout} className="px-2 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 transition-colors" title="Keluar Akun">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- KONTEN UTAMA --- */}
      
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
                {blanks.map(b => <div key={`blank-${b}`} className="h-16 sm:h-24 bg-gray-50/50 rounded-lg sm:rounded-xl"></div>)}
                {days.map(d => {
                  const isToday = d.dateStr === getLocalYMD();
                  const isActive = d.dateStr === reportDate;
                  return (
                    <button 
                      key={d.day} 
                      onClick={() => { handleDateChange(d.dateStr); setActiveTab('input'); }}
                      className={`relative h-16 sm:h-24 rounded-lg sm:rounded-xl flex flex-col justify-start items-center pt-1.5 sm:pt-3 border transition-all ${(d.hasUtama || d.hasLain) ? 'bg-blue-50/30 hover:bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200'} ${isActive ? 'ring-2 ring-blue-500 transform scale-105 z-10 bg-blue-50' : ''}`}
                    >
                      <span className={`text-sm sm:text-lg font-bold ${isToday ? 'text-blue-600 bg-blue-100 px-2 rounded-full' : 'text-gray-700'}`}>{d.day}</span>
                      <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row gap-0.5 sm:gap-1 w-full px-1 items-center justify-center">
                        {d.hasUtama && <span className="bg-green-500 text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm w-full sm:w-auto truncate">SU</span>}
                        {d.hasLain && <span className="bg-purple-500 text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm w-full sm:w-auto truncate">SU/L</span>}
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
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2"><Edit size={20} className="text-blue-500"/> Pejabat Penandatangan PDF</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">Pihak Kiri (Penyetor)</h3>
                <div><label className="text-xs text-gray-500 uppercase">Jabatan</label><input type="text" value={signatures.leftRole || ''} onChange={(e) => setSignatures({...signatures, leftRole: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">Nama</label><input type="text" value={signatures.leftName || ''} onChange={(e) => setSignatures({...signatures, leftName: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none font-bold focus:border-blue-500" /></div>
              </div>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">Pihak Kanan (Bendahara)</h3>
                <div><label className="text-xs text-gray-500 uppercase">Lokasi</label><input type="text" value={signatures.location || ''} onChange={(e) => setSignatures({...signatures, location: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">Jabatan</label><input type="text" value={signatures.rightRole || ''} onChange={(e) => setSignatures({...signatures, rightRole: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase">Nama</label><input type="text" value={signatures.rightName || ''} onChange={(e) => setSignatures({...signatures, rightName: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm mt-1 outline-none font-bold focus:border-blue-500" /></div>
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
                        <button onClick={() => moveCategory(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp size={16}/></button>
                        <button onClick={() => moveCategory(index, 'down')} disabled={index === categories.length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown size={16}/></button>
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
                    {Array.isArray(cat.items) && cat.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Tag size={14} className="text-gray-400"/>
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${activeType === 'utama' ? 'bg-green-500' : 'bg-purple-500'}`}>Dokumen {activeType === 'utama' ? 'STSU (SU)' : 'Lain-lain (SU/L)'}</div>
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

          <div className={`${activeType === 'utama' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'} rounded-xl shadow-sm border p-4 mb-6 transition-colors`}>
            <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide ${activeType === 'utama' ? 'text-green-800' : 'text-purple-800'}`}><Plus size={18} /> Tambah Transaksi {activeType === 'utama' ? 'SU' : 'SU/L'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Kategori</label>
                <select value={selectedCatToAdd} onChange={(e) => handleCatChange(e.target.value)} className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Pilih Kategori --</option>
                  {filteredCategories.map(cat => <option key={cat.id} value={cat.id} className="capitalize">{cat.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-5">
                <label className={`block text-xs font-semibold mb-1 ${activeType === 'utama' ? 'text-green-700' : 'text-purple-700'}`}>Sub-Kategori</label>
                <select value={selectedItemToAdd} onChange={(e) => setSelectedItemToAdd(e.target.value)} disabled={!selectedCatToAdd || availableItemsToAdd.length === 0 || (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct')} className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500">
                  {!selectedCatToAdd ? <option value="">Pilih Kategori Dulu</option> : 
                   availableItemsToAdd.length === 0 ? <option value="">Semua item ditambahkan</option> :
                   (availableItemsToAdd.length === 1 && availableItemsToAdd[0].id === 'direct') ? <option value="direct">Langsung isi nominal</option> :
                   <option value="">-- Pilih Item --</option>}
                  {availableItemsToAdd.map(item => item.id !== 'direct' && <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 mt-2 sm:mt-0">
                <button onClick={handleAddActiveItem} disabled={!selectedCatToAdd || !selectedItemToAdd} className={`w-full text-white p-2.5 rounded-lg font-bold flex justify-center items-center transition-colors disabled:bg-gray-300 ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>Add</button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {activeCategories.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
                <AlertCircle size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium">Belum ada pendapatan yang dimasukkan.</p>
              </div>
            ) : (
              activeCategories.map((cat, idx) => (
                <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`px-4 py-3 border-b flex justify-between items-center ${activeType === 'utama' ? 'bg-green-50/50 border-green-100' : 'bg-purple-50/50 border-purple-100'}`}>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeType === 'utama' ? 'bg-green-200 text-green-800' : 'bg-purple-200 text-purple-800'}`}>{idx + 1}</span> {cat.name}</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {cat.activeItems.map(item => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 sm:w-1/2">
                          <button onClick={() => handleRemoveActiveItem(cat.id, item.id)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm"><Trash size={18} /></button>
                          <label className="text-gray-700 font-medium">{item.id === 'direct' ? 'Nominal Pemasukan' : item.name}</label>
                        </div>
                        <div className="relative w-full sm:w-1/2 md:w-2/5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                          <input 
                            id={`input_${cat.id}_${item.id}`}
                            type="text" inputMode="numeric" 
                            value={currentReport.formData[`${cat.id}_${item.id}`] ? formatRp(currentReport.formData[`${cat.id}_${item.id}`]) : ''} 
                            onChange={(e) => handleInputChange(cat.id, item.id, e.target.value)} 
                            className={`w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-right font-bold focus:ring-2 outline-none ${activeType === 'utama' ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-purple-500 focus:border-purple-500'}`} 
                            placeholder="0" 
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 mt-2 border-t border-dashed border-gray-300 flex justify-between items-center text-sm font-bold text-gray-600">
                      <span>Sub Total:</span><span className="text-gray-800 text-base">Rp {formatRp(subtotals[cat.id])}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Baris Bawah Mengambang (Floating Footer) */}
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
                <button onClick={() => setActiveTab('print')} disabled={activeCategories.length === 0} className={`flex-1 sm:flex-none text-white px-6 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-sm disabled:bg-gray-300 ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}><FileText size={20} /> Lihat PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: CETAK PDF === */}
      {activeTab === 'print' && (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
             <div>
               <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                 <FileText size={20} className={activeType === 'utama' ? 'text-green-600' : 'text-purple-600'}/> 
                 Preview & Download: {activeType === 'utama' ? 'STSU Pendapatan' : 'STSU Lain-lain'}
               </h2>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
               <button onClick={() => setActiveTab('input')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex-1 sm:flex-none">Kembali Edit</button>
               
               <button onClick={handleDownloadPDF} disabled={pdfLoading} className={`px-4 py-2 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md ${activeType === 'utama' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} disabled:opacity-50`}>
                 {pdfLoading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                 {pdfLoading ? 'Memproses...' : 'Unduh PDF'}
               </button>

               <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-md" title="Membuka dialog cetak mesin printer">
                 <Printer size={18} /> Cetak Printer
               </button>
             </div>

          </div>

          <div id="printable-area" className="print-container bg-white p-6 sm:p-10 shadow-lg min-h-[297mm] mx-auto border border-gray-200 text-black relative">
            
            <div className="absolute top-10 right-10 text-gray-200 font-bold text-3xl opacity-50 uppercase tracking-widest print:opacity-0 pointer-events-none">
              DRAFT {activeType === 'utama' ? 'SU' : 'SU/L'}
            </div>

            <div className="font-bold underline mb-8 text-[11pt]">No. {computedStsuNo}</div>

            <div className="mb-6 text-[11pt]">
              Diterima uang hasil pendapatan {formatTanggalCetak(reportDate)} sebagai berikut;
            </div>

            <div className="space-y-2">
              {activeCategories.map((cat, index) => {
                if (subtotals[cat.id] === 0) return null;
                const isDirect = Array.isArray(cat.activeItems) && cat.activeItems.length === 1 && cat.activeItems[0].id === 'direct';

                return (
                  <div key={cat.id} className="text-[11pt] pb-3">
                    <div className="font-bold mb-1">
                      {index + 1}. Diterima uang hasil pendapatan {cat.name} sebagai berikut :
                    </div>
                    
                    <div className="w-full">
                      {!isDirect && cat.activeItems.map(item => {
                        const val = (currentReport.formData || {})[`${cat.id}_${item.id}`] || 0;
                        if (val === 0) return null;
                        return (
                          <div key={item.id} className="flex w-full max-w-[450px] mb-0.5 pl-4 sm:pl-6">
                            <span className="flex-1 pr-2">{item.name}</span>
                            <span className="w-[40px] text-left">Rp.</span>
                            <span className="w-[100px] text-right">{formatRp(val)}</span>
                          </div>
                        );
                      })}
                      
                      <div className={`flex w-full font-bold ${isDirect ? '' : 'mt-1 pt-1'}`}>
                        <span className="flex-1 text-right pr-6">{isDirect ? 'Nominal' : 'Sub Total'}</span>
                        <span className="w-[40px] text-left">Rp.</span>
                        <span className="w-[120px] text-right">{formatRp(subtotals[cat.id])}</span>
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
                Disetor uang kebendahara penerimaan hasil retribusi layanan masuk tempat rekreasi dan pemakaian fasilitas TMR Pada hari {formatTanggalCetak(reportDate)} dengan STSU No. {computedStsuNo} dengan uang sebesar Rp. {formatRp(grandTotal)}
              </p>
            </div>

            <div className="flex justify-between mt-16 text-center text-[11pt]">
              <div className="w-[45%] flex flex-col justify-between">
                <div><br/>{signatures.leftRole}</div>
                <div className="mt-28 font-bold underline">({signatures.leftName})</div>
              </div>
              <div className="w-[45%] flex flex-col justify-between">
                <div>{signatures.location}, {formatTanggalTtd(currentReport.signatureDate)}<br/>{signatures.rightRole}</div>
                <div className="mt-24 font-bold underline">({signatures.rightName})</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
