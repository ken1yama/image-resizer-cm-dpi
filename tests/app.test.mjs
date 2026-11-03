import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launch, openApp, openImage, download, fixtures, pngInfo, jpegDpi, zipEntries, makePng, APP_PATH } from './helpers.mjs';

let browser, fx;
before(async () => { browser = await launch(); fx = fixtures(); });
after(async () => { await browser.close(); fs.rmSync(fx.dir, { recursive: true, force: true }); });

test('バージョン表記が index.html・README・CHANGELOG で一致している', () => {
  const html = fs.readFileSync(APP_PATH, 'utf8');
  const meta = html.match(/<meta name="app-version" content="([^"]+)">/)[1];
  const banner = html.match(/^\s*Version (\S+) —/m)[1];
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8').match(/\*\*Version (\S+)\*\*/)[1];
  const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').match(/^## \[(\d+\.\d+\.\d+)\]/m)[1];
  assert.deepEqual([banner, readme, changelog], [meta, meta, meta]);
});

test('起動時にエラー・外部通信・CSP 違反がなく、フッターにバージョンが出る', async () => {
  const { page, problems } = await openApp(browser);
  const meta = await page.getAttribute('meta[name="app-version"]', 'content');
  assert.equal(await page.textContent('#appVersion'), meta);
  await openImage(page, fx.a);
  assert.deepEqual(problems, []);
  assert.deepEqual(await page.evaluate(() => window.__csp), []);
  await page.close();
});

test('PNG: 5 cm × 300 dpi で出力され、dpi が書き込まれる', async () => {
  const { page, problems } = await openApp(browser);
  await openImage(page, fx.a);
  await page.fill('#wcm', '5');
  const f = await download(page, '#save');
  assert.equal(f.name, 'a_5x2.5cm_300dpi.png');
  const info = pngInfo(f.data);
  assert.deepEqual([info.width, info.height], [591, 295]);
  assert.ok(Math.abs(info.dpi - 300) < 0.5, `dpi=${info.dpi}`);
  assert.deepEqual(problems, []);
  await page.close();
});

test('JPEG: dpi（JFIF）が書き込まれる', async () => {
  const { page } = await openApp(browser);
  await openImage(page, fx.a);
  await page.fill('#wcm', '5');
  await page.selectOption('#fmt', 'jpeg');
  await page.fill('#dpi', '600');
  const f = await download(page, '#save');
  assert.match(f.name, /\.jpg$/);
  assert.deepEqual(jpegDpi(f.data), { unit: 1, x: 600, y: 600 });
  await page.close();
});

test('Lanczos: Worker で処理され、Worker なしの結果と一致する', async () => {
  const run = async init => {
    const { page, problems } = await openApp(browser, { init });
    await openImage(page, fx.a);
    await page.fill('#wcm', '5');
    await page.selectOption('#method', 'lanczos');
    const f = await download(page, '#save');
    const workers = await page.evaluate(() => window.__workers || 0);
    assert.deepEqual(problems, []);
    await page.close();
    return { data: f.data, workers };
  };
  const withWorker = await run(() => {
    const W = window.Worker; window.__workers = 0;
    window.Worker = class extends W { constructor(...a) { super(...a); window.__workers++; } };
  });
  const without = await run(() => { window.Worker = undefined; });
  assert.equal(withWorker.workers, 1);
  assert.ok(withWorker.data.equals(without.data), 'Worker 版とフォールバック版の出力が異なる');
});

test('一括処理: 2 枚が ZIP にまとまり、CRC が正しい', async () => {
  const { page, problems } = await openApp(browser);
  await page.setInputFiles('#batchFile', [fx.a, fx.b]);
  await page.waitForFunction(() => document.querySelector('#bstart').textContent.includes('2'));
  await page.click('#bstart');
  await page.waitForSelector('#bsave:not([hidden])');
  const z = await download(page, '#bsave');
  assert.match(z.name, /^resized_2files_300dpi\.zip$/);
  const entries = zipEntries(z.data);
  assert.equal(entries.length, 2);
  assert.ok(entries.every(e => e.crcOk && e.size > 0));
  assert.deepEqual(problems, []);
  await page.close();
});

test('貼り付けた画像は「貼り付けた画像」と表示される', async () => {
  const { page } = await openApp(browser);
  await page.evaluate(async b64 => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bin], 'image.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }));
  }, makePng(40, 40).toString('base64'));
  await page.waitForSelector('#wrap:not([hidden])');
  assert.equal(await page.textContent('#fname'), '貼り付けた画像');
  await page.close();
});

test('canvas 面積に上限がある端末（iOS Safari 相当）では、大きな出力を警告して止める', async () => {
  const limited = () => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...a) { return this.width * this.height > 4096 * 4096 ? null : get.apply(this, a); };
  };
  const big = async init => {
    const { page } = await openApp(browser, { init });
    await openImage(page, fx.a);
    await page.fill('#wcm', '50'); // 5906 × 2953 px ≈ 17.4 MP
    const r = { hidden: await page.isHidden('#limitMsg'), disabled: await page.isDisabled('#go') };
    await page.close();
    return r;
  };
  assert.deepEqual(await big(limited), { hidden: false, disabled: true });
  assert.deepEqual(await big(undefined), { hidden: true, disabled: false });
});
