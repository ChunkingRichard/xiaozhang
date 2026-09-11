/**
 * shot.js — 用无头 Edge 通过 CDP 截图，验证真实渲染
 * 用法: node shot.js <url> <outfile> [width] [height] [waitMs] [actionsJson]
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL_ = process.argv[2];
const OUT = process.argv[3];
const W = Number(process.argv[4] || 480);
const H = Number(process.argv[5] || 900);
const WAIT = Number(process.argv[6] || 1600);
const ACTIONS = process.argv[7] ? JSON.parse(process.argv[7]) : [];
const DSF = Number(process.argv[8] || 2);

const PORT = 9333 + Math.floor(Math.random() * 500);
const PROFILE = path.join(require('os').tmpdir(), 'edge-shot-' + Date.now());

function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: pathname }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const child = spawn(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    `--window-size=${W},${H}`,
    'about:blank',
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { child.kill(); } catch (_) {}
    setTimeout(() => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {} }, 400);
  };

  try {
    // 等待 CDP 就绪
    let target = null;
    for (let i = 0; i < 60; i++) {
      try {
        const list = await get('/json/list');
        target = list.find((t) => t.type === 'page');
        if (target && target.webSocketDebuggerUrl) break;
      } catch (_) {}
      await sleep(200);
    }
    if (!target) throw new Error('无法连接到调试端口');

    // 用 CDP 的 Page.captureScreenshot（通过 HTTP 版 /json/new 打开页面后需 ws）
    // 简化：改用 Edge 自带的 --screenshot 需要独立进程，这里自行实现 ws 客户端
    const wsUrl = target.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const pending = new Map();

    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    };
    const send = (method, params = {}) => new Promise((res) => {
      const id = ++msgId;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise((r) => { ws.onopen = r; });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: W, height: H, deviceScaleFactor: DSF, mobile: false,
    });

    // 收集 console 输出
    const logs = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
      if (m.method === 'Runtime.consoleAPICalled') {
        const txt = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        logs.push('[' + m.params.type + '] ' + txt);
      }
      if (m.method === 'Runtime.exceptionThrown') {
        const ex = m.params.exceptionDetails;
        logs.push('[EXCEPTION] ' + (ex.exception?.description || ex.text));
      }
    };

    await send('Page.navigate', { url: URL_ });
    await sleep(WAIT);

    // 强制触发一次 resize 与 layout，确保媒体查询重算
    await send('Runtime.evaluate', {
      expression: 'window.dispatchEvent(new Event("resize")); void document.body.offsetHeight;',
    });
    await sleep(500);

    // 确认实际视口宽度
    const vw = await send('Runtime.evaluate', { expression: 'window.innerWidth + "x" + window.innerHeight', returnByValue: true });
    console.log('VIEWPORT', vw.result?.result?.value);

    // 执行交互动作
    for (const act of ACTIONS) {
      if (act.eval) {
        const r = await send('Runtime.evaluate', { expression: act.eval, awaitPromise: true, returnByValue: true });
        if (r.result && r.result.result && r.result.result.value !== undefined) {
          console.log('EVAL>', r.result.result.value);
        } else if (r.result && r.result.exceptionDetails) {
          console.log('EVAL-ERR>', r.result.exceptionDetails.text);
        }
        await sleep(act.wait || 700);
      }
    }

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (!shot.result || !shot.result.data) throw new Error('截图失败: ' + JSON.stringify(shot).slice(0, 200));
    fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));

    // 顺带抓控制台错误
    const errs = await send('Runtime.evaluate', {
      expression: 'JSON.stringify(window.__errs || [])',
      returnByValue: true,
    });
    console.log('SAVED', OUT, fs.statSync(OUT).size, 'bytes');
    console.log('--- CONSOLE ---');
    logs.forEach((l) => console.log(l));
    console.log('--- ERRORS ---');
    console.log(errs.result?.result?.value || '[]');

    ws.close();
    cleanup();
    process.exit(0);
  } catch (e) {
    console.error('FAILED:', e.message);
    cleanup();
    process.exit(1);
  }
})();
