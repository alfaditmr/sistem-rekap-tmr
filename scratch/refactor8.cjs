const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// The exact string to find Laporan start
const laporanStartStr = "{/* 🔴 TAB: LAPORAN (EXCEL) */}";
let laporanStart = code.indexOf(laporanStartStr);
// Include the comment block start
const fullLaporanStart = code.lastIndexOf("{/* ============================================================== */}", laporanStart);
if (fullLaporanStart === -1) throw new Error("Could not find full laporan start");

// Find Laporan End
const laporanEndStr = "Tabel di atas merekap pendapatan khusus dari sumber ${selectedReportType} pada bulan terpilih.`}\n            </div>\n          </div>\n        </div>\n      )}";
const fullLaporanEnd = code.indexOf(laporanEndStr, laporanStart) + laporanEndStr.length;

let laporanBlock = code.substring(laporanStart, fullLaporanEnd);
let oldLaporanBlock = code.substring(fullLaporanStart, fullLaporanEnd);

// Modify Laporan Block to be a dashboard tab
laporanBlock = laporanBlock.replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (");
// The max-w wrapper should just be a plain div because dashboard has its own max-w wrapper
laporanBlock = laporanBlock.replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div className="mt-4">');


// Dashboard Block
const dashStartStr = "{topLevelRoute === 'dashboard' && (";
const fullDashStart = code.indexOf(dashStartStr);

// we want to grab up to the first "      )}" inside the dashboard
const dashBlockEndStr = "        </div>\n      )}";
const firstDashEnd = code.indexOf(dashBlockEndStr, fullDashStart) + dashBlockEndStr.length;

let oldDashBlock = code.substring(fullDashStart, firstDashEnd);

// Create new dashboard block
let newDashBlock = oldDashBlock.replace("{topLevelRoute === 'dashboard' && (\n        <div className=\"max-w-4xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4\">", 
  "{dashboardTab === 'kalender' && (\n<div className=\"mt-4\">");

// Replace its ending
newDashBlock = newDashBlock.substring(0, newDashBlock.lastIndexOf(dashBlockEndStr)) + "</div>\n)}";

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

${newDashBlock}

${laporanBlock}

  </div>
)}`;

// Perform replacements using exact string matching
code = code.replace(oldLaporanBlock, ""); // Delete old Laporan
code = code.replace(oldDashBlock, finalDash); // Replace old dashboard

fs.writeFileSync('src/App.jsx', code);
console.log('Done securely.');
