import React, { useState, useMemo } from 'react';
import { Sparkles, Save, Info, Trash2 } from 'lucide-react';

// Basic heuristic algorithm simulating AI for target breakdown
const generateAIBreakdown = (globalTarget, yearStr, categories) => {
    const year = parseInt(yearStr);
    
    // Estimate Idul Fitri month (very rough estimation)
    // 2024: April, 2025: March, 2026: March, 2027: March, 2028: Feb
    let idulFitriMonth = 3; // default to March/April
    if (year === 2024) idulFitriMonth = 4;
    else if (year === 2025 || year === 2026) idulFitriMonth = 3;
    else if (year === 2027) idulFitriMonth = 3;
    else if (year === 2028) idulFitriMonth = 2;
    else if (year === 2029) idulFitriMonth = 2;
    else if (year === 2030) idulFitriMonth = 1;

    // Month weights (1-12)
    // Base weight 1.0. 
    // June/July: School holiday (+0.5)
    // December: End of year (+0.5)
    // Idul Fitri: (+1.5)
    const monthWeights = {};
    let totalMonthWeight = 0;
    
    for (let m = 1; m <= 12; m++) {
        let weight = 1.0;
        if (m === 6 || m === 7) weight += 0.5; // School holiday
        if (m === 12) weight += 0.5; // December
        if (m === idulFitriMonth) weight += 1.5; // Lebaran
        
        monthWeights[m] = weight;
        totalMonthWeight += weight;
    }

    // Distribute total target to months
    const monthlyTargets = {};
    for (let m = 1; m <= 12; m++) {
        monthlyTargets[m] = (monthWeights[m] / totalMonthWeight) * globalTarget;
    }

    // Get all items to distribute to
    const allItems = [];
    categories.forEach(cat => {
        if (cat.type === 'utama' && cat.items) {
            cat.items.forEach(item => {
                allItems.push({ catId: cat.id, item: item });
            });
        }
    });

    if (allItems.length === 0) return {};

    // Calculate item weights
    // Example: Dewasa gets more, Anak gets less.
    const getItemWeight = (itemName) => {
        const name = itemName.toLowerCase();
        if (name.includes('dewasa')) return 10;
        if (name.includes('anak')) return 5;
        if (name.includes('mobil') || name.includes('gol 3')) return 4;
        if (name.includes('motor') || name.includes('gol 2')) return 6;
        if (name.includes('sepeda') || name.includes('gol 1')) return 1;
        if (name.includes('rombongan')) return 3;
        return 2;
    };

    let totalItemWeightBase = 0;
    const baseItemWeights = {};
    allItems.forEach(i => {
        const key = `${i.catId}_${i.item.id}`;
        const w = getItemWeight(i.item.name);
        baseItemWeights[key] = w;
        totalItemWeightBase += w;
    });

    // Final distribution
    const newTargets = {};
    
    allItems.forEach(i => {
        const key = `${i.catId}_${i.item.id}`;
        newTargets[key] = {};
        
        for (let m = 1; m <= 12; m++) {
            const mStr = String(m).padStart(2, '0');
            let iWeight = baseItemWeights[key];
            
            // AI Context: Rombongan increases during school holidays (June/July/Dec)
            if ((m === 6 || m === 7 || m === 12) && i.item.name.toLowerCase().includes('rombongan')) {
                iWeight *= 2.0; 
            }
            
            // Recalculate context total for this month
            let contextTotalWeight = 0;
            allItems.forEach(i2 => {
                const k2 = `${i2.catId}_${i2.item.id}`;
                let w2 = baseItemWeights[k2];
                if ((m === 6 || m === 7 || m === 12) && i2.item.name.toLowerCase().includes('rombongan')) {
                    w2 *= 2.0;
                }
                contextTotalWeight += w2;
            });

            const allocatedAmount = (iWeight / contextTotalWeight) * monthlyTargets[m];
            newTargets[key][mStr] = Math.round(allocatedAmount);
        }
    });

    return newTargets;
};

