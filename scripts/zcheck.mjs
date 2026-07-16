import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('waic-squad-session-v1', JSON.stringify({
  teamCode: 'lanchi', member: { id: '11111111-1111-4111-8111-111111111111', name: '家齐', color: '#e8cd8a' },
})));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.venue-marker', { timeout: 15000 });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const ven = document.querySelector('.venue-marker');
  const ring = ven.querySelector('.venue-ring');
  const r = ring.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  return JSON.stringify({ ringRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width)], hit: hit && (hit.className.baseVal || hit.className).toString().slice(0, 60) });
}));
await browser.close();
