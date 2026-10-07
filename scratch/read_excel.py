import pandas as pd

try:
    df = pd.read_excel('REALISASI 102M 2026.xlsx', sheet_name=None)
    with open('scratch/realisasi_sample.txt', 'w', encoding='utf-8') as f:
        for sheet_name, sheet_df in df.items():
            f.write(f"--- Sheet: {sheet_name} ---\n")
            f.write(sheet_df.head(10).to_string())
            f.write("\n\n")
            
            # Print column names
            f.write(f"Columns: {list(sheet_df.columns)}\n")
            f.write("\n========================================\n\n")
            
except Exception as e:
    with open('scratch/realisasi_sample.txt', 'w', encoding='utf-8') as f:
        f.write(f"Error: {e}")
