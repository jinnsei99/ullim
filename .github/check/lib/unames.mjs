// U 이름 찾기 (ROADMAP 0-19, 0-20도 쓴다): 앱 JS 글에서 전역 `U`에 붙이는 이름과 꺼내 쓰는 이름을 찾는다.
// Node 기능을 쓰지 않는 순수 코드다. 글을 받아 결과를 돌려주므로 브라우저에서도 그대로 불러 돌릴 수 있다.
//
// 찾는 모양 (주석 · 문자열 · 정규식 안은 건너뛴다. 템플릿 문자열의 ${ … } 안은 코드로 읽는다)
//   만듦: `U.이름 = …`(`+=` `||=` `??=` 같은 대입 포함), `Object.assign(U, { 이름, 이름: 값, 이름() {} })`
//   씀:   그 밖의 `U.이름`(`U.이름.속 = …`, `U.이름(…)`, `U?.이름` 포함), `const { 이름, 이름: 별명 } = U`(읽는 순간 꺼냄 = take)
//   `window.U.이름`도 `U.이름`과 같이 센다. 함수 머리의 `(U)`와 `window.U = window.U || {}`는 세지 않는다.
//   그 밖에 `U`를 통째로 쓰는 곳(`U[이름]`, 다른 이름에 담기, 넘기기)은 이름을 알 수 없어서 `others`에 줄 번호만 모은다.
//   만듦 · 씀마다 `now`가 붙는다: 파일이 읽히는 순간 실행되는 자리면 true, 함수 안이라 불릴 때 실행되면 false(`whenRead`, 0-20).

const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
  '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];
// 이 낱말 · 기호 뒤의 `/`는 나눗셈이 아니라 정규식의 시작이다
const BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const ID_START = /[\p{ID_Start}$_]/u;
const ID_PART = /[\p{ID_Continue}$‌‍]/u;

// 글을 낱말(토큰)로 나눈다: { t: 'id' | 'num' | 'str' | 'p'(기호), v, line }
export function tokenize(src) {
  const out = [];
  const tpl = []; // 템플릿 ${ 안에 들어갈 때의 { 깊이
  let i = 0, line = 1, depth = 0;
  const n = src.length;
  const push = (t, v, at) => out.push({ t, v, line: at });
  const prevAllowsRegex = () => {
    const p = out[out.length - 1];
    if (!p) return true;
    if (p.t === 'p') return p.v !== ')' && p.v !== ']';
    if (p.t === 'id') return BEFORE_REGEX.has(p.v);
    return false;
  };
  // 템플릿 글자 부분을 읽는다. ${를 만나면 코드로 돌아가고 true, `로 끝나면 false
  const readTemplate = () => {
    const at = line;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { if (src[i + 1] === '\n') line++; i += 2; continue; }
      if (c === '`') { i++; push('str', '`', at); return false; }
      if (c === '$' && src[i + 1] === '{') { i += 2; push('str', '`', at); tpl.push(depth); depth++; push('p', '${', line); return true; }
      if (c === '\n') line++;
      i++;
    }
    throw new Error(`${at}번째 줄: 템플릿 문자열이 끝나지 않음`);
  };
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === '﻿' || c === ' ' || c === ' ' || c === ' ') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`${line}번째 줄: 주석이 끝나지 않음`);
      for (let k = i; k < end; k++) if (src[k] === '\n') line++;
      i = end + 2; continue;
    }
    if (c === '"' || c === "'") {
      const at = line; i++;
      while (i < n && src[i] !== c) { if (src[i] === '\\') { if (src[i + 1] === '\n') line++; i++; } else if (src[i] === '\n') throw new Error(`${at}번째 줄: 문자열이 끝나지 않음`); i++; }
      i++; push('str', c, at); continue;
    }
    if (c === '`') { i++; readTemplate(); continue; }
    if (c === '}' && tpl.length && tpl[tpl.length - 1] === depth - 1) { tpl.pop(); depth--; i++; push('p', '}$', line); readTemplate(); continue; }
    if (c === '/' && prevAllowsRegex()) {
      const at = line; i++;
      let cls = false;
      while (i < n) {
        const d = src[i];
        if (d === '\n') throw new Error(`${at}번째 줄: 정규식이 끝나지 않음`);
        if (d === '\\') { i += 2; continue; }
        if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break;
        i++;
      }
      i++;
      while (i < n && ID_PART.test(src[i])) i++;
      push('str', '/', at); continue;
    }
    if (ID_START.test(c) || c === '\\') {
      let k = i + 1;
      while (k < n && ID_PART.test(src[k])) k++;
      push('id', src.slice(i, k), line); i = k; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let k = i + 1;
      while (k < n && /[0-9a-zA-Z_.]/.test(src[k])) {
        if ((src[k] === 'e' || src[k] === 'E') && (src[k + 1] === '+' || src[k + 1] === '-') && !/^0[xX]/.test(src.slice(i, k))) k++;
        k++;
      }
      push('num', src.slice(i, k), line); i = k; continue;
    }
    const p = PUNCT.find(s => src.startsWith(s, i)) || c;
    if (p === '{') depth++;
    else if (p === '}') depth--;
    push('p', p, line); i += p.length;
  }
  if (tpl.length) throw new Error('템플릿 문자열의 ${ … }가 끝나지 않음');
  return out;
}

