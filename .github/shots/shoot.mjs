// 화면 촬영 (ROADMAP 0-16): 디자인 A·B·C × 컴퓨터(1440×900) · 아이패드 버전(1180×820) 6장 + 좁은 화면(390×844) 1장.
// 점검이 아니다(이름이 숫자로 시작하지 않아서 .github/check/run.mjs가 돌리지 않는다). '화면 촬영' 워크플로
// (.github/workflows/shots.yml)가 `node .github/shots/shoot.mjs`로 돌리고, 그림은 실행 화면 Artifacts에 zip으로 올라간다.
// 크롬 부분(웹 서버 · 헤드리스 크롬 · CDP · 앱 열기)은 점검과 같은 ../check/lib/browser.mjs를 쓴다.
//
// 매번 똑같이 찍히게(0-18 전후 비교용):
//   어두운 화면(prefers-color-scheme: dark)으로 고정 · '움직임 줄이기'(prefers-reduced-motion)로 앱 CSS의 애니메이션 · 전환을 끔 ·
//   재생하지 않음(재생 위치 맨 앞, 소리 막대 0) · 오디오가 켜진 뒤(상태 줄 '소리 켜기' 단추가 사라진 뒤) · 글꼴 4종과
//   화면에 쓰인 글꼴 조각을 다 불러온 뒤 · 창 · 알림 말풍선이 없을 때 · 매 프레임 그리기를 멈추고 글자 커서를 숨긴 뒤에 찍는다.
//   화면마다 빈 저장 공간에서 두 번 따로 열어 찍고, 두 그림이 파일까지 같아야 한다.
// 빨강: 두 그림이 다름 · 글꼴을 다 못 불러옴 · 데모 곡이 아님 · 창이 남음 · 바라던 화면이 아님 · 콘솔 오류 · 크롬 없음 · 시간 초과.
// 빨강이어도 찍은 그림은 올린다(두 그림이 다르면 두 번째 그림도 `-2nd.png`로 함께).
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { BASE, connect, launchChrome, newPage, openApp, sleep, startServer, stop } from '../check/lib/browser.mjs';

const OUT = '_shots';   // 저장소 맨 위 기준. 워크플로가 이 폴더를 올린다(커밋하지 않는다)
const SETTLE_MS = 1500, STEADY_MS = 15000, ALL_MS = 300000;
const PREFS = { welcomed: true, designIntro: true };   // 시작 창 · 디자인 안내를 건너뛴다(0-13과 같음)
const FONTS = ['Black Han Sans', 'IBM Plex Mono', 'IBM Plex Sans Condensed', 'IBM Plex Sans KR'];   // index.html이 구글 글꼴에서 받는 4종
const MEDIA = [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }];
const SHOTS = [
  { file: '01-A-computer-1440x900.png', name: '디자인 A · 컴퓨터 버전', w: 1440, h: 900, prefs: { design: 'a', uiMode: 'desktop' } },
  { file: '02-B-computer-1440x900.png', name: '디자인 B · 컴퓨터 버전', w: 1440, h: 900, prefs: { design: 'b', uiMode: 'desktop' } },
  { file: '03-C-computer-1440x900.png', name: '디자인 C · 컴퓨터 버전', w: 1440, h: 900, prefs: { design: 'c', uiMode: 'desktop' } },
  { file: '04-A-ipad-1180x820.png', name: '디자인 A · 아이패드 버전', w: 1180, h: 820, prefs: { design: 'a', uiMode: 'touch' } },
  { file: '05-B-ipad-1180x820.png', name: '디자인 B · 아이패드 버전', w: 1180, h: 820, prefs: { design: 'b', uiMode: 'touch' } },
  { file: '06-C-ipad-1180x820.png', name: '디자인 C · 아이패드 버전', w: 1180, h: 820, prefs: { design: 'c', uiMode: 'touch' } },
  { file: '07-narrow-390x844.png', name: '좁은 화면 (디자인 A · 아이패드 버전)', w: 390, h: 844, prefs: { design: 'a', uiMode: 'touch' } }
];
const problems = [], warnings = [], rows = [];
const hash = buf => createHash('sha256').update(buf).digest('hex').slice(0, 12);

