import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('waic-squad-session-v1', JSON.stringify({
  teamCode: 'lanchi', member: { id: '11111111-1111-4111-8111-111111111111', name: '家齐', color: '#e8cd8a' },
})));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.pin', { timeout: 15000 });
await page.waitForTimeout(2500);

// 1. zoom into the expo cluster (real user gesture), then tap a party pin -> drawer
await page.evaluate(() => window.__map.jumpTo({ center: [121.4828, 31.1782], zoom: 13.6 }));
await page.waitForTimeout(1200);
await page.locator('.pin').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/waic-drawer.png' });
// mark 想去 inside drawer
const tri = page.locator('.drawer .rating button').first();
if (await tri.count()) { await tri.click(); await page.waitForTimeout(400); }
await page.screenshot({ path: '/tmp/waic-drawer2.png' });
// close drawer
await page.locator('.drawer-scrim').click({ position: { x: 10, y: 10 } });
await page.waitForTimeout(600);

// 2. tap venue marker -> venue page
await page.locator('.venue-marker .venue-ring').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/waic-venuenav.png' });

// 3. hall block -> filtered exhibitors
await page.locator('.hall-block').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/waic-hallfilter.png' });
await browser.close();
console.log('done');
