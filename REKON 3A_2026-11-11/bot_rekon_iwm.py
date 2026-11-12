import re
import time
import os
import sys
import socket
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from fpdf import FPDF

# ==============================================================================
# INSTRUKSI PENGGUNAAN & COMPILE:
# 1. Pastikan install: pip install flask flask-cors selenium fpdf
# 2. Perintah Build EXE: 
#    python -m PyInstaller --onefile --name "Server_Robot_IWM" --hidden-import="selenium.webdriver" --hidden-import="flask" --hidden-import="flask_cors" --hidden-import="fpdf" bot_rekon_iwm.py
# ==============================================================================

app = Flask(__name__)
CORS(app) # Mengizinkan Tab Android / Web React mengakses API ini

IWM_LOGIN_URL = "https://202.129.187.146:6997/ragunan_iwm/index.php"
IWM_PERLOKASI_URL = "https://202.129.187.146:6997/ragunan_iwm/index.php?mod=laporan.rekap.perlokasi&sub=rekapPerlokasi&act=view&typ=html"
IWM_DISKON_URL = "https://202.129.187.146:6997/ragunan_iwm/index.php?mod=laporan.rekap.diskon&sub=rekapDiskon&act=view&typ=html"
IWM_SETTLEMENT_URL = "https://202.129.187.146:6997/ragunan_iwm/index.php?mod=laporan.rekap.settlement&sub=rekapSettlement&act=view&typ=html"

IWM_USER = "admintmriwm"
IWM_PASS = "tmriwm2015"

CHROME_PROFILE_PATH = r"C:\SeleniumChromeProfile_IWM"
if not os.path.exists(CHROME_PROFILE_PATH):
    try:
        os.makedirs(CHROME_PROFILE_PATH, exist_ok=True)
    except:
        pass


def clean_number(text: str) -> int:
    text = (text or "").strip()
    return int(re.sub(r"[^\d]", "", text)) if re.search(r"\d", text) else 0


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


def cetak_baris_stsu(pdf, no, uraian, nominal):
    pdf.set_font('Arial', '', 10)
    pdf.set_x(15)
    pdf.cell(15, 5, f"{no}.", ln=0, align='C')
    pdf.cell(120, 5, uraian, ln=0, align='L')
    pdf.cell(10, 5, 'Rp.', ln=0, align='L')
    val = '-' if nominal == 0 else f"{nominal:,.0f}".replace(",", ".")
    pdf.cell(35, 5, val, ln=1, align='R')


def tentukan_folder_penyimpanan(tanggal_target):
    if getattr(sys, 'frozen', False):
        app_path = os.path.dirname(sys.executable)
    else:
        app_path = os.path.dirname(os.path.abspath(__file__))

    folder_candidates = [
        os.path.join(app_path, f"REKON 3A_{tanggal_target}"),
        os.path.join(app_path, f"REKON_{tanggal_target}")
    ]
    for fc in folder_candidates:
        if os.path.exists(fc):
            return fc

    target_folder = os.path.join(app_path, f"REKON 3A_{tanggal_target}")
    os.makedirs(target_folder, exist_ok=True)
    return target_folder


