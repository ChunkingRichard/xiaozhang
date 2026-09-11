/**
 * store.js — 本地数据层
 * 全部数据存储于浏览器 localStorage，不上传任何服务器。
 */

const DB_KEY = 'ledger_db_v1';

const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food', name: '餐饮', icon: '🍚', color: '#FF8A4C' },
    { id: 'drink', name: '饮品', icon: '🧋', color: '#F7B955' },
    { id: 'traffic', name: '交通', icon: '🚇', color: '#5BA8F0' },
    { id: 'shopping', name: '购物', icon: '🛍️', color: '#E8739B' },
    { id: 'daily', name: '日用', icon: '🧴', color: '#7BC48A' },
    { id: 'entertain', name: '娱乐', icon: '🎬', color: '#A78BFA' },
    { id: 'medical', name: '医疗', icon: '💊', color: '#F87171' },
    { id: 'housing', name: '居住', icon: '🏠', color: '#34D399' },
    { id: 'digital', name: '数码', icon: '💻', color: '#60A5FA' },
    { id: 'study', name: '学习', icon: '📚', color: '#FBBF24' },
    { id: 'travel', name: '旅行', icon: '✈️', color: '#38BDF8' },
    { id: 'social', name: '人情', icon: '🎁', color: '#FB7185' },
    { id: 'other_e', name: '其他', icon: '📦', color: '#94A3B8' },
  ],
  income: [
    { id: 'salary', name: '工资', icon: '💰', color: '#10B981' },
    { id: 'bonus', name: '奖金', icon: '🎉', color: '#F59E0B' },
    { id: 'invest', name: '理财', icon: '📈', color: '#3B82F6' },
    { id: 'refund', name: '退款', icon: '↩️', color: '#8B5CF6' },
    { id: 'parttime', name: '兼职', icon: '💼', color: '#06B6D4' },
    { id: 'redpacket', name: '红包', icon: '🧧', color: '#EF4444' },
    { id: 'other_i', name: '其他', icon: '📦', color: '#94A3B8' },
  ],
};

const DEFAULT_DB = () => ({
  version: 1,
  books: [
    {
      id: 'default',
      name: '我的账本',
      icon: '📒',
      startDay: 1,
      createdAt: Date.now(),
    },
  ],
  currentBookId: 'default',
  records: [], // {id, bookId, type:'expense'|'income', amount, categoryId, note, date:'YYYY-MM-DD', time, account, source:'manual'|'ai_screenshot'|'ai_chat', createdAt}
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  budgets: {}, // { 'YYYY-MM': total, 'YYYY-MM::categoryId': amount }
  goals: [], // {id, name, target, saved, deadline, createdAt}
  accounts: [
    { id: 'wechat', name: '微信', icon: '💚' },
    { id: 'alipay', name: '支付宝', icon: '💙' },
    { id: 'bank', name: '银行卡', icon: '🏦' },
    { id: 'cash', name: '现金', icon: '💵' },
  ],
  settings: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    nickname: '',
    monthlyBudget: 0,
    spendDiscipline: 'balanced', // frugal | balanced | relaxed
    theme: 'light',
  },
});

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return DEFAULT_DB();
    const db = JSON.parse(raw);
    // 补全缺失字段
    const base = DEFAULT_DB();
    return { ...base, ...db, settings: { ...base.settings, ...(db.settings || {}) } };
  } catch (e) {
    console.error('读取数据失败，已重置', e);
    return DEFAULT_DB();
  }
}

let _db = null;
function db() {
  if (!_db) _db = loadDB();
  return _db;
}

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(_db));
  } catch (e) {
    console.error('保存失败', e);
    alert('保存失败：本地存储空间可能已满，建议先导出备份。');
  }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------------- 账本 ---------------- */

const Books = {
  all: () => db().books,
  current: () => db().books.find((b) => b.id === db().currentBookId) || db().books[0],
  setCurrent(id) {
    db().currentBookId = id;
    save();
  },
  add({ name, icon = '📒', startDay = 1 }) {
    const book = { id: uid(), name, icon, startDay, createdAt: Date.now() };
    db().books.push(book);
    save();
    return book;
  },
  update(id, patch) {
    const b = db().books.find((x) => x.id === id);
    if (b) { Object.assign(b, patch); save(); }
    return b;
  },
  remove(id) {
    if (db().books.length <= 1) throw new Error('至少保留一个账本');
    db().books = db().books.filter((b) => b.id !== id);
    db().records = db().records.filter((r) => r.bookId !== id);
    if (db().currentBookId === id) db().currentBookId = db().books[0].id;
    save();
  },
};

