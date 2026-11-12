import re
import time
import os
import sys
import shutil
import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from fpdf import FPDF

# Import untuk Date Picker
try:
    from tkcalendar import Calendar
except ImportError:
    print("Library 'tkcalendar' belum terinstall.")
    print("Silakan install dengan: pip install tkcalendar")
    sys.exit()

# ==============================================================================
# INSTRUKSI UNTUK MEMBUAT EXE (Gunakan di Terminal/CMD):
# 1. Install Library: pip install pyinstaller selenium fpdf tkcalendar babel
# 2. Perintah Build (Paling Aman): 
#    python -m PyInstaller --onefile --name "Bot_Rekon_3A_V1.7" --hidden-import="selenium.webdriver" --hidden-import="selenium.webdriver.chrome.webdriver" --hidden-import="babel.numbers" --hidden-import="tkcalendar" rekon_3a_1.7.py
# ==============================================================================

# ==========================================
# 1. KONFIGURASI
# ==========================================
A3_LOGIN_URL = "https://3a-cms.ainosi.id/login"
A3_TRANS_URL = "https://3a-cms.ainosi.id/pwa-order-v2"
A3_EMAIL, A3_PASS = "yaninfotmr@gmail.com", "Y4nInfo_TMR2024!"

CHROME_PROFILE_PATH = r"C:\SeleniumChromeProfile_PDF"
try:
    os.makedirs(CHROME_PROFILE_PATH, exist_ok=True)
except:
    if getattr(sys, 'frozen', False):
        app_path = os.path.dirname(sys.executable)
    else:
        app_path = os.path.dirname(os.path.abspath(__file__))
    CHROME_PROFILE_PATH = os.path.join(app_path, "ChromeProfile_PDF")
    os.makedirs(CHROME_PROFILE_PATH, exist_ok=True)

def clean_number(text: str) -> int:
    text = (text or "").strip()
    return int(re.sub(r"[^\d]", "", text)) if re.search(r"\d", text) else 0

def bersihkan_lock_profil(profile_dir):
    """Menghapus file lock sisa crash agar Chrome tidak gagal start."""
    for lock_name in ["SingletonLock", "SingletonCookie", "SingletonSocket", "DevToolsActivePort"]:
        lock_file = os.path.join(profile_dir, lock_name)
        if os.path.exists(lock_file):
            try:
                os.remove(lock_file)
            except:
                pass
        default_lock = os.path.join(profile_dir, "Default", lock_name)
        if os.path.exists(default_lock):
            try:
                os.remove(default_lock)
            except:
                pass

# ==========================================
# 2. DETEKSI KOLOM DINAMIS & LOGIKA PEMETAAN STSU
# ==========================================
def cari_indeks_kolom_tiket(thead):
    """
    Mendeteksi posisi kolom 'Ticket', 'Total Ticket' (Qty), dan 'Total Nominal' secara dinamis.
    Semua kolom di sebelah kiri 'Ticket' dianggap sebagai kolom informasi/sumber (Merchant, Location, dll).
    """
    idx_ticket = None
    idx_qty = None
    idx_nominal = None

    for i, h in enumerate(thead):
        h_clean = h.strip().upper()
        if h_clean in ["TICKET", "TICKET NAME", "NAMA TIKET", "TIKET"]:
            idx_ticket = i
        elif ("TOTAL" in h_clean and "TICKET" in h_clean) or "QTY" in h_clean or "JUMLAH TIKET" in h_clean:
            idx_qty = i
        elif "NOMINAL" in h_clean or "AMOUNT" in h_clean or h_clean == "TOTAL":
            idx_nominal = i

    if idx_ticket is None or idx_qty is None or idx_nominal is None:
        print(f"⚠️ [PERINGATAN] Ada perubahan nama header tabel: {thead}")
        if len(thead) >= 3:
            if idx_nominal is None: idx_nominal = len(thead) - 1
            if idx_qty is None: idx_qty = len(thead) - 2
            if idx_ticket is None: idx_ticket = len(thead) - 3
            print(f"   -> Menggunakan deteksi posisi otomatis: Kolom Ticket={idx_ticket}, Qty={idx_qty}, Nominal={idx_nominal}")
        else:
            return [], 0, 1, 2

    left_indices = [i for i in range(len(thead)) if i < idx_ticket and i not in (idx_qty, idx_nominal)]
    return left_indices, idx_ticket, idx_qty, idx_nominal


