/**
 * mklive.js — 生成 AI 联调动作序列
 */
const fs = require('fs');
const seed = require('./seed.js');

fs.writeFileSync('_a-chat.json', JSON.stringify([
  { eval: seed, wait: 700 },
  { eval: "Ledger.Settings.set({apiKey:'sk-test',baseUrl:'http://127.0.0.1:8766/v1',model:'test'}); App.go('ai')", wait: 900 },
  { eval: "document.getElementById('chatInput').value='这个月钱花哪儿了？'; document.getElementById('chatSend').click()", wait: 3000 },
]));

fs.writeFileSync('_a-insight.json', JSON.stringify([
  { eval: seed, wait: 700 },
  { eval: "Ledger.Settings.set({apiKey:'sk-test',baseUrl:'http://127.0.0.1:8766/v1',model:'test'}); App.refresh()", wait: 400 },
  { eval: "document.querySelector('[data-act=\"insight-refresh\"]').click()", wait: 3000 },
]));

console.log('written _a-chat.json, _a-insight.json');
