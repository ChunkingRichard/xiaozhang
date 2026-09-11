/**
 * 验证长图切片的几何计算是否正确。
 * 纯数学复刻 sliceImage 的逻辑（不依赖 DOM），
 * 检查各种尺寸下的段数、段宽、段高、覆盖率。
 *
 * 用法: node test-slice.js
 */

const IMG_MAX_W = 1400;
const IMG_MAX_H = 2000;
const IMG_LONG_RATIO = 2.4;
const IMG_MAX_SLICES = 6;
const IMG_OVERLAP = 70;

/** 复刻 sliceImage 的几何计算 */
function sliceGeometry(W, H) {
  const scale = W > IMG_MAX_W ? IMG_MAX_W / W : 1;
  const baseW = Math.round(W * scale);
  const baseH = Math.round(H * scale);

  const isLong = baseH / baseW > IMG_LONG_RATIO && baseH > IMG_MAX_H;
  if (!isLong) {
    let w = baseW;
    let h = baseH;
    if (h / w > IMG_LONG_RATIO) h = Math.round(Math.min(h, w * IMG_LONG_RATIO));
    return [{ part: 1, total: 1, oy: 0, oh: H, outW: w, outH: h }];
  }

  const idealCount = Math.ceil(baseH / IMG_MAX_H);
  const count = Math.min(idealCount, IMG_MAX_SLICES);

  const segH = Math.ceil(baseH / count);
  const outScale = segH > IMG_MAX_H ? IMG_MAX_H / segH : 1;

  const out = [];
  for (let i = 0; i < count; i++) {
    const sy = i * segH;
    const overlapSrc = Math.round(IMG_OVERLAP / outScale);
    let sh = segH + (i < count - 1 ? overlapSrc : 0);
    sh = Math.min(sh, baseH - sy);

    const oy = Math.round(sy / scale);
    const oh = Math.min(Math.round(sh / scale), H - oy);
    const dh = Math.max(1, Math.round(sh * scale * outScale));
    out.push({ part: i + 1, total: count, oy, oh, outW: baseW, outH: dh, srcStart: sy, srcEnd: sy + sh });
  }
  return out;
}

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? '  → ' + extra : '')); }
}

/* ---------------- 测试用例 ---------------- */

console.log('\n【1】★ 关键回归：普通手机截图 1080×2340 不应被切碎');
{
  const s = sliceGeometry(1080, 2340);
  s.forEach((x) => console.log(`     段${x.part}/${x.total}: 原图段 ${x.oy}+${x.oh} → 输出 ${x.outW}×${x.outH}`));
  ok(s.length === 1, '不切片，只有 1 段（旧逻辑会切成 6 段）', 'got ' + s.length);
  ok(s[0].outW === 1080, '宽度保持 1080（老代码会压成 126）', 'got ' + s[0].outW);
  ok(s[0].oh === 2340, '完整覆盖整个高度');
}

console.log('\n【2】★ 关键回归：长图 1080×12000');
{
  const s = sliceGeometry(1080, 12000);
  s.forEach((x) => console.log(`     段${x.part}/${x.total}: 输出宽 ${x.outW}, 高 ${x.outH}`));
  ok(s.length > 1, `切成多段（实际 ${s.length} 段）`);
  ok(s[0].outW === 1080, '★ 宽度仍是 1080，不是 126', 'got ' + s[0].outW);
  ok(s.length <= IMG_MAX_SLICES, `段数不超过上限 ${IMG_MAX_SLICES}`);
}

console.log('\n【3】超长图 1080×30000 —— 段数封顶后单段不能过大');
{
  const s = sliceGeometry(1080, 30000);
  ok(s.length === IMG_MAX_SLICES, `段数正好钳到上限 ${IMG_MAX_SLICES}`, 'got ' + s.length);
  ok(s[0].outW === 1080, '宽度仍为 1080');
  const maxOut = Math.max(...s.map((x) => x.outH));
  console.log(`     各段输出高度: ${s.map((x) => x.outH).join(', ')}`);
  ok(maxOut <= IMG_MAX_H + IMG_OVERLAP + 2, `封顶后最大段高 ${maxOut} 仍 ≤ ${IMG_MAX_H + IMG_OVERLAP}`);
}

console.log('\n【3b】超长图 1080×30000 —— 覆盖必须完整（按源坐标验证）');
{
  const s = sliceGeometry(1080, 30000);
  const baseH = 30000;
  let cursor = 0;
  let ok_cov = true;
  for (const x of s) {
    if (x.srcStart > cursor + 1) { ok_cov = false; break; }
    cursor = Math.max(cursor, x.srcEnd);
  }
  ok(ok_cov && cursor >= baseH - 2, `无空洞且覆盖到底（cursor=${cursor}/${baseH}）`);
}

