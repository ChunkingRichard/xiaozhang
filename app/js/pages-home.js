/**
 * pages-home.js — 首页 / 记账 / 统计 / 日历
 */

const Pages = {};

/* =========================================================
 *  首页
 * ========================================================= */
Pages.home = (root) => {
  const bookId = Ledger.db().currentBookId;
  const month = App.state.month;
  const { start, end } = Ledger.monthRange(month);
  const sum = Ledger.Records.sum({ bookId, start, end });
  const budget = Ledger.Budgets.getTotal(month);
  const records = Ledger.Records.query({ bookId, month });
  const book = Ledger.Books.current();
  const isD = App.state.isDesktop;

  // 按日分组
  const groups = {};
  records.forEach((r) => { (groups[r.date] = groups[r.date] || []).push(r); });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const monthLabel = month.replace('-', '年') + '月';

  // 各区块 HTML
  const overviewHtml = `
    <div class="overview">
      <div class="ov-head">
        <div class="month-nav">
          <button data-act="prevmonth">‹</button>
          <span class="m-label">${monthLabel}</span>
          <button data-act="nextmonth">›</button>
        </div>
        <div class="ov-range">${Ledger.fmtDateCN(start)} - ${Ledger.fmtDateCN(end)} <span style="opacity:.5">ⓘ</span></div>
      </div>
      <div class="ov-body">
        <div class="ov-left">
          <div class="ov-label"><span style="color:var(--expense)">本月支出</span> </div>
          <div class="ov-amount"><span class="cur">¥</span>${sum.expense.toFixed(2)}</div>
          <div class="ov-sub">
            <div class="item"><div class="k">收入</div><div class="v income">¥${sum.income.toFixed(2)}</div></div>
            <div class="item"><div class="k">结余</div><div class="v ${sum.balance >= 0 ? '' : 'expense'}">¥${sum.balance.toFixed(2)}</div></div>
          </div>
        </div>
        <div class="ov-mascot">${Mascot.big(isD ? 96 : 84)}</div>
      </div>
      <div class="ov-dots"><i class="on"></i><i></i><i></i></div>
    </div>`;

  const quickHtml = `
    <div class="quick-grid">
      <button class="quick-item" data-act="shot"><span class="qi">${Icons.get('camera', 23)}</span><span class="qt">截图记账</span></button>
      <button class="quick-item" data-act="askai"><span class="qi">${Icons.get('chat', 23)}</span><span class="qt">问 AI</span></button>
      <button class="quick-item" data-act="goal"><span class="qi">${Icons.get('target', 23)}</span><span class="qt">省钱目标</span></button>
      <button class="quick-item" data-act="stats"><span class="qi">${Icons.get('chart', 23)}</span><span class="qt">看统计</span></button>
    </div>`;

  const insightHtml = `
    <div class="insight-card" id="insightCard">
      <div class="insight-head">
        <span class="ih-ico">${Icons.get('sparkle', 16)}</span>
        <span class="ih-title">AI 消费洞察</span>
        <button class="ih-btn" data-act="insight-refresh">换一条</button>
      </div>
      <div class="insight-body" id="insightBody">
        <span class="muted small">点这里，让小账看看你这个月有什么值得注意的</span>
      </div>
    </div>`;

  const budgetHtml = budget ? budgetBar(sum.expense, budget) : '';

  const listHtml = `
    <div class="sec-head"><h3>账单明细</h3>
      <span class="more">${records.length ? `共 ${records.length} 笔` : ''}</span>
    </div>
    ${dates.length ? `<div class="rec-list">${dates.map((d) => dayGroup(d, groups[d])).join('')}</div>` : `
      <div class="empty">
        <span class="emo">${Icons.get('empty', 38, 1.4)}</span>
        <div class="t1">这个月还没有账单</div>
        <div class="t2">点「＋」记一笔，或试试截图记账</div>
      </div>`}`;

  root.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" data-act="calendar" title="收支日历">${Icons.get('calendar', 19)}</button>
      <button class="book-switch" data-act="switchbook">
        <span>${UI.esc(book.name)}</span><span class="caret">${Icons.get('chevronDown', 13, 2)}</span>
      </button>
      <button class="icon-btn" data-act="search" title="搜索">${Icons.get('search', 19)}</button>
    </div>
    ${isD ? `
      <div class="page-grid">
        <div class="col-main">
          ${overviewHtml}
          ${quickHtml}
          ${insightHtml}
        </div>
        <div class="col-side">
          ${budgetHtml}
          ${listHtml}
        </div>
      </div>` : `
      ${overviewHtml}
      ${budgetHtml}
      ${quickHtml}
      ${insightHtml}
      ${listHtml}`}
  `;

  // 事件
  root.querySelector('[data-act="prevmonth"]').onclick = () => App.shiftMonth(-1);
  root.querySelector('[data-act="nextmonth"]').onclick = () => App.shiftMonth(1);
  root.querySelector('[data-act="calendar"]').onclick = () => App.go('stats', { tab: 'calendar' });
  root.querySelector('[data-act="stats"]').onclick = () => App.go('stats');
  root.querySelector('[data-act="switchbook"]').onclick = () => Sheets.bookSwitch();
  root.querySelector('[data-act="search"]').onclick = () => App.go('search');
  root.querySelector('[data-act="shot"]').onclick = () => App.go('shot');
  root.querySelector('[data-act="askai"]').onclick = () => App.go('ai');
  root.querySelector('[data-act="goal"]').onclick = () => App.go('goals');

  root.querySelectorAll('.rec-item').forEach((el) => {
    el.onclick = () => Sheets.recordDetail(el.dataset.id);
  });

  // AI 洞察
  const insightBody = root.querySelector('#insightBody');
  const insightBtn = root.querySelector('[data-act="insight-refresh"]');
  let insightLoading = false;

  async function loadInsight() {
    if (insightLoading) return;
    if (!AI.ready()) {
      insightBody.innerHTML = `<span class="muted small">配置 AI 接口后，这里会主动告诉你本月消费里最值得注意的事。<br>
        <a href="javascript:void(0)" data-goto-ai>去配置 →</a></span>`;
      const a = insightBody.querySelector('[data-goto-ai]');
      if (a) a.onclick = () => Sheets.aiConfig();
      return;
    }
    if (!records.length) {
      insightBody.innerHTML = `<span class="muted small">还没有账单数据，先记几笔，小账就能帮你分析了。</span>`;
      return;
    }
    insightLoading = true;
    insightBtn.textContent = '分析中…';
    insightBody.innerHTML = `<div class="typing"><i></i><i></i><i></i></div>`;
    try {
      const text = await AI.insight({ month });
      insightBody.innerHTML = UI.md(text);
    } catch (e) {
      insightBody.innerHTML = `<span class="small" style="color:var(--expense)">分析失败：${UI.esc(e.message)}</span>`;
    } finally {
      insightLoading = false;
      insightBtn.textContent = '换一条';
    }
  }

  insightBtn.onclick = loadInsight;
};

function budgetBar(spent, budget) {
  const pct = Math.min(100, budget ? (spent / budget) * 100 : 0);
  const over = spent > budget;
  return `
    <div style="margin:0 16px 14px;padding:13px 15px;background:var(--surface);border:1px solid ${over ? '#FBDAD7' : 'var(--border)'};border-radius:var(--radius);box-shadow:var(--shadow-s)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:12.5px">
        <span style="color:var(--text-2)">本月预算</span>
        <span style="font-weight:600;color:${over ? 'var(--expense)' : 'var(--text-2)'}">剩余 ¥${(budget - spent).toFixed(2)}</span>
      </div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%;${over ? 'background:linear-gradient(90deg,#F4786E,#E8544A)' : ''}"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:11.5px;color:var(--text-3)">
        <span>已用 ¥${spent.toFixed(2)}</span><span>共 ¥${budget.toFixed(2)}</span>
      </div>
    </div>`;
}

function dayGroup(date, list) {
  const d = new Date(date + 'T00:00:00');
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const isToday = date === Ledger.todayStr();
  const expense = list.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0);
  const income = list.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0);
  const parts = [];
  if (expense) parts.push(`支出 ¥${expense.toFixed(2)}`);
  if (income) parts.push(`收入 ¥${income.toFixed(2)}`);

  return `
    <div class="rec-day">
      <div class="rec-day-head">
        <span class="dd">${Ledger.fmtDateCN(date)} ${wd}${isToday ? ' · 今天' : ''}</span>
        <span class="sm">${parts.join('　')}</span>
      </div>
      <div class="rec-group">
        ${list.map((r) => {
          const c = Ledger.Categories.get(r.categoryId) || { icon: '', name: '未分类', color: '#94A3B8' };
          const srcTxt = { ai_screenshot: 'AI截图', ai_chat: 'AI对话' }[r.source];
          return `
            <div class="rec-item" data-id="${r.id}">
              <div class="rec-ico" style="background:${c.color}1A">${c.icon || Icons.get('tag', 15)}</div>
              <div class="rec-main">
                <div class="rec-name">${UI.esc(c.name)}${srcTxt ? `<span class="badge-src">${srcTxt}</span>` : ''}</div>
                <div class="rec-meta">${r.note ? UI.esc(r.note) : '无备注'}${r.time ? ' · ' + r.time : ''}</div>
              </div>
              <div class="rec-amt ${r.type}">${r.type === 'expense' ? '-' : '+'}${r.amount.toFixed(2)}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* =========================================================
 *  记账表单（新增 / 编辑）—— 底部弹层
 * ========================================================= */
Sheets = window.Sheets || {};

Sheets.recordForm = (record) => {
  const isEdit = !!record;
  const init = record || {
    type: 'expense',
    amount: '',
    categoryId: '',
    note: '',
    date: Ledger.todayStr(),
    time: Ledger.nowTimeStr(),
    account: '',
  };

  let type = init.type;
  let categoryId = init.categoryId || (type === 'income' ? 'salary' : 'food');
  let amount = init.amount ? String(init.amount) : '';

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="segmented" style="margin-bottom:14px" data-seg>
      <button data-t="expense" class="${type === 'expense' ? 'on' : ''}">支出</button>
      <button data-t="income" class="${type === 'income' ? 'on' : ''}">收入</button>
    </div>
    <div class="amount-display"><span class="cur">¥</span><span data-amt>0.00</span></div>
    <div class="field"><label>输入金额</label>
      <input class="input num" type="number" inputmode="decimal" step="0.01" data-amount
        placeholder="0.00" value="${amount}" style="font-size:19px;font-weight:600">
    </div>
    <div class="field"><label>分类</label><div class="cat-grid" data-cats></div></div>
    <div class="field"><label>备注</label><input class="input" data-note placeholder="写点什么…" value="${UI.esc(init.note || '')}"></div>
    <div style="display:flex;gap:10px">
      <div class="field flex1"><label>日期</label><input class="input" type="date" data-date value="${init.date}"></div>
      <div class="field flex1"><label>时间</label><input class="input" type="time" data-time value="${init.time || ''}"></div>
    </div>
    <div class="field"><label>账户</label>
      <select class="select" data-account>
        <option value="">不指定</option>
        ${Ledger.Accounts.all().map((a) => `<option value="${a.name}" ${init.account === a.name ? 'selected' : ''}>${a.icon} ${UI.esc(a.name)}</option>`).join('')}
      </select>
    </div>
    ${isEdit ? `<button class="btn btn-danger btn-block mt8" data-del>删除这条记录</button>` : ''}
  `;

  const amtEl = wrap.querySelector('[data-amt]');
  const amtInput = wrap.querySelector('[data-amount]');

  function syncAmt() {
    const v = parseFloat(amount || '0') || 0;
    amtEl.textContent = v.toFixed(2);
    if (amtInput.value !== amount) amtInput.value = amount;
    footBtn.disabled = v <= 0;
  }

  function renderCats() {
    const list = Ledger.Categories.list(type);
    const box = wrap.querySelector('[data-cats]');
    if (!list.find((c) => c.id === categoryId)) categoryId = list[list.length - 1].id;
    box.innerHTML = list.map((c) => `
      <button class="cat-item ${c.id === categoryId ? 'on' : ''}" data-cid="${c.id}">
        <span class="ci" style="background:${c.color}1A">${c.icon || Icons.get('tag', 17)}</span>
        <span class="cn">${UI.esc(c.name)}</span>
      </button>`).join('');
    box.querySelectorAll('.cat-item').forEach((el) => {
      el.onclick = () => { categoryId = el.dataset.cid; renderCats(); };
    });
  }
  renderCats();

  wrap.querySelectorAll('[data-seg] button').forEach((b) => {
    b.onclick = () => {
      type = b.dataset.t;
      wrap.querySelectorAll('[data-seg] button').forEach((x) => x.classList.toggle('on', x === b));
      renderCats();
    };
  });

  amtInput.oninput = () => { amount = amtInput.value; syncAmt(); };

  // 底部按钮
  const footBtn = document.createElement('button');
  footBtn.className = 'btn btn-primary btn-block';
  footBtn.textContent = isEdit ? '保存修改' : '保存';
  const foot = document.createElement('div');
  foot.style.cssText = 'display:flex;gap:10px;width:100%';
  foot.appendChild(footBtn);

  const sh = UI.sheet({
    title: isEdit ? '编辑记录' : '记一笔',
    body: wrap,
    foot,
    onMount: ({ root, close }) => {
      syncAmt();
      footBtn.onclick = () => {
        const v = parseFloat(amount);
        if (!v || v <= 0) return UI.toast('请输入有效金额');
        const data = {
          type,
          amount: v,
          categoryId,
          note: wrap.querySelector('[data-note]').value.trim(),
          date: wrap.querySelector('[data-date]').value || Ledger.todayStr(),
          time: wrap.querySelector('[data-time]').value || Ledger.nowTimeStr(),
          account: wrap.querySelector('[data-account]').value,
        };
        if (isEdit) { Ledger.Records.update(record.id, data); UI.toast('已保存'); }
        else { Ledger.Records.add({ ...data, source: 'manual' }); UI.toast('记录成功 🎉'); }
        close();
        App.refresh();
      };
      const delBtn = wrap.querySelector('[data-del]');
      if (delBtn) {
        delBtn.onclick = async () => {
          if (await UI.confirm('删除后无法恢复，确定删除这条记录吗？', { danger: true, okText: '删除' })) {
            Ledger.Records.remove(record.id);
            close();
            App.refresh();
            UI.toast('已删除');
          }
        };
      }
    },
  });
};

Sheets.recordDetail = (id) => {
  const r = Ledger.Records.all().find((x) => x.id === id);
  if (r) Sheets.recordForm(r);
};

/* =========================================================
 *  统计页
 * ========================================================= */
Pages.stats = (root, params = {}) => {
  const tab = params.tab || 'chart';
  const bookId = Ledger.db().currentBookId;
  root.innerHTML = `
    <div class="topbar">
      <div class="segmented" style="flex:1;max-width:300px;margin:0 auto">
        <button data-tab="chart" class="${tab === 'chart' ? 'on' : ''}">统计图表</button>
        <button data-tab="calendar" class="${tab === 'calendar' ? 'on' : ''}">收支日历</button>
      </div>
    </div>
    <div id="statsBody"></div>
  `;
  root.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => App.go('stats', { tab: b.dataset.tab });
  });
  const body = root.querySelector('#statsBody');
  if (tab === 'chart') renderChartTab(body, bookId);
  else renderCalendarTab(body, bookId);
};

function renderChartTab(root, bookId) {
  const mode = App.state.statMode; // month | year | custom
  const month = App.state.month;
  const year = month.slice(0, 4);
  const isD = App.state.isDesktop;

  let start, end, label;
  if (mode === 'month') {
    const r = Ledger.monthRange(month);
    start = r.start; end = r.end; label = month.replace('-', '年') + '月';
  } else if (mode === 'year') {
    start = `${year}-01-01`; end = `${year}-12-31`; label = year + '年';
  } else {
    start = App.state.customStart; end = App.state.customEnd;
    label = `${start} ~ ${end}`;
  }

  const sum = Ledger.Records.sum({ bookId, start, end });
  const cats = Ledger.Records.byCategory({ bookId, start, end, type: 'expense' });
  const days = Ledger.Records.byDay({ bookId, start, end });

  // 头部控制条
  const headHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 16px 14px;${isD ? 'padding-left:0;padding-right:0' : ''}">
      <button class="book-switch" data-act="switchbook" style="margin:0;max-width:none;flex:0 1 auto;padding:8px 15px;font-size:13.5px;min-width:0">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(Ledger.Books.current().name)}</span>
        <span class="caret">▼</span>
      </button>
      <div class="segmented" style="flex:0 0 auto;width:182px">
        <button data-m="month" class="${mode === 'month' ? 'on' : ''}">月</button>
        <button data-m="year" class="${mode === 'year' ? 'on' : ''}">年</button>
        <button data-m="custom" class="${mode === 'custom' ? 'on' : ''}" style="padding-left:7px;padding-right:7px">自定义</button>
      </div>
    </div>`;

  const navHtml = mode !== 'custom' ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:0 16px 14px;${isD ? 'padding-left:0;padding-right:0' : ''}">
      <button class="icon-btn" data-nav="-1">‹</button>
      <span style="font-size:15.5px;font-weight:650;min-width:130px;text-align:center">${label}</span>
      <button class="icon-btn" data-nav="1">›</button>
    </div>` : `
    <div style="display:flex;gap:10px;padding:0 16px 14px;${isD ? 'padding-left:0;padding-right:0' : ''}">
      <input class="input flex1" type="date" data-cs value="${App.state.customStart}">
      <input class="input flex1" type="date" data-ce value="${App.state.customEnd}">
    </div>`;

  const pillsHtml = `
    <div class="stat-inline">
      <div class="stat-pill"><div class="k">支出</div><div class="v" style="color:var(--expense)">¥${sum.expense.toFixed(2)}</div></div>
      <div class="stat-pill"><div class="k">收入</div><div class="v" style="color:var(--income)">¥${sum.income.toFixed(2)}</div></div>
      <div class="stat-pill"><div class="k">结余</div><div class="v">¥${sum.balance.toFixed(2)}</div></div>
    </div>`;

  const donutHtml = cats.length ? `
    <div class="sec-head"><h3>支出构成</h3></div>
    <div class="card card-pad chart-box">
      <div class="donut-wrap">
        ${Charts.donut(cats.map((c) => ({ label: c.category.name, value: c.amount, color: c.category.color })), sum.expense)}
        <div class="donut-legend">
          ${cats.slice(0, 7).map((c) => `
            <div class="legend-item">
              <span class="dot" style="background:${c.category.color}"></span>
              <span class="nm">${UI.esc(c.category.name)}</span>
              <span class="vl">¥${c.amount.toFixed(0)}</span>
              <span class="pc">${sum.expense ? ((c.amount / sum.expense) * 100).toFixed(1) : 0}%</span>
            </div>`).join('')}
        </div>
      </div>
    </div>` : '';

  const rankHtml = cats.length ? `
    <div class="sec-head"><h3>分类排行</h3></div>
    <div class="card card-pad">
      ${cats.map((c) => {
        const max = cats[0].amount || 1;
        return `
        <div class="bar-row">
          <span class="bn">${c.category.icon}${UI.esc(c.category.name)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(c.amount / max) * 100}%;background:${c.category.color}"></span></span>
          <span class="bv">¥${c.amount.toFixed(2)}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  const trendHtml = days.length ? `
    <div class="sec-head"><h3>收支趋势</h3></div>
    <div class="card card-pad chart-box">
      ${Charts.line(days, mode)}
    </div>` : '';

  const emptyHtml = !cats.length ? `
    <div class="empty">
      <span class="emo">${Icons.get('chart', 38, 1.4)}</span>
      <div class="t1">这个时间段没有数据</div>
      <div class="t2">换个时间范围，或先去记几笔</div>
    </div>` : '';

  root.innerHTML = isD ? `
    ${headHtml}
    ${navHtml}
    ${emptyHtml}
    ${cats.length ? `
      <div class="stats-cols">
        <div>
          ${pillsHtml.replace('class="stat-inline"', 'class="stat-inline" style="padding-left:0;padding-right:0"')}
          ${donutHtml}
        </div>
        <div>
          ${rankHtml}
          ${trendHtml}
        </div>
      </div>` : ''}
  ` : `
    ${headHtml}
    ${navHtml}
    ${pillsHtml}
    ${donutHtml}
    ${rankHtml}
    ${trendHtml}
    ${emptyHtml}
  `;

  bindChartEvents(root);
}