def petakan_ke_stsu(data_tiket, tanggal_rekon_str):
    stsu = {i: {"qty": 0, "nominal": 0} for i in range(1, 22)}
    tgl = datetime.strptime(tanggal_rekon_str, "%Y-%m-%d")
    is_weekend = tgl.weekday() >= 5 

    for item in data_tiket:
        info_kiri = str(item['left_info']).upper()
        tiket = str(item['ticket_name']).upper()
        qty = int(item['qty'])
        nominal = int(item['nominal'])
        gabungan = info_kiri + " " + tiket

        # 1. KENDARAAN / PARKIR (Pisahkan dengan tegas GOL I, GOL II, dan GOL III)
        if "KENDARAAN" in gabungan or "PARKIR" in gabungan or "MOTOR" in tiket or "MOBIL" in tiket or "BUS" in tiket or "SEPEDA" in tiket:
            idx = 0
            if re.search(r'\bGOL(?:ONGAN)?\s*III\b', tiket):
                idx = 19
            elif re.search(r'\bGOL(?:ONGAN)?\s*II\b', tiket):
                idx = 18
            elif re.search(r'\bGOL(?:ONGAN)?\s*I\b', tiket):
                idx = 17
            elif "BUS BESAR" in tiket or "TRUK BESAR" in tiket or "TRUCK BESAR" in tiket:
                idx = 17
            elif "BUS KECIL" in tiket or "TRUK KECIL" in tiket or "TRUCK KECIL" in tiket or "PICK UP BESAR" in tiket:
                idx = 18
            elif "MOBIL" in tiket or "MINIBUS" in tiket or "MINI BUS" in tiket or "SEDAN" in tiket or "PICK UP KECIL" in tiket:
                idx = 19
            elif "MOTOR" in tiket or "RODA TIGA" in tiket:
                idx = 20
            elif "SEPEDA" in tiket and "MOTOR" not in tiket:
                idx = 21
            
            if idx > 0:
                stsu[idx]["qty"] += qty
                stsu[idx]["nominal"] += nominal
            continue 

        # 2. WAHANA (Kuda, Unta, Gajah, TSA)
        idx = 0
        if "KUDA" in gabungan: idx = 5
        elif "UNTA" in gabungan: idx = 6
        elif "GAJAH" in gabungan: idx = 7
        elif "TAMAN SATWA ANAK" in gabungan or "TSA" in gabungan: idx = 8
        
        if idx > 0:
            stsu[idx]["qty"] += qty
            stsu[idx]["nominal"] += nominal
            continue

        # 3. PUSAT PRIMATA SCHMUTZER
        if "PRIMATA" in gabungan or "SCHMUTZER" in gabungan:
            is_holiday = any(k in tiket for k in ["WEEKEND", "HOLIDAY", "LIBUR"])
            is_weekday = "WEEKDAY" in tiket

            if is_holiday:
                libur = True
            elif is_weekday:
                libur = False
            else:
                libur = is_weekend
                
            idx = 0
            if "ROMBONGAN" in tiket or "REDUKSI" in tiket:
                if "DEWASA" in tiket: 
                    idx = 16 if libur else 11
                elif "ANAK" in tiket: 
                    idx = 15 if libur else 12
            else:
                if "DEWASA" in tiket: 
                    idx = 13 if libur else 9
                elif "ANAK" in tiket: 
                    idx = 14 if libur else 10
            
            if idx > 0:
                stsu[idx]["qty"] += qty
                stsu[idx]["nominal"] += nominal
            continue

        # 4. TIKET MASUK TMR PENGUNJUNG REGULER
        idx = 0
        if "ROMBONGAN" in tiket or "REDUKSI" in tiket:
            if "DEWASA" in tiket: idx = 3
            elif "ANAK" in tiket: idx = 4
        else:
            if "DEWASA" in tiket: idx = 1
            elif "ANAK" in tiket: idx = 2
            
        if idx > 0:
            stsu[idx]["qty"] += qty
            stsu[idx]["nominal"] += nominal

    return stsu

