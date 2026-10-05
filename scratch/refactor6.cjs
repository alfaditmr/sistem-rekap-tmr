const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const lStart = code.indexOf("{/* 🔴 TAB: LAPORAN (EXCEL) */}");
const lEndStr = "Tabel di atas merekap pendapatan khusus dari sumber ${selectedReportType} pada bulan terpilih.`}\n            </div>\n          </div>\n        </div>\n      )}";
const lEnd = code.indexOf(lEndStr, lStart) + lEndStr.length;

let laporanBlock = code.substring(lStart, lEnd);

const cStart = code.lastIndexOf("{/* ============================================================== */}", lStart) - 8;

code = code.substring(0, cStart) + code.substring(lEnd);

laporanBlock = laporanBlock.replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (");
laporanBlock = laporanBlock.replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div>');

const dStart = code.indexOf("{topLevelRoute === 'dashboard' && (");
const dEndStr = "</div>\n      )}";
// be careful not to match the very end of file. The dashboard block ends with:
//         </div>
//       )}
//
//       </div>
//       )}
const searchDend = "      )}";
const dEnd = code.indexOf(searchDend, dStart + 2000) + searchDend.length;

let dashBlock = code.substring(dStart, dEnd);

dashBlock = dashBlock.replace("{topLevelRoute === 'dashboard' && (\n        <div className=\"max-w-4xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4\">", "{dashboardTab === 'kalender' && (\n<div>");

dashBlock = dashBlock.substring(0, dashBlock.lastIndexOf("      )}")) + ")}";

const finalDash = `{topLevelRoute === 'dashboard' && (
  <div className="max-w-6xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4">
     
     <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 w-max mx-auto">
       <button 
          onClick={() => setDashboardTab('kalender')}
          className={\`px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all \${dashboardTab === 'kalender' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}\`}
       >
          <Calendar className="inline-block mr-2" size={18} /> Kalender Status
       </button>
       <button 
          onClick={() => setDashboardTab('rekap')}
          className={\`px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all \${dashboardTab === 'rekap' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}\`}
       >
          <FileSpreadsheet className="inline-block mr-2" size={18} /> Rekapitulasi & Rekon
       </button>
     </div>

${dashBlock}

${laporanBlock}

  </div>
)}`;

code = code.substring(0, dStart) + finalDash + code.substring(dEnd);
fs.writeFileSync('src/App.jsx', code);
console.log('done');
