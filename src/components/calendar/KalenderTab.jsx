import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { safeString, formatRp, getLocalYMD } from '../../utils/formatters';

/**
 * Komponen Tab Kalender Status STSU
 * Menampilkan matriks hari dalam bulan dengan indikator kelengkapan STSU Utama dan Lain-lain
 */
export default function KalenderTab({
  activeTab,
  allReports = {},
  reportDate,
  onSelectDay
}) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const nextMonth = () =>
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  const prevMonth = () =>
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));

  const { blanks, days } = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const blanksArr = Array.from({ length: firstDayIndex }, (_, i) => i);
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = allReports[dateStr] || {};
      const utamaItems = Array.isArray(dayData.utama?.activeItems) ? dayData.utama.activeItems : [];
      const hasUtama = utamaItems.length > 0;
      const utamaSequence = dayData.utama?.sequence || '';
      const utamaTotal =
        hasUtama && dayData.utama?.formData
          ? Object.values(dayData.utama.formData).reduce((sum, val) => sum + (Number(val) || 0), 0)
          : 0;

      const lainDocs = [];
      Object.keys(dayData).forEach((k) => {
        if (
          (k === 'lain' || k.startsWith('lain_')) &&
          Array.isArray(dayData[k].activeItems) &&
          dayData[k].activeItems.length > 0
        ) {
          lainDocs.push({
            key: k,
            sequence: dayData[k].sequence || '',
            total: dayData[k].formData
              ? Object.values(dayData[k].formData).reduce((sum, val) => sum + (Number(val) || 0), 0)
              : 0
          });
        }
      });

      return {
        day: d,
        dateStr,
        hasUtama,
        utamaSequence,
        utamaTotal,
        lainDocs,
        hasLain: lainDocs.length > 0
      };
    });

    return { blanks: blanksArr, days: daysArr };
  }, [calendarMonth, allReports]);

  if (activeTab !== 'kalender') return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 mt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-center text-white">
          <h2 className="text-2xl font-black mb-1 drop-shadow-sm">Kalender Status STSU</h2>
          <p className="text-blue-100 text-sm opacity-90">
            Pantau kelengkapan STSU Pendapatan dan STSU Lain-lain.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6 bg-gray-50 p-2 rounded-xl border border-gray-100">
            <button
              onClick={prevMonth}
              className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
              {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <div
                key={day}
                className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="h-28 sm:h-36 bg-gray-50/50 rounded-lg sm:rounded-xl"></div>
            ))}

            {days.map((d) => {
              const isToday = d.dateStr === getLocalYMD();
              const isActive = d.dateStr === reportDate;

              return (
                <button
                  key={d.day}
                  onClick={() => onSelectDay({ dateStr: d.dateStr })}
                  className={`relative h-28 sm:h-36 rounded-lg sm:rounded-xl flex flex-col justify-start items-center pt-1.5 sm:pt-2 border transition-all overflow-hidden ${
                    d.hasUtama || d.hasLain
                      ? 'bg-blue-50/30 hover:bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  } ${isActive ? 'ring-2 ring-blue-500 transform scale-105 z-10 bg-blue-50' : ''}`}
                >
                  <span
                    className={`text-sm sm:text-lg font-bold ${
                      isToday ? 'text-blue-600 bg-blue-100 px-2 rounded-full' : 'text-gray-700'
                    }`}
                  >
                    {d.day}
                  </span>

                  <div className="mt-1 w-full px-1 flex flex-col gap-1 items-center overflow-y-auto no-scrollbar pb-1">
                    {d.hasUtama && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDay({ dateStr: d.dateStr, type: 'utama' });
                        }}
                        className="w-full bg-green-50 border border-green-200 rounded shadow-sm flex flex-col overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                        title="Klik untuk membuka dokumen STSU Utama (SU)"
                      >
                        <div className="bg-green-500 text-white flex justify-between items-center px-1.5 py-0.5">
                          <span className="text-[9px] font-bold">SU</span>
                          {d.utamaSequence && d.utamaSequence !== '...' && (
                            <span className="text-[9px] font-bold">{safeString(d.utamaSequence)}</span>
                          )}
                        </div>
                        <div
                          className="text-[9px] sm:text-[10px] font-black text-green-800 text-right px-1.5 py-0.5 truncate"
                          title={`Rp ${formatRp(d.utamaTotal)}`}
                        >
                          Rp {formatRp(d.utamaTotal)}
                        </div>
                      </div>
                    )}

                    {d.lainDocs.map((lainDoc, index) => {
                      const docNum =
                        lainDoc.key === 'lain'
                          ? 1
                          : parseInt(lainDoc.key.split('_')[1], 10) || index + 1;
                      return (
                        <div
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDay({ dateStr: d.dateStr, type: 'lain', lainIndex: docNum });
                          }}
                          className="w-full bg-purple-50 border border-purple-200 rounded shadow-sm flex flex-col overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                          title={`Klik untuk membuka Dokumen Lain-lain (SU/L) Ke-${docNum}`}
                        >
                          <div className="bg-purple-500 text-white flex justify-between items-center px-1.5 py-0.5">
                            <span className="text-[9px] font-bold">
                              SU/L {docNum > 1 ? `Ke-${docNum}` : ''}
                            </span>
                            {lainDoc.sequence && lainDoc.sequence !== '...' && (
                              <span className="text-[9px] font-bold">{safeString(lainDoc.sequence)}</span>
                            )}
                          </div>
                          <div
                            className="text-[9px] sm:text-[10px] font-black text-purple-800 text-right px-1.5 py-0.5 truncate"
                            title={`Rp ${formatRp(lainDoc.total)}`}
                          >
                            Rp {formatRp(lainDoc.total)}
                          </div>
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
  );
}
