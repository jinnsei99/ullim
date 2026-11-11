// 점검 5 (ROADMAP 0-15): 장르 템플릿 10종 렌더.
// 앱이 가진 장르 템플릿(`U.GENRES`)마다 `U.genreProject(id)`로 새 프로젝트를 만들고, 그 템플릿에서 가장 꽉 찬 씬
// (클립이 가장 많은 씬)을 4마디 렌더해서 소리 크기를 잰다. 렌더는 내보내기 창의 '세션 씬 하나 · 길이 4마디'와 같은 길이다
// (`U.renderOffline`, 44.1kHz, 끝 여운 2초). 앱은 0-13 · 0-14와 같은 방식(lib/browser.mjs, 헤드리스 크롬)으로 한 번 연다.
// 재는 값(dBFS, 0이 디지털 한계): RMS = 4마디 동안의 평균 크기, 피크 = 가장 큰 한 점(끝 여운까지).
// 빨강: 무음(RMS가 -60 dB 아래) · 넘침(피크가 0 dBFS 위, 샘플 값 1.0 초과) · 숫자가 아닌 값(NaN · 무한대) ·
//       클립이 있는 씬이 없음 · 렌더 오류 · 렌더하는 동안 콘솔 오류 · 장르 목록을 못 찾음 · 크롬을 못 찾음 · 시간 초과.
// 경고만(빨강 아님): RMS가 아래 기준표에서 ±3 dB 넘게 벗어남 · 기준표에 없는 장르 · 기준표에는 있는데 앱에 없는 장르.
//   소리를 일부러 바꿨으면 기준표를 새 값으로 고친다(값은 점검 결과에 그대로 나온다).
import { appendFileSync } from 'node:fs';
import { BASE, connect, launchChrome, newPage, openApp, sleep, startServer, stop } from './lib/browser.mjs';

const BARS = 4, SILENT_DB = -60, WARN_DB = 3;
const SETTLE_MS = 1500, ALL_MS = 240000;
const PREFS = { welcomed: true, designIntro: true, design: 'a', uiMode: 'desktop' };   // 시작 창 · 안내 없이
// 기준표: 장르 → RMS(dB). 2026-11-11 점검(Actions 헤드리스 크롬)이 잰 값
const REF_RMS = {
  house: -11.1, techno: -10.9, trap: -14.9, dnb: -13.1, lofi: -15.0,
  jazzhop: -15.3, rock: -10.5, popband: -12.8, future: -10.9, flip: -10.7
};
const problems = [], warnings = [], rows = [];
let current = { name: '앱 열기', errors: [], urls: new Map() };   // CDP 사건(콘솔 오류 등)을 지금 렌더하는 장르에 붙인다

// 앱 페이지 안에서 도는 함수(Node에서는 실행하지 않고 글자로 보낸다): 템플릿 → 가장 꽉 찬 씬 → 렌더 → 크기
// 무한대는 페이지 밖으로 그대로 못 나오므로 dB 계산은 Node에서 한다(여기서는 0~1 사이 값)
async function probe(id, bars) {
  const p = U.genreProject(id);
  const bar = U.barLen(p.sig);
  const counts = p.scenes.map((s, i) => p.tracks.filter(t => t.slots[i]).length);
  const scene = counts.indexOf(Math.max(...counts));
  const out = { scene, sceneName: (p.scenes[scene] && p.scenes[scene].name) || `씬 ${scene + 1}`, clips: counts[scene] || 0 };
  if (!out.clips) return out;
  const res = await U.renderOffline(p, { from: 0, to: bars * bar, scene, stems: false, sampleRate: 44100, tail: 2 });
  const body = Math.round(bars * bar * 60 / p.bpm * res.sr);   // 4마디 길이(샘플 수), 끝 여운 빼고
  let sum = 0, n = 0, peak = 0, bad = 0;
  for (const c of res.files[0].ch) {
    const m = Math.min(body, c.length);
    n += m;
    for (let i = 0; i < c.length; i++) {
      const a = c[i];
      if (!Number.isFinite(a)) { bad++; continue; }
      const b = Math.abs(a);
      if (b > peak) peak = b;
      if (i < m) sum += a * a;
    }
  }
  return Object.assign(out, { rms: n ? Math.sqrt(sum / n) : 0, peak, bad, sec: res.duration });
}

const toDb = x => x > 0 ? 20 * Math.log10(x) : -Infinity;
const fmt = x => x === -Infinity ? '-∞' : x.toFixed(1);

