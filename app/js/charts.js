/**
 * charts.js — 轻量 SVG 图表（无第三方依赖）
 */

const Charts = (() => {
  /* ---------- 环形图 ---------- */
  function donut(data, total, size = 132, thick = 17) {
    const r = (size - thick) / 2;
    const cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    const sum = data.reduce((a, d) => a + d.value, 0) || 1;
    let offset = 0;

    const segs = data.map((d) => {
      const frac = d.value / sum;
      const len = frac * circ;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}"
        stroke-width="${thick}" stroke-dasharray="${len} ${circ - len}"
        stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"
        stroke-linecap="butt"></circle>`;
      offset += len;
      return seg;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EEF1F5" stroke-width="${thick}"></circle>
        ${segs}
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="11" fill="#9AA4B2">总支出</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="15" font-weight="700" fill="#1A1D21">¥${(total || 0).toFixed(0)}</text>
      </svg>`;
  }

  /* ---------- 折线 / 柱状趋势 ---------- */
  function line(days, mode = 'month') {
    if (!days.length) return '<div class="muted tc small" style="padding:20px">暂无数据</div>';

    const W = 340, H = 150, PT = 14, PB = 26, PL = 8, PR = 8;
    const iw = W - PL - PR, ih = H - PT - PB;

    // 若是年模式，按月份聚合
    let series = days;
    if (mode === 'year') {
      const map = {};
      days.forEach((d) => {
        const m = d.date.slice(0, 7);
        if (!map[m]) map[m] = { date: m, income: 0, expense: 0 };
        map[m].income += d.income; map[m].expense += d.expense;
      });
      series = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }

    const max = Math.max(...series.map((d) => Math.max(d.expense, d.income)), 1);
    const n = series.length;
    const step = n > 1 ? iw / (n - 1) : iw;

    const px = (i) => PL + (n > 1 ? i * step : iw / 2);
    const py = (v) => PT + ih - (v / max) * ih;

    const linePath = (key) => series.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d[key]).toFixed(1)}`).join(' ');
    const areaPath = (key) => `${linePath(key)} L${px(n - 1).toFixed(1)},${PT + ih} L${px(0).toFixed(1)},${PT + ih} Z`;

    const labelStep = Math.max(1, Math.ceil(n / 6));
    const labels = series.map((d, i) => {
      if (i % labelStep !== 0 && i !== n - 1) return '';
      const t = mode === 'year' ? Number(d.date.slice(5)) + '月' : String(Number(d.date.slice(8)));
      return `<text x="${px(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#9AA4B2">${t}</text>`;
    }).join('');

    const dots = (key, color) => series.map((d, i) =>
      d[key] > 0 ? `<circle cx="${px(i).toFixed(1)}" cy="${py(d[key]).toFixed(1)}" r="2.6" fill="#fff" stroke="${color}" stroke-width="1.8"></circle>` : ''
    ).join('');

    return `
      <svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block">
        <defs>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#E8544A" stop-opacity=".16"/>
            <stop offset="100%" stop-color="#E8544A" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#12A87A" stop-opacity=".14"/>
            <stop offset="100%" stop-color="#12A87A" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="${PL}" y1="${PT + ih}" x2="${W - PR}" y2="${PT + ih}" stroke="#E8EBEF" stroke-width="1"/>
        <path d="${areaPath('income')}" fill="url(#gInc)"></path>
        <path d="${linePath('income')}" fill="none" stroke="#12A87A" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></path>
        <path d="${areaPath('expense')}" fill="url(#gExp)"></path>
        <path d="${linePath('expense')}" fill="none" stroke="#E8544A" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>
        ${dots('income', '#12A87A')}
        ${dots('expense', '#E8544A')}
        ${labels}
      </svg>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:4px;font-size:11.5px;color:var(--text-3)">
        <span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#E8544A;margin-right:5px"></i>支出</span>
        <span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#12A87A;margin-right:5px"></i>收入</span>
      </div>`;
  }

  return { donut, line };
})();

window.Charts = Charts;

/* =========================================================
 *  Mascot — 原创 SVG 吉祥物「小账」
 * ========================================================= */
const Mascot = (() => {
  // 一只原创的方块小精灵形象（原创设计，非任何既有 IP）
  function big(size = 72) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="mg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#4C86F7"/><stop offset="100%" stop-color="#2059D6"/>
          </linearGradient>
        </defs>
        <!-- 身体 -->
        <rect x="18" y="24" width="64" height="58" rx="20" fill="url(#mg1)"/>
        <!-- 顶部天线小球 -->
        <line x1="50" y1="24" x2="50" y2="12" stroke="#2059D6" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="50" cy="9" r="5.4" fill="#FFC64D"/>
        <!-- 眼睛 -->
        <ellipse cx="38" cy="48" rx="5.4" ry="6" fill="#fff"/>
        <ellipse cx="62" cy="48" rx="5.4" ry="6" fill="#fff"/>
        <circle cx="39" cy="49.4" r="2.7" fill="#1A1D21"/>
        <circle cx="63" cy="49.4" r="2.7" fill="#1A1D21"/>
        <!-- 腮红 -->
        <ellipse cx="29" cy="60" rx="5" ry="3.2" fill="#FF8FA8" opacity=".55"/>
        <ellipse cx="71" cy="60" rx="5" ry="3.2" fill="#FF8FA8" opacity=".55"/>
        <!-- 微笑 -->
        <path d="M43 62 Q50 68 57 62" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
        <!-- 手 -->
        <ellipse cx="16" cy="56" rx="7" ry="9" fill="#3D7BF5"/>
        <ellipse cx="84" cy="56" rx="7" ry="9" fill="#3D7BF5"/>
        <!-- 金币 -->
        <circle cx="82" cy="80" r="8.6" fill="#FFC64D"/>
        <text x="82" y="84.4" text-anchor="middle" font-size="10.5" font-weight="700" fill="#8A5A00">¥</text>
      </svg>`;
  }

  function tiny(size = 26) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <rect x="18" y="26" width="64" height="56" rx="19" fill="url(#mg1)"/>
        <line x1="50" y1="26" x2="50" y2="14" stroke="#2059D6" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="50" cy="11" r="5.2" fill="#FFC64D"/>
        <ellipse cx="38" cy="50" rx="5.2" ry="5.8" fill="#fff"/>
        <ellipse cx="62" cy="50" rx="5.2" ry="5.8" fill="#fff"/>
        <circle cx="39" cy="51.2" r="2.6" fill="#1A1D21"/>
        <circle cx="63" cy="51.2" r="2.6" fill="#1A1D21"/>
        <path d="M43 63 Q50 69 57 63" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      </svg>`;
  }

  return { big, tiny };
})();

window.Mascot = Mascot;
