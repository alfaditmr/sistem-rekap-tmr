const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const laporanStart = code.indexOf('{/* 🔴 TAB: LAPORAN (EXCEL) */}');
const laporanEnd = code.indexOf('          </div>\n        </div>\n      )}', laporanStart) + 40;
let laporanBlock = code.substring(laporanStart, laporanEnd);

code = code.substring(0, laporanStart - 80) + code.substring(laporanEnd);

laporanBlock = laporanBlock.replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (");
laporanBlock = laporanBlock.replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div>');

const dashStart = code.indexOf("{topLevelRoute === 'dashboard' && (");
const dashEnd = code.indexOf("          </div>\n        </div>\n      )}", dashStart) + 40;
let dashBlock = code.substring(dashStart, dashEnd);

dashBlock = dashBlock.replace("{topLevelRoute === 'dashboard' && (\n        <div className=\"max-w-4xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4\">", 
  "{dashboardTab === 'kalender' && (\n<div>");

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

code = code.substring(0, dashStart) + finalDash + code.substring(dashEnd);
fs.writeFileSync('src/App.jsx', code);
console.log('done');