const isP = (tok, v) => tok && tok.t === 'p' && tok.v === v;
const isId = (tok, v) => tok && tok.t === 'id' && (v === undefined || tok.v === v);
const OPEN = { '(': ')', '[': ']', '{': '}', '${': '}$' };
const CLOSE = new Set([')', ']', '}', '}$']);

// toks[j]가 '{'일 때, 그 { … }의 맨 바깥 칸에 있는 이름(객체 열쇠 · 꺼내는 이름)을 돌려준다
function braceKeys(toks, j) {
  const keys = [];
  let d = 0, atKey = true;
  for (let k = j; k < toks.length; k++) {
    const tok = toks[k];
    if (tok.t === 'p' && OPEN[tok.v]) { d++; if (d === 1) { atKey = true; continue; } }
    else if (tok.t === 'p' && CLOSE.has(tok.v)) { d--; if (d === 0) return { keys, end: k }; }
    if (d !== 1) continue;
    if (isP(tok, ',')) { atKey = true; continue; }
    if (!atKey) continue;
    atKey = false;
    if (isP(tok, '...') || isP(tok, '[')) continue;
    let key = tok;
    // async 이름() · get 이름() · set 이름(v) · *이름()
    if (isP(key, '*')) key = toks[++k];
    else if (isId(key) && ['async', 'get', 'set'].includes(key.v) && toks[k + 1] && (toks[k + 1].t === 'id' || toks[k + 1].t === 'str' || isP(toks[k + 1], '*'))) {
      key = toks[++k]; if (isP(key, '*')) key = toks[++k];
    }
    if (key && key.t === 'id') keys.push({ name: key.v, line: key.line });
  }
  return { keys, end: toks.length - 1 };
}

// toks[j]가 '}'일 때 짝이 되는 '{'의 자리
function openOf(toks, j) {
  let d = 0;
  for (let k = j; k >= 0; k--) {
    if (toks[k].t !== 'p') continue;
    if (CLOSE.has(toks[k].v)) d++;
    else if (OPEN[toks[k].v]) { d--; if (d === 0) return k; }
  }
  return -1;
}

// 대입 오른쪽(문장 끝까지)에 같은 이름 `U.이름`이 있으면 앞 값을 이어 받는 것이다(예: U.X = Object.assign(U.X || {}, …))
// 문장 끝: 맨 바깥의 `;`, 감싼 괄호가 닫힘, 또는 세미콜론 없이 줄이 바뀜(앞 줄이 값으로 끝나고 새 줄이 이어지는 기호로 시작하지 않음)
const GOES_ON = new Set(['.', '?.', '?', ':', '||', '&&', '??', '+', '-', '*', '/', '%', ',', '=', '=>', '(', '[']);
function carriesOn(toks, from, name) {
  let d = 0;
  for (let k = from; k < toks.length && k < from + 400; k++) {
    const tok = toks[k], before = toks[k - 1];
    if (d === 0 && k > from && tok.line > before.line && (before.t !== 'p' || [')', ']', '}'].includes(before.v)) && !(tok.t === 'p' && GOES_ON.has(tok.v))) return false;
    if (tok.t === 'p' && OPEN[tok.v]) d++;
    else if (tok.t === 'p' && CLOSE.has(tok.v)) { if (--d < 0) return false; }
    else if (d === 0 && isP(tok, ';')) return false;
    if (isId(tok, 'U') && (isP(toks[k + 1], '.') || isP(toks[k + 1], '?.')) && isId(toks[k + 2], name)) return true;
  }
  return false;
}

