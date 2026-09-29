import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, RefreshCw, Link as LinkIcon, CheckCircle, Plus, Trash, Database, Filter, Trash2 } from 'lucide-react';

export default function RekonBankTab({ formatRp, safeString, categories, onSaveRekon }) {
  const [bankRows, setBankRows] = useState(() => {
      try {
          const saved = localStorage.getItem('tmr_v19_bankRows');
          return saved ? JSON.parse(saved) : [];
      } catch(e) { return []; }
  });
  const [selectedBankDate, setSelectedBankDate] = useState('Semua');

  useEffect(() => {
      localStorage.setItem('tmr_v19_bankRows', JSON.stringify(bankRows));
  }, [bankRows]);

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

  const filteredBankRows = useMemo(() => {
      if (selectedBankDate === 'Semua') return bankRows;
      return bankRows.filter(r => r.date.includes(selectedBankDate));
  }, [bankRows, selectedBankDate]);
  const [apiData, setApiData] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiDate, setApiDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal State
  const [splitModal, setSplitModal] = useState({ isOpen: false, bankRow: null, allocations: [] });

  const fetchApiFasilitas = async () => {
    setLoadingApi(true);
    try {
       const url = `https://sistem-informasi-ragunan.vercel.app/api/fasilitas${apiDate ? '?date=' + apiDate : ''}`;
       const res = await fetch(url);
       const fasRes = await res.json();
       
       if (fasRes && fasRes.data && fasRes.data.length > 0) {
           const newFasilitas = fasRes.data.map(d => ({...d, source: 'Fasilitas'}));
           setApiData(prev => [...prev.filter(d => d.source !== 'Fasilitas'), ...newFasilitas]);
       } else {
           alert("Data API Fasilitas kosong (0 data).");
       }
    } catch(e) {
       console.error("API Fasilitas error:", e);
       alert("Gagal menarik data Fasilitas dari API. Pastikan endpoint aktif dan bisa diakses.");
    }
    setLoadingApi(false);
  };

  const fetchApiPromo = async () => {
    setLoadingApi(true);
    try {
       const url = `https://sistem-informasi-ragunan.vercel.app/api/promo${apiDate ? '?date=' + apiDate : ''}`;
       const res = await fetch(url);
       const proRes = await res.json();
       
       if (proRes && proRes.data && proRes.data.length > 0) {
           const newPromo = proRes.data.map(d => ({...d, source: 'Promo'}));
           setApiData(prev => [...prev.filter(d => d.source !== 'Promo'), ...newPromo]);
       } else {
           alert("Data API Promo kosong (0 data).");
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
                    // Format bank CSV adalah 200000.00 (Titik sebagai desimal)
                    // Hapus koma jika kebetulan bank memakai koma untuk ribuan (misal 200,000.00)
                    const numStr = uangMasukCell.replace(/,/g, ""); 
                    const num = parseFloat(numStr);
                    
                    if (!isNaN(num) && num > 0) {
                        possibleAmount = num;
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
                return [...prev, ...newRows];
            });
            e.target.value = null; // Reset input file
        }
     });
  };

  const openSplitModal = (row) => {
      setSplitModal({
          isOpen: true,
          bankRow: row,
          allocations: [{ id: Date.now(), categoryId: '', itemId: '', apiRefId: '', amount: row.amount }]
      });
  };

  const addAllocation = () => {
      setSplitModal(prev => ({
          ...prev,
          allocations: [...prev.allocations, { id: Date.now(), categoryId: '', itemId: '', apiRefId: '', amount: 0 }]
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
      
      setBankRows(prev => prev.map(r => r.id === splitModal.bankRow.id ? { ...r, status: 'matched' } : r));
      
      if(onSaveRekon) {
          onSaveRekon(splitModal.bankRow.date, splitModal.allocations, apiData);
      }

      setSplitModal({ isOpen: false, bankRow: null, allocations: [] });
  };

  const getItemsForCategory = (catId) => {
      const cat = categories.find(c => c.id === catId);
      return cat ? cat.items : [];
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

      {bankRows.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                  <Filter size={16} /> Filter Tanggal Mutasi:
              </div>
              <select 
                  value={selectedBankDate} 
                  onChange={e => setSelectedBankDate(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5"
              >
                  {uniqueBankDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="text-sm text-gray-500 sm:ml-auto">
                  Menampilkan {filteredBankRows.length} dari {bankRows.length} data mutasi
              </div>
          </div>
      )}


      {apiData.length > 0 && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><CheckCircle size={18}/> {apiData.length} Data Bukti Transfer Tersedia (API)</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                  {apiData.map(item => (
                      <div key={item.id} className="min-w-[200px] bg-white p-3 rounded-lg shadow-sm border border-indigo-100">
                          <div className="text-xs font-bold text-gray-500 mb-1">{item.source} - ID: {item.id.substring(0,6)}...</div>
                          <div className="font-bold text-indigo-700">Rp {formatRp(item.jumlahTransfer)}</div>
                          <a href={item.buktiTransferUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-2">
                              <LinkIcon size={12}/> Lihat Bukti
                          </a>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Tanggal (Bank)</th>
                      <th className="px-6 py-4">Keterangan</th>
                      <th className="px-6 py-4 text-right">Nominal Masuk</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredBankRows.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Belum ada data CSV mutasi bank yang di-upload atau sesuai filter.</td></tr>
                  ) : filteredBankRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-3">
                              {row.status === 'matched' 
                                ? <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><CheckCircle size={14}/> Matched</span>
                                : <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full w-max inline-block">Pending</span>}
                          </td>
                          <td className="px-6 py-3 font-medium">{row.date}</td>
                          <td className="px-6 py-3">{row.description}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-900">Rp {formatRp(row.amount)}</td>
                          <td className="px-6 py-3 text-center">
                              {row.status !== 'matched' && (
                                  <button onClick={() => openSplitModal(row)} className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-lg text-xs">
                                      Pecah / Validasi
                                  </button>
                              )}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
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
                                  <div className="w-full md:w-1/4">
                                      <label className="block text-xs font-bold text-gray-600 mb-1">Kategori POS</label>
                                      <select value={alloc.categoryId} onChange={e => updateAllocation(alloc.id, 'categoryId', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                                          <option value="">-- Pilih --</option>
                                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                      </select>
                                  </div>
                                  <div className="w-full md:w-1/4">
                                      <label className="block text-xs font-bold text-gray-600 mb-1">Item POS</label>
                                      <select value={alloc.itemId} onChange={e => updateAllocation(alloc.id, 'itemId', e.target.value)} disabled={!alloc.categoryId} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                                          <option value="">-- Pilih Item --</option>
                                          {getItemsForCategory(alloc.categoryId).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                      </select>
                                  </div>
                                  <div className="w-full md:w-1/4">
                                      <label className="block text-xs font-bold text-gray-600 mb-1">Hubungkan Bukti API (Opsional)</label>
                                      <select value={alloc.apiRefId} onChange={e => updateAllocation(alloc.id, 'apiRefId', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-indigo-700">
                                          <option value="">-- Tanpa Bukti API --</option>
                                          {apiData.map(d => <option key={d.id} value={d.id}>{d.source} - Rp {formatRp(d.jumlahTransfer)}</option>)}
                                      </select>
                                  </div>
                                  <div className="w-full md:w-1/5">
                                      <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Pecahan</label>
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

    </div>
  );
}
