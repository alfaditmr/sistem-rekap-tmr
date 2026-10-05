import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove Laporan button from Nav
nav_btn = r'<button onClick={() => { setActiveTab\(\'laporan\'\); setPrintMode\(\'pdf\'\); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1\.5 \${activeTab === \'laporan\' \? \'bg-green-800\' : \'hover:bg-green-600\'}`}><Table size=\{18\} /> <span className="hidden md:inline">Laporan</span></button>'
code = re.sub(nav_btn + r'\s*', '', code)

# 2. Extract activeTab === 'laporan' block
laporan_start_str = "{activeTab === 'laporan' && ("
laporan_start_idx = code.find(laporan_start_str)

laporan_end_str = "              {selectedReportType === 'rekapitulasi' \n                  ? 'Kolom (SATU, DUA) otomatis ditambahkan mengikuti Hari Minggu pada kalender bulan tersebut.'\n                  : `Tabel di atas merekap pendapatan khusus dari sumber ${selectedReportType} pada bulan terpilih.`}\n            </div>\n          </div>\n        </div>\n      )}"
laporan_end_idx = code.find(laporan_end_str, laporan_start_idx) + len(laporan_end_str)

laporan_block = code[laporan_start_idx:laporan_end_idx]

# Remove it from the original place, along with the comment above it
preceding_comment_idx = code.rfind('// ==============================================================', 0, laporan_start_idx) - 8
code = code[:preceding_comment_idx] + code[laporan_end_idx:]

# Convert activeTab === 'laporan' to dashboardTab === 'rekap'
laporan_block = laporan_block.replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (")
# Remove the <div className="max-w-6xl mx-auto px-4 py-6 no-print"> wrapper
laporan_block = laporan_block.replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div>')

# 3. Extract topLevelRoute === 'dashboard' block
dashboard_start_str = "{topLevelRoute === 'dashboard' && ("
dashboard_start_idx = code.find(dashboard_start_str)
dashboard_end_str = "        </div>\n      )}"
dashboard_end_idx = code.find(dashboard_end_str, dashboard_start_idx) + len(dashboard_end_str)

dashboard_block = code[dashboard_start_idx:dashboard_end_idx]
# Strip the outer wrapper of the old dashboard
old_dashboard_inner = dashboard_block.replace(
    "{topLevelRoute === 'dashboard' && (\n        <div className=\"max-w-4xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4\">",
    "{dashboardTab === 'kalender' && (\n<div>"
)
old_dashboard_inner = re.sub(r'        </div>\n      \)}$', '</div>\n)}', old_dashboard_inner)

new_dashboard_route = f"""{{topLevelRoute === 'dashboard' && (
  <div className="max-w-6xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4">
     
     <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 w-max mx-auto">
       <button 
          onClick={{() => setDashboardTab('kalender')}}
          className={{`px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${{dashboardTab === 'kalender' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}}`}}
       >
          <Calendar className="inline-block mr-2" size={{18}} /> Kalender Status
       </button>
       <button 
          onClick={{() => setDashboardTab('rekap')}}
          className={{`px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${{dashboardTab === 'rekap' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}}`}}
       >
          <FileSpreadsheet className="inline-block mr-2" size={{18}} /> Rekapitulasi & Rekon
       </button>
     </div>

     {old_dashboard_inner}

     {laporan_block}

  </div>
)}}"""

code = code[:dashboard_start_idx] + new_dashboard_route + code[dashboard_end_idx:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully refactored dashboard & laporan!")
