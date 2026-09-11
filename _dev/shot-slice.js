/**
 * shot-slice.js — 把一张真实账单长图切好后截出每段的缩略对比图，
 * 用来肉眼检查：切片后文字是否仍然清晰（对比"整体压扁"的效果）
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL_ = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const OUT = process.argv[3] || path.join(__dirname, 'screenshots', 'slice-check.png');
const PORT = 10300 + Math.floor(Math.random() * 400);
const PROFILE = path.join(require('os').tmpdir(), 'edge-sliceck-' + Date.now());

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
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
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 1 })), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* 造一张有"细小文字"的长图：每 60px 一组，行内画细横线模拟文字笔画 */
function makeTextImage(w, h) {
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let c = [252, 252, 252];
      const row = y % 60;
      // 每组画 5 条 3px 细线，模拟一行文字的字形
      if (row < 26 && row % 5 < 3 && x > w * 0.08 && x < w * 0.88) {
        // 交替长短，模拟文字
        const seg = Math.floor((x - w * 0.08) / 14) % 3;
        if (seg !== 1) c = [30, 34, 34];
      }
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255;
    }
  }
  return encodePNG(w, h, rgba);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function cdpGet(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--window-size=1400,1000', 'about:blank',
  ], { stdio: 'ignore' });

  const cleanup = () => { try { child.kill(); } catch (_) {} setTimeout(() => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {} }, 400); };

  try {
    let target = null;
    for (let i = 0; i < 60; i++) {
      try { const l = await cdpGet('/json/list'); target = l.find((t) => t.type === 'page'); if (target?.webSocketDebuggerUrl) break; } catch (_) {}
      await sleep(200);
    }
    if (!target) throw new Error('无法连接');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0; const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id; pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
    await new Promise((r) => (ws.onopen = r));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
    };

    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: URL_ }); await sleep(2500);

    // 生成 1080×6000 的长图（模拟 100 行记录）
    const png = makeTextImage(1080, 6000);
    const b64 = png.toString('base64');

    // 在页面里：把「整体压扁到 1400」和「切片后每段」都画出来对比
    const setupExpr = `(async () => {
      const bin = atob("${b64}");
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const file = new File([arr], "long.png", { type: "image/png" });

      // 老方式：整体压进 1400 上限
      const oldUrl = await new Promise((res) => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
          const maxSize = 1400;
          let W = im.naturalWidth, H = im.naturalHeight;
          const r = Math.min(maxSize / W, maxSize / H);
          W = Math.round(W * r); H = Math.round(H * r);
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
          ctx.drawImage(im, 0, 0, W, H);
          // 放大回可对比的尺寸
          const c2 = document.createElement('canvas'); c2.width = 420; c2.height = 700;
          const x2 = c2.getContext('2d'); x2.imageSmoothingEnabled = false;
          x2.fillStyle = '#fff'; x2.fillRect(0,0,420,700);
          // 居中裁一段纵向区域放大
          const srcY = Math.round(H * 0.25), srcH = Math.round(H * 0.35);
          x2.drawImage(c, 0, srcY, W, srcH, 0, 0, 420, 700);
          res({ url: c2.toDataURL('image/png'), size: W + 'x' + H });
        };
        im.src = url;
      });

      // 新方式：切片
      const parts = await window.__prepareImages(file);

      // 把第一段按同尺寸区域放大
      const newUrl = await new Promise((res) => {
        const im = new Image();
        im.onload = () => {
          const c2 = document.createElement('canvas'); c2.width = 420; c2.height = 700;
          const x2 = c2.getContext('2d'); x2.imageSmoothingEnabled = false;
          x2.fillStyle = '#fff'; x2.fillRect(0,0,420,700);
          const W = im.naturalWidth, H = im.naturalHeight;
          const srcY = Math.round(H * 0.25), srcH = Math.round(H * 0.35);
          x2.drawImage(im, 0, srcY, W, srcH, 0, 0, 420, 700);
          res(c2.toDataURL('image/png'));
        };
        im.src = parts[0].dataUrl;
      });

      // 搭个对比页面
      const box = document.createElement('div');
      box.id = '__cmp';
      box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;gap:24px;padding:24px;font:14px system-ui';
      box.innerHTML = \`
        <div><div style="margin-bottom:8px;font-weight:600">旧方式：整体压扁 → \${oldUrl.size}</div>
          <img src="\${oldUrl.url}" style="border:1px solid #ccc;width:420px;height:700px"></div>
        <div><div style="margin-bottom:8px;font-weight:600">新方式：切片第 1 段（共 \${parts.length} 段）→ 1080 宽</div>
          <img src="\${newUrl}" style="border:1px solid #ccc;width:420px;height:700px"></div>
      \`;
      document.body.appendChild(box);
      return 'ok';
    })()`;

    const r = await send('Runtime.evaluate', { expression: setupExpr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    await sleep(600);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
    console.log('对比图已保存:', OUT);
    ws.close(); cleanup();
  } catch (e) {
    console.error('失败:', e.message); cleanup(); process.exit(1);
  }
})();
