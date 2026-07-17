import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on('console', m => { if (m.type() !== 'debug') console.log('[console]', m.type(), m.text().slice(0, 200)); });
page.on('requestfailed', r => console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText));
page.on('response', r => { if (r.url().includes('supabase')) console.log('[resp]', r.status(), r.request().method(), r.url().slice(0, 130)); });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('waic-squad-session-v1', JSON.stringify({
  teamCode: 'lanchi-e2e', member: { id: '11111111-1111-4111-8111-111111111111', name: '家齐', color: '#e8cd8a' },
})));
await page.goto('http://localhost:5173/#/exhibitors', { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.card .tri button');
console.log('--- clicking 想聊 ---');
await page.locator('.card').first().locator('.tri button').first().click();
await page.waitForTimeout(5000);
await browser.close();
