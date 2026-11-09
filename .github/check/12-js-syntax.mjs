// 점검 2 (ROADMAP 0-12): JS 문법.
// 저장소의 모든 .js 파일(.git · .github · node_modules 폴더는 뺀다)과 index.html 안에 직접 쓴 <script>를
// 브라우저처럼 "보통 스크립트"로 읽어만 본다(실행하지 않는다. 이 앱의 JS는 모듈이 아니다).
// 괄호를 안 닫았거나 쉼표가 빠진 것처럼 끝까지 읽을 수 없는 파일이 하나라도 있으면 빨강. 검사할 파일을 하나도 못 찾아도 빨강.
// 이름 오타처럼 실행해야 드러나는 오류는 잡지 못한다(0-13 앱 열기에서 본다).
// Node(크롬과 같은 V8)가 읽는 문법이면 통과하므로, 아이패드 사파리가 아직 모르는 새 문법인지는 알 수 없다.
import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';

const SKIP = new Set(['.git', '.github', 'node_modules']);
const problems = [];

// 저장소 맨 위부터 .js 파일 찾기
const files = [];
const walk = dir => {
  for (const entry of readdirSync(dir || '.', { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { if (!SKIP.has(entry.name)) walk(path); }
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
};
walk('');
files.sort();

// 문법 오류를 "파일 n번째 줄: 내용"으로. V8은 stack 첫 줄에 "파일:줄"을 적는다.
const describe = (err, label) => {
  const at = String(err.stack || '').split('\n')[0].match(/:(\d+)\s*$/);
  return `${label}${at ? ` ${at[1]}번째 줄` : ''}: ${err.name}: ${err.message}`;
};
const parse = (code, label, lineOffset = 0) => {
  try { new Script(code, { filename: label, lineOffset }); }
  catch (err) { problems.push(err instanceof SyntaxError ? describe(err, label) : `${label}: 읽지 못함: ${err.message}`); }
};

for (const path of files) parse(readFileSync(path, 'utf8').replace(/^﻿/, ''), path);

// index.html 안에 직접 쓴 <script> 덩어리(src 없는 것, 보통 스크립트 종류만)
const html = readFileSync('index.html', 'utf8');
let inline = 0;
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
  const attrs = m[1];
  if (/\bsrc\s*=/i.test(attrs)) continue;
  const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
  if (type && !/^(text|application)\/(java|ecma)script$/i.test(type)) continue;
  inline++;
  const startLine = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;
  parse(m[2], `index.html 안 script ${inline}`, startLine);
}

if (!files.length) problems.push('검사할 .js 파일을 하나도 찾지 못했다');
else if (!files.some(p => p.startsWith('js/'))) problems.push('js/ 폴더에서 .js 파일을 하나도 찾지 못했다');

// 요약에 쓸 묶음별 수: "js/ 43 · sw.js 1"
const groups = new Map();
for (const path of files) {
  const key = path.includes('/') ? path.split('/')[0] + '/' : path;
  groups.set(key, (groups.get(key) || 0) + 1);
}
if (inline) groups.set('index.html 안 script', inline);
const breakdown = [...groups].map(([k, n]) => `${k} ${n}`).join(' · ');
const total = files.length + inline;

// 결과: 로그에 출력하고, Actions 실행 화면에도 남긴다(11-file-list.mjs와 같은 방식)
// - Annotations 칸(로그인하지 않아도 보이고 PR 화면에도 뜬다): ::notice / ::error 줄
// - Summary 칸(로그인해야 보인다): GITHUB_STEP_SUMMARY 파일
const lines = problems.length
  ? [`JS 문법: 오류 ${problems.length}개 (파일 ${total}개 중. ${breakdown || '없음'})`, ...problems.map(p => `  - ${p}`)]
  : [`JS 문법: ${total}개 파일 오류 0 (${breakdown})`];
(problems.length ? console.error : console.log)(lines.join('\n'));
if (process.env.GITHUB_ACTIONS) {
  // GitHub 규칙: 내용의 % · 줄바꿈은 %25 · %0A로, title 안의 : · ,는 %3A · %2C로 적는다
  const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const prop = s => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
  console.log(problems.length
    ? `::error title=${prop('점검 0-12 JS 문법')}::${data(lines.join('\n'))}`
    : `::notice title=${prop('점검 0-12 JS 문법')}::${data(lines[0])}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const mark = problems.length ? '❌' : '✅';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${mark} ${lines[0]}\n${lines.slice(1).join('\n')}${lines.length > 1 ? '\n' : ''}\n`);
}
if (problems.length) process.exit(1);
