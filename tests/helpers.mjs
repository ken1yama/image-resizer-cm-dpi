import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from 'playwright';

export const APP_URL = new URL('../index.html', import.meta.url).href;
export const APP_PATH = new URL('../index.html', import.meta.url);

// ---- 検証用の PNG（RGB のグラデーション）を依存なしで生成 ----
export function makePng(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = (x * 255) / w; raw[o + 1] = (y * 255) / h; raw[o + 2] = 128;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function fixtures() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resizer-'));
  const a = path.join(dir, 'a.png'), b = path.join(dir, 'b.png');
  fs.writeFileSync(a, makePng(400, 200));
  fs.writeFileSync(b, makePng(300, 300));
  return { dir, a, b };
}

// ---- 出力ファイルの解析 ----
export function pngInfo(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const info = { width: dv.getUint32(16), height: dv.getUint32(20), dpi: null };
  for (let i = 8; i < buf.length - 12;) {
    const len = dv.getUint32(i), type = buf.toString('latin1', i + 4, i + 8);
    if (type === 'pHYs') info.dpi = dv.getUint32(i + 8) * 0.0254;
    i += 12 + len;
  }
  return info;
}
export function jpegDpi(buf) {
  // JFIF の APP0: 単位(1=dpi)と X/Y 密度
  return { unit: buf[13], x: (buf[14] << 8) | buf[15], y: (buf[16] << 8) | buf[17] };
}
export function zipEntries(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < n; i++) {
    const crc = buf.readUInt32LE(p + 16), size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const data = buf.subarray(off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28)).subarray(0, size);
    out.push({ name, size, crcOk: zlib.crc32(data) === crc });
    p += 46 + nameLen;
  }
  return out;
}

// ---- ブラウザ操作 ----
export async function launch() { return chromium.launch(); }

// 外部通信・CSP 違反・JS エラーを記録するページを開く
export async function openApp(browser, { init } = {}) {
  const page = await (await browser.newContext({ locale: 'ja-JP' })).newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) problems.push('external request: ' + r.url()); });
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  if (init) await page.addInitScript(init);
  await page.goto(APP_URL);
  return { page, problems };
}

export async function openImage(page, file) {
  await page.setInputFiles('#file', file);
  await page.waitForSelector('#wrap:not([hidden])');
}

export async function download(page, clickSelector) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(clickSelector)]);
  return { name: dl.suggestedFilename(), data: fs.readFileSync(await dl.path()) };
}