export default function TargetManager({ categories, targets, setTargets, formatRp }) {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [globalTargetInput, setGlobalTargetInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Get current year target data
    const currentYearTargets = useMemo(() => {
        return targets[year] || {};
    }, [targets, year]);

    const handleAutoGenerate = () => {
        const globalTarget = parseFloat(globalTargetInput.replace(/[^0-9]/g, ''));
        if (!globalTarget || globalTarget <= 0) {
            alert('Masukkan total target global yang valid (contoh: 40000000000)');
            return;
        }

        setIsGenerating(true);
        setTimeout(() => {
            const distributed = generateAIBreakdown(globalTarget, year, categories);
            
            setTargets(prev => ({
                ...prev,
                [year]: distributed
            }));
            
            setIsGenerating(false);
            setGlobalTargetInput('');
            alert('Berhasil! Target telah didistribusikan secara otomatis oleh Smart AI berdasarkan Kalender Hari Libur dan Musim.');
        }, 800); // simulate thinking
    };

    const handleReset = () => {
        if (window.confirm(`Anda yakin ingin menghapus semua target pendapatan untuk tahun ${year}?`)) {
            setTargets(prev => {
                const newData = { ...prev };
                delete newData[year];
                return newData;
            });
        }
    };

    const updateTarget = (catId, itemId, month, value) => {
        const numValue = parseFloat(value.replace(/[^0-9]/g, '')) || 0;
        const key = `${catId}_${itemId}`;
        
        setTargets(prev => {
            const yearData = { ...(prev[year] || {}) };
            if (!yearData[key]) yearData[key] = {};
            yearData[key][month] = numValue;
            
            return {
                ...prev,
                [year]: yearData
            };
        });
    };

    // Calculate total for the year to show progress
    const calculatedTotal = useMemo(() => {
        let total = 0;
        Object.keys(currentYearTargets).forEach(key => {
            Object.keys(currentYearTargets[key]).forEach(month => {
                total += currentYearTargets[key][month] || 0;
            });
        });
        return total;
    }, [currentYearTargets]);

    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-6">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500"/> Manajemen Target Pendapatan
            </h2>
            
            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Target Global (Setahun)</label>
                    <input 
                        type="text" 
                        value={globalTargetInput}
                        onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setGlobalTargetInput(val ? formatRp(val) : '');
                        }}
                        className="w-full md:w-64 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-amber-500 font-bold" 
                        placeholder="Misal: 40.000.000.000" 
                    />
                </div>
                
                <div className="shrink-0">
                    <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Tahun</label>
                    <select 
                        value={year} 
                        onChange={e => setYear(e.target.value)}
                        className="border border-gray-300 rounded-lg p-2 text-sm outline-none font-bold bg-white"
                    >
                        {['2024', '2025', '2026', '2027', '2028', '2029', '2030'].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="shrink-0 md:mt-5 flex gap-2">
                    <button 
                        onClick={handleReset}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-sm"
                        title={`Hapus target tahun ${year}`}
                    >
                        <Trash2 size={16} />
                        Reset
                    </button>
                    <button 
                        onClick={handleAutoGenerate}
                        disabled={isGenerating || !globalTargetInput}
                        className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-sm"
                    >
                        <Sparkles size={16} />
                        {isGenerating ? 'Memproses AI...' : 'Smart Breakdown (AI)'}
                    </button>
                </div>
            </div>

            <div className="mb-4 flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 font-medium flex items-center gap-2">
                    <Info size={16} className="text-blue-500" />
                    Total Akumulasi Target {year}:
                </div>
                <div className="text-lg font-black text-indigo-700">
                    Rp {formatRp(calculatedTotal)}
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                        <tr>
                            <th className="px-3 py-2 border-b border-gray-200 sticky left-0 bg-gray-100 z-10 w-48 shadow-[1px_0_0_#e5e7eb]">Kategori / Item</th>
                            {monthNames.map(m => (
                                <th key={m} className="px-2 py-2 border-b border-gray-200 border-l text-center min-w-[100px]">{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.filter(c => c.type === 'utama' && c.items).map(cat => (
                            <React.Fragment key={cat.id}>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <td colSpan={13} className="px-3 py-2 font-bold text-gray-800 sticky left-0 bg-gray-50 z-10 shadow-[1px_0_0_#e5e7eb]">
                                        {cat.name}
                                    </td>
                                </tr>
                                {cat.items.map(item => {
                                    const key = `${cat.id}_${item.id}`;
                                    const itemTarget = currentYearTargets[key] || {};
                                    
                                    return (
                                        <tr key={key} className="border-b border-gray-100 hover:bg-amber-50/30">
                                            <td className="px-3 py-2 text-gray-600 sticky left-0 bg-white z-10 shadow-[1px_0_0_#e5e7eb] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                                <span className="truncate" title={item.name}>{item.name}</span>
                                            </td>
                                            {months.map(m => {
                                                const val = itemTarget[m] || 0;
                                                return (
                                                    <td key={m} className="px-1 py-1 border-l border-gray-100">
                                                        <input 
                                                            type="text" 
                                                            value={val > 0 ? formatRp(val) : ''}
                                                            onChange={e => updateTarget(cat.id, item.id, m, e.target.value)}
                                                            className="w-full text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-1 py-1 text-xs outline-none font-medium"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-3 text-[11px] text-gray-500">
                * Data akan tersimpan secara otomatis saat Anda mengubah nilai atau memproses menggunakan AI.
            </div>
        </div>
    );
}
