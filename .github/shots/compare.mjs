// 전후 비교 (ROADMAP 0-18): 바꾸기 전 그림과 바꾼 뒤 그림을 이름끼리 짝지어 점마다 대 보고, 달라진 그림 목록을 낸다.
// '화면 촬영' 워크플로(.github/workflows/shots.yml)가 같은 실행 · 같은 크롬 · 같은 촬영 코드(이 PR의 shoot.mjs)로
//   후 = 이 PR(또는 손으로 고른 브랜치)의 앱 파일 → _shots/
//   전 = main과 갈라진 지점(merge-base)의 앱 파일 → _shots/before/
// 를 찍은 뒤 `node .github/shots/compare.mjs`로 돌린다. 크롬 판 · 글꼴 파일 · 찍는 법이 양쪽 같으므로, 달라진 것은 앱 파일 탓이다.
//
// 결과: 로그 · Annotations(로그인 없이 보임) · Summary · _shots/compare/changes.txt, 그리고 달라진 그림마다
//   _shots/compare/<이름>.png = 왼쪽 전 | 가운데 후 | 오른쪽 차이(후를 흐린 회색으로 깔고 달라진 점은 빨강, 영역은 파란 상자).
// 그림마다 달라진 점 수(색이 조금이라도 다른 점) · 비율 · 색 차이 최댓값(0~255) · 영역(16점 칸으로 묶어 붙은 칸끼리 한 덩어리)을 적는다.
// 달라져도 빨강으로 만들지 않는다(디자인을 바꾸는 PR은 달라지는 게 정상). 늘 0으로 끝나고 목록만 보여 준다.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, encodePng } from './png.mjs';

const AFTER = process.env.SHOT_AFTER || '_shots', BEFORE = process.env.SHOT_BEFORE || join(AFTER, 'before'), OUT = join(AFTER, 'compare');
const CELL = 16, MAX_AREAS = 5, GAP = 12;
const GAP_RGB = [128, 128, 128], DOT_RGB = [230, 0, 40], BOX_RGB = [0, 110, 255];
const BASE = process.env.COMPARE_BASE || '', HEAD = process.env.SHOT_SHA || '';
const short = s => (s || '?').slice(0, 7);
const pngs = dir => existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.png') && !f.endsWith('-2nd.png')).sort() : [];
const num = n => n.toLocaleString('en-US');

// 두 그림을 점마다 비교: 달라진 점 수 · 색 차이 최댓값 · 영역 목록 · 차이 그림(전 | 후 | 차이)
function diff(A, B) {
  const { w, h } = A, cw = Math.ceil(w / CELL), ch = Math.ceil(h / CELL);
  const cells = new Map();   // 칸 번호 → 그 칸에서 달라진 점의 [x0, y0, x1, y1, 수]
  const mask = new Uint8Array(w * h);
  let n = 0, max = 0;
  for (let y = 0; y < h; y++) {
    const ra = A.rows[y], rb = B.rows[y];
    if (A.bpp === B.bpp && ra.equals(rb)) continue;
    for (let x = 0; x < w; x++) {
      let d = 0;
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(ra[x * A.bpp + k] - rb[x * B.bpp + k]));
      if (!d) continue;
      n++; max = Math.max(max, d); mask[y * w + x] = 1;
      const id = ((y / CELL) | 0) * cw + ((x / CELL) | 0), c = cells.get(id);
      if (c) { c[0] = Math.min(c[0], x); c[1] = Math.min(c[1], y); c[2] = Math.max(c[2], x); c[3] = Math.max(c[3], y); c[4]++; }
      else cells.set(id, [x, y, x, y, 1]);
    }
  }
  // 붙은 칸(옆 · 위아래 · 대각선)끼리 묶어 영역 하나로
  const areas = [], seen = new Set();
  for (const start of cells.keys()) {
    if (seen.has(start)) continue;
    const a = [Infinity, Infinity, -1, -1, 0], stack = [start];
    seen.add(start);
    while (stack.length) {
      const id = stack.pop(), c = cells.get(id), cx = id % cw, cy = (id / cw) | 0;
      a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[2]); a[3] = Math.max(a[3], c[3]); a[4] += c[4];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy, nid = ny * cw + nx;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || seen.has(nid) || !cells.has(nid)) continue;
        seen.add(nid); stack.push(nid);
      }
    }
    areas.push(a);
  }
  areas.sort((p, q) => q[4] - p[4]);
  return { n, max, areas, mask };
}

// 전 | 후 | 차이 세 칸 그림
function triptych(A, B, { mask, areas }) {
  const { w, h } = A, W = w * 3 + GAP * 2, rgb = Buffer.alloc(W * h * 3);
  const put = (x, y, r, g, b) => { const p = (y * W + x) * 3; rgb[p] = r; rgb[p + 1] = g; rgb[p + 2] = b; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < W; x++) put(x, y, ...GAP_RGB);
    for (let x = 0; x < w; x++) {
      const a = A.rows[y], b = B.rows[y], ia = x * A.bpp, ib = x * B.bpp;
      put(x, y, a[ia], a[ia + 1], a[ia + 2]);
      put(w + GAP + x, y, b[ib], b[ib + 1], b[ib + 2]);
      if (mask[y * w + x]) put(2 * (w + GAP) + x, y, ...DOT_RGB);
      else { const v = Math.round(0.3 * (0.299 * b[ib] + 0.587 * b[ib + 1] + 0.114 * b[ib + 2]) + 0.7 * 235); put(2 * (w + GAP) + x, y, v, v, v); }
    }
  }
  // 영역마다 파란 상자(2점 굵기, 3점 바깥에)
  const ox = 2 * (w + GAP);
  for (const [x0, y0, x1, y1] of areas) {
    const L = Math.max(0, x0 - 4), T = Math.max(0, y0 - 4), R = Math.min(w - 1, x1 + 4), Bm = Math.min(h - 1, y1 + 4);
    for (let t = 0; t < 2; t++) {
      for (let x = L; x <= R; x++) { put(ox + x, Math.min(h - 1, T + t), ...BOX_RGB); put(ox + x, Math.max(0, Bm - t), ...BOX_RGB); }
      for (let y = T; y <= Bm; y++) { put(ox + Math.min(w - 1, L + t), y, ...BOX_RGB); put(ox + Math.max(0, R - t), y, ...BOX_RGB); }
    }
  }
  return encodePng(W, h, rgb);
}

