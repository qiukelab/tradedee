import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.POLYLOVE_TEST_URL || 'http://localhost:3000';
const output = fileURLToPath(new URL('../../../.impeccable/review/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const fixture = () => ({ items: Array.from({length:7},(_,i)=>({id:String(i+1),question:`Learning fixture ${i+1}: Will the event happen?`,slug:`learning-fixture-${i+1}`,yes_probability:i===2?.0005:.6,liquidity:10000-i*100,volume_24h:1000-i*100,spread:.02,price_change_1d:null,end_date:'2027-01-01T00:00:00Z',image:'https://example.com/portrait.jpg',source_language:'en'})),as_of:new Date().toISOString(),data_freshness:'fresh'});
let checks=0;
const check=(name)=>{checks++; console.log(`PASS ${name}`);};
const errors=[];
async function open({width=1440,height=960,state='fresh',url='/',reduced='reduce'}={}) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/markets',async route=>{
    if(state==='error')return route.fulfill({status:503,body:'unavailable'});
    if(state==='loading'){await new Promise(r=>setTimeout(r,2500));}
    const data=fixture();if(state==='empty')data.items=[];
    if(state==='stale')data.data_freshness='stale';
    if(state==='expired')data.as_of='2020-01-01T00:00:00Z';
    await route.fulfill({json:data});
  });
  await page.goto(base+url);
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  return {page,context};
}
try {
  for(const width of [390,768,1280,1440]) {
    const {page,context}=await open({width});
    await expect(page.locator('.story-card')).toHaveCount(3);
    assert.equal(await page.locator('img').count(),0);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    assert.equal(overflow,false,`Landing overflow at ${width}`);
    if(process.env.POLYLOVE_CAPTURE==='1') await page.screenshot({path:`${output}/beginner-landing-${width}.png`});
    await page.goto(base+'/?view=terminal&market=1#detail');
    await expect(page.locator('#detail')).toBeVisible();
    await page.evaluate(()=>window.scrollTo(0,0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,`Desk overflow at ${width}`);
    if(process.env.POLYLOVE_CAPTURE==='1') await page.screenshot({path:`${output}/beginner-desk-${width}.png`});
    check(`Landing and desk at ${width}px, three real-data cards and no images`);
    await context.close();
  }
  const {page,context}=await open();
  await expect(page.locator('.lesson-card')).toContainText('ข้อมูลสมมติ');
  const landingA11y = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(landingA11y.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
  check('Landing automated WCAG checks');
  await expect(page.locator('.lesson-card')).toContainText('ไม่ใช่ผลสำรวจคน 100 คน');
  const slider=page.locator('#lesson-probability');
  await slider.fill('75');await expect(page.locator('.lesson-slider output')).toHaveText('75%');
  await page.locator('.lesson-card').getByRole('tab',{name:'ไม่ตก · NO'}).click();
  await expect(page.locator('.lesson-card [role=tabpanel][data-state=active]')).toContainText('ไม่มีฝนตก');
  await page.locator('.lesson-card').getByRole('tab',{name:'ไม่ตก · NO'}).press('ArrowLeft');
  await expect(page.locator('.lesson-card').getByRole('tab',{name:'ตก · YES',exact:true})).toHaveAttribute('data-state','active');
  check('Fictional lesson, interactive proportion and keyboard tabs');
  await page.locator('.story-card').first().getByRole('button').click();
  await expect(page).toHaveURL(/view=terminal.*market=1#detail/);
  await expect(page.locator('#detail h2')).toHaveText(fixture().items[0].question);
  check('Selected market survives transition to detail');
  const help=page.locator('#detail').getByRole('button',{name:'ช่วยอธิบายตัวเลขนี้'});
  await help.click();await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Probability');
  await page.keyboard.press('Escape');await expect(help).toBeFocused();
  check('Glossary opens in context, Escape closes and returns focus');
  await page.locator('#detail').getByRole('button',{name:'ลองจำลองเรื่องนี้'}).click();
  await expect(page).toHaveURL(/market=1#practice/);
  await page.locator('#paper-amount').fill('60');
  await expect(page.locator('.loss-callout')).toContainText('60');
  await expect(page.locator('.outcome-grid>div').first()).toContainText('100');
  await expect(page.locator('.outcome-grid>div').first()).toContainText('+40');
  await page.locator('#practice').getByRole('tab',{name:'ไม่เกิดขึ้น · NO'}).click();
  await page.locator('#paper-amount').fill('40');
  await expect(page.locator('.outcome-grid>div').first()).toContainText('+60');
  const deskA11y = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(deskA11y.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
  check('Desk, detail and populated simulation automated WCAG checks');
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('#practice').evaluate(el=>el.scrollIntoView({block:'start'}));
    if(process.env.POLYLOVE_CAPTURE==='1') await page.screenshot({path:`${output}/beginner-practice-${width}.png`});
    await page.locator('#detail').evaluate(el=>el.scrollIntoView({block:'start'}));
    if(process.env.POLYLOVE_CAPTURE==='1') await page.screenshot({path:`${output}/beginner-detail-${width}.png`});
  }
  await page.locator('#paper-amount').fill('1001');await expect(page.locator('.simulation-result')).toHaveCount(0);
  check('YES and NO preview, proceeds versus profit, maximum loss and input limits');
  await page.getByRole('button',{name:'Switch to English'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.reload();await expect(page.locator('h1')).toHaveText('My discovery desk');
  await expect(page.locator('#detail h2')).toHaveText(fixture().items[0].question);
  check('English persists on reload; original question stays unchanged');
  await page.locator('.desktop-nav').getByRole('button',{name:'Explore stories',exact:true}).click();
  await page.getByRole('textbox',{name:'Search stories'}).fill('nothing-matches');
  await expect(page.getByText('No matching story. Try another word or view all stories.')).toBeVisible();
  await page.getByRole('button',{name:'Show all stories'}).click();
  await expect(page.locator('.story-card')).toHaveCount(3);
  await page.getByRole('button',{name:'Next stories'}).click();
  await expect(page.locator('.story-card').first()).toContainText('Learning fixture 4');
  await page.getByRole('button',{name:'See more data in a table'}).click();
  await expect(page.locator('tbody tr')).toHaveCount(7);
  check('Search, no results, pagination and optional table');
  await page.goBack();await expect(page.locator('h1')).toHaveText('My discovery desk');
  check('Browser back restores SPA view');
  await context.close();
  for(const state of ['error','empty','stale','expired','loading']) {
    const {page,context}=await open({state,url:'/?view=terminal&market=1#practice'});
    if(state==='loading')await expect(page.locator('.data-message.loading')).toBeVisible();
    if(state==='error')await expect(page.locator('.data-message.error')).toBeVisible();
    if(state==='empty')await expect(page.locator('.data-message.empty')).toBeVisible();
    if(state==='stale'||state==='expired')await expect(page.locator('.data-message.stale')).toBeVisible();
    await expect(page.locator('#paper-amount')).toHaveCount(0);
    if(state==='error') {
      await page.unroute('**/api/v1/markets');await page.route('**/api/v1/markets',route=>route.fulfill({json:fixture()}));
      await page.getByRole('button',{name:'ลองโหลดใหม่',exact:true}).click();
      await expect(page.locator('.story-card')).toHaveCount(3);
      await expect(page.locator('#paper-amount')).toBeVisible();
      check('Retry recovers real market content');
    }
    check(`${state} data never enables a stale/missing simulation`);
    await context.close();
  }
  const mobile=await open({width:390});
  await mobile.page.getByRole('button',{name:'เปิดเมนู'}).click();
  await expect(mobile.page.getByRole('dialog')).toBeVisible();
  await mobile.page.getByRole('dialog').getByRole('button',{name:'สำรวจเรื่องราว',exact:true}).click();
  await expect(mobile.page.getByRole('dialog')).toHaveCount(0);
  await expect(mobile.page).toHaveURL(/#stories/);
  check('Mobile sheet navigation closes and reaches requested section');
  await mobile.context.close();
  const animated=await open({height:600,reduced:'no-preference'});
  const triggerCount = () => animated.page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(entry=>entry.name.includes('/gsap_ScrollTrigger.js'))?.name;if(!url)throw new Error('ScrollTrigger resource not found');const {ScrollTrigger}=await import(url);return ScrollTrigger.getAll().length;});
  await expect.poll(triggerCount).toBeGreaterThan(0);
  await animated.page.locator('.story-card').first().getByRole('button').click();
  await expect(animated.page.locator('#detail')).toBeVisible();
  await expect.poll(triggerCount).toBe(0);
  check('GSAP ScrollTrigger cleanup after leaving landing');
  check('Motion-enabled landing to desk transition remains usable');
  await animated.context.close();
  assert.deepEqual(errors,[]);
  check('No browser runtime errors');
  console.log(`${checks} browser checks passed; screenshots: ${output}`);
} finally { await browser.close(); }
