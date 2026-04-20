import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Edit, Printer, Plus, Trash, FileText, Calculator, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Tag, Cloud, CloudOff, RefreshCw, ArrowUp, ArrowDown, Download, LogOut, Lock, Save, ClipboardCheck, ArrowRightLeft } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ==========================================
// 🔴 KONFIGURASI DATABASE FIREBASE 🔴
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

const getLainKeys = (dayData) => {
  let keys = Object.keys(dayData || {}).filter(k => k === 'lain' || k.startsWith('lain_'));
  keys.sort((a, b) => {
    const getNum = (k) => k === 'lain' ? 1 : parseInt(k.split('_')[1] || 1);
    return getNum(a) - getNum(b);
  });
  return keys;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [resetDialog, setResetDialog] = useState({ isOpen: false, password: '', error: '', isVerifying: false });
  const [saveToast, setSaveToast] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // --- STATE TRANSIT DATA (FITUR BARU) ---
  const [isTransitOpen, setIsTransitOpen] = useState(false);
  const [transitData, setTransitData] = useState([]);

  // --- AUTH & FIREBASE ---
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline');

  // --- STATE 3A ---
  const [ipRobot, setIpRobot] = useState(() => localStorage.getItem('tmr_ip_robot') || '');
  const [isFetching3A, setIsFetching3A] = useState(false);

  // --- DATA STORAGE (DIKEMBALIKAN KE DATABASE ASLI AGAR DATA LAMA MUNCUL) ---
  const getInitialState = (key, defaultValue) => {
    try { const saved = localStorage.getItem(key); if (saved) return JSON.parse(saved); } catch (e) {}
    return defaultValue;
  };

  const [signatures, setSignatures] = useState(() => getInitialState('tmr_signatures', {
    leftRole: 'Kepala Seksi Pelayanan dan Informasi',
    leftName: 'Afriana Pulungan, S.Si., M.AP.',
    leftNip: '197304212007012021',
    rightRole: 'Bendahara Penerimaan',
    rightName: 'Evi Irmawati',
    rightNip: '198101082009042006',
    location: 'Jakarta'
  }));

  const [categories, setCategories] = useState(() => getInitialState('tmr_categories', [
    { id: 'cat_1', name: 'pemakaian fasilitas TMR', type: 'utama', items: [{ id: 'item_1a', name: 'Promo Penjualan Produk' }, { id: 'item_1b', name: 'Penempatan banner promosi' }] },
    { id: 'cat_2', name: 'Retribusi Pedagang', type: 'utama', items: [{ id: 'item_2a', name: 'Retribusi pedagang Hari Biasa' }, { id: 'item_2b', name: 'Retribusi pedagang Hari Besar' }] },
    { id: 'cat_3', name: 'Pendapatan Retribusi Juru Foto', type: 'utama', items: [] },
    { id: 'cat_4', name: 'Penyediaan satwa jinak untuk berfoto', type: 'utama', items: [] },
    { id: 'cat_5', name: 'E-ticketing New Gate', type: 'utama', items: [{ id: 'item_1', name: 'Dewasa' }, { id: 'item_2', name: 'Anak' }, { id: 'item_8', name: 'Taman Satwa Anak' }] },
    { id: 'cat_6', name: 'Ticket online', type: 'utama', items: [{ id: 'item_1', name: 'Dewasa' }, { id: 'item_2', name: 'Anak' }, { id: 'item_8', name: 'Taman Satwa Anak' }] },
    { id: 'cat_7', name: 'TVM', type: 'utama', items: [{ id: 'item_1', name: 'Dewasa' }, { id: 'item_2', name: 'Anak' }, { id: 'item_8', name: 'Taman Satwa Anak' }] }
  ]));

  const [allReports, setAllReports] = useState(() => getInitialState('tmr_allReports', {}));
  const [reportDate, setReportDate] = useState(getLocalYMD());
  const [activeType, setActiveType] = useState('utama'); 
  const [selectedCatToAdd, setSelectedCatToAdd] = useState('');
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isAddingSusulan, setIsAddingSusulan] = useState(false);
  const [susulanValidDate, setSusulanValidDate] = useState('');

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('tmr_signatures', JSON.stringify(signatures)); }, [signatures]);
  useEffect(() => { localStorage.setItem('tmr_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('tmr_allReports', JSON.stringify(allReports)); }, [allReports]);
  useEffect(() => { localStorage.setItem('tmr_ip_robot', ipRobot); }, [ipRobot]);

  // --- FIREBASE SYNC (MENGGUNAKAN DOC ASLI) ---
  const getDocRef = () => doc(db, 'tmr_data', 'rekapitulasi_laporan');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const load = async () => {
      setSyncStatus('syncing');
      try {
        const snap = await getDoc(getDocRef());
        if (snap.exists()) {
          const d = snap.data();
          if (d.signatures) setSignatures(d.signatures);
          if (d.categories) setCategories(d.categories);
          if (d.allReports) setAllReports(d.allReports);
        }
        setDbReady(true); setSyncStatus('synced');
      } catch (e) { setSyncStatus('offline'); }
    };
    load();
  }, [user]);

  const handleForceSave = async () => {
    if (!user || !dbReady) return;
    setSyncStatus('syncing');
    try {
      await setDoc(getDocRef(), { signatures, categories, allReports, lastUpdated: new Date().toISOString() });
      setSyncStatus('synced'); setSaveToast(true); setTimeout(() => setSaveToast(false), 3000);
    } catch(e) { setSyncStatus('offline'); }
  };

  const showConfirm = (message, onConfirmAction) => {
    setConfirmDialog({ isOpen: true, message, onConfirm: onConfirmAction });
  };

  // --- ADDED MISSING LOGIN HANDLER ---
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
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

  // --- LOGIC ---
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
      const updated = typeof updater === 'function' ? updater(typeData) : { ...typeData, ...updater };
      return { ...prev, [reportDate]: { ...dayData, [activeType]: updated } };
    });
  };

  const calcTotal = (data) => Object.values(data?.formData || {}).reduce((a, b) => a + (Number(b) || 0), 0);

  const clearCurrentReport = () => {
    setResetDialog({ isOpen: true, password: '', error: '', isVerifying: false });
  };

  // ==========================================
  // 🟢 LOGIKA TRANSIT & SINKRONISASI 3A 🟢
  // ==========================================
  const handleTarikData3A = async () => {
    if (!ipRobot) { alert("IP PC Robot belum diatur!"); return; }
    setIsFetching3A(true);
    try {
      const res = await fetch(`http://${ipRobot}:5000/api/tarik_rekon_3a?tanggal=${reportDate}`);
      if (!res.ok) throw new Error("Gagal hubungi server robot.");
      const dataResponse = await res.json();
      const rekon = dataResponse.rekon_data || {};
      
      const newTransitList = [];

      // Pemetaan Channel API ke catId Aplikasi
      const channelMap = {
        'GATE': { catId: 'cat_5', label: 'New Gate' },
        'MERCHANT_PAGE': { catId: 'cat_6', label: 'Ticket Online' },
        'TVM': { catId: 'cat_7', label: 'TVM' }
      };

      Object.keys(channelMap).forEach(channel => {
        const source = rekon[channel] || {};
        const mapping = channelMap[channel];

        Object.keys(source).forEach(idx => {
          const apiItem = source[idx];
          const nominal = Number(apiItem.nominal) || 0;
          if (nominal === 0) return; 

          // Cek apakah item ini ada di kategori aplikasi kita
          const cat = categories.find(c => c.id === mapping.catId);
          const foundAppItem = cat?.items.find(i => i.id === `item_${idx}`);

          newTransitList.push({
            channel: mapping.label,
            catId: mapping.catId,
            itemId: `item_${idx}`,
            apiName: apiItem.nama || `Tiket ID ${idx}`,
            appName: foundAppItem ? foundAppItem.name : `[TIDAK SINKRON/BARU]`,
            nominal: nominal,
            isMapped: !!foundAppItem
          });
        });
      });

      if (newTransitList.length === 0) {
        alert("Tidak ada data pendapatan untuk tanggal ini di sistem 3A.");
      } else {
        setTransitData(newTransitList);
        setIsTransitOpen(true);
      }
    } catch (e) { 
      alert(`Error: ${e.message}. Pastikan Robot PC menyala dan API berjalan.`); 
    } finally { 
      setIsFetching3A(false); 
    }
  };

  const handleValidasiTransit = () => {
    // Proses pemindahan data dari transit ke sistem rekap
    updateCurrentReport(prev => {
      const newForm = { ...prev.formData };
      const newActive = [...prev.activeItems];

      transitData.forEach(item => {
        const key = `cat_${item.catId.split('_')[1]}_item_${item.itemId.split('_')[1]}`;
        newForm[key] = item.nominal;

        if (!newActive.find(i => i.catId === item.catId && i.itemId === item.itemId && !i.isSusulan)) {
          newActive.push({ catId: item.catId, itemId: item.itemId, isSusulan: false });
        }
      });

      return { ...prev, formData: newForm, activeItems: newActive };
    });

    setIsTransitOpen(false);
    setTransitData([]);
    alert("Berhasil! Data 3A telah divalidasi dan disinkronkan ke dalam form STSU.");
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetDialog(p => ({ ...p, isVerifying: true }));
    try {
      await signInWithEmailAndPassword(auth, user.email, resetDialog.password);
      updateCurrentReport({ sequence: '', activeItems: [], formData: {} });
      setResetDialog({ isOpen: false, password: '', error: '', isVerifying: false });
    } catch (err) { setResetDialog(p => ({ ...p, isVerifying: false, error: 'Password salah!' })); }
  };

  const handleSequenceChange = (e) => {
    const val = e.target.value;
    updateCurrentReport({ sequence: val });
  };

  const handleDateChange = (val) => {
    setReportDate(val);
    setSelectedCatToAdd('');
    setSelectedItemToAdd('');
  };

  const handleTypeSwitch = (type) => {
    setActiveType(type);
    setSelectedCatToAdd('');
    setSelectedItemToAdd('');
  };

  const handleCatChange = (catId) => {
    setSelectedCatToAdd(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && (!cat.items || cat.items.length === 0)) {
      setSelectedItemToAdd('direct');
    } else {
      setSelectedItemToAdd('');
    }
  };

  const handleAddActiveItem = () => {
    if (!selectedCatToAdd || !selectedItemToAdd) return;
    updateCurrentReport(prev => {
      const items = [...prev.activeItems];
      if (!items.find(i => i.catId === selectedCatToAdd && i.itemId === selectedItemToAdd && !!i.isSusulan === isAddingSusulan && i.validDate === susulanValidDate)) {
        items.push({ catId: selectedCatToAdd, itemId: selectedItemToAdd, isSusulan: isAddingSusulan, validDate: susulanValidDate });
      }
      return { ...prev, activeItems: items };
    });
    setSelectedItemToAdd('');
  };

  const handleRemoveActiveItem = (catId, itemId, isSus, validDate) => {
    updateCurrentReport(prev => ({
      ...prev,
      activeItems: prev.activeItems.filter(i => !(i.catId === catId && i.itemId === itemId && !!i.isSusulan === !!isSus && i.validDate === validDate))
    }));
  };

  const handleInputChange = (key, val) => {
    const num = val.replace(/[^0-9]/g, '');
    updateCurrentReport(prev => ({
      ...prev,
      formData: { ...prev.formData, [key]: Number(num) || 0 }
    }));
  };

  const filteredCategories = useMemo(() => {
    const base = activeType.startsWith('lain') ? 'lain' : 'utama';
    return categories.filter(c => c.type === base);
  }, [categories, activeType]);

  const getInputKey = (catId, itemId, isSus, validDate) => isSus ? `${catId}_${itemId}_susulan_${validDate}` : `${catId}_${itemId}`;

  const activeGroups = useMemo(() => {
    const groups = [];
    categories.forEach((cat, idx) => {
      const matched = currentReport.activeItems.filter(ai => ai.catId === cat.id);
      const configs = [];
      matched.forEach(m => {
        const key = m.isSusulan ? `susulan_${m.validDate}` : 'normal';
        if (!configs.find(c => c.key === key)) configs.push({ key, isSusulan: !!m.isSusulan, validDate: m.validDate });
      });
      configs.forEach(conf => {
        const items = [];
        const subItems = currentReport.activeItems.filter(ai => ai.catId === cat.id && !!ai.isSusulan === conf.isSusulan && ai.validDate === conf.validDate);
        subItems.forEach(si => {
          const found = (cat.items || []).find(i => i.id === si.itemId) || (si.itemId === 'direct' ? { id: 'direct', name: cat.name } : null);
          if (found) items.push(found);
        });
        if (items.length > 0) groups.push({ groupId: `${cat.id}_${conf.key}`, catId: cat.id, name: cat.name, ...conf, items, catIndex: idx });
      });
    });
    return groups.sort((a,b) => (a.isSusulan ? 1 : -1) || a.catIndex - b.catIndex);
  }, [categories, currentReport.activeItems]);

  const grandTotal = useMemo(() => Object.values(currentReport.formData).reduce((a, b) => a + (Number(b) || 0), 0), [currentReport.formData]);

  const computedStsuNo = useMemo(() => {
    if (!reportDate) return '';
    const [y, m, d] = reportDate.split('-');
    const typeCode = activeType.startsWith('lain') ? 'SU/L' : 'SU';
    return `${currentReport.sequence || '...'}/${d}/${m}/${typeCode}/${y}`;
  }, [reportDate, activeType, currentReport.sequence]);

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-area');
    if (!element) return;
    if (window.html2pdf) {
      setPdfLoading(true);
      const opt = {
        margin:       [10, 10, 10, 10], 
        filename:     `Laporan_STSU_${!activeType.startsWith('lain') ? 'PENDAPATAN' : 'LAIN'}_${reportDate}.pdf`,
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


  // --- RENDER ---
  if (!authReady) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">Memuat Keamanan Sistem...</div>;
  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-blue-900 p-4">
      <form onSubmit={(e) => { handleLogin(e); }} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
            <Lock size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-black text-center mb-8 text-gray-800">LOGIN SISTEM REKAP STSU</h1>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 p-4 rounded-2xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="Email Akun Admin" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 p-4 rounded-2xl mb-8 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="Password" required />
        <button disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50">
           {isLoggingIn ? 'MEMERIKSA...' : 'MASUK APLIKASI'}
        </button>
        {loginError && <p className="text-red-500 text-xs text-center mt-4 font-bold flex items-center justify-center gap-1"><AlertCircle size={14}/> {loginError}</p>}
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-32">
      <style>{`
        @media print {
          body { background-color: white; }
          .no-print { display: none !important; }
          .print-container { width: 100%; max-width: 100%; margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: black; box-shadow: none; border: none; }
          @page { margin: 15mm; }
        }
      `}</style>

      {saveToast && <div className="fixed top-5 right-5 bg-green-600 text-white p-4 rounded-2xl shadow-xl z-[9999] animate-bounce font-bold flex items-center gap-2"><CheckCircle size={20}/> Data Tersimpan ke Cloud!</div>}

      {/* MODAL TRANSIT & VALIDASI 3A */}
      {isTransitOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-blue-600 rounded-t-3xl text-white">
              <div className="flex items-center gap-3">
                <ArrowRightLeft size={24} />
                <h3 className="text-xl font-bold">Menu Transit & Validasi Data 3A</h3>
              </div>
              <button onClick={() => setIsTransitOpen(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition-all"><Plus size={20} className="rotate-45" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-6 text-sm text-blue-800 flex gap-3">
                <AlertCircle size={24} className="shrink-0" />
                <p>Data di bawah ditarik dari Sistem 3A. Silakan cek apakah <strong>Nama Tiket di API</strong> sudah sinkron dengan <strong>Nama Tiket di Aplikasi</strong>. Jika ada label <span className="font-bold text-red-600 underline">Tidak Sinkron</span>, nominal tetap akan diteruskan sesuai Mapping ID.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold tracking-widest">
                      <th className="p-3 rounded-l-xl">Kanal / Channel</th>
                      <th className="p-3">Nama Tiket (API 3A)</th>
                      <th className="p-3">Sinkronisasi App</th>
                      <th className="p-3 rounded-r-xl text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transitData.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-blue-600">{item.channel}</td>
                        <td className="p-3 text-gray-700">{item.apiName}</td>
                        <td className="p-3">
                          {item.isMapped ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 w-fit">
                              <CheckCircle size={10} /> {item.appName}
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 w-fit">
                              <AlertCircle size={10} /> Tidak Sinkron
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black">Rp {formatRp(item.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-3xl flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Data Transit</p>
                <p className="text-xl font-black text-blue-700">Rp {formatRp(transitData.reduce((a,b) => a + b.nominal, 0))}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsTransitOpen(false)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-2xl transition-all">BATAL</button>
                <button onClick={handleValidasiTransit} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-all">
                  <ClipboardCheck size={20} /> VALIDASI & MASUKKAN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="font-bold text-xl">Konfirmasi</h3>
            </div>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDialog({isOpen: false, message: '', onConfirm: null})} className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Batal</button>
              <button onClick={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({isOpen: false, message: '', onConfirm: null}); }} className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md">Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-blue-800 text-white p-4 sticky top-0 z-50 flex justify-between items-center no-print shadow-lg">
        <div className="font-bold flex items-center gap-2 text-lg"><Calculator size={24}/> SISTEM REKAP STSU </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-xl transition-all ${activeTab==='dashboard'?'bg-blue-900 shadow-inner scale-110':'hover:bg-blue-700 opacity-70'}`} title="Dashboard"><Calendar size={20}/></button>
          <button onClick={() => setActiveTab('input')} className={`p-2 rounded-xl transition-all ${activeTab==='input'?'bg-blue-900 shadow-inner scale-110':'hover:bg-blue-700 opacity-70'}`} title="Input Data"><Edit size={20}/></button>
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-xl transition-all ${activeTab==='settings'?'bg-blue-900 shadow-inner scale-110':'hover:bg-blue-700 opacity-70'}`} title="Settings"><Settings size={20}/></button>
          <button onClick={() => setActiveTab('print')} className={`p-2 rounded-xl transition-all ${activeTab==='print'?'bg-blue-900 shadow-inner scale-110':'hover:bg-blue-700 opacity-70'}`} title="Cetak PDF"><FileText size={20}/></button>
          <button onClick={() => signOut(auth)} className="ml-2 p-2 hover:bg-red-600 rounded-xl transition-all bg-red-500/20"><LogOut size={20}/></button>
        </div>
      </nav>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="max-w-4xl mx-auto p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1))} className="p-3 border-2 rounded-2xl hover:bg-gray-100 transition-all shadow-sm"><ChevronLeft/></button>
              <h2 className="text-xl font-black uppercase tracking-widest text-gray-800">{calendarMonth.toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</h2>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1))} className="p-3 border-2 rounded-2xl hover:bg-gray-100 transition-all shadow-sm"><ChevronRight/></button>
            </div>
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(h => <div key={h} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>)}
              {Array.from({length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()}).map((_,i) => <div key={i} className="bg-gray-50/30 rounded-2xl border-none"></div>)}
              {Array.from({length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 0).getDate()}).map((_,i) => {
                const day = i+1;
                const dStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const data = allReports[dStr] || {};
                const ut = data.utama || {};
                const utTotal = calcTotal(ut);
                const lKeys = getLainKeys(data);
                return (
                  <div key={day} onClick={() => { setReportDate(dStr); setActiveTab('input'); }} className={`min-h-[100px] sm:min-h-[120px] p-2 border-2 rounded-2xl flex flex-col items-center cursor-pointer transition-all ${dStr===reportDate?'ring-4 ring-blue-500/30 bg-blue-50 border-blue-300':'bg-white hover:bg-gray-50 border-gray-100 shadow-sm'}`}>
                    <span className={`text-sm font-black mb-2 px-2.5 py-0.5 rounded-full ${dStr===getLocalYMD()?'bg-blue-600 text-white shadow-md':'text-gray-400'}`}>{day}</span>
                    <div className="w-full flex flex-col gap-1 overflow-hidden">
                      {utTotal > 0 && (
                        <div className="bg-green-600 text-white text-[8px] sm:text-[10px] w-full p-1 sm:p-1.5 rounded-lg shadow-sm font-bold text-left leading-tight">
                          <div className="opacity-90 font-medium text-[8px] sm:text-[9px] truncate">SU: {ut.sequence || '-'}</div>
                          <div className="truncate">Rp {formatRp(utTotal)}</div>
                        </div>
                      )}
                      {lKeys.map(k => {
                        const lTot = calcTotal(data[k]);
                        if(lTot === 0) return null;
                        return (
                          <div key={k} className="bg-purple-600 text-white text-[8px] sm:text-[10px] w-full p-1 sm:p-1.5 rounded-lg shadow-sm font-bold text-left leading-tight">
                            <div className="opacity-90 font-medium text-[8px] sm:text-[9px] truncate">SU/L: {data[k].sequence || '-'}</div>
                            <div className="truncate">Rp {formatRp(lTot)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* INPUT */}
      {activeTab === 'input' && (
        <div className="max-w-4xl mx-auto p-4 no-print space-y-6">
          {/* Form Switcher */}
          <div className="flex bg-white p-2 rounded-[24px] shadow-sm border gap-2">
            <button onClick={() => handleTypeSwitch('utama')} className={`flex-1 py-4 rounded-2xl font-black transition-all ${activeType==='utama'?'bg-green-600 text-white shadow-lg scale-[1.02]':'bg-gray-50 text-gray-400 hover:text-green-600'}`}>PENDAPATAN (SU)</button>
            <button onClick={() => { const keys = getLainKeys(allReports[reportDate]); handleTypeSwitch(keys.length>0?keys[0]:'lain_1'); }} className={`flex-1 py-4 rounded-2xl font-black transition-all ${activeType.startsWith('lain')?'bg-purple-600 text-white shadow-lg scale-[1.02]':'bg-gray-50 text-gray-400 hover:text-purple-600'}`}>LAIN-LAIN (SU/L)</button>
          </div>

          {/* Sub Tab Lain-lain */}
          {activeType.startsWith('lain') && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 animate-in fade-in slide-in-from-top-2">
              {getLainKeys(allReports[reportDate]).map((k, i) => {
                const total = calcTotal(allReports[reportDate]?.[k]);
                return (
                  <button key={k} onClick={() => setActiveType(k)} className={`px-5 py-3 rounded-2xl font-bold border-2 whitespace-nowrap flex items-center gap-2 transition-all ${activeType===k?'bg-purple-100 text-purple-700 border-purple-500 shadow-sm scale-105':'bg-white text-gray-400 border-gray-100'}`}>
                    Dokumen {i+1} {total > 0 && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-inner font-black">Rp {formatRp(total)}</span>}
                  </button>
                )
              })}
              <button onClick={() => {
                const keys = getLainKeys(allReports[reportDate]);
                const nextNum = keys.length > 0 ? Math.max(...keys.map(k => parseInt(k.split('_')[1]||1))) + 1 : 1;
                setActiveType(`lain_${nextNum}`);
              }} className="px-5 py-3 bg-white border-2 border-dashed border-purple-300 rounded-2xl font-bold text-purple-600 hover:bg-purple-50 transition-all flex items-center gap-1"><Plus size={18}/> TAMBAH</button>
            </div>
          )}

          {/* Header Input */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tanggal Laporan</label><input type="date" value={reportDate} onChange={e => handleDateChange(e.target.value)} className="w-full border-2 p-3 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all" /></div>
            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tanggal Cetak</label><input type="date" value={currentReport.signatureDate} onChange={e => updateCurrentReport({signatureDate: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all" /></div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nomor Urut STSU</label>
              <div className="flex gap-2">
                <input type="text" value={currentReport.sequence} onChange={e => handleSequenceChange(e)} className="w-24 border-2 p-3 rounded-2xl font-black text-center text-lg focus:border-blue-500 outline-none transition-all shadow-inner" placeholder="01" />
                <div className="flex-1 bg-gray-50 border-2 border-dashed rounded-2xl p-3 text-[10px] font-mono text-gray-500 flex items-center justify-center text-center overflow-hidden leading-tight font-bold">{currentReport.sequence ? `No. ${computedStsuNo}` : 'Pilih No...'}</div>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className={`${activeType==='utama'?'bg-green-100 border-green-200':'bg-purple-100 border-purple-200'} p-5 rounded-[32px] border-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-colors`}>
            <div className="flex gap-2 flex-wrap justify-center">
              {activeType === 'utama' && (
                <button onClick={handleTarikData3A} disabled={isFetching3A} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-md transition-all active:scale-95 text-sm">
                  {isFetching3A ? <RefreshCw className="animate-spin" size={18}/> : <span>🤖</span>} TARIK DATA 3A
                </button>
              )}
              <label className={`flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border-2 text-sm font-black cursor-pointer transition-all ${isAddingSusulan?'border-orange-500 text-orange-600 shadow-inner':'border-gray-200 text-gray-400'}`}>
                <input type="checkbox" checked={isAddingSusulan} onChange={e => setIsAddingSusulan(e.target.checked)} className="accent-orange-500 w-4 h-4" /> MODE SUSULAN
              </label>
              {isAddingSusulan && <input type="date" value={susulanValidDate} onChange={e => setSusulanValidDate(e.target.value)} className="border-2 border-orange-200 p-3 rounded-2xl text-xs font-bold outline-none focus:border-orange-500 shadow-inner" />}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
               <select value={selectedCatToAdd} onChange={e => handleCatChange(e.target.value)} className="flex-1 md:w-56 border-2 border-gray-200 p-3 rounded-2xl text-sm font-black focus:border-blue-500 outline-none transition-all text-gray-600 uppercase shadow-inner">
                  <option value="">-- PILIH KATEGORI --</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <button onClick={handleAddActiveItem} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95">ADD</button>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-6" id="input-fields-container">
            {activeGroups.length === 0 ? (
               <div className="bg-white py-16 text-center rounded-[32px] border-2 border-dashed border-gray-200 animate-pulse">
                  <Calculator size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Belum ada item ditambahkan</p>
               </div>
            ) : (
              activeGroups.map((g, idx) => (
                <div key={g.groupId} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
                  <div className={`p-5 border-b font-black flex justify-between items-center ${g.isSusulan?'bg-orange-600 text-white':'bg-gray-50 text-gray-700'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${g.isSusulan?'bg-white/20':'bg-white shadow-sm border'}`}>{idx+1}</div>
                      <span className="uppercase text-sm tracking-widest">{g.name} {g.isSusulan ? <span className="ml-2 text-[10px] bg-black/20 px-2 py-1 rounded-lg">VALIDASI: {formatTanggalTtd(g.validDate)}</span> : ''}</span>
                    </div>
                    <button onClick={() => showConfirm('Hapus blok kategori ini?', () => handleRemoveActiveItem(g.catId, null, g.isSusulan, g.validDate))} className={`${g.isSusulan?'text-white/70 hover:text-white':'text-red-400 hover:text-red-600'} transition-all`}><Trash size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                    {g.items.map(it => {
                      const k = getInputKey(g.catId, it.id, g.isSusulan, g.validDate);
                      return (
                        <div key={it.id} className="flex items-center justify-between group">
                          <label className="text-sm font-bold text-gray-500 group-hover:text-blue-600 transition-colors uppercase">{it.name}</label>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-300 font-black tracking-widest">RP</span>
                            <input type="text" value={currentReport.formData[k] ? formatRp(currentReport.formData[k]) : ''} onChange={e => handleInputChange(k, e.target.value)} className="w-48 border-b-2 border-gray-100 p-2 text-right font-black text-xl focus:border-blue-500 outline-none transition-all placeholder:text-gray-200" placeholder="0" />
                            <button onClick={() => handleRemoveActiveItem(g.catId, it.id, g.isSusulan, g.validDate)} className="text-gray-200 hover:text-red-500 transition-all"><Trash size={18}/></button>
                          </div>
                        </div>
                      )
                    })}
                    <div className="mt-6 pt-5 border-t-2 border-dashed flex justify-end">
                       <div className="bg-gray-50 px-5 py-3 rounded-2xl border-2 border-gray-100 flex items-center gap-4 shadow-inner">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub Total</span>
                          <span className="text-xl font-black text-gray-800">Rp {formatRp(g.items.reduce((a, it) => a + (Number(currentReport.formData[getInputKey(g.catId, it.id, g.isSusulan, g.validDate)]) || 0), 0))}</span>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Floating Actions */}
          <div className="fixed bottom-6 right-6 flex flex-col gap-3 no-print z-50">
             <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="bg-blue-600 text-white p-4 rounded-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 border-white"><ArrowUp size={24}/></button>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 z-[40] shadow-[0_-15px_30px_rgba(0,0,0,0.1)] no-print">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Grand Total {activeType.startsWith('lain') ? 'SU/L' : 'SU'}</p>
                  <p className={`text-2xl sm:text-3xl font-black leading-none ${activeType.startsWith('lain')?'text-purple-600':'text-green-600'}`}>Rp {formatRp(grandTotal)}</p>
                </div>
                <div className="hidden lg:block h-8 w-px bg-gray-200"></div>
                <div className="hidden lg:block max-w-[300px]">
                   <p className="text-[9px] font-bold text-gray-300 uppercase mb-1">Terbilang</p>
                   <p className="text-[10px] text-gray-500 italic leading-tight capitalize font-medium">"{terbilang(grandTotal)} Rupiah"</p>
                </div>
              </div>
              <div className="flex w-full sm:w-auto gap-3">
                <button onClick={clearCurrentReport} className="flex-1 sm:px-8 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all border-2 border-transparent active:scale-95">RESET</button>
                <button onClick={handleForceSave} className="flex-1 sm:px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95"><Save size={20}/> SIMPAN</button>
                <button onClick={() => setActiveTab('print')} disabled={grandTotal === 0} className="flex-1 sm:px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-30">PREVIEW</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {resetDialog.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReset} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-3 bg-red-600"></div>
             <h3 className="text-2xl font-black text-gray-800 mb-3 flex items-center gap-3 mt-2"><AlertCircle className="text-red-600" size={28}/> Reset Data?</h3>
             <p className="text-sm text-gray-500 mb-6 leading-relaxed font-medium">Wajib masukkan password akun untuk menghapus form STSU ini secara permanen.</p>
             {resetDialog.error && (
               <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-xs font-bold mb-4 border border-red-100 flex items-center gap-2">
                 <AlertCircle size={16}/> {resetDialog.error}
               </div>
             )}
             <input type="password" value={resetDialog.password} onChange={e => setResetDialog(p=>({...p, password:e.target.value}))} className="w-full border-2 p-4 rounded-2xl mb-6 font-black text-center text-xl focus:border-red-600 outline-none transition-all shadow-inner" placeholder="PASSWORD ADMIN" required autoFocus />
             <div className="flex gap-3">
                <button type="button" onClick={() => setResetDialog({isOpen:false, password:'', error:'', isVerifying:false})} className="flex-1 bg-gray-100 p-4 rounded-2xl font-black text-gray-600 hover:bg-gray-200 transition-all">BATAL</button>
                <button disabled={resetDialog.isVerifying} className="flex-1 bg-red-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all disabled:bg-gray-400">
                  {resetDialog.isVerifying ? <RefreshCw className="animate-spin mx-auto" size={20}/> : 'YA, HAPUS'}
                </button>
             </div>
          </form>
        </div>
      )}

      {/* PRINT PREVIEW */}
      {activeTab === 'print' && (
        <div className="max-w-4xl mx-auto p-4 animate-in fade-in duration-500">
          <div className="bg-white p-12 sm:p-20 shadow-2xl min-h-[297mm] mx-auto text-black print-container relative border-2 border-gray-100 rounded-[40px]">
             <div className="font-bold underline mb-10 text-lg">No. {computedStsuNo}</div>
             <p className="mb-8 text-lg">Diterima uang hasil pendapatan {formatTanggalCetak(reportDate)} sebagai berikut;</p>
             <div className="space-y-6">
               {activeGroups.map((g, i) => (
                 <div key={g.groupId} className="pl-4">
                    <div className="font-bold mb-2 text-md">{i+1}. Diterima uang hasil pendapatan {g.name.toUpperCase()} {g.isSusulan ? `susulan (validasi ${formatTanggalTtd(g.validDate)})` : ''} sebagai berikut :</div>
                    <div className="pl-8 space-y-1">
                       {g.items.map(it => {
                         const val = currentReport.formData[getInputKey(g.catId, it.id, g.isSusulan, g.validDate)];
                         if(!val) return null;
                         return (
                           <div key={it.id} className="flex max-w-[500px] border-b border-dashed border-gray-100">
                              <span className="flex-1 italic">{it.name}</span>
                              <span className="w-12 text-right">Rp.</span>
                              <span className="w-32 text-right font-bold">{formatRp(val)}</span>
                           </div>
                         )
                       })}
                    </div>
                    <div className="flex max-w-[500px] font-black mt-4 pl-8 pt-2 border-t-2 border-gray-800">
                       <span className="flex-1 text-right pr-6 uppercase tracking-widest text-[10px]">Sub Total {g.name}</span>
                       <span className="w-12 text-right">Rp.</span>
                       <span className="w-32 text-right">{formatRp(g.items.reduce((a, it) => a + (Number(currentReport.formData[getInputKey(g.catId, it.id, g.isSusulan, g.validDate)]) || 0), 0))}</span>
                    </div>
                 </div>
               ))}
             </div>
             <div className="flex font-black border-t-4 border-b-4 border-black py-4 mt-12 mb-10 text-xl">
                <span className="flex-1 text-right pr-10 uppercase tracking-[0.3em]">Jumlah Total</span>
                <span className="w-12 text-right">Rp.</span>
                <span className="w-40 text-right">{formatRp(grandTotal)}</span>
             </div>
             <div className="mb-10 text-lg">
                <strong className="block mb-1">Terbilang : </strong> 
                <div className="bg-gray-50 p-4 border rounded-2xl italic capitalize font-medium">"{terbilang(grandTotal)} Rupiah"</div>
             </div>
             <p className="text-justify leading-relaxed mb-16 text-md indent-12">
                Disetor uang kebendahara penerimaan hasil retribusi layanan masuk tempat rekreasi dan pemakaian fasilitas TMR Pada hari {formatTanggalCetak(reportDate)} dengan STSU No. {computedStsuNo} dengan uang sebesar Rp. {formatRp(grandTotal)}
             </p>
             
             <div className="flex justify-between text-center mt-20">
                <div className="w-[200px] flex flex-col justify-between h-48">
                   <div className="font-bold leading-tight">{signatures.leftRole}</div>
                   <div>
                     <div className="font-bold underline mb-1">{signatures.leftName}</div>
                     <div className="text-[11px] font-mono">NIP. {signatures.leftNip || '..............................'}</div>
                   </div>
                </div>
                <div className="w-[250px] flex flex-col justify-between h-48">
                   <div className="font-bold leading-tight">{signatures.location}, {formatTanggalTtd(currentReport.signatureDate)}<br/>{signatures.rightRole}</div>
                   <div>
                     <div className="font-bold underline mb-1">{signatures.rightName}</div>
                     <div className="text-[11px] font-mono">NIP. {signatures.rightNip || '..............................'}</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* SETTINGS / MASTER */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in slide-in-from-right-10 duration-300">
          <div className="bg-white p-8 rounded-[40px] shadow-md border border-gray-100">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-gray-800"><Settings size={24} className="text-blue-600"/> PENGATURAN MASTER</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-inner">
                <h4 className="font-black text-xs uppercase text-gray-400 tracking-widest flex items-center gap-2 mb-2"><Edit size={14}/> Pejabat Penyetor (Kiri)</h4>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Jabatan</label>
                   <input type="text" value={signatures.leftRole} onChange={e => setSignatures({...signatures, leftRole: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-bold outline-none focus:border-blue-500 shadow-sm" placeholder="Jabatan" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap</label>
                   <input type="text" value={signatures.leftName} onChange={e => setSignatures({...signatures, leftName: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-black outline-none focus:border-blue-500 shadow-sm" placeholder="Nama" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">NIP</label>
                   <input type="text" value={signatures.leftNip} onChange={e => setSignatures({...signatures, leftNip: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-mono text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="NIP" />
                </div>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-inner">
                <h4 className="font-black text-xs uppercase text-gray-400 tracking-widest flex items-center gap-2 mb-2"><Edit size={14}/> Pejabat Bendahara (Kanan)</h4>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Lokasi Penandatanganan</label>
                   <input type="text" value={signatures.location} onChange={e => setSignatures({...signatures, location: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-bold outline-none focus:border-blue-500 shadow-sm" placeholder="Kota" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Jabatan</label>
                   <input type="text" value={signatures.rightRole} onChange={e => setSignatures({...signatures, rightRole: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-bold outline-none focus:border-blue-500 shadow-sm" placeholder="Jabatan" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap</label>
                   <input type="text" value={signatures.rightName} onChange={e => setSignatures({...signatures, rightName: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-black outline-none focus:border-blue-500 shadow-sm" placeholder="Nama" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">NIP</label>
                   <input type="text" value={signatures.rightNip} onChange={e => setSignatures({...signatures, rightNip: e.target.value})} className="w-full border-2 p-3 rounded-2xl font-mono text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="NIP" />
                </div>
              </div>
              
              <div className="col-span-full bg-blue-600 p-8 rounded-[40px] border-4 border-blue-100 shadow-xl text-white">
                <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-3"><Cloud size={20}/> Koneksi API PC Robot (Sistem 3A)</h4>
                <p className="text-xs text-blue-100 mb-6 font-medium leading-relaxed">Masukkan IP Address komputer PC Robot di loket yang menjalankan server API. IP ini digunakan untuk melakukan tarikan rekon data secara otomatis ke Menu Transit.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input type="text" value={ipRobot} onChange={e => setIpRobot(e.target.value)} className="w-full border-none p-4 rounded-2xl font-mono text-lg text-blue-900 bg-white shadow-inner focus:ring-4 focus:ring-blue-300 outline-none" placeholder="192.168.1.15" />
                  </div>
                  <button onClick={() => alert("Koneksi Robot Tersimpan!")} className="bg-blue-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95">SIMPAN IP</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-md border border-gray-100">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h3 className="text-xl font-black flex items-center gap-3 text-gray-800"><Tag size={24} className="text-blue-600"/> DATABASE KATEGORI</h3>
                <button onClick={() => setCategories([...categories, { id: `cat_${Date.now()}`, name: 'Kategori Baru', type: 'utama', items: [] }])} className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-100 transition-all border-2 border-blue-200 shadow-sm"><Plus size={18}/> TAMBAH KATEGORI</button>
             </div>
             <div className="space-y-6">
                {categories.map((c, i) => (
                   <div key={c.id} className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex flex-col gap-6 shadow-inner">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                         <div className="flex-1 flex items-center gap-4 w-full">
                            <span className="w-10 h-10 rounded-2xl bg-white shadow-sm border flex items-center justify-center font-black text-blue-600 text-sm">{i+1}</span>
                            <input type="text" value={c.name} onChange={e => setCategories(categories.map(cat => cat.id===c.id ? {...cat, name: e.target.value} : cat))} className="bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl p-3 font-black text-sm flex-1 outline-none transition-all uppercase shadow-sm" />
                         </div>
                         <div className="flex items-center gap-3">
                            <select value={c.type} onChange={e => setCategories(categories.map(cat => cat.id===c.id ? {...cat, type: e.target.value} : cat))} className="bg-white border-2 p-3 rounded-2xl text-xs font-black shadow-sm outline-none focus:border-blue-500 text-gray-600">
                               <option value="utama">Pendapatan (SU)</option>
                               <option value="lain">Lain-lain (SU/L)</option>
                            </select>
                            <button onClick={() => setCategories(categories.filter(cat => cat.id !== c.id))} className="text-red-400 bg-white border-2 hover:bg-red-50 hover:border-red-200 p-3 rounded-2xl transition-all shadow-sm"><Trash size={18}/></button>
                         </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(c.items || []).map(it => (
                               <div key={it.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border-2 border-transparent group transition-all hover:border-blue-300 hover:shadow-md">
                                  <span className="text-[10px] font-black text-gray-300 ml-1 bg-white px-2 py-1 rounded-lg border">{it.id.replace('item_','')}</span>
                                  <input type="text" value={it.name} onChange={e => setCategories(categories.map(cat => cat.id===c.id ? {...cat, items: cat.items.map(i => i.id===it.id ? {...i, name:e.target.value} : i)} : cat))} className="bg-transparent text-xs font-bold flex-1 outline-none text-gray-700 uppercase" />
                                  <button onClick={() => setCategories(categories.map(cat => cat.id===c.id ? {...cat, items: cat.items.filter(i => i.id !== it.id)} : cat))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash size={16}/></button>
                               </div>
                            ))}
                            <button onClick={() => {
                               const nextIdx = (c.items || []).length > 0 ? Math.max(...c.items.map(it => parseInt(it.id.split('_')[1]||0))) + 1 : 1;
                               setCategories(categories.map(cat => cat.id===c.id ? {...cat, items: [...(cat.items||[]), { id: `item_${nextIdx}`, name: 'Item Baru' }]} : cat))
                            }} className="bg-blue-50/50 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl p-3 text-[10px] font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"><Plus size={16}/> TAMBAH TIKET</button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
