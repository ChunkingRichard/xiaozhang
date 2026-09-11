/**
 * mkshot-recog.js — 模拟上传一张截图并走完识别流程
 */
const fs = require('fs');

// 生成一张假的「微信支付」截图（canvas 绘制）作为测试输入
const makeImg = `
(function(){
  var c = document.createElement('canvas');
  c.width = 750; c.height = 900;
  var g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0,0,750,900);
  g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif';
  g.fillText('微信支付', 40, 80);
  g.font = '28px sans-serif';
  g.fillText('-38.50', 40, 150);
  g.fillText('公司楼下快餐', 40, 200);
  g.fillText('2026-09-10 12:30', 40, 250);
  return c.toDataURL('image/png');
})()
`;

fs.writeFileSync('_a-recog.json', JSON.stringify([
  { eval: "Ledger.Settings.set({apiKey:'sk-test',baseUrl:'http://127.0.0.1:8766/v1',model:'test'})", wait: 300 },
  { eval: "App.go('shot')", wait: 900 },
  {
    eval: `(async function(){
      var url = ${makeImg};
      var blob = await (await fetch(url)).blob();
      var file = new File([blob], 'wechat.png', {type:'image/png'});
      var dt = new DataTransfer();
      dt.items.add(file);
      var inp = document.querySelector('[data-file]');
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', {bubbles:true}));
      return 'uploaded';
    })()`,
    wait: 1500,
  },
  {
    eval: `(function(){
      var btns = Array.from(document.querySelectorAll('button'));
      var b = btns.find(function(x){ return /识别|开始/.test(x.textContent); });
      if (b) { b.click(); return 'clicked:' + b.textContent.trim(); }
      return 'no-button';
    })()`,
    wait: 4000,
  },
]));

// 追加：点击保存并核对落库结果
const acts2 = JSON.parse(fs.readFileSync('_a-recog.json', 'utf8'));
acts2.push({
  eval: `(function(){
    var btns = Array.from(document.querySelectorAll('button'));
    var b = btns.find(function(x){ return /确认入账|保存|记入账本/.test(x.textContent); });
    if (b) { b.click(); return 'saved:' + b.textContent.trim(); }
    return 'no-save:' + btns.map(function(x){return x.textContent.trim();}).slice(0,12).join('/');
  })()`,
  wait: 1500,
});
acts2.push({
  eval: `JSON.stringify({records: Ledger.Records.all().length, expense: Ledger.Records.sum({bookId: Ledger.db().currentBookId}).expense})`,
  wait: 500,
});
fs.writeFileSync('_a-recog2.json', JSON.stringify(acts2));

console.log('written _a-recog.json, _a-recog2.json');
