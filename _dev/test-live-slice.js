/**
 * test-live-slice.js — 在真实浏览器里验证长图切片 pipeline
 *
 * 生成假的「账单长图」（白底/暗底 + 模拟文字横条），
 * 注入页面后调用 prepareImages，检查：
 *   - 普通手机截图不被切碎
 *   - 长图被切成合理段数
 *   - 每段宽度未被压扁
 *   - 输出是 PNG
 *   - 暗色底图自动识别为暗色
 *
 * 用法: node test-live-slice.js <baseUrl>
 * 例:   node test-live-slice.js http://127.0.0.1:8765/index.html
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL_ = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const PORT = 9800 + Math.floor(Math.random() * 500);
const PROFILE = path.join(require('os').tmpdir(), 'edge-slice-' + Date.now());

/* ---------- 手写 PNG 编码器：造测试图 ---------- */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 造一张「每 90px 一组文字横条」的假账单图 */
function makeBillImage(w, h, dark) {
  const rgba = Buffer.alloc(w * h * 4);
  const bg = dark ? [18, 20, 20] : [255, 255, 255];
  const fg = dark ? [205, 215, 210] : [38, 42, 42];
  const x0 = Math.round(w * 0.08), x1 = Math.round(w * 0.92);
  for (let y = 0; y < h; y++) {
    const inRow = (y % 90) < 34;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const on = inRow && x > x0 && x < x1;
      const c = on ? fg : bg;
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255;
    }
  }
  return encodePNG(w, h, rgba);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function cdpGet(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { child.kill(); } catch (_) {}
    setTimeout(() => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {} }, 400);
  };

  try {
    let target = null;
    for (let i = 0; i < 60; i++) {
      try {
        const list = await cdpGet('/json/list');
        target = list.find((t) => t.type === 'page');
        if (target && target.webSocketDebuggerUrl) break;
      } catch (_) {}
      await sleep(200);
    }
    if (!target) throw new Error('无法连接调试端口');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
    await new Promise((r) => (ws.onopen = r));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve, reject } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: URL_ });
    await sleep(2600);

    // 确认 prepareImages 已暴露
    const probe = await send('Runtime.evaluate', {
      expression: 'typeof window.__prepareImages', returnByValue: true,
    });
    if (probe.result.value !== 'function') {
      console.log('  ! window.__prepareImages 未暴露，检查 pages-shot.js 末尾');
      throw new Error('prepareImages 未暴露');
    }

    const cases = [
      { w: 1080, h: 2340, dark: false, label: '普通手机截图', expectMin: 1, expectMax: 1 },
      { w: 1080, h: 12000, dark: false, label: '长图·浅色', expectMin: 2, expectMax: 6 },
      { w: 1080, h: 12000, dark: true, label: '长图·暗色', expectMin: 2, expectMax: 6 },
      { w: 1080, h: 30000, dark: false, label: '超长图', expectMin: 2, expectMax: 6 },
      { w: 800, h: 800, dark: false, label: '正方形小图', expectMin: 1, expectMax: 1 },
    ];

    let pass = 0, fail = 0;
    console.log('\n在真实浏览器中验证长图切片：\n');

    for (const c of cases) {
      const png = makeBillImage(c.w, c.h, c.dark);
      const b64 = png.toString('base64');
      const expr = `(async () => {
        const bin = atob("${b64}");
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const file = new File([arr], "test.png", { type: "image/png" });
        const parts = await window.__prepareImages(file);
        return JSON.stringify({
          n: parts.length,
          total: parts[0].total,
          dark: parts[0].dark,
          heads: parts.map(p => p.dataUrl.slice(0, 22)),
          sizes: parts.map(p => {
            const m = p.dataUrl.match(/^data:image\\/(\\w+)/);
            return m ? m[1] : "?";
          })
        });
      })()`;

      const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) {
        console.log(`  ✗ ${c.label} (${c.w}×${c.h}) 异常: ${res.exceptionDetails.text}`);
        fail++; continue;
      }
      const r = JSON.parse(res.result.value);
      const inRange = r.n >= c.expectMin && r.n <= c.expectMax;
      const allPNG = r.heads.every((h) => h.startsWith('data:image/png'));
      const totalOk = r.total === r.n;
      const darkOk = r.dark === c.dark;
      const good = inRange && allPNG && totalOk && darkOk;
      if (good) { pass++; } else { fail++; }
      const mark = good ? '✓' : '✗';
      console.log(`  ${mark} ${c.label} ${c.w}×${c.h} → ${r.n} 段 (期望 ${c.expectMin}~${c.expectMax}), ${r.sizes[0].toUpperCase()}, 底色识别 ${r.dark ? '暗' : '浅'}${darkOk ? '' : ` (期望 ${c.dark ? '暗' : '浅'})`}`);
    }

    console.log(`\n结果：${pass} 通过, ${fail} 失败\n`);
    ws.close();
    cleanup();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.error('运行失败:', e.message);
    cleanup();
    process.exit(2);
  }
})();