/* ---------------- 账单记录 ---------------- */

const Records = {
  all: () => db().records,
  byBook(bookId) {
    return db().records.filter((r) => !bookId || r.bookId === bookId);
  },
  query({ bookId, month, start, end, type, categoryId, keyword } = {}) {
    let list = db().records.slice();
    if (bookId) list = list.filter((r) => r.bookId === bookId);
    if (type) list = list.filter((r) => r.type === type);
    if (categoryId) list = list.filter((r) => r.categoryId === categoryId);
    if (month) list = list.filter((r) => r.date.startsWith(month));
    if (start) list = list.filter((r) => r.date >= start);
    if (end) list = list.filter((r) => r.date <= end);
    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter((r) => {
        const c = Categories.get(r.categoryId);
        return (
          (r.note || '').toLowerCase().includes(k) ||
          String(r.amount).includes(k) ||
          (c && c.name.toLowerCase().includes(k))
        );
      });
    }
    return list.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  },
  add(rec) {
    const item = {
      id: uid(),
      bookId: rec.bookId || db().currentBookId,
      type: rec.type || 'expense',
      amount: Number(rec.amount) || 0,
      categoryId: rec.categoryId || 'other_e',
      note: rec.note || '',
      date: rec.date || todayStr(),
      time: rec.time || nowTimeStr(),
      account: rec.account || '',
      source: rec.source || 'manual',
      createdAt: Date.now(),
    };
    db().records.push(item);
    save();
    return item;
  },
  addBatch(arr) {
    return arr.map((r) => Records.add(r));
  },
  update(id, patch) {
    const r = db().records.find((x) => x.id === id);
    if (r) { Object.assign(r, patch); if (patch.amount != null) r.amount = Number(patch.amount); save(); }
    return r;
  },
  remove(id) {
    db().records = db().records.filter((r) => r.id !== id);
    save();
  },
  removeMany(ids) {
    const set = new Set(ids);
    db().records = db().records.filter((r) => !set.has(r.id));
    save();
  },
  /** 区间汇总 */
  sum({ bookId, start, end } = {}) {
    let list = db().records.filter((r) => !bookId || r.bookId === bookId);
    if (start) list = list.filter((r) => r.date >= start);
    if (end) list = list.filter((r) => r.date <= end);
    let income = 0, expense = 0;
    for (const r of list) {
      if (r.type === 'income') income += r.amount;
      else expense += r.amount;
    }
    return { income, expense, balance: income - expense };
  },
  /** 按分类汇总 */
  byCategory({ bookId, start, end, type = 'expense' } = {}) {
    let list = db().records.filter((r) => r.type === type && (!bookId || r.bookId === bookId));
    if (start) list = list.filter((r) => r.date >= start);
    if (end) list = list.filter((r) => r.date <= end);
    const map = {};
    for (const r of list) {
      map[r.categoryId] = (map[r.categoryId] || 0) + r.amount;
    }
    return Object.entries(map)
      .map(([id, amount]) => ({ category: Categories.get(id) || { id, name: id, color: '#999', icon: '' }, amount }))
      .sort((a, b) => b.amount - a.amount);
  },
  /** 按日汇总 */
  byDay({ bookId, start, end } = {}) {
    let list = db().records.filter((r) => !bookId || r.bookId === bookId);
    if (start) list = list.filter((r) => r.date >= start);
    if (end) list = list.filter((r) => r.date <= end);
    const map = {};
    for (const r of list) {
      if (!map[r.date]) map[r.date] = { date: r.date, income: 0, expense: 0 };
      if (r.type === 'income') map[r.date].income += r.amount;
      else map[r.date].expense += r.amount;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  },
};

/* ---------------- 分类 ---------------- */

