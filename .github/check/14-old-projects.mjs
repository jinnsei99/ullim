// 점검 4 (ROADMAP 0-14): 예전 프로젝트 열기.
// `.github/check/projects/날짜/`에 얼려 둔 견본 `.ullim.json`(그날 형식으로 앱이 저장한 파일)을 지금 앱으로 열어 본다.
// 앱은 0-13과 같은 방식으로 띄운다: 작은 웹 서버(/ullim/ 주소) + Actions에 깔린 구글 크롬(헤드리스) + CDP 직접.
// 견본마다: 파일에 적힌 트랙 · 리턴 · 장치 · 클립 수를 센다 → `U.normalize()`를 지난 뒤 다시 센다 →
//           앱의 '파일 열기'와 같은 길(`U.files.openFile`)로 실제로 열어 화면에 띄운 뒤 다시 센다.
// 빨강: normalize · 파일 열기가 오류를 냄 · 연 뒤 콘솔 오류 · 수가 하나라도 달라짐(사라진 장치 종류를 적는다) ·
//       열린 곡 이름이 다름 · 견본이 없거나 못 읽음 · 크롬을 못 찾거나 앱이 20초 안에 안 열림.
// 견본은 한 번 넣으면 고치지 않는다. 형식이 바뀌면 새 날짜 폴더를 더한다(`projects/README.md`).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const BASE = '/ullim/';
const SAMPLES = '.github/check/projects';
const OPEN_MS = 20000, SETTLE_MS = 1500, ALL_MS = 150000;
const PREFS = { welcomed: true, designIntro: true, design: 'a', uiMode: 'desktop' };   // 시작 창 · 안내 없이
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [], warnings = [], okLines = [];
let chrome = null, server = null, profile = null, origin = '';
let current = { name: '앱 열기', errors: [], urls: new Map() };   // CDP 사건(콘솔 오류 등)을 지금 여는 견본에 붙인다

// ---------- 1. 웹 서버: 저장소 맨 위를 /ullim/ 아래에. .git · .github는 사이트처럼 없는 것으로 (13-app-open.mjs와 같음) ----------
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

// ---------- 2. 크롬 켜기 (13-app-open.mjs와 같음) ----------
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

// ---------- 3. CDP: 명령을 보내고 답을 기다리기, 오류 사건은 지금 여는 견본에 (13-app-open.mjs를 줄임) ----------
const pages = new Set();   // 앱 페이지와 그 페이지가 만든 워커의 CDP 세션
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
      } else if (pages.has(m.sessionId)) onEvent(send, m);
    };
    ws.onopen = () => ok(send);
    ws.onerror = () => fail(new Error('크롬 개발자 도구에 연결하지 못했다'));
  });
}
const short = url => (url || '').startsWith(origin + BASE) ? url.slice((origin + BASE).length) : (url || '').startsWith('blob:') ? '문자열로 만든 워커' : url;
function where(text, url, line) {
  const m = String(text || '').match(/\/ullim\/([^\s():]+):(\d+):\d+/);
  if (m) return `${m[1]} ${m[2]}번째 줄: `;
  return url ? `${short(url)}${line != null ? ` ${line + 1}번째 줄` : ''}: ` : '';
}
const firstLine = s => String(s).split('\n')[0];
function onEvent(send, { method, params: p }) {
  const s = current;
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
    pages.add(p.sessionId);
    send('Runtime.enable', {}, p.sessionId).catch(() => {});
    send('Runtime.runIfWaitingForDebugger', {}, p.sessionId).catch(() => {});
  }
}
function loadFail(s, url, why) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
  if (url.startsWith(origin + '/')) s.errors.push(`불러오지 못함 · ${short(url)} (${why})`);
  else warnings.push(`${s.name}: 바깥 파일을 불러오지 못함 · ${url} (${why})`);
}

