// 점검 3 (ROADMAP 0-13): 앱 열기.
// 저장소 파일을 작은 웹 서버로 실제 사이트와 같은 /ullim/ 주소 아래에 띄우고, Actions에 깔려 있는 구글 크롬을
// 화면 없이(헤드리스) 켜서 화면 8가지로 하나씩 연다. 화면마다 새 시크릿 창처럼 빈 저장 공간에서 연다.
// 웹 서버 · 크롬 켜기 · CDP(개발자 도구 통로)는 lib/browser.mjs에 있다(14-old-projects.mjs와 함께 쓴다).
// 화면마다: 열기 → 데모 곡이 불러와졌는지(곡 이름 · 트랙 수) → 재생 단추를 실제로 눌러 2초 재생 → 소리 시계와
// 스케줄러(문자열로 만든 Web Worker 타이머)가 앞으로 갔는지 → 멈춤.
// 빨강: 콘솔 오류 · 잡히지 않은 오류(워커 안 포함) · 앱 파일을 못 불러옴(404 등) · 데모 곡이 안 불러와짐 ·
//       재생이 안 됨 · 크롬을 못 찾거나 앱이 20초 안에 안 열림. 결과에 어느 화면에서 났는지 적는다.
// 바깥 사이트(구글 글꼴 등)를 못 불러온 것은 인터넷 사정일 수 있어서 경고로만 남긴다.
import { appendFileSync } from 'node:fs';
import { BASE, connect, launchChrome, newPage, openApp, sleep, startServer, stop } from './lib/browser.mjs';

const SETTLE_MS = 1500, PLAY_MS = 2000, ALL_MS = 180000;
const PREFS = { welcomed: true, designIntro: true };   // 처음 온 사람 말고는 시작 창 · 안내를 건너뛴다
const SCREENS = [
  { name: '처음 온 사람 (설정 없음 · 1440×900)', w: 1440, h: 900, prefs: null },
  { name: '디자인 A · 컴퓨터 버전', w: 1440, h: 900, prefs: { design: 'a', uiMode: 'desktop' } },
  { name: '디자인 B · 컴퓨터 버전', w: 1440, h: 900, prefs: { design: 'b', uiMode: 'desktop' } },
  { name: '디자인 C · 컴퓨터 버전', w: 1440, h: 900, prefs: { design: 'c', uiMode: 'desktop' } },
  { name: '디자인 A · 아이패드 버전', w: 1180, h: 820, prefs: { design: 'a', uiMode: 'touch' } },
  { name: '디자인 B · 아이패드 버전', w: 1180, h: 820, prefs: { design: 'b', uiMode: 'touch' } },
  { name: '디자인 C · 아이패드 버전', w: 1180, h: 820, prefs: { design: 'c', uiMode: 'touch' } },
  { name: '좁은 화면 (390×844 · 아이패드 버전)', w: 390, h: 844, prefs: { design: 'a', uiMode: 'touch' } }
];
const problems = [], warnings = [], okLines = [];
let demo = null;