def hitung_stsu_iwm(hasil_scraping, tanggal_target):
    tgl_obj = datetime.strptime(tanggal_target, "%Y-%m-%d")
    is_weekend = tgl_obj.weekday() >= 5

    stsu = {i: {"qty": 0, "nominal": 0} for i in range(1, 22)}

    # 1. Pintu Masuk Reguler
    al = hasil_scraping.get("area_lainnya", {})
    stsu[1]["nominal"] = al.get("dewasa", 0)
    stsu[1]["qty"] = al.get("dewasa", 0) // 4000
    stsu[2]["nominal"] = al.get("anak", 0)
    stsu[2]["qty"] = al.get("anak", 0) // 3000

    # 2. Rombongan Diskon 25%
    for r in hasil_scraping.get("laporan_diskon", []):
        lok = (r.get("lokasi") or "").lower()
        nm = (r.get("nama_rombongan") or "").lower()
        is_prm = "primata" in lok or "primata" in nm or "schmutzer" in lok or "schmutzer" in nm

        ank_qty = r.get("masuk_anak", 0)
        dws_qty = r.get("masuk_dewasa", 0)
        tot_rp = r.get("pendapatan_rp", 0)

        rate_ank = 4500 if (is_prm and not is_weekend) else 5625 if is_prm else 2250
        rate_dws = 4500 if (is_prm and not is_weekend) else 5625 if is_prm else 3000

        calc_ank = ank_qty * rate_ank
        calc_dws = dws_qty * rate_dws
        tot_calc = calc_ank + calc_dws

        if tot_calc > 0 and tot_rp > 0:
            actual_dws = round((calc_dws / tot_calc) * tot_rp)
            actual_ank = tot_rp - actual_dws
        else:
            actual_dws = calc_dws
            actual_ank = calc_ank

        if is_prm:
            if is_weekend:
                stsu[16]["nominal"] += actual_dws
                stsu[16]["qty"] += dws_qty
                stsu[15]["nominal"] += actual_ank
                stsu[15]["qty"] += ank_qty
            else:
                stsu[11]["nominal"] += actual_dws
                stsu[11]["qty"] += dws_qty
                stsu[12]["nominal"] += actual_ank
                stsu[12]["qty"] += ank_qty
        else:
            stsu[3]["nominal"] += actual_dws
            stsu[3]["qty"] += dws_qty
            stsu[4]["nominal"] += actual_ank
            stsu[4]["qty"] += ank_qty

    # 3. Taman Satwa Anak
    cz_tot = hasil_scraping.get("children_zoo", {}).get("total", 0)
    stsu[8]["nominal"] = cz_tot
    stsu[8]["qty"] = cz_tot // 2500

    # 4. Pusat Primata Reguler
    prm = hasil_scraping.get("pusat_primata", {})
    if is_weekend:
        stsu[13]["nominal"] = prm.get("dewasa", 0)
        stsu[13]["qty"] = prm.get("dewasa", 0) // 7500
        stsu[14]["nominal"] = prm.get("anak", 0)
        stsu[14]["qty"] = prm.get("anak", 0) // 7500
    else:
        stsu[9]["nominal"] = prm.get("dewasa", 0)
        stsu[9]["qty"] = prm.get("dewasa", 0) // 6000
        stsu[10]["nominal"] = prm.get("anak", 0)
        stsu[10]["qty"] = prm.get("anak", 0) // 6000

    # 5. Kendaraan
    stsu[17]["nominal"] = al.get("gol_i", 0)
    stsu[17]["qty"] = al.get("gol_i", 0) // 15000
    stsu[18]["nominal"] = al.get("gol_ii", 0)
    stsu[18]["qty"] = al.get("gol_ii", 0) // 12500
    stsu[19]["nominal"] = al.get("gol_iii", 0)
    stsu[19]["qty"] = al.get("gol_iii", 0) // 6000
    stsu[20]["nominal"] = al.get("motor", 0)
    stsu[20]["qty"] = al.get("motor", 0) // 3000
    stsu[21]["nominal"] = al.get("sepeda", 0)
    stsu[21]["qty"] = al.get("sepeda", 0) // 1000

    return stsu


