/**
 * sheets.js — 各类底部弹层设置面板
 */

Sheets = window.Sheets || {};

/* ---------------- AI 接口设置 ---------------- */
Sheets.aiConfig = () => {
  const s = Ledger.Settings.get();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="notice info" style="margin:0 0 16px">
      <span class="ni">${Icons.get('lock', 17)}</span>
      <div>填入你<b>自己的</b>大模型 API Key。支持所有兼容 OpenAI 协议的接口，推荐使用带视觉能力的模型。</div>
    </div>

    <div class="field">
      <label>服务商预设</label>
      <div style="display:flex;flex-wrap:wrap;gap:7px" data-presets>
        ${AI.PRESETS.map((p, i) => `
          <button class="chip" data-p="${i}" style="flex:none">${UI.esc(p.label)}</button>`).join('')}
      </div>
    </div>

    <div class="field"><label>Base URL</label>
      <input class="input" data-base placeholder="https://api.openai.com/v1" value="${UI.esc(s.baseUrl)}">
    </div>
    <div class="field"><label>模型名称</label>
      <input class="input" data-model placeholder="gpt-4o" value="${UI.esc(s.model)}">
      <div class="small muted" style="margin-top:5px">截图记账需要模型支持图片输入，例如 gpt-4o / qwen-vl-max / glm-4v / gemini 等</div>
    </div>
    <div class="field"><label>API Key</label>
      <input class="input" data-key type="password" placeholder="sk-..." value="${UI.esc(s.apiKey)}">
      <div class="small muted" style="margin-top:5px">Key 只保存在你自己的浏览器里，不会上传到任何地方</div>
    </div>

    <button class="btn btn-ghost btn-block mt8" data-test>测试连接</button>
    <div id="testResult" style="margin-top:12px"></div>
  `;

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary btn-block';
  btn.textContent = '保存';
  const foot = document.createElement('div');
  foot.style.cssText = 'width:100%'; foot.appendChild(btn);

  UI.sheet({
    title: 'AI 接口设置',
    body: wrap,
    foot,
    onMount: ({ close }) => {
      const baseEl = wrap.querySelector('[data-base]');
      const modelEl = wrap.querySelector('[data-model]');
      const keyEl = wrap.querySelector('[data-key]');
      const resEl = wrap.querySelector('#testResult');

      wrap.querySelectorAll('[data-p]').forEach((b) => {
        b.onclick = () => {
          const p = AI.PRESETS[Number(b.dataset.p)];
          if (p.baseUrl) { baseEl.value = p.baseUrl; modelEl.value = p.model; }
          wrap.querySelectorAll('[data-p]').forEach((x) => { x.style.background = ''; x.style.borderColor = ''; });
          b.style.background = 'var(--brand-soft)';
          b.style.borderColor = '#BFD4F7';
        };
      });

      btn.onclick = () => {
        Ledger.Settings.set({
          baseUrl: baseEl.value.trim(),
          model: modelEl.value.trim(),
          apiKey: keyEl.value.trim(),
        });
        close();
        UI.toast('已保存');
        App.refresh();
      };

      wrap.querySelector('[data-test]').onclick = async () => {
        const prev = Ledger.Settings.get();
        Ledger.Settings.set({
          baseUrl: baseEl.value.trim(),
          model: modelEl.value.trim(),
          apiKey: keyEl.value.trim(),
        });
        resEl.innerHTML = '';
        const ld = UI.loading('正在测试…');
        try {
          const r = await AI.chat([{ role: 'user', content: '回复"连接正常"四个字即可' }], { temperature: 0 });
          ld.close();
          resEl.innerHTML = `<div class="notice info" style="margin:0"><span class="ni">${Icons.get('check', 17)}</span><div>连接成功，模型回复：${UI.esc(r.slice(0, 60))}</div></div>`;
        } catch (e) {
          ld.close();
          resEl.innerHTML = `<div class="notice err" style="margin:0"><span class="ni">${Icons.get('close', 17, 2)}</span><div>${UI.esc(e.message)}</div></div>`;
        }
      };
    },
  });
};

/* ---------------- 账本切换 ---------------- */
Sheets.bookSwitch = () => {
  const books = Ledger.Books.all();
  const cur = Ledger.db().currentBookId;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="notice info" style="margin:0 0 14px">
      <span class="ni">${Icons.get('book', 17)}</span>
      <div>用不同账本记录不同用途的账，比如「日常」「旅行」「装修」，互不混淆。</div>
    </div>
    ${books.map((b) => `
      <div class="draft-item" style="display:flex;align-items:center;gap:12px;${b.id === cur ? 'border-color:#BFD4F7;background:var(--brand-soft)' : ''}" data-b="${b.id}">
        <span style="font-size:24px">${b.icon}</span>
        <div class="flex1">
          <div style="font-weight:600;font-size:14.5px">${UI.esc(b.name)}</div>
          <div class="small muted">月起始日：每月 ${b.startDay} 号</div>
        </div>
        ${b.id === cur ? '<span style="font-size:12px;color:var(--brand);font-weight:600">使用中</span>' : '<span class="sc" style="color:var(--text-3)">›</span>'}
      </div>`).join('')}
    <div style="display:flex;gap:10px;margin-top:6px">
      <button class="btn btn-ghost flex1" data-manage>账本管理</button>
      <button class="btn btn-primary flex1" data-create>创建账本</button>
    </div>
  `;

  UI.sheet({
    title: '选择账本',
    body: wrap,
    onMount: ({ close }) => {
      wrap.querySelectorAll('[data-b]').forEach((el) => {
        el.onclick = () => {
          Ledger.Books.setCurrent(el.dataset.b);
          close();
          App.refresh();
          UI.toast('已切换账本');
        };
      });
      wrap.querySelector('[data-manage]').onclick = () => { close(); setTimeout(Sheets.bookManage, 180); };
      wrap.querySelector('[data-create]').onclick = () => { close(); setTimeout(() => Sheets.bookEdit(), 180); };
    },
  });
};

