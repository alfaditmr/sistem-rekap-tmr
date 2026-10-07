import os
import pandas as pd
import warnings

# Suppress xlrd warnings
warnings.filterwarnings('ignore')

files = [
    "DATA PENGUNJUNG 2018.xls",
    "DATA PENGUNJUNG 2019.xls",
    "DATA PENGUNJUNG 2020.xls",
    "DATA PENGUNJUNG 2021.xls",
    "DATA PENGUNJUNG 2022.xls",
    "DATA PENGUNJUNG 2023.xls",
    "DATA PENGUNJUNG 2024.xls",
    "DATA PENGUNJUNG 2025.xls",
    "REALISASI 102M 2026.xlsx"
]

print("=== EXCEL COLUMNS ANALYSIS ===")

for filename in files:
    if not os.path.exists(filename):
        continue
        
    try:
        # Load the file
        xls = pd.ExcelFile(filename)
        
        # Get the first sheet that looks like a month (usually January)
        month_sheet = None
        for sheet in xls.sheet_names:
            if 'JANUARI' in sheet.upper():
                month_sheet = sheet
                break
        
        if not month_sheet:
            month_sheet = xls.sheet_names[0]
            
        print(f"\n[{filename}] - Sheet: {month_sheet}")
        
        # Read the top 10 rows without headers to see raw data
        df = pd.read_excel(xls, sheet_name=month_sheet, header=None, nrows=10)
        
        # We will collect all string values in these rows that might be headers
        found_headers = set()
        
        for idx, row in df.iterrows():
            row_vals = []
            for val in row.values:
                if pd.isna(val):
                    continue
                val_str = str(val).strip()
                if val_str and len(val_str) > 1 and not val_str.replace('.','',1).isdigit():
                    row_vals.append(val_str)
            
            if len(row_vals) > 3: # If a row has more than 3 strings, it might be the header row
                print(f"Row {idx}: {row_vals[:15]}...") # print up to 15 to keep it readable
                
    except Exception as e:
        print(f"Error reading {filename}: {str(e)}")
