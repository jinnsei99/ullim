// 점검이 함께 쓰는 크롬 부분: 웹 서버 · 크롬 켜기 · CDP. 지금 쓰는 검사는 13-app-open.mjs · 14-old-projects.mjs.
// 이 파일은 검사가 아니다(run.mjs는 `숫자-이름.mjs`만 돌린다). 검사 파일에서 `import … from './lib/browser.mjs'`로 쓴다.
// 저장소 파일을 작은 웹 서버로 실제 사이트와 같은 /ullim/ 주소 아래에 띄우고, Actions에 깔려 있는 구글 크롬을
// 화면 없이(헤드리스) 켠다. 크롬은 개발자 도구 통로(CDP)로 직접 움직인다. Node 24 기본 기능(WebSocket)만 쓰므로 설치할 것이 없다.
//
// 쓰는 순서: startServer() → launchChrome() → connect(크롬 주소, 경고 목록) → newPage(send, 기록) → openApp(send, 페이지, …)
//            → 검사 → 페이지.close() → … → 끝날 때 stop().
// 기록 = { name, errors: [], urls: new Map() }. 그 페이지와 페이지가 만든 워커에서 난 오류(콘솔 오류 · 잡히지 않은 오류 ·
// 앱 파일 못 불러옴)가 errors에 쌓인다. 기록 대신 "지금 기록을 돌려주는 함수"를 넘기면 사건이 날 때마다 그 함수가 고른 기록에 쌓인다.
// 바깥 사이트(구글 글꼴 등)를 못 불러온 것은 connect에 넘긴 경고 목록에 `기록 이름: …`으로 쌓인다.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

export const BASE = '/ullim/';
export const OPEN_MS = 20000;   // 크롬이 켜질 때까지 · 앱이 열릴 때까지 기다리는 시간
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const firstLine = s => String(s).split('\n')[0];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};
let chrome = null, server = null, profile = null, origin = '', warnings = [];

// ---------- 1. 웹 서버: 저장소 맨 위를 /ullim/ 아래에. .git · .github는 사이트처럼 없는 것으로 ----------
const ROOT = resolve('.');   // 검사는 저장소 맨 위에서 실행된다
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
// 띄우고 주소(http://127.0.0.1:포트)를 돌려준다
export async function startServer() {
  server = createServer(serve);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  return origin;
}

// ---------- 2. 크롬 켜기: 개발자 도구 주소(ws://…)를 받을 때까지. 못 찾으면 null ----------
export async function launchChrome() {
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

// ---------- 3. CDP: 명령을 보내고 답을 기다리기, 사건(콘솔 오류 등)은 세션마다 정한 기록에 ----------
const sessions = new Map();   // CDP 세션 → 기록(또는 기록을 돌려주는 함수)
const recordOf = sid => { const r = sessions.get(sid); return typeof r === 'function' ? r() : r; };
// 연결하고 send(method, params, sessionId)를 돌려준다. 바깥 파일 경고는 warn 목록에 쌓는다
export function connect(url, warn) {
  warnings = warn;
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
      } else if (sessions.has(m.sessionId)) onEvent(send, m);
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

function onEvent(send, { method, params: p, sessionId }) {
  const s = recordOf(sessionId);
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
  } else if (method === 'Target.attachedToTarget') {   // 앱이 만든 워커도 오류를 보게(기록은 그 페이지와 같은 것)
    sessions.set(p.sessionId, sessions.get(sessionId));
    send('Runtime.enable', {}, p.sessionId).catch(() => {});
    send('Runtime.runIfWaitingForDebugger', {}, p.sessionId).catch(() => {});
  }
}
function loadFail(s, url, why) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
  if (url.startsWith(origin + '/')) s.errors.push(`불러오지 못함 · ${short(url)} (${why})`);
  else warnings.push(`${s.name}: 바깥 파일을 불러오지 못함 · ${url} (${why})`);
}

// ---------- 4. 페이지: 빈 저장 공간(새 시크릿 창처럼)에 빈 탭 하나 → 앱 열기 ----------
// { sid, evaluate(식), close() }를 돌려준다. evaluate는 페이지 안에서 식을 계산해 값을 돌려주고, 오류면 던진다
export async function newPage(send, record) {
  const { browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: sid } = await send('Target.attachToTarget', { targetId, flatten: true });
  sessions.set(sid, record);
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    if (r.exceptionDetails) throw new Error(firstLine((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
    return r.result.value;
  };
  const close = () => send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  return { sid, evaluate, close };
}

// 창 크기 w×h, 앱 설정 prefs(앱이 읽기 전에 `ullim:prefs:v1`에 넣는다. null이면 설정 없음)로 앱 주소를 열고,
// ready 식이 참이 될 때까지 기다린다. 20초 안에 안 열리면 던진다
export async function openApp(send, { sid, evaluate }, { w, h, prefs, ready }) {
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await send(m, {}, sid);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sid);
  if (prefs) {
    const json = JSON.stringify(JSON.stringify(prefs));
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('ullim:prefs:v1', ${json}); } catch (e) {}` }, sid);
  }
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid);
  const nav = await send('Page.navigate', { url: origin + BASE }, sid);
  if (nav.errorText) throw new Error(`주소를 열지 못했다 (${nav.errorText})`);
  const until = Date.now() + OPEN_MS;
  let open = false;
  while (!open && Date.now() < until) {
    await sleep(200);
    open = await evaluate(`!!(${ready})`).catch(() => false);
  }
  if (!open) throw new Error(`앱이 ${OPEN_MS / 1000}초 안에 열리지 않았다`);
}

// ---------- 5. 끝 정리: 크롬 · 웹 서버를 끄고 크롬 임시 폴더를 지운다 ----------
export function stop() {
  if (chrome) chrome.kill();
  if (server) server.close();
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch { /* 크롬이 아직 쥐고 있으면 그대로 둔다 */ }
}
