/**
 * mock-ai.js — 模拟 OpenAI 兼容接口，用于端到端验证 AI 链路
 * 监听 8766 端口，返回符合预期的识别结果
 */
const http = require('http');

const RECOGNIZE_RESULT = {
  results: [
    {
      imageIndex: 1,
      items: [
        { type: 'expense', amount: 28.5, date: '2026-09-10', time: '09:32', merchant: '瑞幸咖啡', categoryId: 'drink', confidence: 0.97, rawText: '微信支付 -28.50 瑞幸咖啡' },
        { type: 'expense', amount: 156, date: '2026-09-09', time: '12:05', merchant: '海底捞火锅', categoryId: 'food', confidence: 0.93, rawText: '支付宝 -156.00 海底捞' },
        { type: 'expense', amount: 12, date: '2026-09-09', time: '08:15', merchant: '地铁', categoryId: 'traffic', confidence: 0.62, rawText: '地铁 -12.00' },
      ],
    },
  ],
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let parsed = {};
    try { parsed = JSON.parse(body); } catch (_) {}

    const isVision = JSON.stringify(parsed).includes('image_url');

    // 流式请求模拟
    if (parsed.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const text = '你这个月支出 **¥4569.50**，其中居住类占了 **70%**（¥3200 是房租）。\n\n值得注意的两点：\n\n1. **餐饮类 ¥722**，比饮品（¥64）高出十倍，周末聚餐单笔 ¥680 是主要来源。\n2. 预算剩余 ¥1430.50，按当前日均消耗能撑到月底，但**别再来一次 680 的聚餐**。\n\n建议：把「餐饮」分类预算设到 ¥800，给自己留点余地又不至于失控。';
      const chars = Array.from(text);
      let i = 0;
      const timer = setInterval(() => {
        if (i >= chars.length) {
          clearInterval(timer);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        const chunk = chars.slice(i, i + 3).join('');
        i += 3;
        res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: chunk } }] }) + '\n\n');
      }, 12);
      return;
    }

    // 非流式：识别 or 洞察
    let content;
    if (isVision) {
      content = JSON.stringify(RECOGNIZE_RESULT);
    } else if (parsed.response_format?.type === 'json_object') {
      content = JSON.stringify(RECOGNIZE_RESULT);
    } else {
      content = '本月最大的一笔是 ¥3200 的房租，占了总支出的 70%。日常消费其实很克制。';
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'mock-1',
      object: 'chat.completion',
      model: parsed.model || 'mock-model',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    }));
  });
});

server.listen(8766, '127.0.0.1', () => console.log('Mock AI server on http://127.0.0.1:8766/v1'));
