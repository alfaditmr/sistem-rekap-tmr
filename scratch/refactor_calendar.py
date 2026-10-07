import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract Calendar block
# The calendar block is wrapped in {dashboardTab === 'kalender' && ( ... )}
calendar_pattern = re.compile(r"(\{dashboardTab === 'kalender' && \([\s\S]*?</div>\s*\)\})", re.MULTILINE)
calendar_match = calendar_pattern.search(content)

if not calendar_match:
    print("Calendar block not found!")
    exit(1)

calendar_code = calendar_match.group(1)

# Modify the calendar code for the new context
# Remove {dashboardTab === 'kalender' && ( and the closing )}
calendar_code = re.sub(r"^\{dashboardTab === 'kalender' && \(\s*", "", calendar_code)
calendar_code = re.sub(r"\)\}\s*$", "", calendar_code)

# Change title
calendar_code = calendar_code.replace("Pusat Laporan & Analitik", "Kalender Status STSU")
# Add mb-6 to the main container
calendar_code = calendar_code.replace('<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">', '<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">')

# 2. Remove the old calendar block and the dashboard toggles
# The old calendar block
content = content.replace(calendar_match.group(0), "")

# The dashboard toggle
toggle_pattern = re.compile(r'<div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 p-1\.5 bg-white rounded-xl shadow-sm border border-gray-200 w-max mx-auto">[\s\S]*?</div>', re.MULTILINE)
toggle_match = toggle_pattern.search(content)
if toggle_match:
    content = content.replace(toggle_match.group(0), "")
else:
    print("Toggle block not found! Will continue anyway.")

# 3. Inject calendar into Input tab
# Find `{activeTab === 'input' && (`
input_tab_pattern = re.compile(r"(\{activeTab === 'input' && \(\s*<div className=\"max-w-4xl mx-auto px-4 py-6 no-print\">\s*)")
input_match = input_tab_pattern.search(content)

if not input_match:
    print("Input tab not found!")
    exit(1)

# Inject calendar_code
new_content = content[:input_match.end()] + calendar_code + "\n" + content[input_match.end():]

# 4. Change default state of dashboardTab from 'kalender' to 'rekap'
new_content = new_content.replace("const [dashboardTab, setDashboardTab] = useState('kalender');", "const [dashboardTab, setDashboardTab] = useState('rekap');")

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Calendar moved successfully!")