// ---- 읽는 순간인가 (ROADMAP 0-20) ----
// 앱 JS는 index.html script 순서대로 읽히면서 바로 실행된다. 이때 실행되는 자리(읽는 순간)와
// 함수 몸통이라 나중에 불릴 때 실행되는 자리를 낱말마다 가른다.
//   나중: `function 이름() { }` · `() => { }` · `() => 값` · 객체 · 클래스의 메서드 · 클래스 몸통의 안
//   읽는 순간: 그 밖의 모든 자리(파일 맨 위, if · for 블록, 객체 { }, `class A extends U.B`의 extends 부분)
//   함수지만 읽는 순간으로 보는 것:
//     가. 그 자리에서 바로 부르는 함수 `(function () { })()` · `(() => { })()` (파일을 감싼 껍데기도 이것)
//     나. 배열을 그 자리에서 도는 함수(RUNS_NOW: forEach · map …)에 넘긴 함수
//     다. 같은 파일에서 이름 붙인 함수(`function f() {}` · `const f = () => …`)를 읽는 순간에 부르면 그 몸통(끝까지 따라간다)
//   보지 않는 것: 다른 파일의 함수(`U.이름()`)를 읽는 순간 부를 때 그 함수의 안, 함수 머리의 기본값(`(a = U.x) =>`)은 읽는 순간으로 셈
const CONTROL = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
const RUNS_NOW = new Set(['forEach', 'map', 'filter', 'reduce', 'reduceRight', 'some', 'every', 'find', 'findIndex',
  'findLast', 'findLastIndex', 'flatMap', 'sort', 'from']);

