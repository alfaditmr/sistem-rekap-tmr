import re

def main():
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Kalender Tab Button to Nav Bar
    nav_button = """            <button onClick={() => { setActiveTab('kalender'); setPrintMode('pdf'); }} className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${activeTab === 'kalender' ? 'bg-green-800' : 'hover:bg-green-600'}`}><Calendar size={18} /> <span className="hidden md:inline">Kalender</span></button>\n"""
    
    # Find the input button line and insert nav_button before it
    input_button_pattern = r"(<button onClick=\{\(\) => \{ setActiveTab\('input'\); setPrintMode\('pdf'\); \}\} className=\{`px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 \$\{activeTab === 'input' \? 'bg-green-800' : 'hover:bg-green-600'\}`\}><Edit size=\{18\} /> <span className=\"hidden md:inline\">Input</span></button>)"
    if not re.search(input_button_pattern, content):
        print("Could not find input button!")
        return
    content = re.sub(input_button_pattern, nav_button + r"\1", content)

    # 2. Extract Calendar Block using regex matching the exact div structure
    calendar_pattern = re.compile(r"(\{dashboardTab === 'kalender' && \([\s\S]*?</div>\n)\}\)", re.MULTILINE)
    match = calendar_pattern.search(content)
    if not match:
        # Fallback to lines if regex fails
        print("Calendar block regex failed! Trying line indices.")
        lines = content.split('\n')
        # We know it's around 2828 to 2877 based on the view
        start_idx = -1
        end_idx = -1
        for i, line in enumerate(lines):
            if "{dashboardTab === 'kalender' && (" in line:
                start_idx = i
                break
        
        if start_idx != -1:
            for i in range(start_idx, len(lines)):
                if lines[i] == ")}":
                    # Check if the previous line is </div>
                    if "</div>" in lines[i-1]:
                        end_idx = i
                        break
        
        if start_idx == -1 or end_idx == -1:
            print("Failed to find calendar block!")
            return
            
        calendar_block = '\n'.join(lines[start_idx:end_idx+1])
        
        # Remove from content
        content = content.replace(calendar_block, "")
    else:
        calendar_block = match.group(0)
        content = content.replace(calendar_block, "")
        
    # Modify calendar block
    calendar_block = calendar_block.replace("{dashboardTab === 'kalender' && (", "{activeTab === 'kalender' && (")
    calendar_block = calendar_block.replace("Pusat Laporan & Analitik", "Kalender Status STSU")
    # wrap in a max-w-6xl div to give it proper margins
    calendar_block = calendar_block.replace('<div className="mt-4">', '<div className="max-w-6xl mx-auto px-4 py-6 mt-4">')

    # 3. Inject calendar block before activeTab === 'rekonBank'
    rekon_pattern = r"(\{activeTab === 'rekonBank' && \()"
    if not re.search(rekon_pattern, content):
        print("Could not find rekonBank tab!")
        return
        
    content = re.sub(rekon_pattern, calendar_block + "\n\n      " + r"\1", content)

    # 4. Remove dashboard tab toggles
    toggle_pattern = re.compile(r'\s*<div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 p-1\.5 bg-white rounded-xl shadow-sm border border-gray-200 w-max mx-auto">[\s\S]*?</div>\n', re.MULTILINE)
    content = re.sub(toggle_pattern, "", content)
    
    # 5. Change default state of dashboardTab from 'kalender' to 'rekap'
    content = content.replace("useState('kalender');", "useState('rekap');")

    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Success")

if __name__ == '__main__':
    main()