// 페이지 안에서 계산: 지금 화면 상태. 글꼴 4종은 화면에 안 쓰였어도 불러오게 하고(load), 불러온 조각 수를 센다
const STATE = `(async () => {
  const fonts = ${JSON.stringify(FONTS)};
  await Promise.all(fonts.map(f => document.fonts.load('16px "' + f + '"', '가A1').catch(() => [])));
  await document.fonts.ready;
  const faces = [...document.fonts].filter(f => f.status === 'loaded');
  const have = new Set(faces.map(f => f.family.replace(/^["']|["']$/g, '')));
  const d = U.demoProject();
  return { audio: U.engine.ctx.state, playing: !!U.engine.playing, fontStatus: document.fonts.status, faces: faces.length,
    missing: fonts.filter(f => !have.has(f)), dialog: !!document.querySelector('.dlg-back'), toast: !!document.querySelector('.toast'),
    song: U.project.name, tracks: U.project.tracks.length, demoName: d.name, demoTracks: d.tracks.length,
    design: document.body.dataset.design, touch: document.documentElement.classList.contains('touch'), narrow: document.body.classList.contains('narrow') };
})()`;
// 찍기 직전: 매 프레임 그리기(미터 · 재생 위치 · 깜빡임, js/ui-core.js loop)를 멈추고, 포커스를 풀고, 글자 커서를 숨긴다
const FREEZE = `(() => {
  window.requestAnimationFrame = () => 0;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const st = document.createElement('style');
  st.textContent = '*, *::before, *::after { caret-color: transparent !important; }';
  document.head.append(st);
  return true;
})()`;

// ---------- 1. 한 장 찍기: 빈 저장 공간에서 열고 → 가만해질 때까지 기다리고 → 찍는다. PNG Buffer를 돌려준다 ----------
async function shootOnce(send, s, n) {
  const rec = { name: `${s.name} (${n}번째)`, errors: [], urls: new Map() };
  const page = await newPage(send, rec);
  const run = page.evaluate, sid = page.sid;
  let png = null, st = null;
  try {
    await send('Emulation.setEmulatedMedia', { features: MEDIA }, sid);
    await openApp(send, page, { w: s.w, h: s.h, prefs: Object.assign({}, PREFS, s.prefs),
      ready: `window.U && U.project && U.engine && document.querySelector('.tr.play')` });
    await sleep(SETTLE_MS);

    // 가만해질 때까지: 오디오 켜짐 · 글꼴 다 불러옴(조각 수가 두 번 연속 같음) · 창 · 알림 없음
    const want = { design: s.prefs.design, touch: s.prefs.uiMode === 'touch', narrow: s.w < (s.prefs.uiMode === 'desktop' ? 600 : 860) };
    const until = Date.now() + STEADY_MS;
    let lastFaces = -1, steady = false;
    while (!steady && Date.now() < until) {
      st = await run(STATE);
      steady = st.audio === 'running' && st.fontStatus === 'loaded' && !st.missing.length && !st.dialog && !st.toast && st.faces === lastFaces;
      lastFaces = st.faces;
      if (st.dialog) for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sid);
      if (!steady) await sleep(300);
    }
    if (st.design !== want.design || st.touch !== want.touch || st.narrow !== want.narrow)
      rec.errors.push(`바라던 화면으로 열리지 않았다 (바란 것 ${JSON.stringify(want)} · 열린 것 ${JSON.stringify({ design: st.design, touch: st.touch, narrow: st.narrow })})`);
    if (st.song !== st.demoName || st.tracks !== st.demoTracks) rec.errors.push(`데모 곡이 아니다 (열린 곡 '${st.song}' 트랙 ${st.tracks})`);
    if (st.missing.length) rec.errors.push(`글꼴을 불러오지 못했다: ${st.missing.join(' · ')}`);
    if (!steady) rec.errors.push(`${STEADY_MS / 1000}초 안에 가만해지지 않았다 (오디오 ${st.audio} · 글꼴 ${st.fontStatus} · 창 ${st.dialog ? '있음' : '없음'} · 알림 ${st.toast ? '있음' : '없음'})`);
    if (st.playing) rec.errors.push('재생 중이다');

    await run(FREEZE);
    await sleep(300);   // 커서 숨김 · 포커스 풀기가 화면에 그려지도록
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }, sid);
    png = Buffer.from(shot.data, 'base64');
  } catch (err) {
    rec.errors.push(err.message);
  }
  await page.close();
  for (const e of rec.errors) problems.push(`${rec.name}: ${e}`);
  return { png, faces: st ? st.faces : 0 };
}

