/**
 * ai.js — AI 能力层
 * 兼容 OpenAI Chat Completions 协议（OpenAI / DeepSeek / 通义千问 DashScope 兼容模式 /
 * Moonshot / 智谱 / 自建代理等均可），支持多模态图片输入。
 */

const AI = (() => {
  const PRESETS = [
    { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
    { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash' },
    { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-max' },
    { label: 'Kimi 月之暗面', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-128k' },
    { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v' },
    { label: '自定义', baseUrl: '', model: '' },
  ];

  function cfg() {
    const s = Ledger.Settings.get();
    return { apiKey: s.apiKey, baseUrl: (s.baseUrl || '').replace(/\/+$/, ''), model: s.model };
  }

  function ready() {
    const c = cfg();
    return !!(c.apiKey && c.baseUrl && c.model);
  }

  /** 底层：调用 chat completions */
  async function chat(messages, { temperature = 0.6, jsonMode = false, signal } = {}) {
    const c = cfg();
    if (!c.apiKey) throw new Error('尚未配置 API Key，请先到「我的 → AI 设置」中填写。');

    const body = {
      model: c.model,
      messages,
      temperature,
      stream: false,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    let res;
    try {
      res = await fetch(`${c.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      throw new Error('网络请求失败：' + e.message + '（请检查 Base URL 是否可访问，或是否被浏览器跨域策略拦截）');
    }

    if (!res.ok) {
      let detail = '';
      try {
        const err = await res.json();
        detail = err.error?.message || err.message || JSON.stringify(err);
      } catch (_) {
        detail = await res.text().catch(() => '');
      }
      throw new Error(`API 返回 ${res.status}：${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('API 未返回有效内容');
    return content;
  }

  /** 从模型回复中稳健地抽出 JSON */
  function parseJSON(text) {
    if (!text) throw new Error('空内容');
    let t = text.trim();
    // 去掉 ```json ... ``` 包裹
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    // 截取第一个 { 到最后一个 }
    const s = t.indexOf('{');
    const e = t.lastIndexOf('}');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
    return JSON.parse(t);
  }

  /* =========================================================
   *  多模态截图记账
   * ========================================================= */

  const SCREENSHOT_SYSTEM = `你是一个专业的账单识别引擎。用户会提供一张或多张消费/收支记录截图（可能来自微信、支付宝、银行短信、外卖平台、购物 App 等）。

你的任务是：从每张图片中提取**所有可识别的收支条目**，输出严格 JSON。

【识别规则】
1. 区分收/支：扣款、付款、消费、支出、"-"号 → expense；收款、收入、退款到账、红包收入、"+"号 → income。
2. 金额：只要数字，不带货币符号。若显示 "-28.50" 则取 28.50。
3. 日期：统一格式 YYYY-MM-DD。图中若有完整日期直接用；若只有"今天/昨天/前天/上周六"等相对时间，结合下方提供的"当前日期"换算。
4. 时间：格式 HH:MM，若有则填，没有填空字符串。
5. 商户/备注：优先取商户名称、商品名称或交易说明，简洁（不超过 20 字）。
6. 分类：必须从下方给定的分类 ID 列表中选择最贴切的一个。若无法判断，expense 用 "other_e"，income 用 "other_i"。
7. 若某张图片不是账单截图，或没有任何可识别条目，则该图片对应空数组。
8. 不要编造数据。图片中看不清或没有的字段就留空，金额无法确定则该条目不输出。

【重要：关于「长截图切片」】
长截图会被自动切成多段后送入，标记形如「第 2/5 段（长图切片）」。识别时请遵守：
- 相邻切片之间**有一段重叠区域**，重叠处的同一条记录**只输出一次**，不要因为看到两次就输出两条。
- 判断依据：若某条记录的金额、日期、时间、商户都相同，且在两段中出现的位置分别位于上一段的**末尾**和下一段的**开头**，则是同一条，只保留一次。
- 切片只在本图内部连续，不同图片之间是独立的账单，不要跨图片去合并记录。
- 切片边界可能把一行文字切成两半，若某段开头/结尾有看起来残缺、金额或商户不完整的行，优先以文字完整的那一段为准。

【输出格式】严格输出如下 JSON，不要有任何多余文字：
{
  "results": [
    {
      "imageIndex": 1,
      "items": [
        {
          "type": "expense",
          "amount": 28.5,
          "date": "2026-09-10",
          "time": "12:30",
          "merchant": "瑞幸咖啡",
          "categoryId": "drink",
          "confidence": 0.95,
          "rawText": "支付成功 -28.50 瑞幸咖啡"
        }
      ]
    }
  ]
}`;

  function buildCategoryPrompt() {
    const e = Ledger.Categories.expense().map((c) => `${c.id}(${c.name})`).join('、');
    const i = Ledger.Categories.income().map((c) => `${c.id}(${c.name})`).join('、');
    return `\n\n【可用分类 ID】\n支出类：${e}\n收入类：${i}`;
  }

  /**
   * 识别截图
   * @param {Array<{dataUrl:string, name:string}>} images
   * @returns {Promise<Array>} 扁平的识别条目数组
   */
  async function recognizeScreenshots(images, { onProgress } = {}) {
    if (!ready()) throw new Error('尚未配置 API Key，请先到「我的 → AI 设置」中填写。');
    if (!images.length) return [];

    const today = Ledger.todayStr();
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()];

    const userContent = [
      {
        type: 'text',
        text: `当前日期：${today}（${weekday}）。请识别以下 ${images.length} 张截图中的全部收支条目。` + buildCategoryPrompt(),
      },
    ];

    images.forEach((img, idx) => {
      const isSlice = /第 \d+\/\d+ 段/.test(img.name || '');
      const label = isSlice
        ? `--- 图片 ${idx + 1}：${img.name}（长图切片，与相邻切片的重叠部分不要重复计数）---`
        : `--- 图片 ${idx + 1}${img.name ? '：' + img.name : ''} ---`;
      userContent.push({ type: 'text', text: label });
      userContent.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    });

    onProgress && onProgress('正在请求 AI 识别…');

    const content = await chat(
      [
        { role: 'system', content: SCREENSHOT_SYSTEM },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.1, jsonMode: true }
    );

    let parsed;
    try {
      parsed = parseJSON(content);
    } catch (e) {
      throw new Error('AI 返回的内容不是有效 JSON，无法解析。可能原因：模型不支持图片输入、上下文超长被截断，或返回被截断。原始返回片段：' + content.slice(0, 200));
    }

    const flat = [];
    const seen = new Set();   // 切片重叠处可能出现重复，做一次兜底去重
    (parsed.results || []).forEach((r) => {
      (r.items || []).forEach((it) => {
        if (!it || !it.amount) return;
        const type = it.type === 'income' ? 'income' : 'expense';
        const cid = it.categoryId || (type === 'income' ? 'other_i' : 'other_e');
        const amount = Math.abs(Number(it.amount)) || 0;
        if (!amount) return;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') ? it.date : today;
        const time = /^\d{2}:\d{2}$/.test(it.time || '') ? it.time : '';
        const note = it.merchant || '';
        // 同类型 + 同金额 + 同日期 + 同时间 + 同商户 → 视为同一条（切片重叠导致）
        const key = `${type}|${amount}|${date}|${time}|${note}`;
        if (seen.has(key)) return;
        seen.add(key);
        flat.push({
          type,
          amount,
          date,
          time,
          note,
          categoryId: cid,
          confidence: it.confidence,
          rawText: it.rawText || '',
          imageIndex: r.imageIndex,
          source: 'ai_screenshot',
        });
      });
    });

    return flat;
  }

  /* =========================================================
   *  AI 记账助手（对话 + 数据分析）
   * ========================================================= */

  function buildDataContext({ month } = {}) {
    const m = month || Ledger.monthStr();
    const bookId = Ledger.db().currentBookId;
    const { start, end } = Ledger.monthRange(m);
    const book = Ledger.Books.current();

    const sum = Ledger.Records.sum({ bookId, start, end });
    const cats = Ledger.Records.byCategory({ bookId, start, end, type: 'expense' });
    const incCats = Ledger.Records.byCategory({ bookId, start, end, type: 'income' });
    const days = Ledger.Records.byDay({ bookId, start, end });

    // 近 3 个月趋势
    const trend = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const mm = Ledger.monthStr(d);
      const rg = Ledger.monthRange(mm);
      const s = Ledger.Records.sum({ bookId, start: rg.start, end: rg.end });
      trend.unshift({ month: mm, income: s.income, expense: s.expense });
    }

    const budgetTotal = Ledger.Budgets.getTotal(m);
    const budgetCats = Ledger.Budgets.allCategories(m);

    // 最近 40 条明细
    const recent = Ledger.Records.query({ bookId, month: m }).slice(0, 40).map((r) => {
      const c = Ledger.Categories.get(r.categoryId);
      return `${r.date} ${r.time || ''} ${r.type === 'income' ? '收入' : '支出'} ${r.amount}元 ${c ? c.name : ''} ${r.note || ''}`.trim();
    });

    const todayExpense = Ledger.Records.query({ bookId, start: Ledger.todayStr(), end: Ledger.todayStr() })
      .filter((r) => r.type === 'expense')
      .reduce((a, r) => a + r.amount, 0);

    const goals = Ledger.Goals.all().map((g) => `${g.name}：目标 ${g.target} 元，已存 ${g.saved} 元${g.deadline ? '，截止 ' + g.deadline : ''}`);

    const lines = [
      `【当前账本】${book.name}`,
      `【统计月份】${m}（${start} ~ ${end}）`,
      `【本月收入】${sum.income.toFixed(2)} 元`,
      `【本月支出】${sum.expense.toFixed(2)} 元`,
      `【本月结余】${sum.balance.toFixed(2)} 元`,
      `【今日支出】${todayExpense.toFixed(2)} 元`,
      `【本月预算】${budgetTotal ? budgetTotal.toFixed(2) + ' 元' : '未设置'}${budgetTotal ? '，剩余 ' + (budgetTotal - sum.expense).toFixed(2) + ' 元' : ''}`,
      ``,
      `【本月支出分类明细】`,
      ...(cats.length ? cats.map((c) => `- ${c.category.icon}${c.category.name}：${c.amount.toFixed(2)} 元（占比 ${sum.expense ? ((c.amount / sum.expense) * 100).toFixed(1) : 0}%）`) : ['- 暂无支出']),
      ``,
      `【本月收入分类明细】`,
      ...(incCats.length ? incCats.map((c) => `- ${c.category.icon}${c.category.name}：${c.amount.toFixed(2)} 元`) : ['- 暂无收入']),
      ``,
      `【近三个月收支趋势】`,
      ...trend.map((t) => `- ${t.month}：收入 ${t.income.toFixed(2)}，支出 ${t.expense.toFixed(2)}`),
      ``,
      `【省钱目标】`,
      ...(goals.length ? goals.map((g) => '- ' + g) : ['- 暂无目标']),
      ``,
      `【近期明细（最新在前）】`,
      ...(recent.length ? recent.map((r) => '- ' + r) : ['- 暂无记录']),
      ``,
      `【有支出的天数】${days.filter((d) => d.expense > 0).length} 天 / 本月共 ${days.length} 天有记录`,
    ];
    return lines.join('\n');
  }

  function assistantSystemPrompt() {
    const s = Ledger.Settings.get();
    const styleMap = {
      frugal: '用户偏好节俭，你的建议应偏向鼓励克制消费，但注意不要让他陷入过度节省而影响生活质量。',
      balanced: '用户追求平衡，你应帮助他在享受生活和储蓄之间找到合理节奏。',
      relaxed: '用户对消费较宽松，你应温和提示储蓄意识，但不要施加过多压力。',
    };
    return `你是用户的私人记账助手，名字叫「小账」。你的性格：亲切、专业、有洞察力，像一个懂理财的朋友，而不是冷冰冰的报表。

【你的职责】
1. 基于用户真实的账单数据回答问题，给出具体数字，绝不编造数据。
2. 做消费分析：指出消费结构、异常项、环比变化、潜在浪费点。
3. 督促省钱目标：结合目标进度给出可执行建议。
4. 适度劝诫：当用户超支、冲动消费或预算告急时，温和而明确地提醒。
5. 反向平衡：如果用户过度节省（如连续多日极低消费、削减必要开支），也要提醒他照顾好自己的生活质量和健康。
6. 主动洞察：发现值得注意的变化时主动提出，而不是只被动回答。

【风格要求】
- ${styleMap[s.spendDiscipline] || styleMap.balanced}
- 用中文回答，口语化，简洁有力。避免冗长说教。
- 善用 emoji，但不要滥用。
- 数据引用要准确：金额保留两位小数，格式如 ¥123.45。
- 适当的段落和换行，让回答易读；关键结论可以加粗。
- 如果用户问的问题与账单无关，简短回答后引导回消费理财话题。

【重要】
不得编造任何账单数据。如果数据不足以回答，就说明"当前账本没有相关数据"，并建议用户先记一笔。`;
  }

  async function ask(history, question, { month } = {}) {
    if (!ready()) throw new Error('尚未配置 API Key，请先到「我的 → AI 设置」中填写。');
    const ctx = buildDataContext({ month });
    const messages = [
      { role: 'system', content: assistantSystemPrompt() },
      { role: 'system', content: `以下是用户当前的账单数据（JSON 结构化的文本摘要）：\n\n${ctx}` },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];
    return chat(messages, { temperature: 0.7 });
  }

  /* =========================================================
   *  AI 对话流式版本（打字机效果）
   * ========================================================= */
  async function askStream(history, question, { month, onDelta } = {}) {
    const c = cfg();
    if (!c.apiKey) throw new Error('尚未配置 API Key，请先到「我的 → AI 设置」中填写。');

    const ctx = buildDataContext({ month });
    const messages = [
      { role: 'system', content: assistantSystemPrompt() },
      { role: 'system', content: `以下是用户当前的账单数据：\n\n${ctx}` },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const res = await fetch(`${c.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model: c.model, messages, temperature: 0.7, stream: true }),
    });

    if (!res.ok) {
      let detail = '';
      try { const err = await res.json(); detail = err.error?.message || JSON.stringify(err); } catch (_) { detail = await res.text().catch(() => ''); }
      throw new Error(`API 返回 ${res.status}：${detail.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content || '';
          if (delta) { full += delta; onDelta && onDelta(delta, full); }
        } catch (_) { /* 忽略不完整行 */ }
      }
    }
    return full;
  }

  /** 生成一段消费洞察（用于首页/AI 页顶部卡片） */
  async function insight({ month } = {}) {
    const ctx = buildDataContext({ month });
    const content = await chat(
      [
        { role: 'system', content: '你是一个消费洞察引擎。基于账单数据，输出一段 60 字以内的中文洞察，指出最值得用户注意的一件事。不要寒暄，不要复述所有数据，只讲最有价值的那个点。' },
        { role: 'user', content: ctx },
      ],
      { temperature: 0.6 }
    );
    return content.trim();
  }

  return { PRESETS, ready, cfg, chat, recognizeScreenshots, ask, askStream, insight, buildDataContext, parseJSON };
})();

window.AI = AI;