// ---------- 4. 견본 찾기: projects/날짜/*.ullim.json ----------
function findSamples() {
  if (!existsSync(SAMPLES)) return [];
  const out = [];
  for (const dir of readdirSync(SAMPLES).sort()) {
    const d = join(SAMPLES, dir);
    if (!statSync(d).isDirectory()) continue;
    for (const f of readdirSync(d).sort()) if (f.endsWith('.ullim.json')) out.push({ label: `${dir}/${f.replace(/\.ullim\.json$/, '')}`, file: f, path: join(d, f) });
  }
  return out;
}

// 앱 페이지 안에서 도는 함수(Node에서는 실행하지 않고 글자로 보낸다): 세고 → normalize → 세고 → 파일 열기 → 세기
async function probe(fname, text) {
  const count = p => {
    const all = p.tracks.concat(p.returns || [], p.master ? [p.master] : []);
    const kinds = {};
    let devices = 0, clips = 0;
    for (const t of all) {
      for (const d of t.devices || []) { devices++; kinds[d.kind] = (kinds[d.kind] || 0) + 1; }
      for (const c of t.slots || []) if (c) clips++;
      clips += (t.arr || []).length;
    }
    return { tracks: p.tracks.length, returns: (p.returns || []).length, devices, clips, kinds };
  };
  const proj = s => { const d = JSON.parse(s); return d.project || d; };   // 앱의 readData와 같은 규칙
  const msg = e => String((e && e.message) || e);
  const out = {};
  try { const p = proj(text); out.name = p.name; out.file = count(p); } catch (e) { out.readErr = msg(e); return out; }
  try { out.norm = count(U.normalize(proj(text))); } catch (e) { out.normErr = msg(e); }
  try {
    const ok = await U.files.openFile(new File([text], fname, { type: 'application/json' }));
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 400)));   // 화면을 다시 그리고 조금 더
    if (ok) out.open = Object.assign({ name: U.project.name }, count(U.project));
    else out.openErr = '앱이 "울림 프로젝트 파일이 아니에요"로 거절했다';
  } catch (e) { out.openErr = msg(e); }
  return out;
}

// 두 셈이 다르면 무엇이 몇 → 몇인지, 사라지거나 생긴 장치 종류까지
const WORD = { tracks: '트랙', returns: '리턴', devices: '장치', clips: '클립' };
function diff(a, b) {
  const out = [];
  for (const k of Object.keys(WORD)) if (a[k] !== b[k]) out.push(`${WORD[k]} ${a[k]} → ${b[k]}`);
  for (const k of new Set([...Object.keys(a.kinds), ...Object.keys(b.kinds)])) {
    const x = a.kinds[k] || 0, y = b.kinds[k] || 0;
    if (x > y) out.push(`사라진 장치 종류 '${k}' ${x - y}개`);
    else if (y > x) out.push(`생긴 장치 종류 '${k}' ${y - x}개`);
  }
  return out;
}