// ---------- 1. 앱을 한 번 열고 장르를 차례로 ----------
async function run(send) {
  const page = await newPage(send, () => current);   // 사건이 날 때마다 그때 렌더하는 장르(current)에 붙는다
  const { evaluate } = page;
  await openApp(send, page, { w: 1440, h: 900, prefs: PREFS,
    ready: `window.U && U.GENRES && U.genreProject && U.renderOffline && document.querySelector('.tr.play')` });
  await sleep(SETTLE_MS);
  if (current.errors.length) for (const e of current.errors) problems.push(`앱 열기: ${e}`);

  const genres = await evaluate(`U.GENRES.map(g => ({ id: g.id, name: g.name }))`);
  if (!genres || !genres.length) throw new Error('장르 템플릿을 찾지 못했다 (U.GENRES가 비어 있음)');
  for (const id of Object.keys(REF_RMS)) if (!genres.some(g => g.id === id)) warnings.push(`기준표의 장르 '${id}'가 앱에 없다 (지웠으면 기준표에서도 뺀다)`);

  for (const g of genres) {
    current = { name: g.name, errors: [], urls: new Map() };
    let r = null;
    const t0 = Date.now();
    try { r = await evaluate(`(${probe.toString()})(${JSON.stringify(g.id)}, ${BARS})`); }
    catch (err) { current.errors.push(`렌더 오류: ${err.message}`); }
    await sleep(200);   // 렌더 뒤 늦게 나는 오류까지
    const bad = [...current.errors];
    const row = { id: g.id, name: g.name, scene: r ? r.sceneName : '?', rms: null, peak: null, ref: REF_RMS[g.id], ok: false };
    if (r && !r.clips) bad.push('클립이 있는 씬이 없다');
    else if (r) {
      row.rms = toDb(r.rms); row.peak = toDb(r.peak);
      if (r.bad) bad.push(`숫자가 아닌 값(NaN · 무한대) ${r.bad}개`);
      if (row.rms < SILENT_DB) bad.push(`무음 (RMS ${fmt(row.rms)} dB, 기준 ${SILENT_DB} dB 아래)`);
      if (r.peak > 1) bad.push(`넘침 (피크 +${row.peak.toFixed(2)} dBFS, 0 dBFS 위)`);
      if (row.ref == null) warnings.push(`${g.name} (${g.id}): 기준표에 없다 (지금 RMS ${fmt(row.rms)} dB를 기준표에 더한다)`);
      else if (row.rms >= SILENT_DB && Math.abs(row.rms - row.ref) > WARN_DB)
        warnings.push(`${g.name} (${g.id}): RMS ${fmt(row.rms)} dB가 기준 ${fmt(row.ref)} dB에서 ${Math.abs(row.rms - row.ref).toFixed(1)} dB 벗어났다 (일부러 바꿨으면 기준표를 고친다)`);
    }
    row.ok = !bad.length;
    rows.push(row);
    const title = `${g.name} (${row.scene})`;
    for (const b of bad) problems.push(`${title}: ${b}`);
    console.log(`  ${row.ok ? '·' : '✗'} ${title}: RMS ${row.rms == null ? '?' : fmt(row.rms)} · 피크 ${row.peak == null ? '?' : fmt(row.peak)} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  }
  await page.close();
}

// ---------- 2. 결과: 로그 · Annotations(로그인 없이 보임) · Summary(로그인해야 보임) ----------
const line = r => `${r.name} (${r.scene}): RMS ${r.rms == null ? '?' : fmt(r.rms)} dB · 피크 ${r.peak == null ? '?' : fmt(r.peak)} dB`;
function report() {
  const okN = rows.filter(r => r.ok).length;
  const lines = problems.length
    ? [`장르 템플릿: 문제 ${problems.length}개 (${rows.length}종 중 통과 ${okN}종)`, ...problems.map(p => `  - ${p}`)]
    : [`장르 템플릿: ${rows.length}종 모두 소리 남 · 넘침 0 (가장 꽉 찬 씬 ${BARS}마디)`];
  const table = rows.map(r => `  ${r.ok ? '✓' : '✗'} ${line(r)}`);
  const warn = warnings.map(w => `  ! 경고 · ${w}`);
  (problems.length ? console.error : console.log)([...lines, ...table, ...warn].join('\n'));
  if (process.env.GITHUB_ACTIONS) {
    // GitHub 규칙: 내용의 % · 줄바꿈은 %25 · %0A로, title 안의 : · ,는 %3A · %2C로 적는다
    const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    const prop = s => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
    const title = prop('점검 0-15 장르 템플릿');
    console.log(`::${problems.length ? 'error' : 'notice'} title=${title}::${data([...lines, ...table].join('\n'))}`);
    if (warnings.length) console.log(`::warning title=${title}::${data(warnings.join('\n'))}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const mark = problems.length ? '❌' : '✅';
    const md = ['| 장르 | 씬 | RMS (dB) | 피크 (dB) | 기준 RMS | 결과 |', '|---|---|---|---|---|---|',
      ...rows.map(r => `| ${r.name} | ${r.scene} | ${r.rms == null ? '?' : fmt(r.rms)} | ${r.peak == null ? '?' : fmt(r.peak)} | ${r.ref == null ? '없음' : fmt(r.ref)} | ${r.ok ? '✓' : '✗'} |`)];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${mark} ${lines[0]}\n${[...lines.slice(1), ...warn].join('\n')}\n\n${md.join('\n')}\n\n`);
  }
}
function finish(code) {
  try { report(); } catch (err) { console.error(err); code = 1; }
  stop();
  process.exit(code);
}

setTimeout(() => { problems.push(`점검이 ${ALL_MS / 1000}초 안에 끝나지 않았다`); finish(1); }, ALL_MS);
try {
  const origin = await startServer();
  const c = await launchChrome();
  if (!c) throw new Error('크롬을 찾지 못했다 (google-chrome · chromium. CHROME_PATH로 정할 수 있다)');
  console.log(`크롬: ${c.bin} · 앱 주소: ${origin}${BASE}`);
  const send = await connect(c.url, warnings);
  await run(send);
} catch (err) {
  problems.push(err.message);
}
finish(problems.length ? 1 : 0);
