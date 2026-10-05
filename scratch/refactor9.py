import io

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Title
code = code.replace(
    '<p className="text-gray-500 mb-12 text-center font-medium">Sistem Informasi Manajemen Fasilitas TMR</p>',
    '<p className="text-gray-500 mb-12 text-center font-medium">Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan</p>'
)
code = code.replace(
    '<p className="text-gray-500 mb-10">Sistem Informasi Manajemen Fasilitas TMR</p>',
    '<p className="text-gray-500 mb-10">Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan</p>'
)

# 2. Extract Laporan
lap_start_str = "{/* 🔴 TAB: LAPORAN (EXCEL) */}"
lap_start_idx = code.find(lap_start_str)

full_lap_start = code.rfind("{/* ============================================================== */}", 0, lap_start_idx)

lap_end_str = "Tabel di atas merekap pendapatan khusus dari sumber ${selectedReportType} pada bulan terpilih.`}\n            </div>\n          </div>\n        </div>\n      )}"
full_lap_end = code.find(lap_end_str, lap_start_idx) + len(lap_end_str)

lap_block = code[lap_start_idx:full_lap_end]
code = code[:full_lap_start] + code[full_lap_end:]

lap_block = lap_block.replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (")
lap_block = lap_block.replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div className="mt-4">')

# 3. Dashboard
dash_start_str = "{topLevelRoute === 'dashboard' && ("
dash_start = code.find(dash_start_str)

dash_end_str = "        </div>\n      )}"
dash_first_end = code.find(dash_end_str, dash_start) + len(dash_end_str)

dash_block = code[dash_start:dash_first_end]

new_dash_block = dash_block.replace(
    "{topLevelRoute === 'dashboard' && (\n        <div className=\"max-w-4xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4\">",
    "{dashboardTab === 'kalender' && (\n<div className=\"mt-4\">"
)
new_dash_block = new_dash_block[:new_dash_block.rfind(dash_end_str)] + "</div>\n)}"

final_dash = f"""{{topLevelRoute === 'dashboard' && (
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

{new_dash_block}

{lap_block}

  </div>
)}}"""

code = code[:dash_start] + final_dash + code[dash_first_end:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('done')