// 낱말 목록 → 낱말마다 읽는 순간이면 true
export function whenRead(toks) {
  const n = toks.length;
  const match = new Array(n).fill(-1), parent = new Array(n).fill(-1), stack = [];
  for (let i = 0; i < n; i++) {
    parent[i] = stack.length ? stack[stack.length - 1] : -1;
    const tok = toks[i];
    if (tok.t !== 'p') continue;
    if (OPEN[tok.v]) stack.push(i);
    else if (CLOSE.has(tok.v)) {
      const o = stack.pop();
      if (o === undefined || OPEN[toks[o].v] !== tok.v) throw new Error(`${tok.line}번째 줄: 괄호 짝이 맞지 않음`);
      match[o] = i; match[i] = o; parent[i] = parent[o];
    }
  }
  if (stack.length) throw new Error(`${toks[stack[stack.length - 1]].line}번째 줄: 괄호가 닫히지 않음`);

  // 클래스 몸통의 { (`class 이름 extends … {`). `{ class: 'x' }` · `.class`는 클래스가 아니다
  const classBody = new Set();
  for (let c = 0; c < n; c++) {
    if (!isId(toks[c], 'class') || isP(toks[c + 1], ':') || isP(toks[c - 1], '.') || isP(toks[c - 1], '?.')) continue;
    let i = c + 1;
    while (i < n && !isP(toks[i], '{')) { if (toks[i].t === 'p' && OPEN[toks[i].v]) i = match[i]; i++; }
    if (i < n) classBody.add(i);
  }
  // `=> 값`의 값이 끝나는 낱말: 같은 깊이의 `,` `;`, 짝 없는 `:`(`조건 ? () => 값 : 다른 값`), 감싼 괄호가 닫힘, 또는 세미콜론 없이 줄이 바뀜
  const valueEnd = s => {
    let ask = 0;
    for (let i = s; i < n; i++) {
      const tok = toks[i], before = toks[i - 1];
      if (i > s && tok.line > before.line && (before.t !== 'p' || CLOSE.has(before.v)) && !(tok.t === 'p' && GOES_ON.has(tok.v))) return i - 1;
      if (tok.t === 'p' && OPEN[tok.v]) { i = match[i]; continue; }
      if (isP(tok, '?')) ask++;
      else if (isP(tok, ':') && ask-- === 0) return i - 1;
      if (tok.t === 'p' && (CLOSE.has(tok.v) || tok.v === ',' || tok.v === ';')) return i - 1;
    }
    return n - 1;
  };

  // 함수 몸통 찾기: { s, e(몸통 첫 · 끝 낱말), start(함수가 시작하는 낱말), kind, names }
  const fns = [];
  for (let j = 0; j < n; j++) {
    const tok = toks[j];
    if (isP(tok, '=>')) {
      let start = isP(toks[j - 1], ')') ? match[j - 1] : j - 1;
      if (isId(toks[start - 1], 'async')) start--;
      fns.push(isP(toks[j + 1], '{') ? { s: j + 1, e: match[j + 1], start, kind: 'arrow' } : { s: j + 1, e: valueEnd(j + 1), start, kind: 'arrow' });
      continue;
    }
    if (!isP(tok, '{')) continue;
    if (classBody.has(j)) { fns.push({ s: j, e: match[j], start: j, kind: 'class' }); continue; }
    if (!isP(toks[j - 1], ')')) continue; // 함수가 아닌 { } (블록 · 객체)
    const o = match[j - 1], k = toks[o - 1];
    if (isId(k) && CONTROL.has(k.v)) continue; // if (…) {
    if (isId(k, 'await') && isId(toks[o - 2], 'for')) continue; // for await (…) {
    let start = o - 1, kind = 'method'; // 객체 · 클래스의 `이름(…) {`
    if (isId(k, 'function')) kind = 'function';
    else if (isP(k, '*') && isId(toks[o - 2], 'function')) { kind = 'function'; start = o - 2; }
    else if (isId(k) && isId(toks[o - 2], 'function')) { kind = 'function'; start = o - 2; }
    else if (isId(k) && isP(toks[o - 2], '*') && isId(toks[o - 3], 'function')) { kind = 'function'; start = o - 3; }
    if (kind === 'function' && isId(toks[start - 1], 'async')) start--;
    const names = kind === 'function' && isId(k) && k.v !== 'function' ? [k.v] : [];
    fns.push({ s: j, e: match[j], start, kind, names });
  }

  // 바로 실행되는 함수인가
  for (const f of fns) {
    f.now = false;
    f.names = f.names || [];
    if (f.kind === 'class' || f.kind === 'method') continue;
    const a = f.e + 1;
    // 가. function () { }() · (function () { })() · (() => { })() · ( … ).call(…)
    if (f.kind === 'function' && isP(toks[a], '(')) { f.now = true; continue; }
    if (isP(toks[a], ')') && match[a] === f.start - 1 &&
      (isP(toks[a + 1], '(') || (isP(toks[a + 1], '.') && (isId(toks[a + 2], 'call') || isId(toks[a + 2], 'apply'))))) { f.now = true; continue; }
    // 나. 목록.forEach(함수) · 목록.map(…, 함수)
    const p = parent[f.start];
    if (p >= 0 && isP(toks[p], '(') && (isP(toks[f.start - 1], '(') || isP(toks[f.start - 1], ',')) &&
      isId(toks[p - 1]) && RUNS_NOW.has(toks[p - 1].v) && (isP(toks[p - 2], '.') || isP(toks[p - 2], '?.'))) { f.now = true; continue; }
    // 다를 위해 이름: const 이름 = (…) => … · const 이름 = function …
    if (isP(toks[f.start - 1], '=') && isId(toks[f.start - 2]) && ['const', 'let', 'var'].includes(toks[f.start - 3] && toks[f.start - 3].v)) f.names.push(toks[f.start - 2].v);
  }
  // 다. 이름을 부르는 자리: 이름( … ) — `.이름(`, 함수 머리 `function 이름(`, 메서드 정의 `이름() {`는 빼고
  const calls = new Map();
  for (let i = 0; i < n; i++) {
    if (!isId(toks[i]) || !isP(toks[i + 1], '(')) continue;
    const b = toks[i - 1];
    if (isP(b, '.') || isP(b, '?.') || isId(b, 'function') || isP(b, '*') || isP(toks[match[i + 1] + 1], '{')) continue;
    if (!calls.has(toks[i].v)) calls.set(toks[i].v, []);
    calls.get(toks[i].v).push(i);
  }
  const flags = () => {
    const now = new Array(n).fill(true);
    for (const f of fns) if (!f.now) for (let i = f.s; i <= f.e; i++) now[i] = false;
    return now;
  };
  let now = flags();
  for (let changed = true; changed;) {
    changed = false;
    for (const f of fns) {
      if (f.now || !f.names.length) continue;
      if (f.names.some(name => (calls.get(name) || []).some(i => now[i]))) { f.now = true; changed = true; }
    }
    if (changed) now = flags();
  }
  return now;
}

