// Quick visual QA: screenshot app pages with real Chrome (rAF works there).
import { chromium } from 'playwright-core';

const [,, path = '/', out = 'shot.png', w = '375', h = '812', waitMs = '4000'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('waic-squad-session-v1', JSON.stringify({
    teamCode: 'lanchi', member: { id: '11111111-1111-4111-8111-111111111111', name: '家齐', color: '#e8cd8a' },
  }));
});
await page.goto('http://localhost:5173/#' + path, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(+waitMs);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
