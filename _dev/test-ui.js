/**
 * test-ui.js — 用轻量 DOM 模拟验证页面渲染无运行时错误
 * 不依赖浏览器，检查所有页面的 render 函数能跑通、产出合理 HTML
 */

const fs = require('fs');
const path = require('path');

/* ---------- 极简 DOM 模拟 ---------- */
class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = {};
    this.style = new Proxy({}, { set: (t, k, v) => { t[k] = v; return true; }, get: (t, k) => t[k] || '' });
    this.dataset = {};
    this._html = '';
    this._text = '';
    this.classList = {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    };
    this.value = '';
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  querySelector(sel) { return new El(); }
  querySelectorAll() { return []; }
  addEventListener() {}
  removeEventListener() {}
  click() {}
  focus() {}
  scrollIntoView() {}
  closest() { return null; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; }
  insertAdjacentHTML() {}
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
}

const elCache = {};
const sandboxDocument = {
  body: new El('body'),
  documentElement: new El('html'),
  createElement: (t) => new El(t),
  getElementById: (id) => { if (!elCache[id]) { elCache[id] = new El(); elCache[id].id = id; } return elCache[id]; },
  querySelector: () => new El(),
  querySelectorAll: () => [],
  addEventListener: () => {},
};

/* ---------- 用 vm 沙箱模拟浏览器全局环境 ---------- */
const vm = require('vm');
const store = {};
const sandbox = {
  console,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  setTimeout: (fn) => { if (typeof fn === 'function') { try { fn(); } catch (_) {} } return 0; },
  clearTimeout: () => {},
  URL: {
    createObjectURL: () => 'blob:x',
    revokeObjectURL: () => {},
  },
  Blob: class { constructor() {} },
  Image: class { constructor() { this.onload = null; } },
  FileReader: class { readAsDataURL() {} readAsText() {} },
  TextDecoder: require('util').TextDecoder,
  fetch: async () => { throw new Error('网络在测试环境不可用'); },
  alert: () => {},
  prompt: () => null,
  confirm: () => true,
  addEventListener: () => {},
  navigator: {},
  document: sandboxDocument,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const files = ['icons.js', 'store.js', 'ui.js', 'ai.js', 'charts.js', 'sheets.js', 'pages-home.js', 'pages-shot.js', 'pages-ai.js', 'pages-mine.js', 'app.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch (e) {
    console.error(`✗ 加载 ${f} 失败:`, e.message);
    process.exit(1);
  }
}
console.log('✓ 全部模块加载成功\n');
// 将模块内 const/let 声明暴露到沙箱
vm.runInContext('globalThis.__expose = { Pages, Sheets, App, AI, UI, Charts, Mascot, Ledger, Icons };', sandbox);
Object.assign(sandbox, sandbox.__expose);
console.log('  已导出模块:', Object.keys(sandbox.__expose).join(', '));


let pass = 0, fail = 0;
function ok(cond, msg, extra = '') {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.log('  ✗ FAIL:', msg, extra); }
}

/* ---------- 准备测试数据 ---------- */
const L = sandbox.Ledger;
// 初始化 App 的 state（真实环境由 App.init 完成）
sandbox.App.state.month = L.monthStr();
sandbox.App.state.customStart = L.todayStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
sandbox.App.state.customEnd = L.todayStr();
const today = L.todayStr();
const ym = L.monthStr();
L.Records.addBatch([
  { type: 'expense', amount: 28.5, categoryId: 'drink', note: '瑞幸咖啡', date: today, time: '09:30' },
  { type: 'expense', amount: 45, categoryId: 'food', note: '公司楼下午饭', date: today, time: '12:15' },
  { type: 'expense', amount: 3200, categoryId: 'housing', note: '房租', date: `${ym}-01` },
  { type: 'income', amount: 15000, categoryId: 'salary', note: '工资', date: `${ym}-05` },
  { type: 'expense', amount: 128, categoryId: 'traffic', note: '打车', date: `${ym}-08`, source: 'ai_screenshot' },
]);
L.Budgets.setTotal(ym, 6000);
L.Goals.add({ name: '年底存 2 万', target: 20000, saved: 6500, deadline: '2026-12-31' });
console.log('✓ 测试数据准备完成（5 条记录）\n');

/* ---------- 逐页渲染测试 ---------- */
function testPage(name, fn, params) {
  console.log(`=== ${name} ===`);
  const root = new El();
  try {
    fn(root, params || {});
    const html = root.innerHTML;
    ok(html.length > 50, `${name} 渲染出内容`, `长度=${html.length}`);
    ok(!html.includes('undefined'), `${name} 无 undefined 泄漏`);
    ok(!html.includes('NaN'), `${name} 无 NaN 泄漏`);
    ok(!/\[object Object\]/.test(html), `${name} 无对象字符串化`);
    return html;
  } catch (e) {
    fail++;
    console.log(`  ✗ 渲染异常: ${e.message}`);
    console.log(e.stack.split('\n').slice(0, 4).join('\n'));
    return '';
  }
}