console.log('\n【4】切片必须完整覆盖原图，不能漏掉底部');
{
  [[1080, 4000], [1080, 12000], [750, 8000], [2000, 15000], [1080, 30000]].forEach(([W, H]) => {
    const s = sliceGeometry(W, H);
    // 按源坐标验证覆盖连续性
    let cursor = 0, contiguous = true;
    for (const x of s) {
      if (x.srcStart > cursor + 1) { contiguous = false; break; }
      cursor = Math.max(cursor, x.srcEnd);
    }
    const baseH = Math.round(H * (W > IMG_MAX_W ? IMG_MAX_W / W : 1));
    ok(contiguous && cursor >= baseH - 2, `${W}×${H}: 连续覆盖到底部`, `cursor=${cursor} baseH=${baseH}`);
  });
}

console.log('\n【5】相邻段之间必须有重叠（防止切断文字行）');
{
  const s = sliceGeometry(1080, 12000);
  ok(s.length > 1, '确实切了多段');
  const overlapPx = s[1].srcStart - s[0].srcEnd;
  // srcEnd 含 overlap，所以相邻段的重叠量 = 上一段的 srcEnd - 下一段 srcStart
  const realOverlap = s[0].srcEnd - s[1].srcStart;
  console.log(`     第1段源区间 [${s[0].srcStart},${s[0].srcEnd}]，第2段源起点 ${s[1].srcStart} → 重叠 ${realOverlap}px`);
  ok(realOverlap > 0, `存在正重叠（实际 ${realOverlap}px，目标 ${IMG_OVERLAP}px）`);
}

console.log('\n【6】每段输出高度不超过 单段上限+重叠，避免请求过大');
{
  [[1080, 12000], [1080, 30000], [1440, 20000]].forEach(([W, H]) => {
    const s = sliceGeometry(W, H);
    const maxOH = Math.max(...s.map((x) => x.outH));
    ok(maxOH <= IMG_MAX_H + IMG_OVERLAP + 2, `${W}×${H}: 最大段高 ${maxOH} ≤ ${IMG_MAX_H + IMG_OVERLAP}`);
  });
}

console.log('\n【7】宽图（横向）不应被误判为长图');
{
  const s = sliceGeometry(3000, 1500);
  ok(s.length === 1, '横向宽图不切片');
  ok(s[0].outW === 1400, '宽度缩到 1400 上限', 'got ' + s[0].outW);
}

console.log('\n【8】正方形 / 小图 保持原样');
{
  const s1 = sliceGeometry(800, 800);
  ok(s1.length === 1 && s1[0].outW === 800 && s1[0].outH === 800, '800×800 保持原尺寸');

  const s2 = sliceGeometry(100, 100);
  ok(s2.length === 1 && s2[0].outW === 100, '100×100 不被放大');
}

console.log('\n【9】阈值边界');
{
  const s1 = sliceGeometry(1000, 2400);
  ok(s1.length === 1, '高宽比 =2.4（等于阈值）且 baseH 2400 > 2000 → 不切（因比值未超）', 'got ' + s1.length);

  const s2 = sliceGeometry(1000, 2600);
  ok(s2.length === 2, '高宽比 2.6 > 阈值 且 baseH 2600 > 2000 → 应切片', 'got ' + s2.length + ' 段');
}

console.log('\n【10】极端细长条 200×20000');
{
  const s = sliceGeometry(200, 20000);
  ok(s[0].outW === 200, '窄图宽度不变（200 < 1400）');
  ok(s.length <= IMG_MAX_SLICES, `段数钳制在 ${IMG_MAX_SLICES} 内`, 'got ' + s.length);
}

console.log('\n【11】常见长截图尺寸实测');
{
  const cases = [
    [1080, 3000], [1080, 5000], [1080, 8000], [1170, 6000], [1440, 4000],
  ];
  cases.forEach(([W, H]) => {
    const s = sliceGeometry(W, H);
    const info = s.map((x) => `${x.outW}×${x.outH}`).join(' + ');
    console.log(`     ${W}×${H} → ${s.length} 段: ${info}`);
    ok(s.length >= 1 && s.length <= IMG_MAX_SLICES, `${W}×${H} 段数合理`);
    ok(s.every((x) => x.outW >= Math.min(W, IMG_MAX_W) - 1), `${W}×${H} 每段宽度未被压缩`);
  });
}

console.log('\n\n==============================================');
console.log(`结果：${pass} 通过, ${fail} 失败`);
console.log('==============================================\n');
process.exit(fail ? 1 : 0);
