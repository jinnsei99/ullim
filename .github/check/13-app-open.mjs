// 점검 3 (ROADMAP 0-13): 앱 열기.
// 저장소 파일을 작은 웹 서버로 실제 사이트와 같은 /ullim/ 주소 아래에 띄우고, Actions에 깔려 있는 구글 크롬을
// 화면 없이(헤드리스) 켜서 화면 8가지로 하나씩 연다. 화면마다 새 시크릿 창처럼 빈 저장 공간에서 연다.
// 크롬은 개발자 도구 통로(CDP)로 직접 움직인다. Node 24 기본 기능(WebSocket)만 쓰므로 설치할 것이 없다.
// 화면마다: 열기 → 데모 곡이 불러와졌는지(곡 이름 · 트랙 수) → 재생 단추를 실제로 눌러 2초 재생 → 소리 시계와
// 스케줄러(문자열로 만든 Web Worker 타이머)가 앞으로 갔는지 → 멈춤.
// 빨강: 콘솔 오류 · 잡히지 않은 오류(워커 안 포함) · 앱 파일을 못 불러옴(404 등) · 데모 곡이 안 불러와짐 ·
//       재생이 안 됨 · 크롬을 못 찾거나 앱이 20초 안에 안 열림. 결과에 어느 화면에서 났는지 적는다.
// 바깥 사이트(구글 글꼴 등)를 못 불러온 것은 인터넷 사정일 수 있어서 경고로만 남긴다.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const BASE = '/ullim/';
const OPEN_MS = 20000, SETTLE_MS = 1500, PLAY_MS = 2000, ALL_MS = 180000;
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
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [], warnings = [], okLines = [];
let chrome = null, server = null, profile = null, origin = '', demo = null;

// ---------- 1. 웹 서버: 저장소 맨 위를 /ullim/ 아래에. .git · .github는 사이트처럼 없는 것으로 ----------
const ROOT = resolve('.');
function serve(req, res) {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { path = ''; }
  if (!path.startsWith(BASE)) { res.writeHead(path === '/' || path === '/ullim' ? 302 : 404, { Location: BASE }); return res.end(); }
  path = path.slice(BASE.length);
  if (!path || path.endsWith('/')) path += 'index.html';
  const file = resolve(ROOT, path), top = path.split('/')[0];
  if (!file.startsWith(ROOT + sep) || top === '.git' || top === '.github' || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); return res.end('없음');
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
}

// ---------- 2. 크롬 켜기: 개발자 도구 주소(ws://…)를 받을 때까지 ----------
async function launchChrome() {
  profile = mkdtempSync(join(tmpdir(), 'ullim-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', 'about:blank'];
  const bins = [process.env.CHROME_PATH, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const bin of bins) {
    const url = await new Promise(done => {
      const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let buf = '', found = false;
      const timer = setTimeout(() => { p.kill(); done(null); }, OPEN_MS);
      p.on('error', () => { clearTimeout(timer); done(null); });
      p.on('exit', () => { clearTimeout(timer); done(null); });
      p.stderr.on('data', d => {   // 찾은 뒤에도 계속 읽어 줘야 크롬이 멈추지 않는다
        if (found) return;
        const m = (buf += d).match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) { found = true; clearTimeout(timer); chrome = p; done(m[1]); }
      });
    });
    if (url) return { url, bin };
  }
  return null;
}

// ---------- 3. CDP: 명령을 보내고 답을 기다리기, 사건(콘솔 오류 등)은 화면별로 나누기 ----------
const sessions = new Map();   // CDP 세션 → 그 세션이 속한 화면 기록
function connect(url) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(url), wait = new Map();
    let id = 0;
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      wait.set(++id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id) {
        const w = wait.get(m.id); wait.delete(m.id);
        if (w) m.error ? w.reject(new Error(`${w.method}: ${m.error.message}`)) : w.resolve(m.result);
      } else if (sessions.has(m.sessionId)) onEvent(send, sessions.get(m.sessionId), m);
    };
    ws.onopen = () => ok(send);
    ws.onerror = () => fail(new Error('크롬 개발자 도구에 연결하지 못했다'));
  });
}

// 오류가 난 곳: "js/파일.js n번째 줄". 오류 내용(stack)에 적힌 주소를 먼저 본다
const short = url => (url || '').startsWith(origin + BASE) ? url.slice((origin + BASE).length) : (url || '').startsWith('blob:') ? '문자열로 만든 워커' : url;
function where(text, url, line) {
  const m = String(text || '').match(/\/ullim\/([^\s():]+):(\d+):\d+/);
  if (m) return `${m[1]} ${m[2]}번째 줄: `;
  return url ? `${short(url)}${line != null ? ` ${line + 1}번째 줄` : ''}: ` : '';
}
const firstLine = s => String(s).split('\n')[0];

