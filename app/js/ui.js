/**
 * ui.js — 通用 UI 工具（Toast / Sheet / 遮罩 / 图标）
 */

const UI = (() => {
  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg, ms = 2000) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), ms);
  }

  /* ---------- 加载遮罩 ---------- */
  function loading(text = '处理中…') {
    let el = document.getElementById('maskLoad');
    if (!el) {
      el = document.createElement('div');
      el.id = 'maskLoad';
      el.className = 'mask-load';
      el.innerHTML = `<div class="spinner"></div><div class="ml-t"></div>`;
      document.body.appendChild(el);
    }
    el.querySelector('.ml-t').textContent = text;
    el.style.display = 'flex';
    return {
      setText: (t) => { el.querySelector('.ml-t').textContent = t; },
      close: () => { el.style.display = 'none'; },
    };
  }

  /* ---------- 底部弹层 ---------- */
  function sheet({ title, body, foot, onMount, beforeClose }) {
    const mask = document.createElement('div');
    mask.className = 'sheet-mask';
    mask.innerHTML = `
      <div class="sheet">
        <div class="sheet-head">
          <h3></h3>
          <button class="icon-btn" data-close>${Icons.get('close', 17, 2)}</button>
        </div>
        <div class="sheet-body"></div>
        ${foot ? '<div class="sheet-foot"></div>' : ''}
      </div>`;
    mask.querySelector('h3').textContent = title || '';
    const bodyEl = mask.querySelector('.sheet-body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else bodyEl.appendChild(body);

    const footEl = mask.querySelector('.sheet-foot');
    if (foot) {
      if (typeof foot === 'string') footEl.innerHTML = foot;
      else footEl.appendChild(foot);
    }

    document.body.appendChild(mask);

    const close = () => {
      if (beforeClose && beforeClose() === false) return;
      mask.remove();
    };
    mask.querySelector('[data-close]').onclick = close;
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });

    onMount && onMount({ root: mask, body: bodyEl, foot: footEl, close });
    return { root: mask, close };
  }

  /* ---------- 确认框 ---------- */
  function confirm(msg, { title = '确认操作', okText = '确定', danger = false } = {}) {
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.className = 'sheet-mask';
      box.style.alignItems = 'center';
      box.innerHTML = `
        <div style="background:#fff;border-radius:20px;width:82%;max-width:340px;padding:22px;box-shadow:0 12px 40px rgba(20,30,50,.16)">
          <div style="font-size:16px;font-weight:700;margin-bottom:8px" class="ct"></div>
          <div style="font-size:14px;color:#5A6472;line-height:1.6;white-space:pre-wrap" class="cm"></div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn btn-ghost" style="flex:1" data-no>取消</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" style="flex:1" data-yes></button>
          </div>
        </div>`;
      box.querySelector('.ct').textContent = title;
      box.querySelector('.cm').textContent = msg;
      box.querySelector('[data-yes]').textContent = okText;
      document.body.appendChild(box);
      box.querySelector('[data-no]').onclick = () => { box.remove(); resolve(false); };
      box.querySelector('[data-yes]').onclick = () => { box.remove(); resolve(true); };
      box.addEventListener('click', (e) => { if (e.target === box) { box.remove(); resolve(false); } });
    });
  }

  /* ---------- 格式化 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 极简 Markdown 渲染（加粗 / 换行 / 列表） */
  function md(text) {
    let t = esc(text || '');
    t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    t = t.replace(/^\s*[-*]\s+(.+)$/gm, '· $1');
    return t;
  }

  return { toast, loading, sheet, confirm, esc, md };
})();

window.UI = UI;
