import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import pg from 'pg';
import assert from 'node:assert/strict';
import {decrypt} from '../../api/src/security.js';
const url=process.env.TEST_DATABASE_URL;if(!url||!url.includes(':55432/'))throw new Error('Use isolated test PostgreSQL on port 55432');
const db=new pg.Pool({connectionString:url}),origin=process.env.TEST_ORIGIN??'http://localhost:3000',email=`browser-${Date.now()}@example.test`,password='browser test long password';
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage();let id;
try{
 await page.goto(origin+'/register');await page.locator('input[name=name]').fill('สมาชิกทดสอบ');await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(password);await page.locator('input[name=acceptTerms]').check();await page.getByRole('button',{name:'สมัครสมาชิก',exact:true}).click();await page.getByRole('status').filter({hasText:'จัดคิว'}).waitFor();
 const {rows:[u]}=await db.query('SELECT id FROM users WHERE email=$1',[email]);id=u.id;
 const {rows:[mail]}=await db.query("SELECT payload FROM jobs WHERE user_id=$1 AND kind='email' AND status='queued'",[id]);const link=decrypt(mail.payload,process.env.TEST_QUEUE_KEY).url;
 await page.goto(link);await page.getByRole('button',{name:'ยืนยันอีเมล',exact:true}).click();await page.getByRole('status').filter({hasText:'ยืนยันอีเมลแล้ว'}).waitFor();
 await page.goto(origin+'/login');await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(password);await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await page.waitForURL('**/app');await page.getByRole('heading',{name:'สวัสดี สมาชิกทดสอบ'}).waitFor();
 await page.locator('input[value=BTCUSDT]').check();await page.getByRole('button',{name:'บันทึกเหรียญที่ติดตาม'}).click();await page.getByRole('status').filter({hasText:'บันทึกแล้ว'}).waitFor();
 await page.goto(origin+'/app/alerts');await page.locator('input[name=price]').fill('100');await page.getByRole('button',{name:'เพิ่มแจ้งเตือน'}).click();await page.getByText('BTCUSDT ขึ้นผ่าน 100.00 USDT').waitFor();
 assert.equal((await db.query('SELECT count(*)::int n FROM alerts WHERE user_id=$1',[id])).rows[0].n,1);
 await page.goto(origin+'/app/account');await page.getByRole('heading',{name:'บัญชีของฉัน'}).waitFor();
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.deepEqual(a11y.violations.map(v=>v.id),[]);
 await page.goto(origin+'/admin');await page.getByText('หน้านี้สำหรับผู้ดูแลระบบ').waitFor();
 // Fixture role grant occurs only in the isolated database to inspect admin pages.
 await db.query("UPDATE users SET role='admin' WHERE id=$1",[id]);await page.reload();await page.getByRole('heading',{name:'ห้องดูแล TradeDee'}).waitFor();
 for(const title of ['สมาชิก','ข่าว','บทวิเคราะห์','ตั้งค่า','ประวัติ']){await page.getByRole('button',{name:title,exact:true}).click();await page.waitForTimeout(150);}
 const responses=await Promise.all(Array.from({length:20},()=>context.request.get(origin+'/api/v1/assets')));assert.ok(responses.every(r=>r.status()===200));
 console.log('PASS: real PostgreSQL registration, verification, login, watchlist, alerts, member/admin gates, 20 concurrent reads');
}finally{if(id)await db.query('DELETE FROM users WHERE id=$1',[id]);await browser.close();await db.end();}