// ---------- 2. 화면 하나: 두 번 찍어 같은지 보고 저장 ----------
async function shoot(send, s) {
  const a = await shootOnce(send, s, 1), b = await shootOnce(send, s, 2);
  if (!a.png) return;
  writeFileSync(join(OUT, s.file), a.png);
  const same = !!b.png && a.png.equals(b.png);
  if (b.png && !same) {
    writeFileSync(join(OUT, s.file.replace('.png', '-2nd.png')), b.png);
    problems.push(`${s.name}: 두 번 찍은 그림이 다르다 (${hash(a.png)} · ${hash(b.png)})`);
  }
  rows.push({ file: s.file, name: s.name, hash: hash(a.png), kb: Math.round(a.png.length / 1024), same, faces: a.faces });
}

// ---------- 3. 결과: 로그 · Annotations(로그인 없이 보임) · Summary · _shots/fingerprints.txt ----------
let chromeVer = '';
function report() {
  const allSame = rows.length === SHOTS.length && rows.every(r => r.same);
  const lines = problems.length
    ? [`화면 촬영: 문제 ${problems.length}개 (찍은 그림 ${rows.length}/${SHOTS.length}장)`, ...problems.map(p => `  - ${p}`)]
    : [`화면 촬영: ${rows.length}장 · 화면마다 두 번 찍어 ${allSame ? '모두 같음' : '다른 것 있음'} · 글꼴 ${FONTS.length}종 불러옴 · ${chromeVer}`];
  const detail = rows.map(r => `  ${r.same ? '✓' : '✗'} ${r.file}  ${r.hash}  ${r.kb}KB  글꼴 조각 ${r.faces}개`);
  const warn = warnings.map(w => `  ! 경고 · ${w}`);
  (problems.length ? console.error : console.log)([...lines, ...detail, ...warn].join('\n'));
  try {
    writeFileSync(join(OUT, 'fingerprints.txt'), [`# 화면 촬영 지문 (sha256 앞 12자). 커밋 ${process.env.SHOT_SHA || '?'} · ${chromeVer}`,
      ...rows.map(r => `${r.file} ${r.hash}`), ...problems.map(p => `문제: ${p}`)].join('\n') + '\n');
  } catch { /* 폴더가 없으면 그림도 없다 */ }
  if (process.env.GITHUB_ACTIONS) {
    // GitHub 규칙: 내용의 % · 줄바꿈은 %25 · %0A로, title 안의 : · ,는 %3A · %2C로 적는다
    const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    const prop = s => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
    console.log(problems.length
      ? `::error title=${prop('화면 촬영 0-16')}::${data(lines.join('\n'))}`
      : `::notice title=${prop('화면 촬영 0-16')}::${data([lines[0], ...rows.map(r => `${r.file} ${r.hash}`)].join('\n'))}`);
    if (warnings.length) console.log(`::warning title=${prop('화면 촬영 0-16')}::${data(warnings.join('\n'))}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const table = ['| 그림 | 화면 | 지문 | 크기 | 두 번 같음 |', '|---|---|---|---|---|',
      ...rows.map(r => `| \`${r.file}\` | ${r.name} | \`${r.hash}\` | ${r.kb}KB | ${r.same ? '✅' : '❌'} |`)];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${problems.length ? '❌' : '✅'} ${lines[0]}\n\n${[...lines.slice(1), '', ...table].join('\n')}\n\n`);
  }
}
function finish(code) {
  try { report(); } catch (err) { console.error(err); code = 1; }
  stop();
  process.exit(code);
}

setTimeout(() => { problems.push(`촬영이 ${ALL_MS / 1000}초 안에 끝나지 않았다`); finish(1); }, ALL_MS);
try {
  mkdirSync(OUT, { recursive: true });
  const origin = await startServer();
  const c = await launchChrome();
  if (!c) throw new Error('크롬을 찾지 못했다 (google-chrome · chromium. CHROME_PATH로 정할 수 있다)');
  const send = await connect(c.url, warnings);
  chromeVer = (await send('Browser.getVersion')).product.replace('HeadlessChrome/', '크롬 ');
  console.log(`${chromeVer} (${c.bin}) · 앱 주소: ${origin}${BASE} · 저장: ${OUT}/`);
  for (const s of SHOTS) await shoot(send, s);
} catch (err) {
  problems.push(err.message);
}
finish(problems.length ? 1 : 0);
