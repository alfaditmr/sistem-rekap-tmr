import re
import time
import os
import sys
import socket
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
import selenium.webdriver.chrome.webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ==============================================================================
# INSTRUKSI PENGGUNAAN & COMPILE:
# 1. Pastikan install: pip install flask flask-cors selenium
# 2. Perintah Build EXE: 
#    python -m PyInstaller --onefile --name "Server_Robot_IWM" --hidden-import="selenium.webdriver" --hidden-import="flask" --hidden-import="flask_cors" bot_rekon_iwm.py
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


def buat_driver_chrome_iwm(use_profile=True):
    options = Options()
    # Berjalan di background (Headless Mode) tanpa membuka jendela browser
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    
    # --- TAMBAHAN ANTI-CRASH CHROME ---
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--remote-debugging-port=0")
    # ----------------------------------
    
    if use_profile:
        for lock_name in ["SingletonLock", "SingletonCookie", "SingletonSocket"]:
            lock_file = os.path.join(CHROME_PROFILE_PATH, lock_name)
            if os.path.exists(lock_file):
                try:
                    os.remove(lock_file)
                except:
                    pass
        options.add_argument(f"--user-data-dir={CHROME_PROFILE_PATH}")

    options.add_argument("--ignore-certificate-errors")
    options.set_capability("acceptInsecureCerts", True)
    
    # Penyamaran Anti-Bot
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    return webdriver.Chrome(options=options)


def proses_tarik_data_iwm(tanggal_target):
    try:
        driver = buat_driver_chrome_iwm(use_profile=True)
    except Exception as e_prof:
        print(f"⚠️ [IWM] Profil utama sedang digunakan proses lain atau terkunci ({e_prof}), membuka sesi Chrome headless baru...")
        driver = buat_driver_chrome_iwm(use_profile=False)
    
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
        # Rincian asli 'Rekap Pendapatan Perlokasi' per baris lokasi (format DATA PENGUNJUNG IWM)
        "rekap_perlokasi": [],
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

            # Simpan rincian asli per lokasi (termasuk baris bernilai 0) untuk bukti cetak Old Gate
            hasil_scraping["rekap_perlokasi"].append({
                "no": cells[0],
                "lokasi": cells[1],
                "anak": anak_rp,
                "dewasa": dewasa_rp,
                "gol_i": g1_rp,
                "gol_ii": g2_rp,
                "gol_iii": g3_rp,
                "motor": motor_rp,
                "sepeda": sepeda_rp,
                "total": clean_number(cells[9]) if len(cells) > 9 else (anak_rp + dewasa_rp + g1_rp + g2_rp + g3_rp + motor_rp + sepeda_rp)
            })

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

        print("✅ [IWM] Semua tahapan ekstraksi data IWM selesai dengan sukses! (PDF diunduh/dicetak langsung melalui Web App)")

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
