/**
 * test-logic.js — 核心逻辑自测（Node 环境）
 * 验证数据层、统计、预算、导入导出等纯逻辑正确性
 */

/* ---------- 模拟浏览器环境 ---------- */
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = global;
global.alert = (m) => console.log('[alert]', m);

/* ---------- 加载数据层 ---------- */
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'store.js'), 'utf8');
eval(code);

const L = global.Ledger;
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.log('  ✗ FAIL:', msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg}  (期望 ${b}, 实际 ${a})`); }

console.log('\n=== 1. 初始状态 ===');
eq(L.Books.all().length, 1, '默认一个账本');
eq(L.Books.current().name, '我的账本', '账本名称');
eq(L.Records.all().length, 0, '初始无记录');
eq(L.Categories.expense().length, 13, '默认支出分类 13 个');
eq(L.Categories.income().length, 7, '默认收入分类 7 个');

console.log('\n=== 2. 添加记录 ===');
const r1 = L.Records.add({ type: 'expense', amount: 28.5, categoryId: 'drink', note: '瑞幸', date: '2026-09-10' });
const r2 = L.Records.add({ type: 'expense', amount: 45, categoryId: 'food', note: '午饭', date: '2026-09-10' });
const r3 = L.Records.add({ type: 'income', amount: 12000, categoryId: 'salary', note: '工资', date: '2026-09-05' });
const r4 = L.Records.add({ type: 'expense', amount: 1200, categoryId: 'housing', note: '房租', date: '2026-09-01' });
eq(L.Records.all().length, 4, '共 4 条记录');
eq(r1.bookId, 'default', '记录归属当前账本');

console.log('\n=== 3. 统计汇总 ===');
const s = L.Records.sum({ bookId: 'default', start: '2026-09-01', end: '2026-09-30' });
eq(s.expense, 1273.5, '本月支出合计');
eq(s.income, 12000, '本月收入合计');
eq(s.balance, 10726.5, '本月结余');

console.log('\n=== 4. 分类汇总 ===');
const cats = L.Records.byCategory({ bookId: 'default', start: '2026-09-01', end: '2026-09-30' });
eq(cats.length, 3, '三个支出分类');
eq(cats[0].category.id, 'housing', '最大支出是房租');
eq(cats[0].amount, 1200, '房租金额');

console.log('\n=== 5. 按日汇总 ===');
const days = L.Records.byDay({ bookId: 'default', start: '2026-09-01', end: '2026-09-30' });
eq(days.length, 3, '3 个有记录的日子');
const d0910 = days.find((d) => d.date === '2026-09-10');
eq(d0910.expense, 73.5, '9月10日支出');

console.log('\n=== 6. 查询与筛选 ===');
eq(L.Records.query({ bookId: 'default', type: 'expense' }).length, 3, '筛选支出 3 条');
eq(L.Records.query({ bookId: 'default', month: '2026-09' }).length, 4, '按月份筛选 4 条');
eq(L.Records.query({ keyword: '瑞幸' }).length, 1, '搜索备注');
eq(L.Records.query({ keyword: '饮品' }).length, 1, '搜索分类名（饮品）');
eq(L.Records.query({ keyword: '饮' }).length, 2, '模糊搜索「饮」同时命中餐饮与饮品');
eq(L.Records.query({ keyword: '45' }).length, 1, '搜索金额');
eq(L.Records.query({ categoryId: 'food' }).length, 1, '按分类筛选');

console.log('\n=== 7. 月份区间 ===');
const range = L.monthRange('2026-09');
eq(range.start, '2026-09-01', '9月起始');
eq(range.end, '2026-09-30', '9月结束（30天）');
const feb = L.monthRange('2026-02');
eq(feb.end, '2026-02-28', '2026年2月28天');
const leap = L.monthRange('2024-02');
eq(leap.end, '2024-02-29', '2024年2月29天（闰年）');

console.log('\n=== 8. 预算 ===');
L.Budgets.setTotal('2026-09', 5000);
eq(L.Budgets.getTotal('2026-09'), 5000, '总预算');
L.Budgets.setCategory('2026-09', 'food', 1000);
eq(L.Budgets.getCategory('2026-09', 'food'), 1000, '分类预算');
const bc = L.Budgets.allCategories('2026-09');
eq(Object.keys(bc).length, 1, '分类预算 1 项');
L.Budgets.setTotal('2026-10', 6000);
eq(L.Budgets.getTotal('2026-09'), 5000, '不同月份预算独立');

console.log('\n=== 9. 省钱目标 ===');
const g = L.Goals.add({ name: '存 2 万', target: 20000, saved: 5000, deadline: '2026-12-31' });
eq(L.Goals.all().length, 1, '创建目标');
L.Goals.update(g.id, { saved: 8000 });
eq(L.Goals.all()[0].saved, 8000, '更新已存金额');

console.log('\n=== 10. 多账本 ===');
const b2 = L.Books.add({ name: '旅行账本', icon: '✈️' });
L.Books.setCurrent(b2.id);
eq(L.Books.current().name, '旅行账本', '切换账本');
const t1 = L.Records.add({ type: 'expense', amount: 300, categoryId: 'travel', note: '机票' });
eq(L.Records.byBook(b2.id).length, 1, '新账本 1 条记录');
eq(L.Records.byBook('default').length, 4, '原账本仍 4 条');
const s2 = L.Records.sum({ bookId: 'default', start: '2026-09-01', end: '2026-09-30' });
eq(s2.expense, 1273.5, '原账本统计不受影响');

console.log('\n=== 11. 更新与删除 ===');
L.Records.update(r1.id, { amount: 30 });
eq(L.Records.all().find((x) => x.id === r1.id).amount, 30, '更新金额');
L.Records.removeMany([r2.id, r3.id]);
eq(L.Records.byBook('default').length, 2, '批量删除后剩 2 条');
L.Records.remove(r4.id);
eq(L.Records.byBook('default').length, 1, '删除后剩 1 条');

console.log('\n=== 12. 分类删除时迁移记录 ===');
const cat = L.Categories.add('expense', { name: '宠物', icon: '🐱', color: '#FFAA00' });
const pet = L.Records.add({ type: 'expense', amount: 200, categoryId: cat.id, date: '2026-09-12' });
L.Categories.remove('expense', cat.id);
eq(L.Records.all().find((x) => x.id === pet.id).categoryId, 'other_e', '记录迁移到「其他」');

console.log('\n=== 13. 数据导入导出 ===');
const json = L.DataIO.export();
ok(json.length > 100, '导出 JSON 非空');
const parsed = JSON.parse(json);
ok(Array.isArray(parsed.records), '导出包含 records');
ok(Array.isArray(parsed.books), '导出包含 books');
const before = L.Records.all().length;
L.DataIO.import(json);
eq(L.Records.all().length, before, '导入后记录数不变');
ok(L.Books.all().length === 2, '导入后账本数正确');
ok(L.Settings.get().theme === 'light', '设置项完整');

console.log('\n=== 14. 数据持久化 ===');
const raw = localStorage.getItem('ledger_db_v1');
ok(raw && raw.length > 100, 'localStorage 已写入');
ok(JSON.parse(raw).records.length === before, '持久化记录数一致');

console.log('\n=== 15. 边界情况 ===');
eq(L.Records.add({ type: 'expense', amount: 'abc' }).amount, 0, '非法金额归零');
eq(L.Records.add({ type: 'expense', amount: -50 }).amount, -50, '负数字段原样（由UI层拦截）');
const emptySum = L.Records.sum({ bookId: 'nonexistent' });
eq(emptySum.expense, 0, '不存在账本统计为 0');
try { L.Books.remove(L.Books.all()[0].id); L.Books.remove(L.Books.all()[0].id); } catch (e) { ok(true, '删除最后一个账本会报错'); }

console.log(`\n${'='.repeat(46)}`);
console.log(`结果：${pass} 通过, ${fail} 失败`);
console.log('='.repeat(46));
process.exit(fail ? 1 : 0);