// ---------- 1. 화면 하나 열어 보기 ----------
async function openScreen(send, s) {
  s.errors = []; s.urls = new Map();
  const page = await newPage(send, s);   // 이 화면(과 화면이 만든 워커)에서 난 오류는 s.errors에 쌓인다
  const run = page.evaluate, sid = page.sid;
  const say = [];
  try {
    await openApp(send, page, { w: s.w, h: s.h, prefs: s.prefs && Object.assign({}, PREFS, s.prefs),
      ready: `window.U && U.project && U.engine && document.querySelector('.tr.play')` });   // 앱 상태(U.project)와 재생 단추가 생기면
    await sleep(SETTLE_MS);   // 저장된 곡 찾기 · 시작 창 · 안내처럼 열린 뒤 조금 있다 도는 일

    // 바라던 화면 조합으로 열렸는지 (아니면 모두 A로 열려도 조용히 초록이 된다)
    const p = s.prefs || { design: 'a', uiMode: 'desktop' };
    const want = { design: p.design, touch: p.uiMode === 'touch', narrow: s.w < (p.uiMode === 'desktop' ? 600 : 860) };
    const is = await run(`({ design: document.body.dataset.design, touch: document.documentElement.classList.contains('touch'),
      narrow: document.body.classList.contains('narrow') })`);
    if (is.design !== want.design || is.touch !== want.touch || is.narrow !== want.narrow) {
      s.errors.push(`바라던 화면으로 열리지 않았다 (바란 것 ${JSON.stringify(want)} · 열린 것 ${JSON.stringify(is)})`);
    }

    const got = await run(`(() => { const d = U.demoProject(); return { name: U.project.name, tracks: U.project.tracks.length,
      demoName: d.name, demoTracks: d.tracks.length, dialog: !!document.querySelector('.dlg-back') }; })()`);
    demo = demo || { name: got.demoName, tracks: got.demoTracks };
    if (got.name !== got.demoName || got.tracks !== got.demoTracks || !got.tracks) {
      s.errors.push(`데모 곡이 불러와지지 않았다 (열린 곡 '${got.name}' 트랙 ${got.tracks} · 데모 곡 '${got.demoName}' 트랙 ${got.demoTracks})`);
    } else say.push(`데모 곡 트랙 ${got.tracks}`);
    if (!s.prefs) {   // 처음 온 사람: 시작 창이 떴는지 적고, Escape로 닫은 뒤 재생한다
      say.push(got.dialog ? '시작 창 뜸' : '시작 창 안 뜸');
      for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sid);
      await sleep(300);
    }

    // 재생 단추를 실제로 눌러 2초
    const btn = await run(`(() => { for (const b of document.querySelectorAll('.tr.play')) { const r = b.getBoundingClientRect();
      if (r.width && r.height) { const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
        return { x, y, covered: !(hit && b.contains(hit)) }; } } return null; })()`);
    if (!btn) s.errors.push('재생 단추가 보이지 않는다');
    else if (btn.covered) s.errors.push('재생 단추가 다른 것에 가려져 있다');
    else {
      const at = { x: btn.x, y: btn.y, button: 'left', clickCount: 1 };
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y }, sid);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', buttons: 1, ...at }, sid);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', buttons: 0, ...at }, sid);
      await sleep(PLAY_MS);
      const e = await run(`({ playing: U.engine.playing, heard: U.engine.heardBeat() - U.engine.startB,
        sched: U.engine.schedB - U.engine.startB, state: U.engine.ctx.state })`);
      if (!e.playing) s.errors.push(`재생 단추를 눌러도 재생이 시작되지 않았다 (오디오 ${e.state})`);
      else if (!(e.heard >= 1)) s.errors.push(`재생 중인데 소리 시계가 가지 않는다 (2초 동안 ${Number(e.heard).toFixed(1)}박 · 오디오 ${e.state})`);
      else if (!(e.sched >= 1)) s.errors.push(`스케줄러가 음을 앞으로 예약하지 않는다 (2초 동안 ${Number(e.sched).toFixed(1)}박)`);
      else say.push(`재생 ${e.heard.toFixed(1)}박`);
      await run('U.engine.stop(), true').catch(() => {});
      await sleep(300);   // 멈춘 뒤 늦게 나는 오류까지
    }
  } catch (err) {
    s.errors.push(err.message);
  }
  await page.close();
  if (s.errors.length) for (const e of s.errors) problems.push(`${s.name}: ${e}`);
  else okLines.push(`${s.name}: 오류 0 · ${say.join(' · ')}`);
}

// ---------- 2. 결과: 로그 · Annotations(로그인 없이 보임) · Summary(로그인해야 보임) ----------
function report() {
  const bad = SCREENS.filter(s => s.errors && s.errors.length).length;
  const lines = problems.length
    ? [`앱 열기: 문제 ${problems.length}개 (화면 ${SCREENS.length}개 중 ${bad}개)`, ...problems.map(p => `  - ${p}`)]
    : [`앱 열기: 화면 ${SCREENS.length}개 콘솔 오류 0 · 데모 곡 '${demo.name}' 트랙 ${demo.tracks}개 불러옴 · 재생 ${okLines.length}/${SCREENS.length}`];
  const detail = [...okLines.map(l => `  ✓ ${l}`), ...warnings.map(w => `  ! 경고 · ${w}`)];
  (problems.length ? console.error : console.log)([...lines, ...detail].join('\n'));
  if (process.env.GITHUB_ACTIONS) {
    // GitHub 규칙: 내용의 % · 줄바꿈은 %25 · %0A로, title 안의 : · ,는 %3A · %2C로 적는다
    const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    const prop = s => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
    console.log(problems.length
      ? `::error title=${prop('점검 0-13 앱 열기')}::${data(lines.join('\n'))}`
      : `::notice title=${prop('점검 0-13 앱 열기')}::${data(lines[0])}`);
    if (warnings.length) console.log(`::warning title=${prop('점검 0-13 앱 열기')}::${data(warnings.join('\n'))}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const mark = problems.length ? '❌' : '✅';
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${mark} ${lines[0]}\n${[...lines.slice(1), ...detail].join('\n')}\n\n`);
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
  for (const s of SCREENS) await openScreen(send, s);
} catch (err) {
  problems.push(err.message);
}
finish(problems.length ? 1 : 0);