const homeHtml = testPage('首页', sandbox.Pages.home);
ok(homeHtml.includes('本月支出'), '首页含本月支出');
ok(homeHtml.includes('瑞幸咖啡'), '首页显示记录');
ok(homeHtml.includes('AI 消费洞察'), '首页含 AI 洞察入口');
ok(homeHtml.includes('6000.00'), '首页显示预算');
ok(homeHtml.includes('badge-src'), '首页标记 AI 来源记录');

sandbox.Pages.stats = sandbox.Pages.stats;
testPage('统计图表', sandbox.Pages.stats, { tab: 'chart' });
testPage('收支日历', sandbox.Pages.stats, { tab: 'calendar' });
testPage('截图记账', sandbox.Pages.shot);
testPage('AI 助手', sandbox.Pages.ai);
testPage('我的', sandbox.Pages.mine);
testPage('省钱目标', sandbox.Pages.goals);
testPage('搜索', sandbox.Pages.search);

/* ---------- 图表测试 ---------- */
console.log('\n=== 图表 ===');
try {
  const donut = sandbox.Charts.donut([
    { label: '餐饮', value: 100, color: '#FF8A4C' },
    { label: '交通', value: 50, color: '#5BA8F0' },
  ], 150);
  ok(donut.includes('<svg'), '环形图生成 SVG');
  ok(donut.includes('stroke-dasharray'), '环形图含扇形');
  ok(!donut.includes('NaN'), '环形图无 NaN');

  const days = L.Records.byDay({ start: `${ym}-01`, end: `${ym}-30` });
  const line = sandbox.Charts.line(days, 'month');
  ok(line.includes('<svg'), '折线图生成 SVG');
  ok(!line.includes('NaN'), '折线图无 NaN');
  ok(line.includes('path'), '折线图含路径');

  const emptyLine = sandbox.Charts.line([], 'month');
  ok(emptyLine.includes('暂无数据'), '空数据折线图有兜底');

  const yearLine = sandbox.Charts.line(days, 'year');
  ok(yearLine.includes('<svg'), '年模式折线图正常');
} catch (e) {
  fail++;
  console.log('  ✗ 图表异常:', e.message);
}

/* ---------- 吉祥物 ---------- */
console.log('\n=== 吉祥物 ===');
const big = sandbox.Mascot.big();
const tiny = sandbox.Mascot.tiny();
ok(big.includes('<svg') && big.includes('linearGradient'), '大吉祥物 SVG 正常');
ok(tiny.includes('<svg'), '小吉祥物 SVG 正常');

/* ---------- AI 数据上下文 ---------- */
console.log('\n=== AI 数据上下文 ===');
try {
  const ctx = sandbox.AI.buildDataContext({ month: ym });
  ok(ctx.includes('本月支出'), '上下文含支出');
  ok(ctx.includes('房租'), '上下文含分类明细');
  ok(ctx.includes('年底存 2 万'), '上下文含省钱目标');
  ok(ctx.includes('近三个月收支趋势'), '上下文含趋势');
  ok(ctx.includes('近期明细'), '上下文含明细');
  ok(!ctx.includes('undefined'), '上下文无 undefined');
  ok(ctx.length > 300, `上下文内容充实（${ctx.length} 字符）`);
  // 隐私检查：不应包含 API Key
  ok(!ctx.includes('sk-'), '上下文不含 API Key');
  console.log('\n--- 上下文预览（前 700 字）---');
  console.log(ctx.slice(0, 700));
  console.log('...\n');
} catch (e) {
  fail++;
  console.log('  ✗ 上下文异常:', e.message);
}

/* ---------- AI JSON 解析 ---------- */
console.log('=== AI 返回解析 ===');
const cases = [
  ['{"results":[]}', '标准 JSON'],
  ['```json\n{"results":[]}\n```', '带代码块包裹'],
  ['好的，结果如下：\n{"results":[{"imageIndex":1,"items":[]}]}\n以上。', '带前后文字'],
];
for (const [input, desc] of cases) {
  try {
    const r = sandbox.AI.parseJSON(input);
    ok(Array.isArray(r.results), `解析成功：${desc}`);
  } catch (e) {
    fail++; console.log(`  ✗ 解析失败：${desc} — ${e.message}`);
  }
}

/* ---------- 提示词检查 ---------- */
console.log('\n=== 隐私与安全 ===');
const aiSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'ai.js'), 'utf8');
ok(aiSrc.includes('不得编造'), '提示词含防编造约束');
ok(aiSrc.includes('过度节省'), '提示词含反向平衡（防过度省钱）');
ok(aiSrc.includes('user'), '提示词含用户消费风格注入');

const swSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'store.js'), 'utf8');
ok(!/https?:\/\/(?!api)/.test(swSrc.replace(/https:\/\/api\.openai\.com/g, '')), '数据层无外部上报地址');

console.log(`\n${'='.repeat(46)}`);
console.log(`结果：${pass} 通过, ${fail} 失败`);
console.log('='.repeat(46));
process.exit(fail ? 1 : 0);