def terbilang(angka):
    angka = int(angka)
    huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
    if angka < 12: return huruf[angka]
    elif angka < 20: return terbilang(angka - 10) + " belas"
    elif angka < 100: return terbilang(angka // 10) + " puluh " + terbilang(angka % 10)
    elif angka < 200: return "seratus " + terbilang(angka - 100)
    elif angka < 1000: return terbilang(angka // 100) + " ratus " + terbilang(angka % 100)
    elif angka < 2000: return "seribu " + terbilang(angka - 1000)
    elif angka < 1000000: return terbilang(angka // 1000) + " ribu " + terbilang(angka % 1000)
    elif angka < 1000000000: return terbilang(angka // 1000000) + " juta " + terbilang(angka % 1000000)
    elif angka < 1000000000000: return terbilang(angka // 1000000000) + " miliar " + terbilang(angka % 1000000000)
    return ""

def generate_terbilang(nominal):
    if nominal == 0: return "Nol rupiah.-"
    text = terbilang(nominal).strip()
    text = text.capitalize() + " rupiah.-"
    return re.sub(' +', ' ', text)

# ==========================================
# 3. GENERATOR PDF (DINAMIS & NAMA TIKET FULL)
# ==========================================
def cetak_baris_stsu(pdf, no, uraian, nominal):
    pdf.set_font('Arial', '', 10)
    pdf.set_x(15)
    pdf.cell(15, 5, f"{no}.", ln=0, align='C')
    pdf.cell(120, 5, uraian, ln=0, align='L')
    pdf.cell(10, 5, 'Rp.', ln=0, align='L')
    val = '-' if nominal == 0 else f"{nominal:,.0f}".replace(",", ".")
    pdf.cell(35, 5, val, ln=1, align='R')

def buat_pdf_stsu(channel, tanggal_rekon_str, stsu_data, raw_table_data, channel_summary_data, folder_path):
    total_nominal = sum(item["nominal"] for item in stsu_data.values())
    tgl_obj = datetime.strptime(tanggal_rekon_str, "%Y-%m-%d")
    bulan_indo = {1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'}
    hari_dict = {0: 'SENIN', 1: 'SELASA', 2: 'RABU', 3: 'KAMIS', 4: 'JUMAT', 5: 'SABTU', 6: 'MINGGU'}
    
    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.add_page()
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=15)
    
    pdf.set_font("Arial", '', 11)
    
    if channel == "MERCHANT_PAGE": channel_display = "TIKET ONLINE"
    elif channel == "TVM": channel_display = "TICKET VENDING MACHINE"
    elif channel == "GATE": channel_display = "NEW GATE"
    elif channel == "MPOS": channel_display = "MPOS"
    else: channel_display = channel.upper()
    
    pdf.set_xy(15, 15)
    pdf.cell(90, 5, "BLUD TAMAN MARGASATWA", ln=0, align='L')
    pdf.cell(90, 5, "SURAT TANDA SETOR UANG", ln=1, align='R')
    pdf.set_xy(15, 20)
    pdf.cell(90, 5, "RAGUNAN PROV.DKI JAKARTA", ln=0, align='L')
    pdf.cell(90, 5, "DASAR HASIL RETRIBUSI", ln=1, align='R')
    pdf.set_xy(15, 25)
    pdf.cell(90, 5, "", ln=0, align='L')
    pdf.cell(90, 5, channel_display, ln=1, align='R')
    
    pdf.set_y(33)
    no_urut_stsu = f"      /{tgl_obj.strftime('%d')}/{tgl_obj.strftime('%m')}/SU/{tgl_obj.strftime('%Y')}"
    pdf.set_font("Arial", '', 11)
    pdf.set_x(15)
    pdf.cell(10, 5, "No", ln=0)
    pdf.cell(5, 5, ":", ln=0)
    pdf.cell(45, 5, no_urut_stsu, ln=1)
    
    pdf.ln(1)
    pdf.set_font("Arial", '', 10)
    dashed_line = "-" * 163 
    
    pdf.set_x(15)
    pdf.cell(180, 3, dashed_line, ln=1, align='C') 
    pdf.set_x(15)
    pdf.cell(15, 4, "NO", ln=0, align='C')         
    pdf.cell(120, 4, "URAIAN", ln=0, align='C')
    pdf.cell(45, 4, "JUMLAH", ln=1, align='C')
    pdf.set_x(15)
    pdf.cell(180, 3, dashed_line, ln=1, align='C') 
    pdf.ln(1) 
    
    pdf.set_font("Arial", 'B', 10)
    pdf.set_x(15)
    pdf.cell(180, 6, "4.1.02 Pendapatan Retribusi Daerah", ln=1)
    pdf.set_x(15)
    pdf.cell(180, 6, "4.1.02.02.009.00001 Retribusi Pelayanan Tempat Rekreasi, Pariwisata, dan Olahraga", ln=1)
    
    items_tmr = [
        "Dewasa", "Anak", "Rombongan Dewasa Reduksi 25%", "Rombongan Anak Reduksi 25%",
        "Kuda Tunggang", "Unta Tunggang", "Gajah Tunggang", "Taman Satwa Anak",
        "Hari Selasa-Jum'at Pst Primata-Dewasa", "Hari Selasa-Jum'at Pst Primata-Anak",
        "Hari Selasa-Jum'at Pst Primata-Romb Dws Reduksi 25%", "Hari Selasa-Jum'at Pst Primata-Romb Anak Reduksi 25%",
        "Hari Sabtu-Minggu/Besar Pst Primata-Dewasa", "Hari Sabtu-Minggu/Besar Pst Primata-Anak",
        "Hari Sabtu-Minggu/Besar Pst Primata-Romb Anak Reduksi 25%", "Hari Sabtu-Minggu/Besar Pst Primata-Romb Dws Reduksi 25%"
    ]
    for i in range(1, 17): cetak_baris_stsu(pdf, i, items_tmr[i-1], stsu_data[i]['nominal'])
        
    pdf.set_font("Arial", 'B', 10)
    pdf.set_x(15)
    pdf.cell(180, 6, "4.1.02.02.014.00001 Retribusi Penyediaan Tempat Khusus Parkir Di Luar Badan Jalan", ln=1)
    
    items_parkir = [
        "Golongan I (Bus Besar, Truk Besar, dan Mobil Box Besar)",
        "Golongan II (Bus Kecil, Truk Kecil, Mobil Box Kecil dan Pick Up Besar)",
        "Golongan III (Mobil, Sedan Minibus/Sejenis, Pick up Kecil)",
        "Sepeda Motor dan Kendaraan Roda Tiga",
        "Sepeda"
    ]
    for i in range(17, 22): cetak_baris_stsu(pdf, i, items_parkir[i-17], stsu_data[i]['nominal'])
        
    pdf.ln(1)
    pdf.set_font("Arial", '', 10)
    pdf.set_x(15)
    pdf.cell(180, 3, dashed_line, ln=1, align='C') 
    pdf.set_x(15)
    pdf.cell(15, 4, "", ln=0)
    pdf.cell(120, 4, "JUMLAH", ln=0, align='C')    
    pdf.cell(10, 4, "Rp.", ln=0, align='L')
    val_total = '-' if total_nominal == 0 else f"{total_nominal:,.0f}".replace(",", ".")
    pdf.cell(35, 4, val_total, ln=1, align='R')
    pdf.set_x(15)
    pdf.cell(180, 3, dashed_line, ln=1, align='C') 
    
    pdf.ln(4)
    terbilang_str = generate_terbilang(total_nominal)
    pdf.set_font("Arial", '', 10)
    pdf.set_x(15)
    pdf.cell(180, 6, f"Terbilang : {terbilang_str}", ln=1)
    
    pdf.ln(8)
    tgl_cetak = f"Jakarta, {tgl_obj.strftime('%d')} {bulan_indo[tgl_obj.month]} {tgl_obj.strftime('%Y')}"
    pdf.set_x(15)
    pdf.cell(80, 5, "", ln=0, align='C')
    pdf.cell(100, 5, tgl_cetak, ln=1, align='C')
    pdf.ln(3)
    pdf.set_x(15)
    pdf.cell(80, 5, "Kepala Seksi Pelayanan dan Informasi", ln=0, align='C')
    pdf.cell(100, 5, "Bendahara Penerimaan", ln=1, align='C')
    pdf.ln(25) 
    pdf.set_x(15)
    pdf.cell(80, 5, "Afriana Pulungan, S.Si., M.AP.", ln=0, align='C')
    pdf.cell(100, 5, "Evi Irmawati", ln=1, align='C')
    pdf.set_x(15)
    pdf.cell(80, 5, "NIP 197304212007012021", ln=0, align='C')
    pdf.cell(100, 5, "NIP 198101082009042006", ln=1, align='C')

    # ==============================================================
    # MENGGAMBAR TABEL LAMPIRAN SECARA NATIVE & DINAMIS
    # ==============================================================
    if raw_table_data and len(raw_table_data.get('tbody', [])) > 0:
        pdf.add_page(orientation='L') 
        pdf.set_margins(15, 12, 15)
        pdf.set_auto_page_break(auto=True, margin=10)
        
        tbody = raw_table_data.get('tbody', [])
        row_h = 4.8 if len(tbody) > 12 else 5.5
        
        # --- TABEL 1: BUKTI REKONSILIASI ---
        pdf.set_font("Arial", 'B', 11)
        pdf.set_fill_color(103, 119, 239) 
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 7, "BUKTI REKONSILIASI DARI SISTEM 3A", border=0, ln=1, align='C', fill=True)
        
        pdf.set_font("Arial", 'B', 9.5)
        hari_str = hari_dict[tgl_obj.weekday()]
        tgl_str = f"{tgl_obj.day:02d} {bulan_indo[tgl_obj.month].upper()} {tgl_obj.year}"
        sub_title = f"HARI, TANGGAL: {hari_str}, {tgl_str}   |   CHANNEL: {channel_display}"
        pdf.cell(0, 5.5, sub_title, border=0, ln=1, align='C', fill=True)
        pdf.ln(2) 
        
        pdf.set_text_color(0, 0, 0)
        
        thead = raw_table_data.get('thead', ["Merchant", "Location", "Ticket", "Total Ticket", "Total Nominal"])
        left_indices, idx_ticket, idx_qty, idx_nominal = cari_indeks_kolom_tiket(thead)
        active_indices = left_indices + [idx_ticket, idx_qty, idx_nominal]
        
        # PERBAIKAN LEBAR KOLOM: Lebarkan kolom TICKET menjadi 112mm agar semua tulisan muat utuh
        total_w = 267
        w_qty = 24
        w_nominal = 35
        w_ticket = 112
        sisa_w = total_w - (w_ticket + w_qty + w_nominal) # Sisa 96mm untuk kolom sebelah kiri
        
        num_left = len(left_indices)
        if num_left == 0:
            left_widths = []
            w_ticket += sisa_w
        elif num_left == 1:
            left_widths = [sisa_w]
        elif num_left == 2:
            left_widths = [40, sisa_w - 40] # Merchant 40mm, Location 56mm
        else:
            w_per_col = sisa_w / num_left
            left_widths = [w_per_col] * num_left
            
        col_widths = left_widths + [w_ticket, w_qty, w_nominal]
        
        pdf.set_font("Arial", 'B', 8.5)
        pdf.set_fill_color(230, 230, 230)
        for pos, col_idx in enumerate(active_indices):
            header_text = thead[col_idx].upper() if col_idx < len(thead) else ""
            pdf.cell(col_widths[pos], 6.5, header_text, border=1, align='C', fill=True)
        pdf.ln()
            
        pdf.set_font("Arial", '', 8) 
        for row in tbody:
            if not row or len(row) <= max(active_indices): continue
            if any("tidak ada data" in c.lower() for c in row): continue
            
            for pos, col_idx in enumerate(active_indices):
                val = str(row[col_idx])
                w = col_widths[pos]
                
                if col_idx == idx_ticket:
                    # KHUSUS KOLOM TICKET: Jangan pernah dipotong (..), kecilkan font otomatis jika sangat panjang
                    font_sz = 8.0
                    pdf.set_font("Arial", '', font_sz)
                    while pdf.get_string_width(val) > (w - 2.5) and font_sz > 5.5:
                        font_sz -= 0.2
                        pdf.set_font("Arial", '', font_sz)
                    pdf.cell(w, row_h, val, border=1, align='L')
                    pdf.set_font("Arial", '', 8) # Kembalikan ke ukuran standar untuk kolom berikutnya
                else:
                    # Untuk kolom selain Ticket, potong rapi menggunakan ukuran lebar aktual FPDF
                    pdf.set_font("Arial", '', 8)
                    if pdf.get_string_width(val) > (w - 2.5):
                        while pdf.get_string_width(val + "..") > (w - 2.5) and len(val) > 0:
                            val = val[:-1]
                        val = val + ".."
                    
                    align = 'R' if col_idx in (idx_qty, idx_nominal) else 'L'
                    pdf.cell(w, row_h, val, border=1, align=align)
            pdf.ln()
            
        pdf.set_font("Arial", 'B', 8.5)
        pdf.set_fill_color(200, 200, 200)
        tfoot = raw_table_data.get('tfoot', [])
        w_span_left = sum(left_widths) + w_ticket
        
        if len(tfoot) >= 3:
            pdf.cell(w_span_left, 6.5, "TOTAL", border=1, align='C', fill=True)
            pdf.cell(w_qty, 6.5, tfoot[-2], border=1, align='R', fill=True)
            pdf.cell(w_nominal, 6.5, tfoot[-1], border=1, align='R', fill=True)
            pdf.ln()

        # --- TABEL 2: SUMMARY BY CHANNEL ORDER ---
        if channel_summary_data and (len(channel_summary_data.get('tbody', [])) > 0 or len(channel_summary_data.get('tfoot', [])) > 0):
            pdf.ln(3.5) 
            
            pdf.set_font("Arial", 'B', 9.5)
            pdf.set_fill_color(103, 119, 239)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(0, 6.5, "SUMMARY BY CHANNEL ORDER", border=0, ln=1, align='C', fill=True)
            pdf.set_text_color(0, 0, 0)
            
            col_w_ch = [107, 80, 80] 
            
            pdf.set_font("Arial", 'B', 8.5)
            pdf.set_fill_color(230, 230, 230)
            ch_thead = channel_summary_data.get('thead', ["Channel Order", "Transaction Qty", "Total Nominal"])
            if len(ch_thead) >= 3:
                pdf.cell(col_w_ch[0], 6.5, ch_thead[0].upper(), border=1, align='C', fill=True)
                pdf.cell(col_w_ch[1], 6.5, ch_thead[-2].upper(), border=1, align='C', fill=True)
                pdf.cell(col_w_ch[2], 6.5, ch_thead[-1].upper(), border=1, align='C', fill=True)
                pdf.ln()
                
            pdf.set_font("Arial", '', 8)
            for row in channel_summary_data.get('tbody', []):
                if not row or len(row) < 3: continue
                if any("tidak ada data" in c.lower() for c in row): continue
                pdf.cell(col_w_ch[0], row_h, row[0], border=1, align='L')
                pdf.cell(col_w_ch[1], row_h, row[-2], border=1, align='R')
                pdf.cell(col_w_ch[2], row_h, row[-1], border=1, align='R')
                pdf.ln()
                
            pdf.set_font("Arial", 'B', 8.5)
            pdf.set_fill_color(200, 200, 200)
            ch_tfoot = channel_summary_data.get('tfoot', [])
            if len(ch_tfoot) >= 3:
                pdf.cell(col_w_ch[0], 6.5, ch_tfoot[0], border=1, align='C', fill=True)
                pdf.cell(col_w_ch[1], 6.5, ch_tfoot[-2], border=1, align='R', fill=True)
                pdf.cell(col_w_ch[2], 6.5, ch_tfoot[-1], border=1, align='R', fill=True)
                pdf.ln()
            elif len(ch_tfoot) == 2:
                pdf.cell(col_w_ch[0], 7, "TOTAL", border=1, align='C', fill=True)
                pdf.cell(col_w_ch[1], 7, ch_tfoot[0], border=1, align='R', fill=True)
                pdf.cell(col_w_ch[2], 7, ch_tfoot[1], border=1, align='R', fill=True)
                pdf.ln()

        waktu_tarik = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        pdf.ln(2) 
        pdf.set_font("Arial", 'I', 7) 
        pdf.set_text_color(100, 100, 100) 
        pdf.cell(0, 4, f"*Data diekstrak oleh sistem pada: {waktu_tarik} WIB", ln=1, align='L')
        pdf.set_text_color(0, 0, 0) 

    nama_file = f"STSU_{channel_display.replace(' ', '_')}_{tanggal_rekon_str}.pdf"
    full_path = os.path.join(folder_path, nama_file)
    
    try:
        pdf.output(full_path)
        print(f"📄 Berhasil mencetak/menimpa PDF: {full_path}")
    except PermissionError:
        print(f"❌ GAGAL MENYIMPAN PDF: {nama_file}")
        print(f"   ⚠️ File tersebut sepertinya sedang DIBUKA di PDF Reader.")
        print(f"   ⚠️ Tolong TUTUP dulu file PDF-nya, lalu coba tarik data lagi.")
    except Exception as e:
        print(f"❌ Terjadi kesalahan saat menyimpan PDF: {e}")

# ==========================================
# 4. ROBOT PENARIK DATA (DENGAN ANTI-CRASH CHROME)
# ==========================================
def buat_driver_chrome(use_profile=True):
    """Membuat instance Chrome dengan flag anti-crash DevToolsActivePort."""
    options = Options()
    # options.add_argument("--headless=new") 
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--remote-debugging-port=0")
    options.add_argument("--ignore-certificate-errors")
    options.set_capability("acceptInsecureCerts", True)
    
    if use_profile:
        bersihkan_lock_profil(CHROME_PROFILE_PATH)
        options.add_argument(f"--user-data-dir={CHROME_PROFILE_PATH}")
        
    return webdriver.Chrome(options=options)

def tarik_rekon_3a_real(tanggal_rekon_str, channels_to_process):
    print(f"\n🚀 Memulai Tarik Data Rekon 3A untuk Tanggal Paid: {tanggal_rekon_str}")
    
    if getattr(sys, 'frozen', False):
        app_path = os.path.dirname(sys.executable)
    else:
        app_path = os.path.dirname(os.path.abspath(__file__))
        
    base_folder = os.path.join(app_path, f"REKON_{tanggal_rekon_str}")
    
    if os.path.exists(base_folder) and len(channels_to_process) == 4:
        print(f"⚠️ Menemukan folder lama untuk tanggal {tanggal_rekon_str}. Sedang membersihkan data...")
        try:
            shutil.rmtree(base_folder) 
            time.sleep(0.5) 
        except Exception as e:
            print(f"❌ Gagal membersihkan folder lama. Error: {e}")
    
    os.makedirs(base_folder, exist_ok=True)
    
    try:
        driver = buat_driver_chrome(use_profile=True)
    except Exception as e:
        print(f"⚠️ Profil utama sedang digunakan proses lain, membuka sesi Chrome baru...")
        driver = buat_driver_chrome(use_profile=False)

    wait = WebDriverWait(driver, 30)
    
    try:
        driver.get(A3_LOGIN_URL)
        try:
            email_input = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.NAME, "email")))
            email_input.send_keys(A3_EMAIL)
            driver.find_element(By.NAME, "password").send_keys(A3_PASS)
            driver.find_element(By.XPATH, "//button[@type='submit']").click()
            wait.until(EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Welcome')]")))
        except:
            pass
        
        driver.get(A3_TRANS_URL)
        wait.until(EC.presence_of_element_located((By.ID, "filter-form")))

        tgl_obj = datetime.strptime(tanggal_rekon_str, "%Y-%m-%d")
        h_min_7 = (tgl_obj - timedelta(days=7)).strftime("%Y-%m-%d")
        h_plus_1 = (tgl_obj + timedelta(days=1)).strftime("%Y-%m-%d")
        val_order = f"{h_min_7} 00:00:00 to {h_plus_1} 23:59:59"
        
        for channel in channels_to_process:
            if channel == "MERCHANT_PAGE": disp = "TIKET ONLINE"
            elif channel == "TVM": disp = "TICKET VENDING MACHINE"
            elif channel == "GATE": disp = "NEW GATE"
            elif channel == "MPOS": disp = "MPOS"
            else: disp = channel.upper()

            print(f"🔄 Memproses Channel: {disp} ...")
            
            driver.execute_script(f"""
                document.getElementById('tanggal_order').value = '{val_order}';
                document.getElementById('tanggal_paid').value = '{tanggal_rekon_str}';
                document.getElementById('tanggal_visit').value = '';
                $('#status').val('paid').trigger('change');
                $('#channel_type').val('{channel}').trigger('change');
                $('#merchant').val('').trigger('change');
                $('#partner').val('').trigger('change');
                $('#filter-form').submit();
            """)
            
            def SemuaTabelSelesai(_drv):
                try:
                    ids = ["orders-table_processing", "summary-ticket-table_processing", "summary-channel-order-table_processing"]
                    for proc_id in ids:
                        el = _drv.find_elements(By.ID, proc_id)
                        if el and "none" not in el[0].value_of_css_property("display").lower():
                            return False
                    return True
                except:
                    return False

            WebDriverWait(driver, 60).until(SemuaTabelSelesai)
            time.sleep(2) 
            
            driver.execute_script("let t = document.getElementById('toggleZero'); if(t && t.checked) t.click();")
            time.sleep(1.0)
            
            print(f"💾 [DATA] Mengekstrak isi tabel untuk {disp}...")
            
            raw_table_data = driver.execute_script("""
                let table = document.querySelector('#summary-ticket-table');
                if (!table) return { 'thead': [], 'tbody': [], 'tfoot': [] };
                
                let thead = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
                let tbody = Array.from(table.querySelectorAll('tbody tr'))
                    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
                let tfoot = Array.from(table.querySelectorAll('tfoot th, tfoot td')).map(td => td.textContent.trim());
                return { 'thead': thead, 'tbody': tbody, 'tfoot': tfoot };
            """)
            
            channel_summary_data = driver.execute_script("""
                let targetTable = document.querySelector('#summary-channel-order-table');
                if (!targetTable) {
                    for (let tbl of document.querySelectorAll('table')) {
                        if (tbl.textContent.includes('Channel Order') && tbl.textContent.includes('Transaction Qty')) {
                            targetTable = tbl;
                            break;
                        }
                    }
                }
                if (!targetTable) return { 'thead': [], 'tbody': [], 'tfoot': [] };
                
                let thead = Array.from(targetTable.querySelectorAll('thead th')).map(th => th.textContent.trim());
                let tbody = Array.from(targetTable.querySelectorAll('tbody tr'))
                    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
                let tfoot = Array.from(targetTable.querySelectorAll('tfoot th, tfoot td')).map(td => td.textContent.trim());
                
                return { 'thead': thead, 'tbody': tbody, 'tfoot': tfoot };
            """)
            
            thead_list = raw_table_data.get('thead', [])
            left_indices, idx_ticket, idx_qty, idx_nominal = cari_indeks_kolom_tiket(thead_list)
            min_cols_needed = max([idx_ticket, idx_qty, idx_nominal] + left_indices) + 1 if thead_list else 4

            data_channel = []
            for cols in raw_table_data.get('tbody', []):
                if len(cols) >= min_cols_needed:
                    first_col_text = cols[0] if cols else ""
                    if not first_col_text or "tidak ada data" in first_col_text.lower() or "total" in first_col_text.lower():
                        continue
                    
                    left_info_str = " | ".join([cols[i] for i in left_indices if i < len(cols)])
                    ticket_name_str = cols[idx_ticket]
                    qty_val = clean_number(cols[idx_qty])
                    nominal_val = clean_number(cols[idx_nominal])

                    data_channel.append({
                        "left_info": left_info_str,
                        "ticket_name": ticket_name_str,
                        "qty": qty_val,
                        "nominal": nominal_val
                    })
            
            stsu_data = petakan_ke_stsu(data_channel, tanggal_rekon_str)
            buat_pdf_stsu(channel, tanggal_rekon_str, stsu_data, raw_table_data, channel_summary_data, base_folder)

        print(f"\n🎉 SELESAI! File PDF telah diperbarui di folder: {base_folder}")
    finally:
        try:
            driver.quit()
        except:
            pass

# ==========================================
# 5. ANTARMUKA DATE PICKER & CHANNEL PICKER (GUI)
# ==========================================
def jalankan_date_picker():
    dates_selected = []
    channels_selected = []

    def get_selected_channels():
        chs = []
        if var_gate.get(): chs.append("GATE")
        if var_tvm.get(): chs.append("TVM")
        if var_merchant.get(): chs.append("MERCHANT_PAGE")
        if var_mpos.get(): chs.append("MPOS")
        return chs

    def on_submit():
        nonlocal dates_selected, channels_selected
        date_str = cal.selection_get().strftime("%Y-%m-%d")
        if date_str not in dates_selected:
            dates_selected.append(date_str)
        
        if not multi_var.get():
            channels_selected = get_selected_channels()
            root.destroy()
        else:
            messagebox.showinfo("Berhasil", f"Tanggal {date_str} ditambahkan ke antrean.\nTotal antrean: {len(dates_selected)} hari.")

    def on_finish():
        nonlocal dates_selected, channels_selected
        if not dates_selected:
            date_str = cal.selection_get().strftime("%Y-%m-%d")
            dates_selected.append(date_str)
        channels_selected = get_selected_channels()
        root.destroy()

    root = tk.Tk()
    root.title("Bot Rekon 3A V1.7 - Pilih Tanggal & Channel")
    root.geometry("350x550") 
    
    style = ttk.Style(root)
    style.theme_use('clam')

    main_frame = ttk.Frame(root, padding="20")
    main_frame.pack(fill=tk.BOTH, expand=True)

    ttk.Label(main_frame, text="Pilih Tanggal Rekon:", font=("Arial", 12, "bold")).pack(pady=(0, 5))

    cal = Calendar(main_frame, selectmode='day', date_pattern='yyyy-mm-dd')
    cal.pack(fill=tk.BOTH, expand=True, pady=5)

    multi_var = tk.BooleanVar(value=False)
    ttk.Checkbutton(main_frame, text="Pilih lebih dari satu tanggal", variable=multi_var).pack(pady=5)

    channel_frame = ttk.LabelFrame(main_frame, text="Pilih Channel:", padding="10")
    channel_frame.pack(fill=tk.X, pady=5)

    var_gate = tk.BooleanVar(value=True)
    var_tvm = tk.BooleanVar(value=True)
    var_merchant = tk.BooleanVar(value=True)
    var_mpos = tk.BooleanVar(value=True)

    ttk.Checkbutton(channel_frame, text="NEW GATE", variable=var_gate).pack(anchor=tk.W, pady=2)
    ttk.Checkbutton(channel_frame, text="TICKET VENDING MACHINE (TVM)", variable=var_tvm).pack(anchor=tk.W, pady=2)
    ttk.Checkbutton(channel_frame, text="TIKET ONLINE", variable=var_merchant).pack(anchor=tk.W, pady=2)
    ttk.Checkbutton(channel_frame, text="MPOS", variable=var_mpos).pack(anchor=tk.W, pady=2)

    btn_frame = ttk.Frame(main_frame)
    btn_frame.pack(pady=15)

    ttk.Button(btn_frame, text="Proses / Tambah", command=on_submit).pack(side=tk.LEFT, padx=5)
    ttk.Button(btn_frame, text="Selesai & Jalankan", command=on_finish).pack(side=tk.LEFT, padx=5)

    root.mainloop()
    return dates_selected, channels_selected

if __name__ == "__main__":
    list_tanggal, list_channel = jalankan_date_picker()
    
    if not list_channel:
        print("⚠️ Tidak ada channel yang dipilih. Program keluar.")
        sys.exit()

    if list_tanggal:
        print(f"📅 Tanggal yang akan diproses: {', '.join(list_tanggal)}")
        print(f"📡 Channel yang akan ditarik: {', '.join(list_channel)}")
        for tgl in list_tanggal:
            try:
                datetime.strptime(tgl, "%Y-%m-%d")
                tarik_rekon_3a_real(tgl, list_channel)
            except Exception as e:
                print(f"❌ Error pada {tgl}: {e}")
    else:
        print("⚠️ Tidak ada tanggal yang dipilih. Program keluar.")
    
    if len(sys.argv) > 1 or not sys.stdin.isatty():
        pass 
    else:
        print("\nSelesai. Tekan ENTER untuk menutup...")
        input()