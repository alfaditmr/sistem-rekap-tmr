import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, RefreshCw, Link as LinkIcon, CheckCircle, Plus, Trash, Database, Filter, Trash2, Edit, RotateCcw, Zap, Sparkles } from 'lucide-react';
import MultiDateCalendar from './MultiDateCalendar';

export default function RekonBankTab({ bankRows, setBankRows, formatRp, safeString, categories, onSaveRekon, allReports, onLinkRekon, onUpdateBankRow, onUnlinkBankRow }) {
  const [selectedBankDates, setSelectedBankDates] = useState([]);
  const [editModal, setEditModal] = useState({ isOpen: false, row: null, proof: '' });
  const hasInitializedDate = React.useRef(false);

  const uniqueBankDates = useMemo(() => {
      // Ambil bagian tanggal saja, bank date format CSV: "Sep 01, 2026 06:46:23 WIB"
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

  useEffect(() => {
      if (uniqueBankDates.length > 1 && !hasInitializedDate.current) {
          let latest = null;
          let latestStr = null;
          uniqueBankDates.forEach(dStr => {
              if (dStr === 'Semua') return;
              const d = new Date(dStr);
              if (!isNaN(d.getTime())) {
                  if (!latest || d > latest) {
                      latest = d;
                      latestStr = dStr;
                  }
              }
          });
          if (latestStr) {
              setSelectedBankDates([latestStr]);
              hasInitializedDate.current = true;
          }
      }
  }, [uniqueBankDates]);

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
          groups[d].total += r.amount;
      });
      return Object.entries(groups).sort((a,b) => new Date(b[0]) - new Date(a[0]));
  }, [filteredBankRows]);

  const [apiData, setApiData] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiDate, setApiDate] = useState(new Date().toISOString().split('T')[0]);
  
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
        header: false, // Matikan header agar tidak error kalau ada baris kosong/header sampah di atas
        skipEmptyLines: true,
        complete: (results) => {
            const formattedRows = [];
            let rowIdx = 0;

            results.data.forEach((row) => {
                // Abaikan baris yang tidak memiliki setidaknya 4 kolom (A, B, C, D)
                if (!row || row.length < 4) return;
                
                // Kolom C (index 2) = Tanggal, Kolom D (index 3) = Keterangan
                const possibleDate = (row[2] || '').trim();
                const possibleDesc = (row[3] || '').trim();
                
                let possibleAmount = 0;
                
                // Kolom F (index 5) = Uang Masuk
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
                    
                    if (val > 0) {
                        possibleAmount = val;
                    }
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
            }
            
            // Tambahkan ke baris yang sudah ada agar tidak menimpa jika upload file baru
            setBankRows(prev => {
                // Untuk mencegah duplikasi saat append, pastikan id unik (menggunakan timestamp)
                const newRows = formattedRows.map((r, i) => ({ ...r, id: `bank_${Date.now()}_${i}` }));
                const combined = [...prev, ...newRows];
                // Batasi maksimal 2000 baris mutasi terakhir agar tidak melebihi limit 1MB Firebase Firestore
                if (combined.length > 2000) {
                    return combined.slice(combined.length - 2000);
                }
                return combined;
            });
            e.target.value = null; // Reset input file
        }
     });
  };

  const parseYmd = (dateStr) => {
      let ymd = new Date().toISOString().split('T')[0];
      try {
          const cleanStr = (dateStr || '').replace(/WIB|WITA|WIT/i, '').trim();
          const d = new Date(cleanStr);
          if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              ymd = `${y}-${m}-${day}`;
          }
      } catch(e) {}
      return ymd;
  };

  const openSplitModal = (row) => {
      setSplitModal({
          isOpen: true,
          bankRow: row,
          allocations: [{ id: Date.now(), categoryId: '', itemId: '', apiRefId: '', amount: row.amount, targetDate: parseYmd(row.date) }]
      });
  };

  const addAllocation = () => {
      setSplitModal(prev => ({
          ...prev,
          allocations: [...prev.allocations, { id: Date.now(), categoryId: '', itemId: '', apiRefId: '', amount: 0, targetDate: parseYmd(prev.bankRow.date) }]
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
      
      if(onSaveRekon) {
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
          ['utama', 'lain'].forEach(type => {
              if (dayData[type] && dayData[type].activeItems) {
                  const typeGroups = {};
                  
                  dayData[type].activeItems.forEach((item, idx) => {
                      if (!item.bankMatched) {
                          // Compute itemKey to get nominal
                          let itemKey = `${item.catId}_${item.itemId || item.id}`;
                          if (item.isSusulan) itemKey += `_susulan_${item.validDate}`;
                          if (item.itemDate) itemKey += `_date_${item.itemDate}`;
                          if (item.itemNote) {
                              let h = 0; for(let i=0;i<item.itemNote.length;i++){ h=((h<<5)-h)+item.itemNote.charCodeAt(i); h=h&h; }
                              itemKey += `_note_${Math.abs(h)}`;
                          }
                          const nominal = dayData[type].formData[itemKey] || 0;
                          
                          if (nominal > 0) {
                              // Determine grouping key
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
                                      isSusulan: item.isSusulan,
                                      validDate: item.validDate,
                                      itemDate: item.itemDate,
                                      itemNote: item.itemNote,
                                      nominal: 0,
                                      itemIndices: []
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <Database size={28} className="text-blue-600" /> Rekonsiliasi Bank & API
            </h2>
            <p className="text-gray-500 text-sm mt-1">Cocokkan mutasi bank CSV dengan bukti transfer dari web app.</p>
          </div>
          <div className="flex gap-2 items-center">
             <div className="flex flex-col sm:flex-row items-center gap-2 bg-indigo-50 p-1.5 rounded-xl shadow-sm border border-indigo-100">
                <input 
                   type="date" 
                   value={apiDate} 
                   onChange={e => setApiDate(e.target.value)} 
                   className="px-2 py-1.5 rounded-lg border border-indigo-200 text-sm text-indigo-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   title="Filter Tanggal API"
                />
                
                <div className="hidden sm:block w-px bg-indigo-200 h-6 mx-1"></div>
                <div className="flex">
                    <button onClick={fetchApiFasilitas} disabled={loadingApi} className="hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors text-sm">
                        <RefreshCw size={14} className={loadingApi ? 'animate-spin' : ''} /> Tarik API Fasilitas
                    </button>
                    <div className="w-px bg-indigo-200 mx-1"></div>
                    <button onClick={fetchApiPromo} disabled={loadingApi} className="hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors text-sm">
                        <RefreshCw size={14} className={loadingApi ? 'animate-spin' : ''} /> Tarik API Promo
                    </button>
                </div>
             </div>
             <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md">
                 <Upload size={18} /> Upload CSV Bank
                 <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
             </label>
             <button onClick={() => { if(window.confirm('Hapus semua data CSV mutasi bank?')) setBankRows([]); }} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors" title="Bersihkan Data CSV">
                 <Trash2 size={18} />
             </button>
          </div>
      </div>

      {apiData.length > 0 && (
          <div className="mb-6 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-indigo-900 text-sm flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-500"/> {apiData.length} Bukti Transfer Tersedia dari API
                  </h3>
                  <button onClick={() => setApiData([])} className="text-xs text-indigo-400 hover:text-rose-600 font-bold transition-colors">
                      Bersihkan Data API
                  </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
                  {apiData.map(item => {
                      const isListrik = item.tipe_transaksi === 'Listrik Tambahan' || (typeof item.id === 'string' && item.id.includes('_listrik'));
                      const isPromo = item.source === 'Promo';
                      const badgeBg = isListrik ? 'bg-amber-100 text-amber-800 border-amber-200' : isPromo ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200';
                      const nominal = item.jumlahTransferNumeric || (typeof item.jumlahTransfer === 'string' ? Number(item.jumlahTransfer.replace(/[^0-9]/g, '')) : item.jumlahTransfer) || 0;
                      const proofUrl = item.buktiTransferUrl || item.buktiTransferDocUrl || item.pksDriveUrl;

                      return (
                          <div key={item.id} className="min-w-[240px] max-w-[280px] bg-white p-3.5 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                              <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badgeBg}`}>
                                          {isListrik && <Zap size={10} className="fill-amber-500 text-amber-500"/>}
                                          {isPromo && <Sparkles size={10} className="text-purple-500"/>}
                                          {item.tipe_transaksi || item.source}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-400">
                                          {item.tanggal_transfer || item.tanggalTransfer || '-'}
                                      </span>
                                  </div>
                                  <div className="font-bold text-gray-900 text-sm truncate" title={item.nama_penyewa || item.namaPerusahaan}>
                                      {item.nama_penyewa || item.namaPerusahaan || '-'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-0.5" title={item.lokasi_sewa || item.keterangan_transaksi || item.namaProduk}>
                                      {item.lokasi_sewa || item.namaProduk || '-'}
                                  </div>
                              </div>
                              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                  <div className="font-black text-indigo-700 text-base">
                                      Rp {formatRp(nominal)}
                                  </div>
                                  <button 
                                      type="button" 
                                      onClick={(e) => handleViewProof(e, proofUrl)} 
                                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                      title="Lihat Bukti Transfer"
                                  >
                                      <LinkIcon size={12}/> Bukti
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

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
                  <div className="p-0">
                      {data.rows.map(row => (
                          <div key={row.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-gray-100 hover:bg-blue-50/50 transition-colors last:border-b-0 gap-4">
                              <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-1.5">
                                      {row.status === 'matched' || row.status === 'linked' 
                                        ? <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-max shadow-sm border border-green-200"><CheckCircle size={12}/> {row.status === 'linked' ? 'Linked' : 'Matched'}</span>
                                        : <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-md w-max inline-block shadow-sm border border-yellow-200">Pending</span>}
                                      <span className="text-xs text-gray-500 font-medium">{row.date}</span>
                                  </div>
                                  <div className={`font-medium leading-snug ${row.status === 'matched' || row.status === 'linked' ? 'text-green-700' : 'text-gray-900'}`}>{row.description}</div>
                                  {row.transferProof && (
                                      <div className="mt-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-1.5 rounded-md inline-block border border-blue-100 font-medium whitespace-pre-wrap">
                                          Keterangan: {row.transferProof}
                                      </div>
                                  )}
                              </div>
                              <div className="text-left md:text-right shrink-0 md:mr-6">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Nominal</div>
                                  <div className={`font-black text-lg ${row.status === 'matched' || row.status === 'linked' ? 'text-green-700' : 'text-gray-900'}`}>Rp {formatRp(row.amount)}</div>
                              </div>
                              <div className="shrink-0 flex flex-wrap gap-2">
                                  {row.status === 'pending' && (
                                      <>
                                          <button onClick={() => openLinkModal(row)} className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors shadow-sm">
                                              <LinkIcon size={16}/> Pasangkan (H-1)
                                          </button>
                                          <button onClick={() => openSplitModal(row)} className="text-white bg-blue-600 hover:bg-blue-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors shadow-sm">
                                              <Plus size={16}/> Input Baru
                                          </button>
                                      </>
                                  )}
                                  { (row.status === 'linked' || row.status === 'matched') && (() => {
                                      let dynamicName = row.linkedTo?.groupName;
                                      const matchedDetails = [];

                                      // Jika punya linkedTo lengkap (cara lama)
                                      if (dynamicName && row.linkedTo?.date) {
                                          matchedDetails.push({ date: row.linkedTo.date, name: dynamicName, proofUrl: row.linkedTo.proofUrl || row.proofUrl || '' });
                                      } 
                                      // Jika dari Input Baru (matched) atau linkedTo kurang lengkap, kita cari di seluruh allReports
                                      else if (allReports) {
                                          Object.keys(allReports).forEach(ymd => {
                                              ['utama', 'lain'].forEach(type => {
                                                  if (allReports[ymd][type] && allReports[ymd][type].activeItems) {
                                                      allReports[ymd][type].activeItems.forEach(item => {
                                                          const isRowMatch = item.bankMatched && (item.bankMatchRowId === row.id || (Array.isArray(item.bankMatchRowIds) && item.bankMatchRowIds.includes(row.id)));
                                                          if (isRowMatch) {
                                                              const cat = categories.find(c => c.id === item.catId);
                                                              const name = cat ? cat.name : item.catId;
                                                              let itemKey = `${item.catId}_${item.itemId || item.id}`;
                                                               if (item.itemDate) itemKey += `_date_${item.itemDate}`;
                                                               if (item.itemNote) {
                                                                   let h = 0; for(let j=0; j<item.itemNote.length; j++){ h=((h<<5)-h)+item.itemNote.charCodeAt(j); h=h&h; }
                                                                   itemKey += `_note_${Math.abs(h)}`;
                                                               }
                                                               const proofUrl = item.proofUrl || allReports[ymd][type].formData?.[itemKey + '_buktiUrl'] || row.proofUrl || '';
                                                               matchedDetails.push({ date: item.itemDate || ymd, name, proofUrl });
                                                          }
                                                      });
                                                  }
                                              });
                                          });
                                      }
                                      
                                      // Dedup array if multiple splits go to same category on same date
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

                                       if (uniqueDetails.length === 0 && row.matchedTo) {
                                            uniqueDetails.push({ date: row.date?.split(" ")[0] || "", name: row.matchedTo, proofUrl: row.proofUrl || "" });
                                        }
                                        if (uniqueDetails.length === 0 && !row.proofUrl && !row.transferProof) return null;

                                       return (
                                           <div className="text-xs text-indigo-700 bg-indigo-50 px-3.5 py-2.5 rounded-xl border border-indigo-100 font-medium flex flex-col gap-1.5 min-w-[210px] shadow-xs">
                                               <span className="text-[11px] text-gray-500 font-normal">Telah dipasangkan dengan:</span>
                                               {uniqueDetails.map((detail, idx) => {
                                                   const activeProof = detail.proofUrl || row.proofUrl || (row.transferProof && (row.transferProof.startsWith('http') || row.transferProof.startsWith('data:')) ? row.transferProof : '');
                                                   return (
                                                       <div key={idx} className="flex flex-col gap-1">
                                                           <span className="font-bold text-indigo-900 leading-snug">[{detail.date}] {detail.name}</span>
                                                           {activeProof && (
                                                               <button 
                                                                   type="button" 
                                                                   onClick={(e) => handleViewProof(e, activeProof)}
                                                                   className="text-[11px] text-indigo-700 hover:text-indigo-900 font-black bg-white hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit shadow-xs transition-colors mt-0.5"
                                                                   title="Klik untuk melihat bukti transfer"
                                                               >
                                                                   <LinkIcon size={12} className="text-indigo-600"/> Lihat Bukti Transfer
                                                               </button>
                                                           )}
                                                       </div>
                                                   );
                                               })}
                                               {!uniqueDetails.some(d => d.proofUrl) && (row.proofUrl || (row.transferProof && (row.transferProof.startsWith('http') || row.transferProof.startsWith('data:')))) && (
                                                   <button 
                                                       type="button" 
                                                       onClick={(e) => handleViewProof(e, row.proofUrl || row.transferProof)}
                                                       className="text-[11px] text-indigo-700 hover:text-indigo-900 font-black bg-white hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit shadow-xs transition-colors mt-0.5"
                                                       title="Klik untuk melihat bukti transfer"
                                                   >
                                                       <LinkIcon size={12} className="text-indigo-600"/> Lihat Bukti Transfer
                                                   </button>
                                               )}
                                           </div>
                                       );
                                   })()}
                                   {(row.status === 'matched' || row.status === 'linked') && (
                                      <button onClick={() => setEditModal({isOpen: true, row, proof: row.transferProof || '', proofUrl: row.proofUrl || ''})} className="text-gray-500 hover:text-blue-600 bg-white border border-gray-200 shadow-sm px-3 py-2 rounded-lg flex items-center justify-center transition-colors self-start" title="Edit Keterangan / Batalkan Pasangan">
                                          <Edit size={16}/>
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
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

      {splitModal.isOpen && (
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
                          {splitModal.allocations.map((alloc, index) => (
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

    {linkModal.isOpen && (
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
                                setEditModal({isOpen:false, row:null, proof:''});
                            }
                        }} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors w-full text-center flex items-center justify-center gap-1">
                            <RotateCcw size={14} /> Batalkan Pasangan
                        </button>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                    <button onClick={() => setEditModal({isOpen:false, row:null, proof:''})} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded-xl text-sm transition-colors">Batal</button>
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
