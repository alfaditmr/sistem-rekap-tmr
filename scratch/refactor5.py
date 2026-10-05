import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Title renaming
for i in range(len(lines)):
    if '<p className="text-gray-500 mb-12 text-center font-medium">Sistem Informasi Manajemen Fasilitas TMR</p>' in lines[i]:
        lines[i] = lines[i].replace('Sistem Informasi Manajemen Fasilitas TMR', 'Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan')
    if '<p className="text-gray-500 mb-10">Sistem Informasi Manajemen Fasilitas TMR</p>' in lines[i]:
        lines[i] = lines[i].replace('Sistem Informasi Manajemen Fasilitas TMR', 'Sistem Informasi Manajemen Pendapatan Taman Margasatwa Ragunan')

# Laporan
laporan_start = -1
laporan_end = -1
for i in range(len(lines)):
    if "{activeTab === 'laporan' && (" in lines[i]:
        laporan_start = i
    if laporan_start != -1 and "Tabel di atas merekap pendapatan khusus dari sumber" in lines[i]:
        # The end of laporan is 4 lines after this
        laporan_end = i + 4
        break

laporan_lines = lines[laporan_start:laporan_end+1]
laporan_lines[0] = laporan_lines[0].replace("{activeTab === 'laporan' && (", "{dashboardTab === 'rekap' && (")
laporan_lines[1] = laporan_lines[1].replace('<div className="max-w-6xl mx-auto px-4 py-6 no-print">', '<div>')

# Delete Laporan lines and the comment above it
# Find comment
comment_start = laporan_start
for i in range(laporan_start-1, -1, -1):
    if "{/* 🔴 TAB: LAPORAN (EXCEL) */}" in lines[i]:
        comment_start = i - 1
        break

del lines[comment_start:laporan_end+1]

# Dashboard
dash_start = -1
dash_end = -1
for i in range(len(lines)):
    if "{topLevelRoute === 'dashboard' && (" in lines[i]:
        dash_start = i
    if dash_start != -1 and "Pantau kelengkapan STSU Pendapatan dan STSU Lain-lain.</p>" in lines[i]:
        # Found it, we need to find the end of dashboard
        pass
        
for i in range(dash_start, len(lines)):
    if "</div>" in lines[i] and i+1 < len(lines) and ")}" in lines[i+1] and i+2 < len(lines) and "</div>" in lines[i+2]:
        dash_end = i + 1

dash_lines = lines[dash_start:dash_end+1]
dash_lines[0] = "{dashboardTab === 'kalender' && (\n"
dash_lines[1] = "<div>\n"

# Delete original dashboard
del lines[dash_start:dash_end+1]

# Reconstruct Dashboard
final_dash = """      {topLevelRoute === 'dashboard' && (
        <div className="max-w-6xl mx-auto px-4 py-6 no-print w-full animate-in fade-in slide-in-from-bottom-4">
           
           <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 w-max mx-auto">
             <button 
                onClick={() => setDashboardTab('kalender')}
                className={`px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${dashboardTab === 'kalender' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
             >
                <Calendar className="inline-block mr-2" size={18} /> Kalender Status
             </button>
             <button 
                onClick={() => setDashboardTab('rekap')}
                className={`px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${dashboardTab === 'rekap' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
             >
                <FileSpreadsheet className="inline-block mr-2" size={18} /> Rekapitulasi & Rekon
             </button>
           </div>

"""
final_dash_lines = [final_dash] + dash_lines + ["\n"] + laporan_lines + ["\n        </div>\n      )}\n"]

lines = lines[:dash_start] + final_dash_lines + lines[dash_start:]

# Nav Button
for i in range(len(lines)):
    if "Laporan</span" in lines[i] and "setActiveTab('laporan')" in lines[i]:
        lines[i] = ""
        break

# State
for i in range(len(lines)):
    if "const [topLevelRoute, setTopLevelRoute] = useState('home');" in lines[i]:
        lines.insert(i+1, "  const [dashboardTab, setDashboardTab] = useState('kalender');\n")
        break

# Add lucide import
for i in range(len(lines)):
    if "import { Settings, Edit" in lines[i]:
        if "FileSpreadsheet" not in lines[i]:
            lines[i] = lines[i].replace("} from 'lucide-react';", ", FileSpreadsheet } from 'lucide-react';")
        break

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('done')