function onEvent(send, s, { method, params: p, sessionId }) {
  if (method === 'Runtime.exceptionThrown') {
    const d = p.exceptionDetails, ex = d.exception || {};
    const text = ex.description || (ex.value !== undefined ? String(ex.value) : d.text);
    s.errors.push(`잡히지 않은 오류 · ${where(text, d.url, d.lineNumber)}${firstLine(text)}`);
  } else if (method === 'Runtime.consoleAPICalled' && (p.type === 'error' || p.type === 'assert')) {
    const text = p.args.map(a => a.value !== undefined ? String(a.value) : a.description || a.type).join(' ');
    const f = ((p.stackTrace || {}).callFrames || [])[0] || {};
    s.errors.push(`콘솔 오류 · ${where(text, f.url, f.lineNumber)}${firstLine(text)}`);
  } else if (method === 'Log.entryAdded' && p.entry.level === 'error' && p.entry.source !== 'network') {
    s.errors.push(`브라우저 오류 · ${where('', p.entry.url, p.entry.lineNumber)}${firstLine(p.entry.text)}`);
  } else if (method === 'Network.requestWillBeSent') {
    s.urls.set(p.requestId, p.request.url);
  } else if (method === 'Network.responseReceived' && p.response.status >= 400) {
    loadFail(s, p.response.url, `${p.response.status}`);
  } else if (method === 'Network.loadingFailed' && !p.canceled && p.errorText !== 'net::ERR_ABORTED') {
    loadFail(s, s.urls.get(p.requestId), p.errorText);
  } else if (method === 'Target.attachedToTarget') {   // 앱이 만든 워커도 오류를 보게
    sessions.set(p.sessionId, s);
    send('Runtime.enable', {}, p.sessionId).catch(() => {});
    send('Runtime.runIfWaitingForDebugger', {}, p.sessionId).catch(() => {});
  }
}
function loadFail(s, url, why) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
  if (url.startsWith(origin + '/')) s.errors.push(`불러오지 못함 · ${short(url)} (${why})`);
  else warnings.push(`${s.name}: 바깥 파일을 불러오지 못함 · ${url} (${why})`);
}

// ---------- 4. 화면 하나 열어 보기 ----------
async function openScreen(send, s) {
  s.errors = []; s.urls = new Map();
  const { browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: sid } = await send('Target.attachToTarget', { targetId, flatten: true });
  sessions.set(sid, s);
  const run = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    if (r.exceptionDetails) throw new Error(firstLine((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
    return r.result.value;
  };
  const say = [];
  try {
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await send(m, {}, sid);
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false }, sid);
    if (s.prefs) {
      const json = JSON.stringify(JSON.stringify(Object.assign({}, PREFS, s.prefs)));
      await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('ullim:prefs:v1', ${json}); } catch (e) {}` }, sid);
    }
    await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid);
    const nav = await send('Page.navigate', { url: origin + BASE }, sid);
    if (nav.errorText) throw new Error(`주소를 열지 못했다 (${nav.errorText})`);

    // 열릴 때까지: 앱 상태(U.project)와 재생 단추가 생기면
    const until = Date.now() + OPEN_MS;
    let open = false;
    while (!open && Date.now() < until) {
      await sleep(200);
      open = await run(`!!(window.U && U.project && U.engine && document.querySelector('.tr.play'))`).catch(() => false);
    }
    if (!open) throw new Error(`앱이 ${OPEN_MS / 1000}초 안에 열리지 않았다`);
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
  await send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  if (s.errors.length) for (const e of s.errors) problems.push(`${s.name}: ${e}`);
  else okLines.push(`${s.name}: 오류 0 · ${say.join(' · ')}`);
}

// ---------- 5. 결과: 로그 · Annotations(로그인 없이 보임) · Summary(로그인해야 보임) ----------
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
  if (chrome) chrome.kill();
  if (server) server.close();
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch { /* 크롬이 아직 쥐고 있으면 그대로 둔다 */ }
  process.exit(code);
}

setTimeout(() => { problems.push(`점검이 ${ALL_MS / 1000}초 안에 끝나지 않았다`); finish(1); }, ALL_MS);
try {
  server = createServer(serve);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const c = await launchChrome();
  if (!c) throw new Error('크롬을 찾지 못했다 (google-chrome · chromium. CHROME_PATH로 정할 수 있다)');
  console.log(`크롬: ${c.bin} · 앱 주소: ${origin}${BASE}`);
  const send = await connect(c.url);
  for (const s of SCREENS) await openScreen(send, s);
} catch (err) {
  problems.push(err.message);
}
finish(problems.length ? 1 : 0);
