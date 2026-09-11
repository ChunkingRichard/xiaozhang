/**
 * pages-mine.js — 我的 / 设置 / 目标 / 预算 / 账户 / 分类 / 搜索
 */

/* =========================================================
 *  我的
 * ========================================================= */
Pages.mine = (root) => {
  const s = Ledger.Settings.get();
  const totalRecords = Ledger.Records.all().length;
  const book = Ledger.Books.current();
  const isD = App.state.isDesktop;

  const profileHtml = `
    <div class="card profile-card">
      <div class="pava">${Mascot.tiny(36)}</div>
      <div class="flex1" style="min-width:0">
        <div style="font-size:18px;font-weight:700">${UI.esc(s.nickname || '记账小能手')}</div>
        <div class="small muted" style="margin-top:3px">共 ${totalRecords} 笔记录 · ${Ledger.Books.all().length} 个账本</div>
      </div>
      <button class="icon-btn" data-act="rename" title="改名">${Icons.get('edit', 17)}</button>
    </div>`;

  const noticeHtml = `
    <div class="notice info">
      <span class="ni">${Icons.get('shield', 17)}</span>
      <div>这是<b>完全属于你的</b>记账工具：数据存在本机，AI 用你自己的 Key，没有任何订阅和付费墙。</div>
    </div>`;

  const aiGroup = `
    <div class="sec-head"><h3>AI 能力</h3></div>
    <div class="setting-group">
      <div class="setting-row" data-act="aiconfig">
        <span class="si">${Icons.get('robot', 18)}</span><span class="st">AI 接口设置</span>
        <span class="sv">${s.apiKey ? UI.esc(s.model || '已配置') : '未配置'}</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span>
      </div>
      <div class="setting-row" data-act="shot">
        <span class="si">${Icons.get('camera', 18)}</span><span class="st">AI 截图记账</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span>
      </div>
      <div class="setting-row" data-act="ai">
        <span class="si">${Icons.get('chat', 18)}</span><span class="st">AI 记账助手</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span>
      </div>
      <div class="setting-row" data-act="discipline">
        <span class="si">${Icons.get('scale', 18)}</span><span class="st">消费风格</span>
        <span class="sv">${{ frugal: '偏节俭', balanced: '求平衡', relaxed: '较宽松' }[s.spendDiscipline] || '求平衡'}</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span>
      </div>
    </div>`;

  const mgmtGroup = `
    <div class="sec-head"><h3>记账管理</h3></div>
    <div class="setting-group">
      <div class="setting-row" data-act="books"><span class="si">${Icons.get('book', 18)}</span><span class="st">账本管理</span><span class="sv">${UI.esc(book.name)}</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="budget"><span class="si">${Icons.get('wallet', 18)}</span><span class="st">预算管理</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="goals"><span class="si">${Icons.get('target', 18)}</span><span class="st">省钱目标</span><span class="sv">${Ledger.Goals.all().length ? Ledger.Goals.all().length + ' 个进行中' : ''}</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="categories"><span class="si">${Icons.get('tag', 18)}</span><span class="st">分类管理</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="accounts"><span class="si">${Icons.get('card', 18)}</span><span class="st">账户管理</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
    </div>`;

  const dataGroup = `
    <div class="sec-head"><h3>数据</h3></div>
    <div class="setting-group">
      <div class="setting-row" data-act="export-json"><span class="si">${Icons.get('upload', 18)}</span><span class="st">导出备份（JSON）</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="export-csv"><span class="si">${Icons.get('chart', 18)}</span><span class="st">导出明细（CSV）</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="import"><span class="si">${Icons.get('download', 18)}</span><span class="st">导入备份</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
      <div class="setting-row" data-act="clear"><span class="si">${Icons.get('trash', 18)}</span><span class="st" style="color:var(--expense)">清空所有数据</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
    </div>`;

  const aboutGroup = `
    <div class="sec-head"><h3>关于</h3></div>
    <div class="setting-group">
      <div class="setting-row" data-act="about"><span class="si">${Icons.get('info', 18)}</span><span class="st">关于与隐私说明</span><span class="sc">${Icons.get('chevronRight', 16, 2)}</span></div>
    </div>`;

  const footer = `<div class="tc muted small" style="padding:10px 0 24px">小账 · 本地记账工具 v1.0</div>`;

  root.innerHTML = `
    <div class="topbar"><div class="tb-title">我的</div></div>
    ${isD ? `
      <div style="padding:0 32px">
        ${profileHtml}
        ${noticeHtml}
      </div>
      <div class="settings-cols">
        <section class="set-col">${aiGroup}</section>
        <section class="set-col">${mgmtGroup}</section>
        <section class="set-col">${dataGroup}</section>
        <section class="set-col">${aboutGroup}</section>
      </div>
      ${footer}` : `
      ${profileHtml}
      ${noticeHtml}
      ${aiGroup}
      ${mgmtGroup}
      ${dataGroup}
      ${aboutGroup}
      ${footer}`}
  `;

  const acts = {
    aiconfig: Sheets.aiConfig,
    shot: () => App.go('shot'),
    ai: () => App.go('ai'),
    books: Sheets.bookManage,
    budget: Sheets.budgetManage,
    goals: () => App.go('goals'),
    categories: Sheets.categoryManage,
    accounts: Sheets.accountManage,
    discipline: Sheets.discipline,
    about: Sheets.about,
    rename: renameUser,
    'export-json': () => { Ledger.DataIO.exportFile(); UI.toast('已导出备份文件'); },
    'export-csv': () => { Ledger.DataIO.exportCSV(Ledger.db().currentBookId); UI.toast('已导出 CSV'); },
    import: doImport,
    clear: doClear,
  };
  Object.entries(acts).forEach(([k, fn]) => {
    const el = root.querySelector(`[data-act="${k}"]`);
    if (el) el.onclick = fn;
  });

  async function renameUser() {
    const name = prompt('给自己起个名字', Ledger.Settings.get().nickname || '');
    if (name != null && name.trim()) { Ledger.Settings.set({ nickname: name.trim() }); App.refresh(); }
  }

  function doImport() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (await UI.confirm('导入将覆盖当前所有数据，确定继续吗？', { danger: true, okText: '覆盖导入' })) {
          try {
            Ledger.DataIO.import(e.target.result);
            UI.toast('导入成功');
            App.refresh();
          } catch (err) {
            UI.toast('导入失败：' + err.message);
          }
        }
      };
      reader.readAsText(f);
    };
    inp.click();
  }

  async function doClear() {
    if (await UI.confirm('这会删除全部账单、账本、目标与设置，且无法恢复。\n建议先导出备份。', { title: '确定清空？', danger: true, okText: '全部清空' })) {
      if (await UI.confirm('最后确认：真的要把所有数据清空吗？', { danger: true, okText: '确认清空' })) {
        Ledger.DataIO.clear();
        App.state.chat = [];
        UI.toast('已清空');
        App.refresh();
      }
    }
  }
};