def buat_pdf_stsu_iwm(tanggal_target, hasil_scraping, folder_path):
    """
    Membuat file PDF STSU_OLD_GATE_[tanggal].pdf yang identik dengan format bot 3A:
    - Lembar 1: Form STSU Resmi Kedinasan (Portrait)
    - Lembar 2: Bukti Rekonsiliasi Sistem IWM & Ringkasan Settlement Berjalan (Landscape)
    """
    stsu_data = hitung_stsu_iwm(hasil_scraping, tanggal_target)
    total_nominal = sum(item["nominal"] for item in stsu_data.values())
    settlement = hasil_scraping.get("settlement", {})
    tgl_obj = datetime.strptime(tanggal_target, "%Y-%m-%d")

    bulan_indo = {
        1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
        5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
        9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
    }
    hari_dict = {0: 'SENIN', 1: 'SELASA', 2: 'RABU', 3: 'KAMIS', 4: 'JUMAT', 5: 'SABTU', 6: 'MINGGU'}

    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.add_page()
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=15)

    # =========================================================================
    # LEMBAR 1: FORM STSU RESMI (PORTRAIT)
    # =========================================================================
    pdf.set_font("Arial", '', 11)
    pdf.set_xy(15, 15)
    pdf.cell(90, 5, "BLUD TAMAN MARGASATWA", ln=0, align='L')
    pdf.cell(90, 5, "SURAT TANDA SETOR UANG", ln=1, align='R')
    pdf.set_xy(15, 20)
    pdf.cell(90, 5, "RAGUNAN PROV.DKI JAKARTA", ln=0, align='L')
    pdf.cell(90, 5, "DASAR HASIL RETRIBUSI", ln=1, align='R')
    pdf.set_xy(15, 25)
    pdf.cell(90, 5, "", ln=0, align='L')
    pdf.cell(90, 5, "OLD GATE", ln=1, align='R')

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
    for i in range(1, 17):
        cetak_baris_stsu(pdf, i, items_tmr[i-1], stsu_data[i]['nominal'])

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
    for i in range(17, 22):
        cetak_baris_stsu(pdf, i, items_parkir[i-17], stsu_data[i]['nominal'])

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

    # =========================================================================
    # LEMBAR 2: BUKTI REKONSILIASI DARI SISTEM IWM (LANDSCAPE)
    # =========================================================================
    pdf.add_page(orientation='L')
    pdf.set_margins(15, 12, 15)
    pdf.set_auto_page_break(auto=True, margin=10)

    pdf.set_font("Arial", 'B', 11)
    pdf.set_fill_color(76, 81, 191) # Indigo elegan untuk IWM
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 7, "BUKTI REKONSILIASI DARI SISTEM IWM (OLD GATE)", border=0, ln=1, align='C', fill=True)

    pdf.set_font("Arial", 'B', 9.5)
    hari_str = hari_dict[tgl_obj.weekday()]
    tgl_str = f"{tgl_obj.day:02d} {bulan_indo[tgl_obj.month].upper()} {tgl_obj.year}"
    sub_title = f"HARI, TANGGAL: {hari_str}, {tgl_str}   |   CHANNEL: OLD GATE (E-TICKETING)"
    pdf.cell(0, 5.5, sub_title, border=0, ln=1, align='C', fill=True)
    pdf.ln(2)

    pdf.set_text_color(0, 0, 0)

    # --- TABEL 1: RINCIAN PENDAPATAN & KARCIS PERLOKASI ---
    pdf.set_font("Arial", 'B', 8.5)
    pdf.set_fill_color(230, 230, 230)

    col_w1 = [15, 45, 112, 35, 60] # Total 267mm
    headers1 = ["NO", "LOKASI / AREA", "URAIAN JENIS TIKET", "TOTAL TIKET (QTY)", "TOTAL NOMINAL (RP)"]
    for idx_h, h_text in enumerate(headers1):
        align = 'R' if idx_h >= 3 else 'C' if idx_h == 0 else 'L'
        pdf.cell(col_w1[idx_h], 6.5, h_text, border=1, align=align, fill=True)
    pdf.ln()

    detail_rows = []
    no_row = 1
    for i in range(1, 22):
        nom = stsu_data[i]["nominal"]
        qty = stsu_data[i]["qty"]
        if nom > 0:
            nm = items_tmr[i-1] if i <= 16 else items_parkir[i-17]
            lok = "Pusat Primata" if (9 <= i <= 16) else "Children Zoo" if i == 8 else "Kawasan Parkir" if i >= 17 else "Pintu Masuk"
            detail_rows.append((no_row, lok, nm, qty, nom))
            no_row += 1

    pdf.set_font("Arial", '', 8)
    row_h = 4.8 if len(detail_rows) > 10 else 5.5
    total_qty_all = sum(r[3] for r in detail_rows)

    for r in detail_rows:
        pdf.cell(col_w1[0], row_h, str(r[0]), border=1, align='C')
        pdf.cell(col_w1[1], row_h, r[1], border=1, align='L')
        pdf.cell(col_w1[2], row_h, r[2], border=1, align='L')
        pdf.cell(col_w1[3], row_h, f"{r[3]:,.0f}".replace(",", "."), border=1, align='R')
        pdf.cell(col_w1[4], row_h, f"{r[4]:,.0f}".replace(",", "."), border=1, align='R')
        pdf.ln()

    # Baris Total Tabel 1
    pdf.set_font("Arial", 'B', 8.5)
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(col_w1[0] + col_w1[1] + col_w1[2], 6.5, "TOTAL PENDAPATAN & KARCIS IWM", border=1, align='C', fill=True)
    pdf.cell(col_w1[3], 6.5, f"{total_qty_all:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.cell(col_w1[4], 6.5, f"{total_nominal:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.ln()

    # --- TABEL 2: SUMMARY SETTLEMENT BERJALAN (TAPING GATE & POS BANK DKI) ---
    pdf.ln(3.5)
    pdf.set_font("Arial", 'B', 9.5)
    pdf.set_fill_color(76, 81, 191)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 6.5, "RINGKASAN SETTLEMENT TRANSAKSI BERJALAN (GATE & POS)", border=0, ln=1, align='C', fill=True)
    pdf.set_text_color(0, 0, 0)

    col_w_st = [67, 50, 50, 50, 50] # Total 267mm
    headers_st = ["STATUS TRANSAKSI", "JUMLAH TRANSAKSI (TAPING)", "PENGUNJUNG (ANAK + DEWASA)", "KENDARAAN", "TOTAL NOMINAL"]

    pdf.set_font("Arial", 'B', 8.5)
    pdf.set_fill_color(230, 230, 230)
    for idx_st, h_st in enumerate(headers_st):
        pdf.cell(col_w_st[idx_st], 6.5, h_st, border=1, align='C', fill=True)
    pdf.ln()

    pdf.set_font("Arial", '', 8)
    status_label = settlement.get("status", "Total Transaksi Approve")
    jml_trx = settlement.get("jumlah_transaksi", 0)
    p_anak = settlement.get("pengunjung_anak", 0)
    p_dws = settlement.get("pengunjung_dewasa", 0)
    p_tot_str = f"{p_anak + p_dws:,.0f} ({p_anak} ank / {p_dws} dws)".replace(",", ".")
    kdr_str = f"{settlement.get('jumlah_kendaraan', 0):,.0f} Unit".replace(",", ".")
    nom_settle = settlement.get("nominal", total_nominal)
    nom_settle_str = f"Rp {nom_settle:,.0f}".replace(",", ".")

    pdf.cell(col_w_st[0], 6.0, status_label, border=1, align='L')
    pdf.cell(col_w_st[1], 6.0, f"{jml_trx:,.0f} Transaksi".replace(",", "."), border=1, align='R')
    pdf.cell(col_w_st[2], 6.0, p_tot_str, border=1, align='R')
    pdf.cell(col_w_st[3], 6.0, kdr_str, border=1, align='R')
    pdf.cell(col_w_st[4], 6.0, nom_settle_str, border=1, align='R')
    pdf.ln()

    waktu_tarik = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    pdf.ln(2)
    pdf.set_font("Arial", 'I', 7)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 4, f"*Data diekstrak otomatis oleh Bot IWM pada: {waktu_tarik} WIB | Sumber: ragunan_iwm", ln=1, align='L')
    pdf.set_text_color(0, 0, 0)

    nama_file = f"STSU_OLD_GATE_{tanggal_target}.pdf"
    full_path = os.path.join(folder_path, nama_file)

    try:
        pdf.output(full_path)
        print(f"📄 [IWM] Berhasil membuat PDF STSU Old Gate: {full_path}")
    except Exception as e:
        print(f"❌ [IWM] Terjadi kesalahan saat menyimpan PDF STSU Old Gate: {e}")

    return full_path