const rows = [], notes = [];
const sameCommit = !!BASE && BASE === HEAD;
try {
  const before = pngs(BEFORE), after = pngs(AFTER);
  if (sameCommit) notes.push(`전과 후가 같은 커밋(${short(HEAD)})이라 비교하지 않았다`);
  else if (!before.length) notes.push(`전 그림이 없다 (${BEFORE}/). 전 촬영 단계를 본다`);
  else {
    mkdirSync(OUT, { recursive: true });
    for (const file of [...new Set([...before, ...after])].sort()) {
      if (!after.includes(file)) { rows.push({ file, kind: '없어짐', text: '후에 없는 그림' }); continue; }
      if (!before.includes(file)) { rows.push({ file, kind: '새 그림', text: '전에 없던 그림' }); continue; }
      const pa = readFileSync(join(BEFORE, file)), pb = readFileSync(join(AFTER, file));
      if (pa.equals(pb)) { rows.push({ file, kind: '같음' }); continue; }
      const A = decodePng(pa), B = decodePng(pb);
      if (A.w !== B.w || A.h !== B.h) { rows.push({ file, kind: '크기 다름', text: `${A.w}×${A.h} → ${B.w}×${B.h}` }); continue; }
      const d = diff(A, B);
      if (!d.n) { rows.push({ file, kind: '같음', text: '점은 모두 같음(파일만 다름)' }); continue; }
      writeFileSync(join(OUT, file), triptych(A, B, d));
      const area = ([x0, y0, x1, y1]) => `(${x0},${y0})–(${x1},${y1}) ${x1 - x0 + 1}×${y1 - y0 + 1}`;
      const shown = d.areas.slice(0, MAX_AREAS).map(area).join(' · ') + (d.areas.length > MAX_AREAS ? ` 외 ${d.areas.length - MAX_AREAS}곳` : '');
      rows.push({ file, kind: '달라짐', n: d.n, pct: (100 * d.n / (A.w * A.h)).toFixed(2), max: d.max, areas: d.areas.length,
        text: `점 ${num(d.n)}개 (${(100 * d.n / (A.w * A.h)).toFixed(2)}%) · 색 차이 최대 ${d.max} · 영역 ${d.areas.length}곳 ${shown}` });
    }
  }
} catch (err) {
  notes.push(`비교하다 멈췄다: ${err.message}`);
}

// ---------- 결과 ----------
const changed = rows.filter(r => r.kind !== '같음');
const head = notes.length && !rows.length
  ? `전후 비교: ${notes[0]}`
  : `전후 비교: ${rows.length}장 중 달라진 그림 ${changed.length}장 (전 ${short(BASE)} → 후 ${short(HEAD)})`;
const list = changed.map(r => `${r.file} · ${r.kind}${r.text ? ` · ${r.text}` : ''}`);
const legend = changed.some(r => r.kind === '달라짐') ? ['차이 그림: zip의 compare/ 폴더 (왼쪽 전 | 가운데 후 | 오른쪽 차이 — 빨강이 달라진 점, 파란 상자가 영역)'] : [];
console.log([head, ...list.map(l => `  ${l}`), ...notes.slice(rows.length ? 0 : 1).map(n => `  ! ${n}`), ...legend.map(l => `  ${l}`)].join('\n'));
if (existsSync(OUT)) writeFileSync(join(OUT, 'changes.txt'), [`# ${head}`, ...legend.map(l => `# ${l}`), ...list, ...notes.map(n => `참고: ${n}`)].join('\n') + '\n');
if (process.env.GITHUB_ACTIONS) {
  const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const title = '전후 비교 0-18'.replace(/:/g, '%3A').replace(/,/g, '%2C');
  console.log(`::notice title=${title}::${data([head, ...list, ...legend].join('\n'))}`);
  if (notes.length && rows.length) console.log(`::warning title=${title}::${data(notes.join('\n'))}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const table = rows.length ? ['| 그림 | 결과 | 달라진 점 | 색 차이 최대 | 영역 |', '|---|---|---|---|---|',
    ...rows.map(r => r.kind === '달라짐'
      ? `| \`${r.file}\` | 🔶 달라짐 | ${num(r.n)}개 (${r.pct}%) | ${r.max} | ${r.areas}곳 |`
      : `| \`${r.file}\` | ${r.kind === '같음' ? '같음' : `🔶 ${r.kind}`} | ${r.text && r.kind !== '같음' ? r.text : ''} | | |`)] : [];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [`### ${head}`, '', ...list.map(l => `- ${l}`), ...legend.map(l => `- ${l}`),
    ...notes.map(n => `- 참고: ${n}`), '', ...table, ''].join('\n') + '\n');
}
process.exit(0);