/* =========================================================
 *  省钱目标
 * ========================================================= */
Pages.goals = (root) => {
  const goals = Ledger.Goals.all();
  const month = Ledger.monthStr();
  const { start, end } = Ledger.monthRange(month);
  const sum = Ledger.Records.sum({ bookId: Ledger.db().currentBookId, start, end });
  const narrow = App.state.isDesktop ? 'fullpage-narrow' : '';

  root.innerHTML = `
    <div class="${narrow}">
    <div class="topbar">
      <button class="icon-btn" data-act="back">‹</button>
      <div class="tb-title">省钱目标</div>
      <button class="icon-btn" data-act="add">＋</button>
    </div>

    <div class="notice info">
      <span class="ni">${Icons.get('target', 17)}</span>
      <div>设定目标后，AI 助手会结合你的账本数据主动督促你。本月已支出 <b>¥${sum.expense.toFixed(2)}</b>，结余 <b>¥${sum.balance.toFixed(2)}</b>。</div>
    </div>

    ${goals.length ? goals.map((g) => {
      const pct = g.target ? Math.min(100, (g.saved / g.target) * 100) : 0;
      const left = Math.max(0, g.target - g.saved);
      let dlTxt = '';
      if (g.deadline) {
        const dLeft = Math.ceil((new Date(g.deadline) - new Date(Ledger.todayStr())) / 86400000);
        dlTxt = dLeft >= 0 ? `还剩 ${dLeft} 天` : `已过期`;
      }
      return `
        <div class="goal-card">
          <div class="goal-top">
            <span class="goal-name">${UI.esc(g.name)}</span>
            <span class="goal-pct">${pct.toFixed(0)}%</span>
          </div>
          <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
          <div class="goal-meta">
            <span>已存 ¥${g.saved.toFixed(2)} / ¥${g.target.toFixed(2)}</span>
            <span>${left > 0 ? '还差 ¥' + left.toFixed(2) : '已达成'}${dlTxt ? ' · ' + dlTxt : ''}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-ghost" style="flex:1;padding:8px;font-size:13px" data-deposit="${g.id}">存一笔</button>
            <button class="btn btn-ghost" style="flex:1;padding:8px;font-size:13px" data-askai="${g.id}">让 AI 给建议</button>
            <button class="btn btn-ghost" style="flex:0 0 auto;padding:8px 12px;font-size:13px" data-edit="${g.id}">${Icons.get('edit', 15)}</button>
          </div>
        </div>`;
    }).join('') : `
      <div class="empty">
        <span class="emo">${Icons.get('target', 38, 1.4)}</span>
        <div class="t1">还没有省钱目标</div>
        <div class="t2">比如「年底存够 2 万」，AI 会帮你盯着</div>
        <button class="btn btn-primary mt16" data-act="add">创建第一个目标</button>
      </div>`}
    </div>
  `;

  root.querySelector('[data-act="back"]').onclick = () => App.go('mine');
  root.querySelectorAll('[data-act="add"]').forEach((b) => { b.onclick = () => editGoal(); });

  root.querySelectorAll('[data-deposit]').forEach((b) => {
    b.onclick = () => deposit(goals.find((g) => g.id === b.dataset.deposit));
  });
  root.querySelectorAll('[data-edit]').forEach((b) => {
    b.onclick = () => editGoal(goals.find((g) => g.id === b.dataset.edit));
  });
  root.querySelectorAll('[data-askai]').forEach((b) => {
    b.onclick = () => {
      const g = goals.find((x) => x.id === b.dataset.askai);
      App.state.pendingQuestion = `我的省钱目标是「${g.name}」，目标 ${g.target} 元，已存 ${g.saved} 元。请结合我当前的消费数据，分析我能不能按时达成，并给出具体可执行的建议。`;
      App.go('ai');
    };
  });

  function editGoal(g) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="field"><label>目标名称</label><input class="input" data-n value="${UI.esc(g ? g.name : '')}" placeholder="例如：年底存够 2 万"></div>
      <div class="field"><label>目标金额</label><input class="input num" type="number" inputmode="decimal" data-t value="${g ? g.target : ''}" placeholder="0.00"></div>
      <div class="field"><label>已存金额</label><input class="input num" type="number" inputmode="decimal" data-s value="${g ? g.saved : 0}" placeholder="0.00"></div>
      <div class="field"><label>截止日期（可选）</label><input class="input" type="date" data-d value="${g ? g.deadline || '' : ''}"></div>
      ${g ? `<button class="btn btn-danger btn-block" data-del>删除这个目标</button>` : ''}
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = g ? '保存' : '创建目标';
    const foot = document.createElement('div');
    foot.style.cssText = 'width:100%';
    foot.appendChild(btn);

    UI.sheet({
      title: g ? '编辑目标' : '新建省钱目标',
      body: wrap,
      foot,
      onMount: ({ close }) => {
        btn.onclick = () => {
          const name = wrap.querySelector('[data-n]').value.trim();
          const target = parseFloat(wrap.querySelector('[data-t]').value) || 0;
          const saved = parseFloat(wrap.querySelector('[data-s]').value) || 0;
          const deadline = wrap.querySelector('[data-d]').value;
          if (!name) return UI.toast('请填写目标名称');
          if (target <= 0) return UI.toast('请填写有效目标金额');
          if (g) Ledger.Goals.update(g.id, { name, target, saved, deadline });
          else Ledger.Goals.add({ name, target, saved, deadline });
          close(); App.refresh(); UI.toast('已保存');
        };
        const del = wrap.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (await UI.confirm('删除该目标？', { danger: true, okText: '删除' })) {
            Ledger.Goals.remove(g.id); close(); App.refresh();
          }
        };
      },
    });
  }

  function deposit(g) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="field"><label>存入金额</label><input class="input num" type="number" inputmode="decimal" data-v placeholder="0.00" style="font-size:19px;font-weight:600"></div>
      <div class="small muted">当前已存 ¥${g.saved.toFixed(2)} / ¥${g.target.toFixed(2)}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = '确认存入';
    const foot = document.createElement('div');
    foot.style.cssText = 'width:100%'; foot.appendChild(btn);
    UI.sheet({
      title: `存入「${g.name}」`, body: wrap, foot,
      onMount: ({ close }) => {
        const inp = wrap.querySelector('[data-v]');
        setTimeout(() => inp.focus(), 220);
        btn.onclick = () => {
          const v = parseFloat(inp.value);
          if (!v || v <= 0) return UI.toast('请输入有效金额');
          Ledger.Goals.update(g.id, { saved: g.saved + v });
          close(); App.refresh();
          UI.toast(`已存入 ¥${v.toFixed(2)}`);
        };
      },
    });
  }
};