// ---------- 5. 앱을 한 번 열고 견본을 차례로 ----------
async function run(send, samples) {
  const { browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: sid } = await send('Target.attachToTarget', { targetId, flatten: true });
  pages.add(sid);
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    if (r.exceptionDetails) throw new Error(firstLine((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
    return r.result.value;
  };
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await send(m, {}, sid);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
  const json = JSON.stringify(JSON.stringify(PREFS));
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('ullim:prefs:v1', ${json}); } catch (e) {}` }, sid);
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid);
  const nav = await send('Page.navigate', { url: origin + BASE }, sid);
  if (nav.errorText) throw new Error(`주소를 열지 못했다 (${nav.errorText})`);
  const until = Date.now() + OPEN_MS;
  let open = false;
  while (!open && Date.now() < until) {
    await sleep(200);
    open = await evaluate(`!!(window.U && U.project && U.files && U.normalize && document.querySelector('.tr.play'))`).catch(() => false);
  }
  if (!open) throw new Error(`앱이 ${OPEN_MS / 1000}초 안에 열리지 않았다`);
  await sleep(SETTLE_MS);
  if (current.errors.length) for (const e of current.errors) problems.push(`앱 열기: ${e}`);

  for (const s of samples) {
    current = { name: s.label, errors: [], urls: new Map() };
    let r = null;
    try {
      const text = readFileSync(s.path, 'utf8');
      r = await evaluate(`(${probe.toString()})(${JSON.stringify(s.file)}, ${JSON.stringify(text)})`);
    } catch (err) { current.errors.push(err.message); }
    await sleep(200);   // 연 뒤 늦게 나는 오류까지
    const bad = [...current.errors];
    if (r) {
      if (r.readErr) bad.push(`파일을 읽지 못했다 (${r.readErr})`);
      if (r.normErr) bad.push(`normalize 오류: ${r.normErr}`);
      else if (r.norm) { const d = diff(r.file, r.norm); if (d.length) bad.push(`normalize 뒤 ${d.join(' · ')}`); }
      if (r.openErr) bad.push(`파일 열기 실패: ${r.openErr}`);
      else if (r.open) {
        const d = diff(r.file, r.open);
        if (d.length) bad.push(`파일로 연 뒤 ${d.join(' · ')}`);
        if (r.open.name !== r.name) bad.push(`열린 곡 이름이 다르다 ('${r.name}' → '${r.open.name}')`);
      }
    }
    const title = r && r.name ? `${s.label} '${r.name}'` : s.label;
    if (bad.length) for (const b of bad) problems.push(`${title}: ${b}`);
    else okLines.push(`${title}: 트랙 ${r.file.tracks} · 장치 ${r.file.devices} · 클립 ${r.file.clips} 그대로`);
  }
  await send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
}

// ---------- 6. 결과: 로그 · Annotations(로그인 없이 보임) · Summary(로그인해야 보임) ----------
let total = 0;
function report() {
  const lines = problems.length
    ? [`예전 프로젝트: 문제 ${problems.length}개 (견본 ${total}개 중 그대로 ${okLines.length}개)`, ...problems.map(p => `  - ${p}`)]
    : [`예전 프로젝트: 견본 ${total}개 모두 그대로 (트랙 · 장치 · 클립 수 바뀐 것 0 · 오류 0)`];
  const detail = [...okLines.map(l => `  ✓ ${l}`), ...warnings.map(w => `  ! 경고 · ${w}`)];
  (problems.length ? console.error : console.log)([...lines, ...detail].join('\n'));
  if (process.env.GITHUB_ACTIONS) {
    // GitHub 규칙: 내용의 % · 줄바꿈은 %25 · %0A로, title 안의 : · ,는 %3A · %2C로 적는다
    const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    const prop = s => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
    const title = prop('점검 0-14 예전 프로젝트');
    console.log(problems.length
      ? `::error title=${title}::${data([...lines, ...okLines.map(l => `  ✓ ${l}`)].join('\n'))}`
      : `::notice title=${title}::${data([lines[0], ...okLines.map(l => `  ✓ ${l}`)].join('\n'))}`);
    if (warnings.length) console.log(`::warning title=${title}::${data(warnings.join('\n'))}`);
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
  const samples = findSamples();
  total = samples.length;
  if (!samples.length) throw new Error(`견본 .ullim.json을 찾지 못했다 (${SAMPLES}/날짜/)`);
  server = createServer(serve);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const c = await launchChrome();
  if (!c) throw new Error('크롬을 찾지 못했다 (google-chrome · chromium. CHROME_PATH로 정할 수 있다)');
  console.log(`크롬: ${c.bin} · 앱 주소: ${origin}${BASE} · 견본 ${samples.length}개`);
  const send = await connect(c.url);
  await run(send, samples);
} catch (err) {
  problems.push(err.message);
}
finish(problems.length ? 1 : 0);
