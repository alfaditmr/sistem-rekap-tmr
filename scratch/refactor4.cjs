const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Title renaming
code = code.replace(
  '<p className="text-gray-500 mb-12 text-center font-medium">Sistem Informasi Manajemen Fasilitas TMR</p>',
  '<p className="text-gray-500 mb-12 text-center font-medium">Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan</p>'
);
code = code.replace(
  '<p className="text-gray-500 mb-10">Sistem Informasi Manajemen Fasilitas TMR</p>',
  '<p className="text-gray-500 mb-10">Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan</p>'
);

// We will use replace instead of substring math which is error prone
// 1. Extract Laporan Block
const laporanStartStr = "{activeTab === 'laporan' && (";
const laporanStart = code.indexOf(laporanStartStr);
if (laporanStart === -1) throw new Error("Could not find laporan block");

const laporanEndStr = "              {selectedReportType === 'rekapitulasi' \n                  ? 'Kolom (SATU, DUA) otomatis ditambahkan mengikuti Hari Minggu pada kalender bulan tersebut.'\n                  : `Tabel di atas merekap pendapatan khusus dari sumber ${selectedReportType} pada bulan terpilih.`}\n            </div>\n          </div>\n        </div>\n      )}";
const laporanEnd = code.indexOf(laporanEndStr, laporanStart) + laporanEndStr.length;

let laporanBlock = code.substring(laporanStart, laporanEnd);
let oldLaporanBlock = laporanBlock;

// Modify Laporan Block
laporanBlock = laporanBlock.replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (");
laporanBlock = laporanBlock.replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div>');

// 2. Extract Dashboard Block
const dashStartStr = "{topLevelRoute === 'dashboard' && (";
const dashStart = code.indexOf(dashStartStr);
if (dashStart === -1) throw new Error("Could not find dashboard block");

const dashEndStr = "        </div>\n      )}";
// Find the exact dashboard end by starting search from dashStart + 5000 (skip inner divs)
const dashEnd = code.indexOf(dashEndStr, dashStart + 3000) + dashEndStr.length;

let dashBlock = code.substring(dashStart, dashEnd);
let oldDashBlock = dashBlock;

dashBlock = dashBlock.replace("{topLevelRoute === 'dashboard' && (\n        <div className=\"max-w-4xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4\">", 
  "{dashboardTab === 'kalender' && (\n<div>");

dashBlock = dashBlock.substring(0, dashBlock.lastIndexOf(dashEndStr)) + "</div>\n)}";

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

// Now safely replace in code
// Delete Laporan
code = code.replace(oldLaporanBlock, "");
// Replace Dashboard
code = code.replace(oldDashBlock, finalDash);

// Remove from Nav
const navBtn = '<button onClick={() => { setActiveTab(\'laporan\'); setPrintMode(\'pdf\'); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === \'laporan\' ? \'bg-green-800\' : \'hover:bg-green-600\'}`}><Table size={18} /> <span className="hidden md:inline">Laporan</span></button>\n            ';
code = code.replace(navBtn, '');

// Add dashboardTab state
const stateTarget = "const [topLevelRoute, setTopLevelRoute] = useState('home');";
code = code.replace(stateTarget, stateTarget + "\n  const [dashboardTab, setDashboardTab] = useState('kalender');");


fs.writeFileSync('src/App.jsx', code);
console.log('done safely');
