// 双浏览器实时联测: A标记 -> B看见; A签到 -> B地图出现头像
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome' });
const mk = async (name, id) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([n, i]) => localStorage.setItem('waic-squad-session-v1', JSON.stringify({
    teamCode: 'lanchi-e2e', member: { id: i, name: n, color: '#e8cd8a' },
  })), [name, id]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  return page;
};

const A = await mk('家齐', '11111111-1111-4111-8111-111111111111');
const B = await mk('阿蓝', '22222222-2222-4222-8222-222222222222');

// 等 presence 稳定
await A.waitForTimeout(3000);

// --- test 1: A 在论坛页评「夯」, B 应实时看到 mark-chip ---
await A.goto('http://localhost:5173/#/forums', { waitUntil: 'domcontentloaded' });
await B.goto('http://localhost:5173/#/forums', { waitUntil: 'domcontentloaded' });
await A.waitForSelector('.card .rating button');
await B.waitForSelector('.card .rating button');
await A.locator('.card').first().locator('.rating button').first().click();
const t0 = Date.now();
await B.locator('.card').first().locator('.mark-chip', { hasText: '家齐 · 夯' }).waitFor({ timeout: 15000 });
console.log('PASS rating realtime:', Date.now() - t0, 'ms');

// --- test 1b: A 展开写纪要, B 展开后看到纪要正文 ---
await A.locator('.card').first().click();
await A.locator('.card').first().locator('.note-input').fill('主论坛全是官话，前20分钟可跳过');
await A.locator('.card').first().locator('.note-input').blur();
await B.locator('.card').first().click();
const t0b = Date.now();
await B.locator('.card').first().locator('.team-note', { hasText: '官话' }).waitFor({ timeout: 15000 });
console.log('PASS note realtime:', Date.now() - t0b, 'ms');

// --- test 2: A 签到场馆, B 地图出现头像 ---
await A.goto('http://localhost:5173/#/team', { waitUntil: 'domcontentloaded' });
await A.waitForSelector('.checkin-btn');
await A.locator('.checkin-btn').click();
await A.waitForSelector('.checkin-opt');
await A.locator('.checkin-opt').first().click();
const t1 = Date.now();
await B.goto('http://localhost:5173/#/', { waitUntil: 'domcontentloaded' });
await B.locator('.presence-marker', { hasText: '家齐' }).waitFor({ timeout: 15000 });
console.log('PASS presence realtime:', Date.now() - t1, 'ms');
await B.screenshot({ path: '/tmp/waic-rt-b.png' });

// --- test 3: B 端小队页显示 A 在线且已签到 ---
await B.goto('http://localhost:5173/#/team', { waitUntil: 'domcontentloaded' });
await B.locator('.member-row', { hasText: '家齐' }).first().waitFor({ timeout: 10000 });
console.log('PASS team roster');
await B.screenshot({ path: '/tmp/waic-rt-team.png' });

await browser.close();
console.log('ALL PASS');