// 파일 하나: { makes: [{ name, line, carries, now }], uses: [{ name, line, take, now }], others: [줄] }
export function scanSource(src) {
  const toks = tokenize(src.replace(/^﻿/, ''));
  const makes = [], uses = [], others = [];
  const now = whenRead(toks);
  for (let i = 0; i < toks.length; i++) {
    if (!isId(toks[i], 'U')) continue;
    const prev = toks[i - 1], next = toks[i + 1];
    if (isP(prev, '.') || isP(prev, '?.')) {
      if (!isId(toks[i - 2], 'window') || isP(toks[i - 3], '.')) continue; // 다른 것의 .U
      if (!isP(next, '.') && !isP(next, '?.')) continue; // window.U = window.U || {}
    }
    if ((isP(next, '.') || isP(next, '?.')) && isId(toks[i + 2])) {
      const name = toks[i + 2].v, op = toks[i + 3];
      if (op && op.t === 'p' && ASSIGN.has(op.v)) makes.push({ name, line: toks[i].line, carries: carriesOn(toks, i + 4, name), now: now[i] });
      else uses.push({ name, line: toks[i].line, take: false, now: now[i] });
      continue;
    }
    // (function (U) {
    if (isP(prev, '(') && isId(toks[i - 2], 'function') && isP(next, ')')) continue;
    // Object.assign(U, { … })
    if (isP(prev, '(') && isId(toks[i - 2], 'assign') && isP(toks[i - 3], '.') && isId(toks[i - 4], 'Object') && isP(next, ',') && isP(toks[i + 2], '{')) {
      for (const key of braceKeys(toks, i + 2).keys) makes.push({ name: key.name, line: key.line, carries: false, now: now[i] });
      continue;
    }
    // const { a, b: c } = U;
    if (isP(prev, '=') && isP(toks[i - 2], '}') && !isP(next, '[') && !isP(next, '(')) {
      const open = openOf(toks, i - 2);
      if (open >= 0) {
        for (const key of braceKeys(toks, open).keys) uses.push({ name: key.name, line: key.line, take: true, now: now[i] });
        continue;
      }
    }
    others.push(toks[i].line);
  }
  return { makes, uses, others };
}