function bindChartEvents(root) {
  const sw = root.querySelector('[data-act="switchbook"]');
  if (sw) sw.onclick = () => Sheets.bookSwitch();
  root.querySelectorAll('[data-m]').forEach((b) => {
    b.onclick = () => { App.state.statMode = b.dataset.m; App.refresh(); };
  });
  root.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => App.shiftMonth(Number(b.dataset.nav));
  });
  const cs = root.querySelector('[data-cs]'), ce = root.querySelector('[data-ce]');
  if (cs) cs.onchange = () => { App.state.customStart = cs.value; App.refresh(); };
  if (ce) ce.onchange = () => { App.state.customEnd = ce.value; App.refresh(); };
}

function renderCalendarTab(root, bookId) {
  const month = App.state.month;
  const { start, end } = Ledger.monthRange(month);
  const sum = Ledger.Records.sum({ bookId, start, end });
  const days = Ledger.Records.byDay({ bookId, start, end });
  const dayMap = {};
  days.forEach((d) => { dayMap[d.date] = d; });

  const [y, m] = month.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  const cells = [];
  // 前置空白
  for (let i = 0; i < firstDay; i++) {
    const d = new Date(y, m - 1, 1 - (firstDay - i));
    cells.push({ date: Ledger.todayStr(d), day: d.getDate(), other: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: `${y}-${Ledger.pad2(m)}-${Ledger.pad2(i)}`, day: i, other: false });
  }
  while (cells.length % 7 !== 0) {
    const last = new Date(y, m - 1, daysInMonth + (cells.length - firstDay - daysInMonth) + 1);
    cells.push({ date: Ledger.todayStr(last), day: last.getDate(), other: true });
  }

  const headHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 16px 14px;${App.state.isDesktop ? 'padding-left:0;padding-right:0' : ''}">
      <button class="book-switch" data-act="switchbook" style="margin:0;max-width:none;flex:0 1 auto;padding:8px 15px;font-size:13.5px;min-width:0">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(Ledger.Books.current().name)}</span>
        <span class="caret">▼</span>
      </button>
      <div class="month-nav">
        <button data-nav="-1" style="width:32px;height:32px">‹</button>
        <span style="font-size:15.5px;font-weight:650;white-space:nowrap">${month.replace('-', '年')}月</span>
        <button data-nav="1" style="width:32px;height:32px">›</button>
      </div>
    </div>`;

  const calCard = `
    <div class="card card-pad">
      <div class="cal-grid">
        ${['日', '一', '二', '三', '四', '五', '六'].map((w) => `<div class="cal-wd">${w}</div>`).join('')}
        ${cells.map((c) => {
          const info = dayMap[c.date];
          const isToday = c.date === Ledger.todayStr();
          const cls = ['cal-cell'];
          if (c.other) cls.push('other');
          if (isToday) cls.push('today');
          if (info && info.expense > 0) cls.push('has-exp');
          return `
            <div class="${cls.join(' ')}" data-date="${c.date}">
              <span class="cd">${c.other && isToday ? '今' : c.day}</span>
              ${info && !c.other ? `<span class="cdot">
                ${info.expense ? `<i style="background:var(--expense)"></i>` : ''}
                ${info.income ? `<i style="background:var(--income)"></i>` : ''}
              </span>` : ''}
            </div>`;
        }).join('')}
      </div>
      <div class="cal-sum">
        <div><div class="k">月收入</div><div class="v" style="color:var(--income)">¥${sum.income.toFixed(2)}</div></div>
        <div><div class="k">月支出</div><div class="v" style="color:var(--expense)">¥${sum.expense.toFixed(2)}</div></div>
        <div><div class="k">月结余</div><div class="v">¥${sum.balance.toFixed(2)}</div></div>
      </div>
    </div>`;

  const spendDays = days.filter((d) => d.expense > 0);
  const daysCard = spendDays.length ? `
    <div class="sec-head"><h3>本月有支出的日子</h3></div>
    <div class="card card-pad">
      ${spendDays.map((d) => {
        const max = Math.max(...days.map((x) => x.expense)) || 1;
        return `
        <div class="bar-row">
          <span class="bn">${Ledger.fmtDateCN(d.date)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(d.expense / max) * 100}%;background:var(--expense)"></span></span>
          <span class="bv">¥${d.expense.toFixed(2)}</span>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="empty"><span class="emo">${Icons.get('calendar', 38, 1.4)}</span><div class="t1">本月还没有支出记录</div></div>`;

  root.innerHTML = App.state.isDesktop ? `
    ${headHtml}
    <div class="stats-cols">
      <div>${calCard}</div>
      <div>${daysCard}</div>
    </div>` : `${headHtml}${calCard}${daysCard}`;

  root.querySelector('[data-act="switchbook"]').onclick = () => Sheets.bookSwitch();
  root.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => App.shiftMonth(Number(b.dataset.nav));
  });
  root.querySelectorAll('.cal-cell').forEach((el) => {
    el.onclick = () => Sheets.dayDetail(el.dataset.date);
  });
}