/* =========================================================
 *  搜索
 * ========================================================= */
Pages.search = (root) => {
  const keyword = App.state.searchKeyword || '';
  const narrow = App.state.isDesktop ? 'fullpage-narrow' : '';
  root.innerHTML = `
    <div class="${narrow}">
    <div class="topbar">
      <button class="icon-btn" data-act="back">‹</button>
      <div class="tb-title">搜索账单</div>
      <div style="width:36px"></div>
    </div>
    <div style="padding:0 16px 14px">
      <input class="input" id="kw" placeholder="输入分类、备注、金额搜索" value="${UI.esc(keyword)}" autocomplete="off">
    </div>
    <div id="searchResult"></div>
    </div>
  `;
  const inp = root.querySelector('#kw');
  const res = root.querySelector('#searchResult');
  root.querySelector('[data-act="back"]').onclick = () => App.go('home');

  function doSearch() {
    const k = inp.value.trim();
    App.state.searchKeyword = k;
    if (!k) {
      res.innerHTML = `<div class="empty"><span class="emo">${Icons.get('search', 38, 1.4)}</span><div class="t1">输入关键词开始搜索</div><div class="t2">可以搜分类名、备注内容或金额</div></div>`;
      return;
    }
    const list = Ledger.Records.query({ keyword: k });
    if (!list.length) {
      res.innerHTML = `<div class="empty"><span class="emo">${Icons.get('search', 38, 1.4)}</span><div class="t1">没有找到相关记录</div><div class="t2">换个关键词试试</div></div>`;
      return;
    }
    const exp = list.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0);
    const inc = list.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0);
    res.innerHTML = `
      <div class="stat-inline" style="margin-bottom:12px">
        <div class="stat-pill"><div class="k">结果数</div><div class="v">${list.length}</div></div>
        <div class="stat-pill"><div class="k">支出合计</div><div class="v" style="color:var(--expense)">¥${exp.toFixed(2)}</div></div>
        <div class="stat-pill"><div class="k">收入合计</div><div class="v" style="color:var(--income)">¥${inc.toFixed(2)}</div></div>
      </div>
      <div class="px16">
        <div class="rec-group">
          ${list.map((r) => {
            const c = Ledger.Categories.get(r.categoryId) || { icon: '', name: '未分类', color: '#94A3B8' };
            return `
              <div class="rec-item" data-id="${r.id}">
                <div class="rec-ico" style="background:${c.color}1A">${c.icon || Icons.get('tag', 15)}</div>
                <div class="rec-main">
                  <div class="rec-name">${UI.esc(c.name)}</div>
                  <div class="rec-meta">${r.date}${r.note ? ' · ' + UI.esc(r.note) : ''}</div>
                </div>
                <div class="rec-amt ${r.type}">${r.type === 'expense' ? '-' : '+'}${r.amount.toFixed(2)}</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    res.querySelectorAll('.rec-item').forEach((el) => {
      el.onclick = () => Sheets.recordDetail(el.dataset.id);
    });
  }

  let timer = null;
  inp.oninput = () => { clearTimeout(timer); timer = setTimeout(doSearch, 260); };
  setTimeout(() => inp.focus(), 200);
  doSearch();
};
