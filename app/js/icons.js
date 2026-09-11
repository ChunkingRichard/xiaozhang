/**
 * icons.js — 线性 SVG 图标库（24×24 网格，统一 1.7 描边）
 * 用法：Icons.get('home', 20) → 返回 <svg> 字符串
 */

const Icons = (() => {
  const P = {
    /* 导航 */
    home: '<path d="M3.2 10.4 12 3.5l8.8 6.9V20a1.2 1.2 0 0 1-1.2 1.2h-4.4v-6h-6.4v6H4.4A1.2 1.2 0 0 1 3.2 20z"/>',
    chat: '<path d="M20.5 12.2c0 4.1-3.8 7.4-8.5 7.4-1 0-2-.16-2.9-.45L4.6 20.6l1.2-3.6A7 7 0 0 1 3.5 12.2c0-4.1 3.8-7.4 8.5-7.4s8.5 3.3 8.5 7.4z"/>',
    chart: '<path d="M4.5 20.2V10.4M11.5 20.2V4.2M18.5 20.2v-6.6"/><path d="M2.6 20.5h18.8"/>',
    user: '<circle cx="12" cy="8.4" r="3.9"/><path d="M4.6 20.4c0-3.6 3.3-5.9 7.4-5.9s7.4 2.3 7.4 5.9"/>',

    /* 首页快捷 */
    camera: '<path d="M3.4 8.6h3l1.5-2.4h8.2l1.5 2.4h3A1.4 1.4 0 0 1 22 10v8.4a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 18.4V10a1.4 1.4 0 0 1 1.4-1.4z"/><circle cx="12" cy="13.9" r="3.6"/>',
    target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    sparkle: '<path d="M12 3.4l1.7 4.6 4.6 1.7-4.6 1.7L12 16l-1.7-4.6L5.7 9.7l4.6-1.7z"/><path d="M18.4 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',

    /* 顶栏 / 通用操作 */
    calendar: '<rect x="3.4" y="5" width="17.2" height="15.4" rx="2.2"/><path d="M3.4 9.8h17.2M8.2 3.4v3.4M15.8 3.4v3.4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="M15.5 15.5l5 5"/>',
    chevronLeft: '<path d="M14.6 6.4 9 12l5.6 5.6"/>',
    chevronRight: '<path d="M9.4 6.4 15 12l-5.6 5.6"/>',
    chevronDown: '<path d="M6.4 9.4 12 15l5.6-5.6"/>',
    close: '<path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>',
    plus: '<path d="M12 5.4v13.2M5.4 12h13.2"/>',
    check: '<path d="M5 12.6l4.6 4.6L19 7.8"/>',
    help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.1-2.5 3.6"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
    trash: '<path d="M4.6 6.6h14.8M9.4 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.8"/><path d="M6.6 6.6l.9 12.2a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12.2"/>',
    edit: '<path d="M15.8 4.6l3.6 3.6-9.9 9.9-4.4.8.8-4.4z"/>',
    send: '<path d="M20.4 3.6 3.6 10.2l6.8 2.8 2.8 6.8z"/><path d="M20.4 3.6 10.4 13"/>',

    /* 我的 / 设置 */
    book: '<path d="M4.4 4.6A1.2 1.2 0 0 1 5.6 3.4h12.8a1.2 1.2 0 0 1 1.2 1.2v14.8a1.2 1.2 0 0 1-1.2 1.2H5.6a1.2 1.2 0 0 1-1.2-1.2z"/><path d="M8 3.4v17.2"/>',
    wallet: '<path d="M3.6 7.4A2.4 2.4 0 0 1 6 5h11.4a2.4 2.4 0 0 1 2.4 2.4v9.2a2.4 2.4 0 0 1-2.4 2.4H6a2.4 2.4 0 0 1-2.4-2.4z"/><path d="M15.4 12h3.4"/>',
    tag: '<path d="M11.2 3.6H5.4a1.8 1.8 0 0 0-1.8 1.8v5.8a1.8 1.8 0 0 0 .53 1.27l7.4 7.4a1.8 1.8 0 0 0 2.54 0l5.8-5.8a1.8 1.8 0 0 0 0-2.54l-7.4-7.4a1.8 1.8 0 0 0-1.27-.53z"/><circle cx="8.2" cy="8.2" r="1.4"/>',
    card: '<rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.2"/><path d="M2.8 10h18.4"/>',
    scale: '<path d="M12 3.8v16.4M6.2 20.2h11.6"/><path d="M12 6.4 5.6 8.6l2.6 4.4 2.6-4.4zM12 6.4l6.4 2.2-2.6 4.4-2.6-4.4z"/>',
    upload: '<path d="M12 15.6V4.4M7.8 8.6 12 4.4l4.2 4.2"/><path d="M4.6 15v3.4a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6V15"/>',
    download: '<path d="M12 4.4v11.2M7.8 11.4 12 15.6l4.2-4.2"/><path d="M4.6 15v3.4a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6V15"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.2v5.4"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>',
    lock: '<rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2.2"/><path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6"/>',
    shield: '<path d="M12 3.4 5 6.2v5.2c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V6.2z"/><path d="M9 12l2.2 2.2L15.4 10"/>',
    alert: '<path d="M12 4.2 21 19.6H3z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
    robot: '<rect x="4.4" y="7.6" width="15.2" height="11.2" rx="3"/><path d="M12 3.4v4.2"/><circle cx="12" cy="3" r="1.2"/><circle cx="9.2" cy="12.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12.6" r="1.3" fill="currentColor" stroke="none"/>',
    image: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.2"/><circle cx="8.8" cy="10" r="1.7"/><path d="M4.4 17.4 9.6 13l3.4 2.8 3-2.4 4 3.6"/>',
    empty: '<path d="M6.4 3.6h8l4.2 4.2v12.6a1.2 1.2 0 0 1-1.2 1.2H6.4a1.2 1.2 0 0 1-1.2-1.2V4.8a1.2 1.2 0 0 1 1.2-1.2z"/><path d="M14 3.6v4.6h4.6"/>',
    folder: '<path d="M3.4 7a1.6 1.6 0 0 1 1.6-1.6h3.6l1.8 2.2h8.6A1.6 1.6 0 0 1 20.6 9.2v8.2a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.4 4v4.4H16"/>',
    arrowRight: '<path d="M4.6 12h14M13.4 6.8 18.6 12l-5.2 5.2"/>',
  };

  /**
   * 取图标 SVG 字符串
   * @param {string} name 图标名
   * @param {number} size 像素尺寸
   * @param {number} sw   描边宽度
   */
  function get(name, size = 20, sw = 1.7) {
    const d = P[name];
    if (!d) return '';
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${d}</svg>`;
  }

  /** 判断是否存在该图标 */
  const has = (name) => !!P[name];
  const names = () => Object.keys(P);

  return { get, has, names };
})();

window.Icons = Icons;