const Categories = {
  expense: () => db().categories.expense,
  income: () => db().categories.income,
  list: (type) => (type === 'income' ? db().categories.income : db().categories.expense),
  get(id) {
    return (
      db().categories.expense.find((c) => c.id === id) ||
      db().categories.income.find((c) => c.id === id) ||
      null
    );
  },
  add(type, cat) {
    const item = { id: uid(), name: cat.name, icon: cat.icon || '📦', color: cat.color || '#94A3B8' };
    db().categories[type].push(item);
    save();
    return item;
  },
  update(type, id, patch) {
    const c = db().categories[type].find((x) => x.id === id);
    if (c) { Object.assign(c, patch); save(); }
    return c;
  },
  remove(type, id) {
    db().categories[type] = db().categories[type].filter((c) => c.id !== id);
    const fallback = type === 'income' ? 'other_i' : 'other_e';
    db().records.forEach((r) => { if (r.categoryId === id) r.categoryId = fallback; });
    save();
  },
};

/* ---------------- 预算 ---------------- */

const Budgets = {
  getTotal(month) {
    return Number(db().budgets[month] || db().settings.monthlyBudget || 0);
  },
  setTotal(month, amount) {
    db().budgets[month] = Number(amount) || 0;
    save();
  },
  getCategory(month, categoryId) {
    return Number(db().budgets[`${month}::${categoryId}`] || 0);
  },
  setCategory(month, categoryId, amount) {
    db().budgets[`${month}::${categoryId}`] = Number(amount) || 0;
    save();
  },
  allCategories(month) {
    const prefix = `${month}::`;
    const out = {};
    for (const k of Object.keys(db().budgets)) {
      if (k.startsWith(prefix)) out[k.slice(prefix.length)] = db().budgets[k];
    }
    return out;
  },
};

/* ---------------- 目标 ---------------- */

const Goals = {
  all: () => db().goals,
  add({ name, target, saved = 0, deadline }) {
    const g = { id: uid(), name, target: Number(target) || 0, saved: Number(saved) || 0, deadline: deadline || '', createdAt: Date.now() };
    db().goals.push(g);
    save();
    return g;
  },
  update(id, patch) {
    const g = db().goals.find((x) => x.id === id);
    if (g) { Object.assign(g, patch); save(); }
    return g;
  },
  remove(id) {
    db().goals = db().goals.filter((g) => g.id !== id);
    save();
  },
};

/* ---------------- 账户 / 设置 ---------------- */

const Accounts = {
  all: () => db().accounts,
  add(name, icon = '💳') {
    const a = { id: uid(), name, icon };
    db().accounts.push(a);
    save();
    return a;
  },
  remove(id) {
    db().accounts = db().accounts.filter((a) => a.id !== id);
    save();
  },
};

const Settings = {
  get: () => db().settings,
  set(patch) {
    Object.assign(db().settings, patch);
    save();
    return db().settings;
  },
};

/* ---------------- 工具函数 ---------------- */

function pad2(n) { return String(n).padStart(2, '0'); }
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nowTimeStr(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const start = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { start, end };
}
function fmtMoney(n) {
  return '¥' + (Number(n) || 0).toFixed(2);
}
function fmtDateCN(s) {
  const [y, m, d] = s.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

/* ---------------- 导入导出 ---------------- */

const DataIO = {
  export() {
    return JSON.stringify(db(), null, 2);
  },
  exportFile() {
    const blob = new Blob([DataIO.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `记账备份_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  import(jsonText) {
    const data = JSON.parse(jsonText);
    if (!data.records) throw new Error('文件格式不正确');
    _db = { ...DEFAULT_DB(), ...data, settings: { ...DEFAULT_DB().settings, ...(data.settings || {}) } };
    save();
  },
  clear() {
    _db = DEFAULT_DB();
    save();
  },
  /** 导出为 CSV，方便在 Excel 打开 */
  exportCSV(bookId) {
    const list = Records.query({ bookId });
    const header = '日期,时间,类型,分类,金额,备注,账户,来源';
    const rows = list.map((r) => {
      const c = Categories.get(r.categoryId);
      const typeCn = r.type === 'income' ? '收入' : '支出';
      const srcCn = { manual: '手动', ai_screenshot: 'AI截图', ai_chat: 'AI对话' }[r.source] || r.source;
      return [r.date, r.time, typeCn, c ? c.name : '', r.amount, (r.note || '').replace(/,/g, '，'), r.account || '', srcCn].join(',');
    });
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `账单明细_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

window.Ledger = {
  db, save,
  Books, Records, Categories, Budgets, Goals, Accounts, Settings, DataIO,
  todayStr, nowTimeStr, monthStr, monthRange, fmtMoney, fmtDateCN, pad2, uid,
  DEFAULT_CATEGORIES,
};
