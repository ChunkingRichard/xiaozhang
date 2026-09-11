/**
 * pages-ai.js — AI 记账助手对话页
 */

Pages.ai = (root) => {
  App.state.chat = App.state.chat || [];
  const shell = App.state.isDesktop ? 'chat-shell' : '';

  root.innerHTML = `
    <div class="${shell}" style="display:flex;flex-direction:column;flex:1;min-height:0">
      <div class="topbar">
        <div class="tb-title">AI 记账助手</div>
        <button class="icon-btn" data-act="clear" title="清空对话">${Icons.get('trash', 18)}</button>
      </div>

      <div id="aiNotice"></div>

      <div class="chat-hero">
        <div class="ava">${Icons.get('robot', 24)}</div>
        <div>
          <div class="h1">嗨，我是小账</div>
          <div class="h2">看懂你的账，也管住你的手</div>
        </div>
      </div>

      <div class="chat-scroll" id="chatScroll"></div>

      <div class="chat-chips" id="chatChips"></div>

      <div class="chat-input-bar">
        <textarea id="chatInput" rows="1" placeholder="问点什么，比如：这个月钱花哪了？"></textarea>
        <button class="chat-send" id="chatSend">${Icons.get('send', 19)}</button>
      </div>
    </div>
  `;

  const noticeEl = root.querySelector('#aiNotice');
  const scrollEl = root.querySelector('#chatScroll');
  const chipsEl = root.querySelector('#chatChips');
  const inputEl = root.querySelector('#chatInput');
  const sendEl = root.querySelector('#chatSend');

  root.querySelector('[data-act="clear"]').onclick = async () => {
    if (!App.state.chat.length) return;
    if (await UI.confirm('清空当前对话记录？')) {
      App.state.chat = [];
      render();
    }
  };

  // 提示
  if (!AI.ready()) {
    noticeEl.innerHTML = `
      <div class="notice warn">
        <span class="ni">${Icons.get('alert', 17)}</span>
        <div><b>还没配置 AI 接口</b><br>到「我的 → AI 接口设置」填入 API Key 后即可与小账对话。</div>
      </div>`;
  }

  const CHIPS = [
    '这个月钱花哪儿了？',
    '帮我看看有没有浪费',
    '我预算还够吗',
    '这个月能存下多少钱',
    '我是不是有些地方省过头了',
    '分析下我的消费习惯',
  ];

  function renderChips() {
    chipsEl.innerHTML = CHIPS.map((c) => `<button class="chip">${UI.esc(c)}</button>`).join('');
    chipsEl.querySelectorAll('.chip').forEach((b) => {
      b.onclick = () => send(b.textContent);
    });
  }
  renderChips();

  function render() {
    const chat = App.state.chat;
    if (!chat.length) {
      scrollEl.innerHTML = `
        <div class="empty" style="padding:26px 24px">
          <span class="emo">${Icons.get('chat', 38, 1.4)}</span>
          <div class="t1">还没有对话</div>
          <div class="t2">从下面的问题里挑一个开始，或者直接问我</div>
        </div>`;
      return;
    }
    scrollEl.innerHTML = chat.map((m) => {
      if (m.role === 'user') {
        return `<div class="msg user"><div class="mava">${Icons.get('user', 17)}</div><div class="bubble">${UI.esc(m.content)}</div></div>`;
      }
      return `<div class="msg ai"><div class="mava">${Icons.get('robot', 17)}</div><div class="bubble">${UI.md(m.content)}</div></div>`;
    }).join('');
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }
  render();

  async function send(text) {
    const q = (text || inputEl.value).trim();
    if (!q) return;
    if (!AI.ready()) return UI.toast('请先配置 AI 接口');

    App.state.chat.push({ role: 'user', content: q });
    inputEl.value = '';
    inputEl.style.height = 'auto';
    render();

    // 历史（不含本条）
    const history = App.state.chat.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

    // 插入占位气泡
    const holder = document.createElement('div');
    holder.className = 'msg ai';
    holder.innerHTML = `<div class="mava">${Icons.get('robot', 17)}</div><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>`;
    scrollEl.appendChild(holder);
    scrollEl.scrollTop = scrollEl.scrollHeight;
    sendEl.disabled = true;

    const bubble = holder.querySelector('.bubble');
    let acc = '';

    try {
      await AI.askStream(history, q, {
        onDelta: (delta, full) => {
          acc = full;
          bubble.innerHTML = UI.md(full);
          scrollEl.scrollTop = scrollEl.scrollHeight;
        },
      });
      App.state.chat.push({ role: 'assistant', content: acc || '（无内容）' });
      bubble.innerHTML = UI.md(acc);
    } catch (e) {
      bubble.innerHTML = `<span style="color:var(--expense)">出错了：${UI.esc(e.message)}</span>`;
      App.state.chat.push({ role: 'assistant', content: `（请求失败：${e.message}）` });
    } finally {
      sendEl.disabled = false;
      scrollEl.scrollTop = scrollEl.scrollHeight;
      App.state.chatDirty = true;
    }
  }

  sendEl.onclick = () => send();
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };
  inputEl.oninput = () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(110, inputEl.scrollHeight) + 'px';
  };
};