def buat_pdf_rombongan_iwm(tanggal_target, laporan_diskon, folder_path):
    """
    Membuat file PDF Rombongan [tanggal].pdf yang persis 100% dengan format resmi IWM:
    Kop 'DATA PENGUNJUNG ROMBONGAN KANTOR PENGELOLA TAMAN MARGASATWA RAGUNAN' dengan 11 kolom.
    """
    if not laporan_diskon or len(laporan_diskon) == 0:
        print(f"ℹ️ [IWM] Tidak ada data rombongan untuk tanggal {tanggal_target}, PDF rombongan dilewati.")
        return None

    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    pdf.set_margins(10, 10, 10)
    pdf.set_auto_page_break(auto=True, margin=10)

    # Kop Judul Resmi Kedinasan IWM
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 5, "DATA PENGUNJUNG ROMBONGAN", border=0, ln=1, align='C')
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(0, 5, "KANTOR PENGELOLA TAMAN MARGASATWA RAGUNAN", border=0, ln=1, align='C')

    tgl_obj = datetime.strptime(tanggal_target, "%Y-%m-%d")
    tgl_str = tgl_obj.strftime("%d-%m-%Y")
    pdf.set_font("Arial", '', 9)
    pdf.cell(0, 5, f"TANGGAL : {tgl_str} s/d {tgl_str}", border=0, ln=1, align='C')
    pdf.ln(2)

    # 11 Kolom Standar Tabel Rombongan
    # Total lebar halaman landscape A4 ~277mm (dengan margin 10mm kiri-kanan)
    col_w = [8, 25, 23, 23, 58, 23, 20, 20, 20, 20, 27]
    headers = [
        "No", "Lokasi", "POS", "Kode\nRombongan", "Nama\nRombongan",
        "Tanggal\nKunjungan", "Jumlah\nTerdaftar Anak", "Jumlah\nTerdaftar Dewasa",
        "Jumlah Masuk\nAnak", "Jumlah Masuk\nDewasa", "Pendapatan\n(Rp)"
    ]

    pdf.set_font("Arial", 'B', 7.5)
    pdf.set_fill_color(240, 240, 240)

    # Cetak header kolom (tinggi 8mm)
    for pos, h in enumerate(headers):
        clean_h = h.replace("\n", " ")
        align = 'R' if pos >= 6 else 'C' if pos in (0, 2, 3, 5) else 'L'
        pdf.cell(col_w[pos], 8, clean_h, border=1, align=align, fill=True)
    pdf.ln()

    # Baris Data Rombongan
    pdf.set_font("Arial", '', 7.5)
    tot_terdaftar_ank = 0
    tot_terdaftar_dws = 0
    tot_masuk_ank = 0
    tot_masuk_dws = 0
    tot_pendapatan = 0

    for idx, r in enumerate(laporan_diskon):
        no_str = str(r.get("no") or (idx + 1))
        lokasi = str(r.get("lokasi", ""))
        pos = str(r.get("pos", "POS 1 Utama"))
        kode = str(r.get("kode_rombongan", ""))
        nama = str(r.get("nama_rombongan", ""))
        tgl_kunj = str(r.get("tgl_kunjungan", tgl_str))

        ter_ank = int(r.get("terdaftar_anak", 0))
        ter_dws = int(r.get("terdaftar_dewasa", 0))
        msk_ank = int(r.get("masuk_anak", 0))
        msk_dws = int(r.get("masuk_dewasa", 0))
        pend = int(r.get("pendapatan_rp", 0))

        tot_terdaftar_ank += ter_ank
        tot_terdaftar_dws += ter_dws
        tot_masuk_ank += msk_ank
        tot_masuk_dws += msk_dws
        tot_pendapatan += pend

        # Pemotongan rapi agar tidak meluap
        if pdf.get_string_width(nama) > (col_w[4] - 2):
            while pdf.get_string_width(nama + "..") > (col_w[4] - 2) and len(nama) > 0:
                nama = nama[:-1]
            nama += ".."

        row_h = 5.2
        pdf.cell(col_w[0], row_h, no_str, border=1, align='C')
        pdf.cell(col_w[1], row_h, lokasi, border=1, align='L')
        pdf.cell(col_w[2], row_h, pos, border=1, align='C')
        pdf.cell(col_w[3], row_h, kode, border=1, align='C')
        pdf.cell(col_w[4], row_h, nama, border=1, align='L')
        pdf.cell(col_w[5], row_h, tgl_kunj, border=1, align='C')
        pdf.cell(col_w[6], row_h, f"{ter_ank:,.0f}".replace(",", "."), border=1, align='R')
        pdf.cell(col_w[7], row_h, f"{ter_dws:,.0f}".replace(",", "."), border=1, align='R')
        pdf.cell(col_w[8], row_h, f"{msk_ank:,.0f}".replace(",", "."), border=1, align='R')
        pdf.cell(col_w[9], row_h, f"{msk_dws:,.0f}".replace(",", "."), border=1, align='R')
        pdf.cell(col_w[10], row_h, f"{pend:,.0f}".replace(",", "."), border=1, align='R')
        pdf.ln()

    # Baris Total Rombongan
    pdf.set_font("Arial", 'B', 8)
    pdf.set_fill_color(220, 220, 220)
    w_label = sum(col_w[:6])
    pdf.cell(w_label, 6.5, "TOTAL", border=1, align='C', fill=True)
    pdf.cell(col_w[6], 6.5, f"{tot_terdaftar_ank:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.cell(col_w[7], 6.5, f"{tot_terdaftar_dws:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.cell(col_w[8], 6.5, f"{tot_masuk_ank:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.cell(col_w[9], 6.5, f"{tot_masuk_dws:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.cell(col_w[10], 6.5, f"{tot_pendapatan:,.0f}".replace(",", "."), border=1, align='R', fill=True)
    pdf.ln()

    # Footer
    waktu_cetak = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    pdf.ln(3)
    pdf.set_font("Arial", 'I', 7.5)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 4, f"Tanggal Cetak : {waktu_cetak}", ln=1, align='L')
    pdf.set_text_color(0, 0, 0)

    # Nama file sesuai standar: Rombongan YYYY-MM-DD.pdf
    nama_file_romb = f"Rombongan_{tanggal_target}.pdf"
    full_path_romb = os.path.join(folder_path, nama_file_romb)

    try:
        pdf.output(full_path_romb)
        print(f"📄 [IWM] Berhasil membuat PDF Laporan Rombongan: {full_path_romb}")
    except Exception as e:
        print(f"❌ [IWM] Terjadi kesalahan saat menyimpan PDF Rombongan: {e}")

    return full_path_romb


def proses_tarik_data_iwm(tanggal_target):
    options = Options()
    # Hapus tanda "#" pada baris di bawah jika ingin browser berjalan tersembunyi (Background)
    # options.add_argument("--headless=new") 
    options.add_argument("--window-size=1920,1080")
    
    # --- TAMBAHAN ANTI-CRASH CHROME ---
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--remote-debugging-port=0")
    # ----------------------------------
    
    options.add_argument(f"--user-data-dir={CHROME_PROFILE_PATH}")
    options.add_argument("--ignore-certificate-errors")
    options.set_capability("acceptInsecureCerts", True)
    
    # Penyamaran Anti-Bot
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    driver = webdriver.Chrome(options=options)
    
    # Hapus jejak webdriver
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    
    wait = WebDriverWait(driver, 30)

    # Struktur JSON yang akan dikirim ke aplikasi STSU
    hasil_scraping = {
        "pusat_primata": {"dewasa": 0, "anak": 0},
        "children_zoo": {"total": 0},
        "area_lainnya": {
            "dewasa": 0, "anak": 0,
            "gol_i": 0, "gol_ii": 0, "gol_iii": 0,
            "motor": 0, "sepeda": 0
        },
        "laporan_diskon": [],
        "settlement": {
            "status": "Total Transaksi Approve",
            "jumlah_transaksi": 0,
            "pengunjung_anak": 0,
            "pengunjung_dewasa": 0,
            "jumlah_kendaraan": 0,
            "nominal": 0
        }
    }

    try:
        print("\n🚀 [IWM] Membuka web portal IWM...")
        driver.get(IWM_LOGIN_URL)
        
        try:
            user_input = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.NAME, "username")))
            print("🔑 [IWM] Form login ditemukan, mengisi kredensial...")
            user_input.clear()
            user_input.send_keys(IWM_USER)
            driver.find_element(By.ID, "regularInput").send_keys(IWM_PASS)
            driver.find_element(By.XPATH, "//button[@type='submit']").click()
            time.sleep(3)
        except:
            print("✅ [IWM] Sesi sudah tersimpan (sudah login), lanjut!")

        # -------------------------------------------------------------------------
        # TAHAP 1: REKAP PENDAPATAN PERLOKASI (TIKET REGULER - 1 PARAMETER TANGGAL)
        # -------------------------------------------------------------------------
        print("🧭 [IWM] Melompat langsung ke URL Laporan -> Rekap Pendapatan Perlokasi...")
        driver.get(IWM_PERLOKASI_URL)
        time.sleep(3)
        
        print(f"📅 [IWM] Mengubah 'Tampilan' menjadi Pendapatan dan Mengisi Tanggal ke: {tanggal_target}")
        
        driver.execute_script(f"""
            let formSearch = document.getElementById('form_search');
            let container = formSearch ? formSearch : document;
            
            // 1. Ubah Dropdown 'Tampilan' menjadi 'Pendapatan (Rp)'
            let selects = container.querySelectorAll('select');
            for(let s of selects) {{
                for(let opt of s.options) {{
                    if(opt.text.toLowerCase().includes('pendapatan')) {{
                        s.value = opt.value;
                        s.dispatchEvent(new Event('change'));
                        break;
                    }}
                }}
            }}
            
            // 2. Isi parameter tanggal pencarian
            let inputs = container.querySelectorAll('input[type="text"], input[type="date"]');
            for(let inp of inputs) {{
                let attr = (inp.name + ' ' + inp.id + ' ' + inp.className).toLowerCase();
                let isDate = attr.includes('tgl') || attr.includes('tanggal') || attr.includes('date') || /^\\d{{4}}-\\d{{2}}-\\d{{2}}$/.test(inp.value);
                
                if(isDate) {{
                    inp.value = '{tanggal_target}';
                }}
            }}
            
            // 3. Submit data untuk merefresh tabel
            if(formSearch) formSearch.submit();
            else {{
               let cariBtn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                  .find(el => el.value.toLowerCase().includes('cari') || el.innerText.toLowerCase().includes('cari'));
               if(cariBtn) cariBtn.click();
            }}
        """)
        
        print("⏳ [IWM] Menunggu data Perlokasi dimuat (Mode Pendapatan Rupiah)...")
        time.sleep(8)

        matrix_perlokasi = driver.execute_script("""
            const tables = document.querySelectorAll('table');
            let targetTable = null;
            for (let t of tables) {
                if (t.textContent.includes('Lokasi') && t.textContent.includes('Karcis Masuk')) {
                    targetTable = t;
                    break;
                }
            }
            if (!targetTable) return [];
            
            const rows = Array.from(targetTable.querySelectorAll('tbody tr'));
            return rows.map(r => Array.from(r.querySelectorAll('td')).map(td => {
                const i = td.querySelector('input'); return (i ? i.value : td.textContent).trim();
            }));
        """)

        print(f"📊 [IWM] Menyusun {len(matrix_perlokasi)} baris data pendapatan...")
        for raw_row in matrix_perlokasi:
            cells = [c.strip() for c in raw_row]
            if len(cells) < 10: continue
            if "total" in cells[0].lower() or "total" in cells[1].lower(): continue 
            
            lokasi = cells[1].lower()
            anak_rp = clean_number(cells[2])
            dewasa_rp = clean_number(cells[3])
            g1_rp = clean_number(cells[4])
            g2_rp = clean_number(cells[5])
            g3_rp = clean_number(cells[6])
            motor_rp = clean_number(cells[7])
            sepeda_rp = clean_number(cells[8])

            if "primata" in lokasi or "schmutzer" in lokasi:
                hasil_scraping["pusat_primata"]["anak"] += anak_rp
                hasil_scraping["pusat_primata"]["dewasa"] += dewasa_rp
            elif "children" in lokasi:
                hasil_scraping["children_zoo"]["total"] += (anak_rp + dewasa_rp)
            else:
                hasil_scraping["area_lainnya"]["anak"] += anak_rp
                hasil_scraping["area_lainnya"]["dewasa"] += dewasa_rp
                hasil_scraping["area_lainnya"]["gol_i"] += g1_rp
                hasil_scraping["area_lainnya"]["gol_ii"] += g2_rp
                hasil_scraping["area_lainnya"]["gol_iii"] += g3_rp
                hasil_scraping["area_lainnya"]["motor"] += motor_rp
                hasil_scraping["area_lainnya"]["sepeda"] += sepeda_rp

        # -------------------------------------------------------------------------
        # TAHAP 2: REKAP PENDAPATAN ROMBONGAN (FULL 11 KOLOM STANDAR)
        # -------------------------------------------------------------------------
        print("🧭 [IWM] Melompat ke URL Laporan -> Rekap Pendapatan Rombongan...")
        driver.get(IWM_DISKON_URL)
        time.sleep(3)
        
        print(f"📅 [IWM] Mengatur rentang tanggal rombongan ke: {tanggal_target}")
        
        driver.execute_script(f"""
            let formSearch = document.getElementById('form_search');
            let container = formSearch ? formSearch : document;
            let inputs = container.querySelectorAll('input[type="text"], input[type="date"]');
            
            for(let inp of inputs) {{
                let attr = (inp.name + ' ' + inp.id + ' ' + inp.className).toLowerCase();
                let isDate = attr.includes('tgl') || attr.includes('tanggal') || attr.includes('date') || /^\\d{{4}}-\\d{{2}}-\\d{{2}}$/.test(inp.value);
                
                if(isDate) {{
                    inp.value = '{tanggal_target}';
                }}
            }}
            
            let cariBtn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                .find(el => el.value.toLowerCase().includes('cari') || el.innerText.toLowerCase().includes('cari'));
                
            if(cariBtn) cariBtn.click();
            else if(formSearch) formSearch.submit();
        """)
        
        print("⏳ [IWM] Menunggu data Rombongan dimuat...")
        time.sleep(6)

        try:
            driver.execute_script("""
                let selects = document.querySelectorAll('select');
                for(let s of selects) {
                    if(s.innerHTML.includes('100 data per halaman') || s.innerHTML.includes('100')) {
                        s.value = '100';
                        s.dispatchEvent(new Event('change'));
                    }
                }
            """)
            time.sleep(4)
        except: pass

        matrix_rombongan = driver.execute_script("""
            const tables = document.querySelectorAll('table');
            let targetTable = null;
            for (let t of tables) {
                if (t.textContent.includes('Kode Rombongan') && t.textContent.includes('Nama Rombongan')) {
                    targetTable = t;
                    break;
                }
            }
            if (!targetTable) return [];
            
            const rows = Array.from(targetTable.querySelectorAll('tbody tr'));
            return rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim()));
        """)

        print(f"🚌 [IWM] Ditemukan {len(matrix_rombongan)} baris data rombongan...")
        for raw_row in matrix_rombongan:
            cells = [c.strip() for c in raw_row]
            if len(cells) < 11: continue
            if "total" in cells[0].lower() or "total" in cells[1].lower() or not cells[0].isdigit(): continue
            
            no_str = cells[0]
            lokasi = cells[1]
            pos = cells[2]
            kode = cells[3]
            nama = cells[4]
            tgl_kunj = cells[5]
            ter_anak = clean_number(cells[6])
            ter_dewasa = clean_number(cells[7])
            masuk_anak = clean_number(cells[8])
            masuk_dewasa = clean_number(cells[9])
            pendapatan = clean_number(cells[10])
            
            if pendapatan > 0:
                hasil_scraping["laporan_diskon"].append({
                    "no": no_str,
                    "lokasi": lokasi,
                    "pos": pos,
                    "kode_rombongan": kode,
                    "nama_rombongan": nama,
                    "tgl_kunjungan": tgl_kunj,
                    "terdaftar_anak": ter_anak,
                    "terdaftar_dewasa": ter_dewasa,
                    "masuk_anak": masuk_anak,
                    "masuk_dewasa": masuk_dewasa,
                    "pendapatan_rp": pendapatan
                })

        # -------------------------------------------------------------------------
        # TAHAP 3: REKAP SETTLEMENT BERJALAN (JUMLAH TRANSAKSI & TAPING GATE/POS)
        # -------------------------------------------------------------------------
        print("🧭 [IWM] Melompat ke menu Laporan -> Rekap Settlement Berjalan...")
        # Coba klik link di menu jika ada, atau direct get
        settle_href = driver.execute_script("""
            let links = Array.from(document.querySelectorAll('a'));
            let target = links.find(a => a.textContent.trim().toLowerCase().includes('settlement'));
            return target ? target.href : null;
        """)
        
        if settle_href:
            driver.get(settle_href)
        else:
            driver.get(IWM_SETTLEMENT_URL)
        time.sleep(3)

        print(f"📅 [IWM] Mengatur filter tanggal settlement ke: {tanggal_target}")
        driver.execute_script(f"""
            let formSearch = document.getElementById('form_search');
            let container = formSearch ? formSearch : document;

            // 1. Pilih 'Tanggal Transaksi' pada dropdown Berdasarkan
            let selects = container.querySelectorAll('select');
            for(let s of selects) {{
                for(let opt of s.options) {{
                    if(opt.text.toLowerCase().includes('transaksi') || opt.value.toLowerCase().includes('transaksi')) {{
                        s.value = opt.value;
                        s.dispatchEvent(new Event('change'));
                        break;
                    }}
                }}
            }}

            // 2. Isi rentang tanggal pencarian
            let inputs = container.querySelectorAll('input[type="text"], input[type="date"]');
            for(let inp of inputs) {{
                let attr = (inp.name + ' ' + inp.id + ' ' + inp.className).toLowerCase();
                let isDate = attr.includes('tgl') || attr.includes('tanggal') || attr.includes('date') || /^\\d{{4}}-\\d{{2}}-\\d{{2}}$/.test(inp.value);
                if(isDate) {{
                    inp.value = '{tanggal_target}';
                }}
            }}

            // 3. Klik tombol Cari
            let cariBtn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                .find(el => el.value.toLowerCase().includes('cari') || el.innerText.toLowerCase().includes('cari'));
            if(cariBtn) cariBtn.click();
            else if(formSearch) formSearch.submit();
        """)

        print("⏳ [IWM] Menunggu data Settlement Transaksi dimuat...")
        time.sleep(6)

        settlement_matrix = driver.execute_script("""
            const tables = document.querySelectorAll('table');
            let targetTable = null;
            for (let t of tables) {
                if (t.textContent.includes('RINGKASAN SETTLEMENT') || t.textContent.includes('Total Transaksi Approve') || t.textContent.includes('Jumlah Transaksi')) {
                    targetTable = t;
                    break;
                }
            }
            if (!targetTable) return [];
            const rows = Array.from(targetTable.querySelectorAll('tr'));
            return rows.map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.textContent.trim()));
        """)

        print(f"💳 [IWM] Memproses {len(settlement_matrix)} baris ringkasan settlement...")
        for row in settlement_matrix:
            if not row or len(row) < 5: continue
            row_text = " ".join(row).lower()

            # Tangkap baris 'Total Transaksi Approve' (prioritas utama) atau 'Total Transaksi Bank'
            if "total transaksi approve" in row_text or "approve" in row[0].lower():
                cells = row
                jml_trx = clean_number(cells[1])
                p_anak = clean_number(cells[2])
                p_dws = clean_number(cells[3])
                kdr = clean_number(cells[4])
                nom = clean_number(cells[5]) if len(cells) >= 6 else 0

                hasil_scraping["settlement"] = {
                    "status": "Total Transaksi Approve",
                    "jumlah_transaksi": jml_trx,
                    "pengunjung_anak": p_anak,
                    "pengunjung_dewasa": p_dws,
                    "jumlah_kendaraan": kdr,
                    "nominal": nom
                }
                print(f"✅ [IWM] Berhasil mengekstrak Settlement: {jml_trx} Transaksi, {p_anak + p_dws} Pengunjung, {kdr} Kendaraan, Rp {nom:,.0f}")
                break

        # -------------------------------------------------------------------------
        # TAHAP 4: MEMBUAT FILE PDF OTOMATIS (IDENTIK DENGAN 3A)
        # -------------------------------------------------------------------------
        target_folder = tentukan_folder_penyimpanan(tanggal_target)
        print(f"\n📂 [IWM] Menyimpan dokumen PDF ke: {target_folder}")

        # 1. Dokumen STSU Old Gate (2 Lembar: STSU + Bukti Rekon & Settlement)
        pdf_stsu_path = buat_pdf_stsu_iwm(tanggal_target, hasil_scraping, target_folder)

        # 2. Dokumen Lampiran Rombongan Resmi (Format 11 Kolom)
        pdf_romb_path = buat_pdf_rombongan_iwm(tanggal_target, hasil_scraping.get("laporan_diskon", []), target_folder)

        print("✅ [IWM] Semua tahapan ekstraksi & pembuatan PDF selesai dengan sukses!")

    except Exception as e:
        print(f"❌ [IWM] Error Kritis pada Selenium: {e}")
        driver.quit()
        raise e
        
    driver.quit()
    return hasil_scraping


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"