Sheets.dayDetail = (date) => {
  const list = Ledger.Records.query({ bookId: Ledger.db().currentBookId, start: date, end: date });
  const d = new Date(date + 'T00:00:00');
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const wrap = document.createElement('div');
  wrap.innerHTML = list.length ? `
    <div class="rec-group">
      ${list.map((r) => {
        const c = Ledger.Categories.get(r.categoryId) || { icon: '', name: '未分类', color: '#94A3B8' };
        return `
          <div class="rec-item" data-id="${r.id}">
            <div class="rec-ico" style="background:${c.color}1A">${c.icon || Icons.get('tag', 15)}</div>
            <div class="rec-main">
              <div class="rec-name">${UI.esc(c.name)}</div>
              <div class="rec-meta">${r.note ? UI.esc(r.note) : '无备注'}${r.time ? ' · ' + r.time : ''}</div>
            </div>
            <div class="rec-amt ${r.type}">${r.type === 'expense' ? '-' : '+'}${r.amount.toFixed(2)}</div>
          </div>`;
      }).join('')}
    </div>` : `<div class="empty"><span class="emo">${Icons.get('empty', 34, 1.4)}</span><div class="t1">这天没有记录</div></div>`;

  UI.sheet({
    title: `${Ledger.fmtDateCN(date)} ${wd}`,
    body: wrap,
    onMount: ({ root, close }) => {
      wrap.querySelectorAll('.rec-item').forEach((el) => {
        el.onclick = () => { close(); setTimeout(() => Sheets.recordDetail(el.dataset.id), 180); };
      });
    },
  });
};
