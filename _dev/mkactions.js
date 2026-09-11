/**
 * mkactions.js — 生成 shot.js 的 actions JSON
 * 用法:
 *   node mkactions.js <out.json> [页面id ...]          追加 App.go('页面')
 *   node mkactions.js <out.json> --raw <js表达式>      追加自定义表达式
 *   node mkactions.js <out.json> --noseed --raw "..."   不注入种子数据
 */
const fs = require('fs');
const seed = require('./seed.js');

const out = process.argv[2] || '_actions.json';
const rest = process.argv.slice(3);
const noSeed = rest.includes('--noseed');
const acts = [];
if (!noSeed) acts.push({ eval: seed, wait: 900 });

for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === '--noseed') continue;
  if (a === '--raw') { acts.push({ eval: rest[++i], wait: 1000 }); continue; }
  acts.push({ eval: `App.go('${a}')`, wait: 1000 });
}

fs.writeFileSync(out, JSON.stringify(acts));
console.log('wrote', out, acts.length, 'actions');
