const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  let logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push('BROWSER ERROR: ' + msg.text());
    }
  });

  page.on('pageerror', error => {
    logs.push('PAGE ERROR: ' + error.message);
  });

  await page.goto('http://localhost:5173');
  
  // Wait for React to mount
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try to click Dashboard Laporan
  try {
     const buttons = await page.$$('button');
     for (const btn of buttons) {
         const text = await page.evaluate(el => el.textContent, btn);
         if (text.includes('Pusat Laporan')) {
             await btn.click();
             logs.push("Clicked Pusat Laporan!");
             break;
         }
     }
     
     await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e) {
     logs.push('Click error: ' + e.message);
  }
  
  fs.writeFileSync('scratch/browser_logs.txt', logs.join('\n'));

  await browser.close();
})();
