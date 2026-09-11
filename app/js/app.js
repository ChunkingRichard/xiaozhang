/**
 * app.js — 应用主入口与路由
 */

const App = {
  state: {
    tab: 'home',
    month: null,
    statMode: 'month',
    customStart: null,
    customEnd: null,
    chat: [],
    shotImages: [],
    shotDrafts: [],
    searchKeyword: '',
    pendingQuestion: '',
    isDesktop: false,
  },
  cleanups: [],

  TABS: [
    { id: 'home', icon: 'home', label: '首页' },
    { id: 'ai', icon: 'chat', label: 'AI 助手' },
    { id: 'stats', icon: 'chart', label: '统计' },
    { id: 'mine', icon: 'user', label: '我的' },
  ],

  init() {
    const now = new Date();
    this.state.month = Ledger.monthStr(now);
    this.state.customStart = Ledger.todayStr(new Date(now.getFullYear(), now.getMonth(), 1));
    this.state.customEnd = Ledger.todayStr(now);

    document.getElementById('app').innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sb-brand">
          <div class="sb-logo">${Icons.get('wallet', 22, 1.8)}</div>
        </div>
        <nav class="sb-nav" id="sbNav">
          ${this.TABS.map((t) => `
            <div class="sb-item" data-tab="${t.id}">
              <span class="si">${Icons.get(t.icon, 20)}</span><span>${t.label}</span>
            </div>`).join('')}
        </nav>
        <div class="sb-foot">
          <button class="sb-add" id="sbAdd" title="记一笔">${Icons.get('plus', 22, 2)}</button>
        </div>
      </aside>

      <div class="main-wrap">
        <div id="pageRoot" class="page"></div>

        <nav class="tabbar" id="tabbar">
          ${this.TABS.map((t, i) => `
            ${i === 2 ? '<div class="tab-fab-wrap"><button class="fab" id="fabAdd">' + Icons.get('plus', 24, 2.2) + '</button></div>' : ''}
            <button class="tab" data-tab="${t.id}"><span class="ti">${Icons.get(t.icon, 22)}</span><span>${t.label}</span></button>
          `).join('')}
        </nav>
      </div>
    `;

    document.querySelectorAll('#tabbar .tab').forEach((b) => {
      b.onclick = () => this.go(b.dataset.tab);
    });
    document.querySelectorAll('#sbNav .sb-item').forEach((b) => {
      b.onclick = () => this.go(b.dataset.tab);
    });
    document.getElementById('fabAdd').onclick = () => Sheets.recordForm();
    document.getElementById('sbAdd').onclick = () => Sheets.recordForm();

    // 响应式：记录是否桌面端，供页面渲染选择布局
    const syncDesktop = () => {
      const isD = window.innerWidth >= 900;
      if (isD !== this.state.isDesktop) {
        this.state.isDesktop = isD;
        this.refresh();
      }
    };
    window.addEventListener('resize', syncDesktop);
    this.state.isDesktop = window.innerWidth >= 900;

    this.go('home');

    if (this.state.pendingQuestion) {
      const q = this.state.pendingQuestion;
      this.state.pendingQuestion = '';
      setTimeout(() => {
        this.go('ai');
        setTimeout(() => {
          const inp = document.getElementById('chatInput');
          if (inp) { inp.value = q; document.getElementById('chatSend').click(); }
        }, 340);
      }, 280);
    }
  },

  go(tab, params) {
    if (tab === 'shot' || tab === 'goals' || tab === 'search') {
      this.state.subPage = tab;
      this.state.subParams = params || {};
    } else {
      this.state.tab = tab;
      this.state.subPage = null;
      this.state.subParams = null;
    }
    this.renderPage(tab, params);
  },

  renderPage(name, params) {
    const root = document.getElementById('pageRoot');
    this.cleanups.forEach((fn) => { try { fn(); } catch (_) {} });
    this.cleanups = [];
    root.scrollTop = 0;

    const isFull = ['shot', 'goals', 'search'].includes(name);

    // 高亮导航（底部 + 侧栏）
    document.querySelectorAll('#tabbar .tab').forEach((b) => {
      b.classList.toggle('on', b.dataset.tab === this.state.tab && !isFull);
    });
    document.querySelectorAll('#sbNav .sb-item').forEach((b) => {
      b.classList.toggle('on', b.dataset.tab === this.state.tab && !isFull);
    });

    document.getElementById('tabbar').style.display = isFull ? 'none' : 'flex';
    root.style.paddingBottom = isFull ? 'calc(24px + env(safe-area-inset-bottom, 0px))' : '';

    // AI 页：填满可视区，内部自行滚动
    if (name === 'ai') {
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.height = this.state.isDesktop ? '100dvh' : '100dvh';
      root.style.overflow = 'hidden';
      root.style.paddingTop = this.state.isDesktop ? '24px' : 'calc(8px + env(safe-area-inset-top, 0px))';
      root.style.paddingBottom = isFull ? '0' : 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))';
    } else {
      root.style.display = '';
      root.style.flexDirection = '';
      root.style.height = '';
      root.style.overflow = '';
      root.style.paddingTop = '';
    }

    const fn = Pages[name];
    if (!fn) { root.innerHTML = `<div class="empty"><span class="emo">${Icons.get('alert', 40, 1.5)}</span><div class="t1">页面建设中</div></div>`; return; }
    fn(root, params || {});
    window.scrollTo(0, 0);
  },

  refresh() {
    this.renderPage(this.state.subPage || this.state.tab, this.state.subParams || {});
  },

  shiftMonth(delta) {
    const [y, m] = this.state.month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.state.month = Ledger.monthStr(d);
    this.refresh();
  },
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  try {
    App.init();
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:#eee;background:#121414;min-height:100vh">
      <h2>初始化失败</h2><pre style="white-space:pre-wrap;color:#E08079">${e.message}\n${e.stack || ''}</pre></div>`;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