Sheets.bookManage = () => {
  const books = Ledger.Books.all();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    ${books.map((b) => {
      const cnt = Ledger.Records.byBook(b.id).length;
      return `
        <div class="draft-item" style="display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">${b.icon}</span>
          <div class="flex1">
            <div style="font-weight:600;font-size:14.5px">${UI.esc(b.name)}</div>
            <div class="small muted">${cnt} 笔记录 · 月起始日 ${b.startDay} 号</div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:13px" data-edit="${b.id}">编辑</button>
        </div>`;
    }).join('')}
    <button class="btn btn-primary btn-block mt8" data-create>＋ 新建账本</button>
  `;

  const sh = UI.sheet({
    title: '账本管理',
    body: wrap,
    onMount: ({ close }) => {
      wrap.querySelector('[data-create]').onclick = () => { close(); setTimeout(() => Sheets.bookEdit(), 180); };
      wrap.querySelectorAll('[data-edit]').forEach((b) => {
        b.onclick = () => { close(); setTimeout(() => Sheets.bookEdit(books.find((x) => x.id === b.dataset.edit)), 180); };
      });
    },
  });
};

Sheets.bookEdit = (book) => {
  const isEdit = !!book;
  const ICONS = ['📒', '🏠', '✈️', '💼', '🎓', '🛒', '🏗️', '🎮', '💊', '🐱'];
  let icon = book ? book.icon : '📒';

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="field"><label>账本名称</label>
      <input class="input" data-n value="${UI.esc(book ? book.name : '')}" placeholder="例如：旅行账本"></div>
    <div class="field"><label>图标</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap" data-icons>
        ${ICONS.map((ic) => `<button data-i="${ic}" style="font-size:23px;width:44px;height:44px;border-radius:12px;border:1.5px solid ${ic === icon ? 'var(--brand)' : 'var(--border)'};background:${ic === icon ? 'var(--brand-soft)' : 'var(--surface-2)'};display:grid;place-items:center">${ic}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label>每月起始日</label>
      <select class="select" data-sd>
        ${Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<option value="${d}" ${book && book.startDay === d ? 'selected' : ''}>每月 ${d} 号</option>`).join('')}
      </select>
      <div class="small muted" style="margin-top:5px">适用于工资日非 1 号的场景，统计周期会更贴合你的实际情况</div>
    </div>
    ${isEdit && Ledger.Books.all().length > 1 ? `<button class="btn btn-danger btn-block" data-del>删除这个账本</button>` : ''}
    ${isEdit && Ledger.Books.all().length > 1 ? `<div class="small muted tc" style="margin-top:8px">删除后该账本下 ${Ledger.Records.byBook(book.id).length} 笔记录会一并删除</div>` : ''}
  `;

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary btn-block';
  btn.textContent = isEdit ? '保存' : '创建';
  const foot = document.createElement('div');
  foot.style.cssText = 'width:100%'; foot.appendChild(btn);

  UI.sheet({
    title: isEdit ? '编辑账本' : '新建账本',
    body: wrap, foot,
    onMount: ({ close }) => {
      wrap.querySelectorAll('[data-icons] button').forEach((b) => {
        b.onclick = () => {
          icon = b.dataset.i;
          wrap.querySelectorAll('[data-icons] button').forEach((x) => {
            const on = x.dataset.i === icon;
            x.style.borderColor = on ? 'var(--brand)' : 'var(--border)';
            x.style.background = on ? 'var(--brand-soft)' : 'var(--surface-2)';
          });
        };
      });
      btn.onclick = () => {
        const name = wrap.querySelector('[data-n]').value.trim();
        const startDay = Number(wrap.querySelector('[data-sd]').value);
        if (!name) return UI.toast('请填写账本名称');
        if (isEdit) Ledger.Books.update(book.id, { name, icon, startDay });
        else { const b = Ledger.Books.add({ name, icon, startDay }); Ledger.Books.setCurrent(b.id); }
        close(); App.refresh(); UI.toast('已保存');
      };
      const del = wrap.querySelector('[data-del]');
      if (del) del.onclick = async () => {
        if (await UI.confirm(`删除账本「${book.name}」及其全部记录？此操作不可恢复。`, { danger: true, okText: '删除' })) {
          try { Ledger.Books.remove(book.id); close(); App.refresh(); UI.toast('已删除'); }
          catch (e) { UI.toast(e.message); }
        }
      };
    },
  });
};

/* ---------------- 预算管理 ---------------- */
Sheets.budgetManage = () => {
  const month = App.state.month;
  const total = Ledger.Budgets.getTotal(month);
  const cats = Ledger.Budgets.allCategories(month);
  const { start, end } = Ledger.monthRange(month);
  const sum = Ledger.Records.sum({ bookId: Ledger.db().currentBookId, start, end });

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="field">
      <label>${month.replace('-', '年')}月 总预算</label>
      <input class="input num" type="number" inputmode="decimal" data-total value="${total || ''}" placeholder="0.00" style="font-size:19px;font-weight:600">
      <div class="small muted" style="margin-top:5px">本月已支出 ¥${sum.expense.toFixed(2)}${total ? `，剩余 ¥${(total - sum.expense).toFixed(2)}` : ''}</div>
    </div>

    <div class="field" style="margin-top:22px">
      <label>分类预算（可选）</label>
      <div class="small muted" style="margin-bottom:10px">给常超支的类别单独设上限，AI 会重点盯这些</div>
    </div>
    ${Ledger.Categories.expense().map((c) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <span style="width:26px;text-align:center;font-size:17px;flex:none">${c.icon}</span>
        <span class="flex1" style="font-size:14px">${UI.esc(c.name)}</span>
        <input class="input num" type="number" inputmode="decimal" data-cat="${c.id}" value="${cats[c.id] || ''}" placeholder="不限" style="width:110px;padding:8px 11px;font-size:14px">
      </div>`).join('')}
  `;

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary btn-block';
  btn.textContent = '保存预算';
  const foot = document.createElement('div');
  foot.style.cssText = 'width:100%'; foot.appendChild(btn);

  UI.sheet({
    title: '预算管理', body: wrap, foot,
    onMount: ({ close }) => {
      btn.onclick = () => {
        Ledger.Budgets.setTotal(month, parseFloat(wrap.querySelector('[data-total]').value) || 0);
        wrap.querySelectorAll('[data-cat]').forEach((el) => {
          const v = parseFloat(el.value) || 0;
          if (v > 0) Ledger.Budgets.setCategory(month, el.dataset.cat, v);
          else delete Ledger.db().budgets[`${month}::${el.dataset.cat}`];
        });
        Ledger.save();
        close(); App.refresh(); UI.toast('预算已保存');
      };
    },
  });
};

/* ---------------- 分类管理 ---------------- */
Sheets.categoryManage = () => {
  let type = 'expense';
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="segmented" style="margin-bottom:16px" data-seg>
      <button data-t="expense" class="on">支出分类</button>
      <button data-t="income">收入分类</button>
    </div>
    <div id="catList"></div>
    <button class="btn btn-primary btn-block mt12" data-add>＋ 新增分类</button>
  `;

  function renderList() {
    const list = Ledger.Categories.list(type);
    const box = wrap.querySelector('#catList');
    box.innerHTML = list.map((c) => {
      const cnt = Ledger.Records.all().filter((r) => r.categoryId === c.id).length;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
          <span style="width:36px;height:36px;border-radius:11px;background:${c.color}1A;display:grid;place-items:center;font-size:18px;flex:none">${c.icon}</span>
          <div class="flex1">
            <div style="font-size:14.5px;font-weight:500">${UI.esc(c.name)}</div>
            <div class="small muted">${cnt} 笔记录</div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 11px;font-size:12.5px" data-e="${c.id}">改</button>
          <button class="btn btn-ghost" style="padding:6px 11px;font-size:12.5px;color:var(--text-3)" data-d="${c.id}">删</button>
        </div>`;
    }).join('');
    box.querySelectorAll('[data-e]').forEach((b) => {
      b.onclick = () => editCat(list.find((c) => c.id === b.dataset.e));
    });
    box.querySelectorAll('[data-d]').forEach((b) => {
      b.onclick = async () => {
        const c = list.find((x) => x.id === b.dataset.d);
        if (await UI.confirm(`删除分类「${c.name}」？该分类下的记录会归到「其他」。`, { danger: true, okText: '删除' })) {
          Ledger.Categories.remove(type, c.id);
          renderList();
          UI.toast('已删除');
        }
      };
    });
  }

  wrap.querySelectorAll('[data-seg] button').forEach((b) => {
    b.onclick = () => {
      type = b.dataset.t;
      wrap.querySelectorAll('[data-seg] button').forEach((x) => x.classList.toggle('on', x === b));
      renderList();
    };
  });

  renderList();

  UI.sheet({
    title: '分类管理', body: wrap,
    onMount: ({ close }) => {
      wrap.querySelector('[data-add]').onclick = () => { close(); setTimeout(() => editCat(), 180); };
    },
  });

  function editCat(cat) {
    const isEdit = !!cat;
    const COLORS = ['#FF8A4C', '#F7B955', '#5BA8F0', '#E8739B', '#7BC48A', '#A78BFA', '#F87171', '#34D399', '#60A5FA', '#FBBF24', '#38BDF8', '#94A3B8'];
    const ICONS = ['🍚', '🧋', '🚇', '🛍️', '🧴', '🎬', '💊', '🏠', '💻', '📚', '✈️', '🎁', '💰', '🎉', '📈', '💼', '🧧', '📦'];
    let color = cat ? cat.color : COLORS[0];
    let icon = cat ? cat.icon : ICONS[0];

    const w = document.createElement('div');
    w.innerHTML = `
      <div class="field"><label>分类名称</label><input class="input" data-n value="${UI.esc(cat ? cat.name : '')}" placeholder="分类名"></div>
      <div class="field"><label>图标</label>
        <div style="display:flex;flex-wrap:wrap;gap:7px" data-ics>
          ${ICONS.map((i) => `<button data-i="${i}" style="font-size:20px;width:40px;height:40px;border-radius:11px;border:1.5px solid ${i === icon ? 'var(--brand)' : 'var(--border)'};background:${i === icon ? 'var(--brand-soft)' : 'var(--surface-2)'};display:grid;place-items:center">${i}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>颜色</label>
        <div style="display:flex;flex-wrap:wrap;gap:9px" data-cs>
          ${COLORS.map((c) => `<button data-c="${c}" style="width:31px;height:31px;border-radius:50%;background:${c};border:2.5px solid ${c === color ? '#1A1D21' : 'transparent'}"></button>`).join('')}
        </div>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = isEdit ? '保存' : '创建';
    const foot = document.createElement('div');
    foot.style.cssText = 'width:100%'; foot.appendChild(btn);

    UI.sheet({
      title: isEdit ? '编辑分类' : '新增分类', body: w, foot,
      onMount: ({ close }) => {
        w.querySelectorAll('[data-ics] button').forEach((b) => {
          b.onclick = () => {
            icon = b.dataset.i;
            w.querySelectorAll('[data-ics] button').forEach((x) => {
              const on = x.dataset.i === icon;
              x.style.borderColor = on ? 'var(--brand)' : 'var(--border)';
              x.style.background = on ? 'var(--brand-soft)' : 'var(--surface-2)';
            });
          };
        });
        w.querySelectorAll('[data-cs] button').forEach((b) => {
          b.onclick = () => {
            color = b.dataset.c;
            w.querySelectorAll('[data-cs] button').forEach((x) => {
              x.style.borderColor = x.dataset.c === color ? '#1A1D21' : 'transparent';
            });
          };
        });
        btn.onclick = () => {
          const name = w.querySelector('[data-n]').value.trim();
          if (!name) return UI.toast('请填写分类名称');
          if (isEdit) Ledger.Categories.update(type, cat.id, { name, icon, color });
          else Ledger.Categories.add(type, { name, icon, color });
          close(); App.refresh(); UI.toast('已保存');
        };
      },
    });
  }
};

