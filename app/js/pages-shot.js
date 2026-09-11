/**
 * pages-shot.js — AI 多模态截图记账
 */

Pages.shot = (root) => {
  App.state.shotImages = App.state.shotImages || [];
  App.state.shotDrafts = App.state.shotDrafts || [];

  const narrow = App.state.isDesktop ? 'fullpage-narrow' : '';

  root.innerHTML = `
    <div class="${narrow}">
      <div class="topbar">
        <button class="icon-btn" data-act="back">‹</button>
        <div class="tb-title">AI 截图记账</div>
        <button class="icon-btn" data-act="help">?</button>
      </div>

      <div id="shotNotice"></div>

      <div class="card card-pad">
        <div class="drop-zone" data-drop>
          <span class="dz-ico">${Icons.get('image', 34, 1.5)}</span>
          <div class="dz-t1">点这里上传截图</div>
          <div class="dz-t2">支持微信、支付宝、银行短信、外卖/购物订单页<br>可一次选多张，自动去重识别</div>
        </div>
        <input type="file" accept="image/*" multiple hidden data-file>
        <div class="thumb-grid" data-thumbs></div>
        <div id="shotActions" style="display:none;gap:10px;margin-top:16px"></div>
      </div>

      <div id="draftArea"></div>
    </div>
  `;

  const noticeEl = root.querySelector('#shotNotice');
  const thumbsEl = root.querySelector('[data-thumbs]');
  const fileEl = root.querySelector('[data-file]');
  const dropEl = root.querySelector('[data-drop]');
  const actionsEl = root.querySelector('#shotActions');
  const draftArea = root.querySelector('#draftArea');

  root.querySelector('[data-act="back"]').onclick = () => App.go('home');
  root.querySelector('[data-act="help"]').onclick = showHelp;

  renderNotice();
  renderThumbs();
  renderDrafts();

  function renderNotice() {
    if (!AI.ready()) {
      noticeEl.innerHTML = `
        <div class="notice warn">
          <span class="ni">${Icons.get('alert', 17)}</span>
          <div><b>还没配置 AI 接口</b><br>截图识别需要用你自己的多模态大模型 API。请到「我的 → AI 接口设置」填写 API Key 后回来使用。</div>
        </div>`;
      return;
    }
    const c = AI.cfg();
    noticeEl.innerHTML = `
      <div class="notice info">
        <span class="ni">${Icons.get('lock', 17)}</span>
        <div>图片仅在你的设备与所选 AI 服务商之间传输，<b>不经过任何我们的服务器</b>。当前模型：${UI.esc(c.model)}</div>
      </div>`;
  }

  function renderThumbs() {
    const imgs = App.state.shotImages;
    thumbsEl.innerHTML = imgs.map((im, i) => `
      <div class="thumb">
        <img src="${im.dataUrl}" alt="">
        <button class="del" data-i="${i}">${Icons.get('close', 14, 2)}</button>
      </div>`).join('');
    thumbsEl.querySelectorAll('.del').forEach((b) => {
      b.onclick = () => { App.state.shotImages.splice(Number(b.dataset.i), 1); renderThumbs(); renderActions(); };
    });
    renderActions();
  }

  function renderActions() {
    const n = App.state.shotImages.length;
    if (!n) { actionsEl.style.display = 'none'; return; }
    actionsEl.style.display = 'flex';    actionsEl.innerHTML = `
      <button class="btn btn-ghost" data-clear style="flex:0 0 auto">清空 ${n}</button>
      <button class="btn btn-primary flex1" data-run>开始识别 ${n} 张</button>`;
    actionsEl.querySelector('[data-clear]').onclick = () => {
      App.state.shotImages = []; App.state.shotDrafts = [];
      renderThumbs(); renderDrafts();
    };
    actionsEl.querySelector('[data-run]').onclick = runRecognize;
  }

  dropEl.onclick = () => fileEl.click();

  fileEl.onchange = async () => {
    const files = Array.from(fileEl.files || []);
    if (!files.length) return;
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const dataUrl = await compressImage(f);
      App.state.shotImages.push({ dataUrl, name: f.name });
    }
    fileEl.value = '';
    renderThumbs();
  };

  // 支持粘贴
  const onPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgs = items.filter((i) => i.type.startsWith('image/'));
    if (!imgs.length) return;
    e.preventDefault();
    (async () => {
      for (const it of imgs) {
        const f = it.getAsFile();
        if (f) App.state.shotImages.push({ dataUrl: await compressImage(f), name: '粘贴图片' });
      }
      renderThumbs();
      UI.toast('已添加粘贴的图片');
    })();
  };
  document.addEventListener('paste', onPaste);
  App.cleanups.push(() => document.removeEventListener('paste', onPaste));

  async function runRecognize() {
    if (!AI.ready()) return UI.toast('请先配置 AI 接口');
    const ld = UI.loading('正在上传截图…');
    try {
      ld.setText(`AI 正在识别 ${App.state.shotImages.length} 张图片…`);
      const items = await AI.recognizeScreenshots(App.state.shotImages, {
        onProgress: (t) => ld.setText(t),
      });
      ld.close();
      if (!items.length) {
        UI.toast('未识别到账单信息，请确认截图内容');
        return;
      }
      // 去重：同金额+日期+备注 视为重复
      const existing = Ledger.Records.all().map((r) => `${r.date}|${r.amount}|${r.note}`);
      App.state.shotDrafts = items.map((it) => ({
        ...it,
        _checked: !existing.includes(`${it.date}|${it.amount}|${it.note}`),
        _dup: existing.includes(`${it.date}|${it.amount}|${it.note}`),
      }));
      renderDrafts();
      UI.toast(`识别到 ${items.length} 条记录，请核对`);
      draftArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      ld.close();
      noticeEl.innerHTML = `<div class="notice err"><span class="ni">${Icons.get('alert', 17)}</span><div><b>识别失败</b><br>${UI.esc(e.message)}</div></div>`;
      UI.toast('识别失败');
    }
  }

  function renderDrafts() {
    const list = App.state.shotDrafts;
    if (!list.length) { draftArea.innerHTML = ''; return; }
    const checked = list.filter((d) => d._checked).length;
    const totalExp = list.filter((d) => d._checked && d.type === 'expense').reduce((a, d) => a + d.amount, 0);
    const totalInc = list.filter((d) => d._checked && d.type === 'income').reduce((a, d) => a + d.amount, 0);

    draftArea.innerHTML = `
      <div class="sec-head" style="margin-top:6px">
        <h3>识别结果 · 已选 ${checked}/${list.length}</h3>
        <span class="more" data-all>全选/全不选</span>
      </div>
      <div class="stat-inline" style="margin-bottom:12px">
        <div class="stat-pill"><div class="k">将记入支出</div><div class="v" style="color:var(--expense)">¥${totalExp.toFixed(2)}</div></div>
        <div class="stat-pill"><div class="k">将记入收入</div><div class="v" style="color:var(--income)">¥${totalInc.toFixed(2)}</div></div>
      </div>
      <div class="px16">
        ${list.map((d, i) => draftCard(d, i)).join('')}
      </div>
      <div style="padding:6px 16px 0;display:flex;gap:10px;margin-bottom:20px">
        <button class="btn btn-ghost" data-cancel style="flex:0 0 auto">取消</button>
        <button class="btn btn-primary flex1" data-save ${checked ? '' : 'disabled'}>确认入账（${checked} 条）</button>
      </div>
    `;

    draftArea.querySelector('[data-all]').onclick = () => {
      const allOn = App.state.shotDrafts.every((d) => d._checked);
      App.state.shotDrafts.forEach((d) => { d._checked = !allOn; });
      renderDrafts();
    };
    draftArea.querySelector('[data-cancel]').onclick = () => {
      App.state.shotDrafts = []; App.state.shotImages = [];
      renderThumbs(); renderDrafts();
    };
    draftArea.querySelector('[data-save]').onclick = saveDrafts;

    draftArea.querySelectorAll('[data-chk]').forEach((el) => {
      el.onclick = () => {
        const d = App.state.shotDrafts[Number(el.dataset.chk)];
        d._checked = !d._checked;
        renderDrafts();
      };
    });
    draftArea.querySelectorAll('[data-field]').forEach((el) => {
      const i = Number(el.dataset.i), f = el.dataset.field;
      el.oninput = () => {
        App.state.shotDrafts[i][f] = f === 'amount' ? (parseFloat(el.value) || 0) : el.value;
        if (f === 'amount') refreshTotals();
      };
    });
    draftArea.querySelectorAll('[data-cat-sel]').forEach((el) => {
      el.onchange = () => {
        App.state.shotDrafts[Number(el.dataset.catSel)].categoryId = el.value;
        // 重绘以更新图标
        const d = App.state.shotDrafts[Number(el.dataset.catSel)];
        const iconEl = draftArea.querySelector(`[data-caticon="${el.dataset.catSel}"]`);
        if (iconEl) iconEl.innerHTML = (Ledger.Categories.get(d.categoryId) || {}).icon || Icons.get('tag', 16);
      };
    });
    draftArea.querySelectorAll('[data-type-sel]').forEach((el) => {
      el.onchange = () => {
        const i = Number(el.dataset.typeSel);
        App.state.shotDrafts[i].type = el.value;
        renderDrafts();
      };
    });
    draftArea.querySelectorAll('[data-del-draft]').forEach((el) => {
      el.onclick = () => {
        App.state.shotDrafts.splice(Number(el.dataset.delDraft), 1);
        renderDrafts();
      };
    });
  }

  function refreshTotals() {
    const list = App.state.shotDrafts;
    const totalExp = list.filter((d) => d._checked && d.type === 'expense').reduce((a, d) => a + d.amount, 0);
    const totalInc = list.filter((d) => d._checked && d.type === 'income').reduce((a, d) => a + d.amount, 0);
    const pills = draftArea.querySelectorAll('.stat-pill .v');
    if (pills[0]) pills[0].textContent = '¥' + totalExp.toFixed(2);
    if (pills[1]) pills[1].textContent = '¥' + totalInc.toFixed(2);
  }

  function draftCard(d, i) {
    const cats = Ledger.Categories.list(d.type);
    const c = Ledger.Categories.get(d.categoryId) || { icon: '' };
    const confTag = d.confidence != null && d.confidence < 0.7 ? `<span style="font-size:10px;color:var(--warn);background:var(--warn-soft);padding:1px 5px;border-radius:5px">待确认</span>` : '';
    const dupTag = d._dup ? `<span style="font-size:10px;color:var(--text-3);background:#F0F2F5;padding:1px 5px;border-radius:5px">可能重复</span>` : '';
    return `
      <div class="draft-item ${d._checked ? '' : 'off'}">
        <div class="draft-head">
          <div class="draft-check ${d._checked ? 'on' : ''}" data-chk="${i}">${d._checked ? '✓' : ''}</div>
          <div class="draft-cat">
            <span data-caticon="${i}" style="display:grid;place-items:center">${c.icon || Icons.get('tag', 16)}</span>
            <span>${UI.esc(c.name)}</span>
            ${confTag}${dupTag}
          </div>
          <div class="draft-amt ${d.type}">${d.type === 'income' ? '+' : '-'}${d.amount.toFixed(2)}</div>
        </div>
        <div class="draft-fields">
          <div class="f"><label>金额</label><input type="number" step="0.01" inputmode="decimal" data-field="amount" data-i="${i}" value="${d.amount}"></div>
          <div class="f"><label>日期</label><input type="date" data-field="date" data-i="${i}" value="${d.date}"></div>
          <div class="f"><label>类型</label>
            <select data-type-sel="${i}">
              <option value="expense" ${d.type === 'expense' ? 'selected' : ''}>支出</option>
              <option value="income" ${d.type === 'income' ? 'selected' : ''}>收入</option>
            </select>
          </div>
          <div class="f"><label>分类</label>
            <select data-cat-sel="${i}">
              ${cats.map((x) => `<option value="${x.id}" ${x.id === d.categoryId ? 'selected' : ''}>${x.icon} ${UI.esc(x.name)}</option>`).join('')}
            </select>
          </div>
          <div class="f" style="grid-column:1/-1"><label>备注 / 商户</label>
            <input data-field="note" data-i="${i}" value="${UI.esc(d.note || '')}" placeholder="商户或说明">
          </div>
        </div>
        ${d.rawText ? `<div class="draft-raw">原文：${UI.esc(d.rawText)}</div>` : ''}
        <div style="display:flex;justify-content:flex-end;margin-top:6px">
          <button data-del-draft="${i}" style="font-size:12px;color:var(--text-3);padding:4px 8px">移除这条</button>
        </div>
      </div>`;
  }

  function saveDrafts() {
    const picked = App.state.shotDrafts.filter((d) => d._checked && d.amount > 0);
    if (!picked.length) return UI.toast('请至少勾选一条');
    Ledger.Records.addBatch(picked.map((d) => ({
      type: d.type,
      amount: d.amount,
      categoryId: d.categoryId,
      note: d.note,
      date: d.date,
      time: d.time || Ledger.nowTimeStr(),
      source: 'ai_screenshot',
    })));
    App.state.shotDrafts = [];
    App.state.shotImages = [];
    UI.toast(`成功入账 ${picked.length} 条`);
    App.go('home');
  }

  function showHelp() {
    UI.sheet({
      title: '使用说明',
      body: `
        <div style="font-size:14px;line-height:1.75;color:var(--text-2)">
          <p><b>1. 配置接口</b><br>到「我的 → AI 接口设置」，填入任意兼容 OpenAI 协议的多模态模型 API Key。推荐使用支持视觉的模型，例如 gpt-4o、qwen-vl-max、glm-4v 等。</p>
          <p><b>2. 上传截图</b><br>支持微信账单、支付宝账单、银行扣款短信、外卖订单、购物订单等多种截图。可一次上传多张，也可以直接 Ctrl+V 粘贴。</p>
          <p><b>3. 核对结果</b><br>AI 会给出识别到的每一条记录，含金额、日期、分类、商户。你可以修改、勾选或删除任意条目，确认后一键入账。</p>
          <p><b>4. 关于准确性</b><br>模型识别可能有误差（尤其是模糊截图或复杂排版）。系统会用「待确认」标记低置信度结果，请务必核对后再保存。</p>
          <p><b>5. 隐私</b><br>图片直接从你的浏览器发送到你自己配置的 AI 服务商，不经过第三方服务器。所有账单数据保存在本机浏览器。</p>
        </div>`,
    });
  }
};

/* 图片压缩，减少 token 消耗与上传体积 */
function compressImage(file, maxSize = 1400, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