// 읽을 파일과 순서: index.html의 <script src="js/…"> 순서, 그 뒤에 목록에 없는 js/ 파일(이름 순),
// 그 뒤에 index.html 안에 직접 쓴 <script>(보통 스크립트만). folder는 'js/a.js' 꼴의 실제 파일 목록이다.
// 돌려주는 것: [{ path(읽을 파일, 직접 쓴 script는 null), label(보여 줄 이름), src(직접 쓴 script의 글) }]
export function appFiles(html, folder) {
  const clean = p => p.trim().replace(/[?#].*$/, '').replace(/^(\.\/)+/, '');
  const scripts = [...html.matchAll(/<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)].map(m => clean(m[1])).filter(p => p.startsWith('js/'));
  const have = new Set(folder);
  const order = [...new Set(scripts)].filter(p => have.has(p));
  const rest = folder.filter(p => !order.includes(p)).sort();
  const out = [...order, ...rest].map(path => ({ path, label: path.replace(/^js\//, '') }));
  let k = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    const type = (m[1].match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (type && !/^(text|application)\/(javascript|ecmascript)$/i.test(type)) continue;
    k++;
    out.push({ path: null, label: k === 1 ? 'index.html' : `index.html #${k}`, src: m[2] });
  }
  return out;
}

// 이름 순서: 대소문자를 가리지 않고, 같으면 원래 글자로
const byName = (a, b) => {
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0;
};

// 파일 여럿([{ label, src }], 보여 줄 순서대로) → 이름마다 만드는 파일 · 쓰는 파일
export function buildMap(files) {
  const names = new Map();
  const get = name => {
    if (!names.has(name)) names.set(name, { name, makers: [], users: [], selfUse: new Set(), carries: new Set() });
    return names.get(name);
  };
  const others = [];
  for (const file of files) {
    let r;
    try { r = scanSource(file.src); } catch (err) { throw new Error(`${file.label}: ${err.message}`); }
    file.scan = r;
    for (const m of r.makes) {
      const e = get(m.name);
      if (!e.makers.includes(file.label)) e.makers.push(file.label);
      if (m.carries) e.carries.add(file.label);
    }
    if (r.others.length) others.push({ label: file.label, lines: r.others });
  }
  for (const file of files) {
    const seen = new Set();
    for (const u of file.scan.uses) {
      const e = get(u.name);
      if (e.makers.includes(file.label)) { e.selfUse.add(file.label); continue; }
      if (!seen.has(u.name)) { seen.add(u.name); e.users.push(file.label); }
    }
  }
  const list = [...names.values()].sort((a, b) => byName(a.name, b.name));
  return {
    files: files.map(f => f.label),
    names: list,
    many: list.filter(e => e.makers.length > 1),
    none: list.filter(e => e.makers.length === 0),
    unused: list.filter(e => e.makers.length > 0 && e.users.length === 0),
    others,
  };
}

// 순서 어김 (ROADMAP 0-20): 파일 여럿([{ label, src }], index.html script 순서대로)을 받아,
// 읽는 순간 읽는 `U.이름`마다 그보다 앞 파일이 그 이름을 읽는 순간 만들었는지 본다. 자기 파일이 만드는 이름은 보지 않는다.
// 돌려주는 것: { problems: [{ file, pos, line, name, take, kind, makers }], groups(파일 · 줄 · 까닭으로 묶음), reads, names, files }
//   kind: 'after'(만드는 파일이 뒤에 있음) · 'later'(함수 안에서만 만듦) · 'none'(만드는 곳 없음). pos · makers의 번호는 1부터 센 script 순서
export function findOrder(files) {
  const scans = files.map(f => {
    try { return f.scan || scanSource(f.src); } catch (err) { throw new Error(`${f.label}: ${err.message}`); }
  });
  const madeNow = new Map(), madeLater = new Map();
  scans.forEach((s, k) => {
    for (const m of s.makes) {
      const at = m.now ? madeNow : madeLater;
      if (!at.has(m.name)) at.set(m.name, []);
      if (!at.get(m.name).includes(k)) at.get(m.name).push(k);
    }
  });
  const label = k => ({ file: files[k].label, pos: k + 1 });
  const problems = [], names = new Set(), readers = new Set();
  let reads = 0;
  scans.forEach((s, k) => {
    const own = new Set(s.makes.map(m => m.name)), seen = new Set();
    for (const u of s.uses) {
      if (!u.now || own.has(u.name) || seen.has(u.name + ':' + u.line)) continue;
      seen.add(u.name + ':' + u.line);
      reads++; names.add(u.name); readers.add(files[k].label);
      const now = madeNow.get(u.name) || [];
      if (now.some(x => x < k)) continue;
      const later = madeLater.get(u.name) || [];
      const kind = now.length ? 'after' : later.length ? 'later' : 'none';
      problems.push({ file: files[k].label, pos: k + 1, line: u.line, name: u.name, take: u.take, kind, makers: (now.length ? now : later).map(label) });
    }
  });
  const groups = [];
  for (const p of problems) {
    const key = [p.file, p.line, p.kind, p.makers.map(m => m.file).join(',')].join('|');
    const g = groups.find(x => x.key === key);
    if (g) g.names.push(p.name);
    else groups.push({ key, file: p.file, pos: p.pos, line: p.line, kind: p.kind, take: p.take, makers: p.makers, names: [p.name] });
  }
  return { problems, groups, reads, names: names.size, files: readers.size };
}

// 지도 → docs/DEPS.md 글. 날짜 · 커밋 · 줄 번호를 넣지 않는다(코드가 같으면 글도 같아야 점검이 비교할 수 있다)
export function renderDeps(map, { tool, check }) {
  const code = s => '`' + s + '`';
  const files = list => list.length ? list.map(code).join(' · ') : '—';
  const users = e => e.users.length ? `${files(e.users)} (${e.users.length})` : '—';
  const makers = e => e.makers.length ? e.makers.map(f => code(f) + (e.carries.has(f) ? ' (이어 받음)' : '')).join(' · ') : '—';
  const L = [];
  L.push('# U 이름 지도', '');
  L.push(`> 도구가 만든 파일이다. 손으로 고치지 않는다. 만드는 도구: ${code(tool)}, 점검 ${code(check)} (ROADMAP 0-19).`);
  L.push("> 코드와 다르면 '점검'이 빨강이 되고, 그 실행의 Artifacts `deps-커밋-시도`에 새 파일이 올라간다. 받아서 이 파일에 덮어쓰고 커밋한다.", '');
  L.push(`- 읽은 파일 ${map.files.length}개: \`index.html\`의 script 순서(그 밖의 \`js/\` 파일은 뒤에). 파일 이름은 \`js/\`를 뺀 것이다.`);
  L.push(`- 이름 ${map.names.length}개. 따로 볼 이름: 만드는 곳 2곳 이상 ${map.many.length}개 · 만드는 곳 없음 ${map.none.length}개 · 아무도 안 씀 ${map.unused.length}개.`);
  L.push('- **만드는 파일**: `U.이름 = …`(`+=` · `||=` 같은 대입 포함) 또는 `Object.assign(U, { 이름 })`가 있는 파일. 함수 안에서 실행 중에 바꾸는 것도 센다.');
  L.push('- **쓰는 파일**: 만드는 파일 말고, `U.이름`을 읽거나(`U.이름.속 = …`도 포함) `const { 이름 } = U`로 꺼내는 파일. 적는 순서는 script 순서다.');
  L.push('- 주석 · 문자열 안의 `U.이름`은 세지 않는다. `U`를 통째로 다른 이름에 담거나 넘긴 뒤 쓰는 것, `U[이름]`처럼 이름을 계산하는 것은 셀 수 없다' +
    (map.others.length ? ` (그런 곳: ${map.others.map(o => `${code(o.label)} ${o.lines.length}곳`).join(' · ')}).` : ' (지금 그런 곳 0).'));
  L.push('', '## 따로 볼 이름 (고치지 않았다)', '');
  L.push(`### 만드는 곳이 2곳 이상 (${map.many.length}개)`, '');
  L.push("script 순서로 뒤에 읽히는 파일이 앞 값을 덮어쓸 수 있다. '(이어 받음)'은 같은 문장에서 앞 값 `U.이름`을 읽어 이어 붙이는 곳이다.", '');
  if (map.many.length) {
    L.push('| 이름 | 만드는 파일 | 쓰는 파일 |', '|---|---|---|');
    for (const e of map.many) L.push(`| ${code('U.' + e.name)} | ${makers(e)} | ${users(e)} |`);
  } else L.push('없음.');
  L.push('', `### 만드는 곳이 없음 (${map.none.length}개)`, '');
  L.push('쓰는 곳은 있는데 붙이는 곳을 찾지 못한 이름이다. 오타이거나, 위에서 셀 수 없다고 한 방법으로 붙였을 수 있다.', '');
  if (map.none.length) {
    L.push('| 이름 | 쓰는 파일 |', '|---|---|');
    for (const e of map.none) L.push(`| ${code('U.' + e.name)} | ${users(e)} |`);
  } else L.push('없음.');
  L.push('', `### 아무도 안 쓰는 이름 (${map.unused.length}개)`, '');
  L.push("만드는 파일 밖에서 읽는 곳이 없다. '자기 파일에서'가 '씀'이면 만든 파일 안에서는 `U.이름`으로 읽는다.", '');
  if (map.unused.length) {
    L.push('| 이름 | 만드는 파일 | 자기 파일에서 |', '|---|---|---|');
    for (const e of map.unused) L.push(`| ${code('U.' + e.name)} | ${makers(e)} | ${e.selfUse.size ? '씀' : '안 씀'} |`);
  } else L.push('없음.');
  L.push('', `## 이름 표 (${map.names.length}개, 이름 순)`, '');
  L.push('| 이름 | 만드는 파일 | 쓰는 파일 (수) |', '|---|---|---|');
  for (const e of map.names) L.push(`| ${code('U.' + e.name)} | ${makers(e)} | ${users(e)} |`);
  L.push('');
  return L.join('\n');
}