/* ---------------- 账户管理 ---------------- */
Sheets.accountManage = () => {
  const wrap = document.createElement('div');
  function render() {
    const list = Ledger.Accounts.all();
    wrap.innerHTML = `
      ${list.map((a) => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:21px">${a.icon}</span>
          <span class="flex1" style="font-size:14.5px">${UI.esc(a.name)}</span>
          <button class="btn btn-ghost" style="padding:6px 11px;font-size:12.5px;color:var(--text-3)" data-d="${a.id}">删除</button>
        </div>`).join('')}
      <div class="row gap8 mt12">
        <input class="input flex1" data-name placeholder="账户名称，如 招商银行">
        <button class="btn btn-primary" data-add style="flex:none">添加</button>
      </div>
    `;
    wrap.querySelectorAll('[data-d]').forEach((b) => {
      b.onclick = () => { Ledger.Accounts.remove(b.dataset.d); render(); UI.toast('已删除'); };
    });
    wrap.querySelector('[data-add]').onclick = () => {
      const n = wrap.querySelector('[data-name]').value.trim();
      if (!n) return UI.toast('请输入账户名称');
      Ledger.Accounts.add(n);
      render();
      UI.toast('已添加');
    };
  }
  render();
  UI.sheet({ title: '账户管理', body: wrap });
};

/* ---------------- 消费风格 ---------------- */
Sheets.discipline = () => {
  const cur = Ledger.Settings.get().spendDiscipline;
  const opts = [
    { k: 'frugal', t: '偏节俭', d: '希望多存钱，需要 AI 严格提醒克制消费' },
    { k: 'balanced', t: '求平衡', d: '既要存钱也要生活，帮我找合理节奏', rec: true },
    { k: 'relaxed', t: '较宽松', d: '不太想被管，适度提示就好' },
  ];
  const wrap = document.createElement('div');
  wrap.innerHTML = opts.map((o) => `
    <div class="draft-item" data-o="${o.k}" style="${o.k === cur ? 'border-color:#BFD4F7;background:var(--brand-soft)' : ''}">
      <div style="font-size:14.5px;font-weight:600;margin-bottom:3px">${o.t}${o.rec ? ' <span style="font-size:11px;color:var(--brand)">推荐</span>' : ''}</div>
      <div class="small muted">${o.d}</div>
    </div>`).join('');

  UI.sheet({
    title: '消费风格', body: wrap,
    onMount: ({ close }) => {
      wrap.querySelectorAll('[data-o]').forEach((el) => {
        el.onclick = () => {
          Ledger.Settings.set({ spendDiscipline: el.dataset.o });
          close(); App.refresh(); UI.toast('已设置');
        };
      });
    },
  });
};

/* ---------------- 关于 ---------------- */
Sheets.about = () => {
  UI.sheet({
    title: '关于与隐私说明',
    body: `
      <div style="font-size:14px;line-height:1.8;color:var(--text-2)">
        <p><b>这是什么</b><br>一个完全属于你自己的本地记账工具。没有订阅，没有付费墙，没有套路。</p>

        <p><b>数据存在哪</b><br>所有账单、账本、预算、目标都保存在你这台设备的浏览器本地存储里（localStorage）。不上传云端，我们也没有服务器能拿到你的数据。</p>

        <p><b>AI 怎么工作</b><br>截图识别和 AI 助手都会直接调用<b>你自己配置的</b>大模型 API。图片和账单摘要从你的浏览器直接发往你选的服务商，不经过任何中间方。AI 服务商如何使用这些数据，取决于你选择的那家的隐私政策。</p>

        <p><b>重要提醒</b><br>清除浏览器数据、更换浏览器或卸载应用会导致本地数据丢失。请定期使用「导出备份」功能保存一份 JSON 文件。</p>

        <p><b>免责</b><br>AI 给出的消费分析仅供参考，不构成投资或理财建议。截图识别的准确性依赖所选模型，请务必核对后再入账。</p>

        <p style="text-align:center;color:var(--text-3);font-size:12.5px;margin-top:22px">小账 · v1.0</p>
      </div>`,
  });
};
