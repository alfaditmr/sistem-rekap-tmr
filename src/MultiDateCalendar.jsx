import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function MultiDateCalendar({ uniqueDates, selectedDates, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const popoverRef = useRef(null);

    const [selectionStart, setSelectionStart] = useState(null);

    // Initialize month to the latest available date or today
    useEffect(() => {
        if (uniqueDates && uniqueDates.length > 0) {
            // Find the latest valid date
            let latestDate = null;
            for (const dStr of uniqueDates) {
                if (dStr === 'Semua') continue;
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) {
                    if (!latestDate || d > latestDate) {
                        latestDate = d;
                    }
                }
            }
            if (latestDate) {
                setCurrentMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
            }
        }
    }, [uniqueDates]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        // Month Header
        const header = (
            <div className="flex justify-between items-center mb-2" key="header">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} className="text-gray-600" /></button>
                <div className="font-bold text-gray-800">{monthNames[month]} {year}</div>
                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} className="text-gray-600" /></button>
            </div>
        );

        // Day of week headers
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const dayHeaders = (
            <div className="grid grid-cols-7 gap-1 mb-2" key="day-headers">
                {dayNames.map(d => (
                    <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>
                ))}
            </div>
        );

        // Blank days
        const blanks = [];
        for (let i = 0; i < firstDay; i++) {
            blanks.push(<div key={`blank-${i}`} className="p-2"></div>);
        }

        // Available dates set (normalized to avoid time issues)
        const availableDates = new Set();
        uniqueDates.forEach(dStr => {
            if (dStr === 'Semua') return;
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) {
                availableDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            }
        });

        const selectedSet = new Set();
        selectedDates.forEach(dStr => {
            if (dStr === 'Semua') return;
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) {
                selectedSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            }
        });

        // Days
        const dayCells = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${month}-${d}`;
            const isAvailable = availableDates.has(dateStr);
            const isSelected = selectedSet.has(dateStr);
            
            // Highlight if it's the start of a selection range
            const isSelectionStart = selectionStart && selectionStart.getFullYear() === year && selectionStart.getMonth() === month && selectionStart.getDate() === d;
            
            // Format to match uniqueDates (e.g. Sep 01, 2026)
            const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedDateString = `${shortMonths[month]} ${String(d).padStart(2, '0')}, ${year}`;
            
            // Check if formattedDateString actually exists in uniqueDates to be safe
            const exactMatch = uniqueDates.find(ud => ud.startsWith(formattedDateString) || (new Date(ud).getFullYear() === year && new Date(ud).getMonth() === month && new Date(ud).getDate() === d));

            dayCells.push(
                <button
                    key={`day-${d}`}
                    disabled={!isAvailable}
                    onClick={() => {
                        if (!isAvailable || !exactMatch) return;
                        const clickedDate = new Date(year, month, d);
                        
                        if (!selectionStart) {
                            // First click: start a new range (clears previous)
                            setSelectionStart(clickedDate);
                            onChange([exactMatch]);
                        } else {
                            // Second click: end the range
                            const start = selectionStart < clickedDate ? selectionStart : clickedDate;
                            const end = selectionStart < clickedDate ? clickedDate : selectionStart;
                            
                            const newSelected = [];
                            uniqueDates.forEach(ud => {
                                if (ud === 'Semua') return;
                                const udDate = new Date(ud);
                                if (!isNaN(udDate.getTime())) {
                                    const udTime = new Date(udDate.getFullYear(), udDate.getMonth(), udDate.getDate()).getTime();
                                    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
                                    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
                                    if (udTime >= startTime && udTime <= endTime) {
                                        newSelected.push(ud);
                                    }
                                }
                            });
                            
                            onChange(newSelected);
                            setSelectionStart(null); // Reset so next click starts new range
                        }
                    }}
                    className={`
                        p-2 text-sm rounded-lg text-center transition-colors
                        ${!isAvailable ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${isAvailable && !isSelected && !isSelectionStart ? 'text-gray-700 hover:bg-gray-100 font-medium cursor-pointer' : ''}
                        ${isSelected || isSelectionStart ? 'bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer shadow-sm' : ''}
                        ${isSelectionStart ? 'ring-2 ring-blue-300 ring-offset-1' : ''}
                    `}
                >
                    {d}
                </button>
            );
        }

        return (
            <div className="p-4 w-[300px]">
                {header}
                <div className="text-center text-[10px] text-gray-500 mb-3 bg-gray-50 p-1.5 rounded border border-gray-100">
                    {selectionStart ? 'Klik tanggal akhir untuk memilih range' : 'Klik 2 tanggal untuk memilih rentang (Range)'}
                </div>
                {dayHeaders}
                <div className="grid grid-cols-7 gap-1">
                    {blanks}
                    {dayCells}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <button 
                        onClick={() => onChange(['Semua'])}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                        Pilih Semua
                    </button>
                    {selectedDates.length > 0 && selectedDates[0] !== 'Semua' && (
                        <div className="text-xs text-gray-500 font-medium">
                            {selectedDates.length} terpilih
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const displayText = selectedDates.length === 0 || (selectedDates.length === 1 && selectedDates[0] === 'Semua') 
        ? 'Semua Tanggal' 
        : selectedDates.length === 1 
            ? selectedDates[0] 
            : `${selectedDates.length} Tanggal Terpilih`;

    return (
        <div className="relative" ref={popoverRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:border-blue-500 px-4 py-2 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
                <CalendarIcon size={16} className="text-blue-600" />
                <span className="font-medium">{displayText}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                    {renderCalendar()}
                </div>
            )}
            
            {/* Selected Pills (Optional extra view) */}
            {selectedDates.length > 0 && selectedDates[0] !== 'Semua' && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-md">
                    {selectedDates.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">
                            {d}
                            <button onClick={() => {
                                const newDates = selectedDates.filter(sd => sd !== d);
                                onChange(newDates.length > 0 ? newDates : ['Semua']);
                            }} className="hover:bg-blue-200 rounded p-0.5"><X size={12}/></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