# === ENDPOINT API YANG DIPANGGIL OLEH APLIKASI REACT ===
@app.route('/api/tarik_rekon_iwm', methods=['GET'])
def api_tarik_iwm():
    tanggal = request.args.get('tanggal')
    if not tanggal:
        return jsonify({"status": "error", "message": "Tanggal wajib diisi (format YYYY-MM-DD)"}), 400
    
    try:
        print(f"\n📡 Request IWM masuk dari Web React untuk tanggal: {tanggal}")
        data = proses_tarik_data_iwm(tanggal)
        print("✅ Data IWM berhasil ditarik dan dikirim ke Web React!")
        return jsonify({
            "status": "success",
            "tanggal": tanggal,
            "data": data
        })
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    # Jika dijalankan dengan argumen tanggal: python bot_rekon_iwm.py 2026-11-11
    if len(sys.argv) > 1 and re.match(r'^\d{4}-\d{2}-\d{2}$', sys.argv[1]):
        tgl_input = sys.argv[1]
        print(f"🚀 Menjalankan penarikan IWM langsung via CLI untuk tanggal: {tgl_input}")
        hasil = proses_tarik_data_iwm(tgl_input)
        print(f"🎉 Selesai! Data & PDF tersimpan untuk tanggal: {tgl_input}")
        sys.exit(0)

    local_ip = get_local_ip()
    print("\n" + "="*60)
    print(" 🤖 SERVER API ROBOT IWM (OLD GATE) TELAH MENYALA AKTIF!")
    print("="*60)
    print(f" 👉 Buka Aplikasi React di Tablet Anda.")
    print(f" 👉 Pastikan IP Address ini sudah dimasukkan di Menu Master/Settings:")
    print(f"    {local_ip}")
    print(f" 👉 API ini berjalan di PORT 5001")
    print("="*60)
    print(" (Biarkan layar hitam ini terbuka selama Anda merekap IWM)\n")
    
    app.run(host='0.0.0.0', port=5001)
