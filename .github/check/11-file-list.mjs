// 점검 1 (ROADMAP 0-11): JS 파일 목록 맞추기.
// 세 목록이 같은 js 파일을 가리켜야 한다.
//   ① index.html의 <script src="js/…"> 줄  ② sw.js CORE의 js 줄  ③ 실제 js/ 폴더의 .js 파일(하위 폴더 포함)
// 하나라도 빠지거나 더 있거나 두 번 적혀 있으면 빨강. 순서는 보지 않는다(index.html 순서는 0-20에서 본다).
// js 말고 다른 파일(아이콘 등)은 이 검사가 보지 않는다.
import { appendFileSync, readFileSync, readdirSync, statSync } from 'node:fs';

const problems = [];

// 경로를 같은 모양으로: "./js/a.js?v=1" → "js/a.js"
const clean = path => path.trim().replace(/[?#].*$/, '').replace(/^(\.\/)+/, '');

// ① index.html의 script 목록(바깥 주소는 뺀다)
const html = readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)]
  .map(m => m[1])
  .filter(src => !/^([a-z]+:)?\/\//i.test(src))
  .map(clean);
if (!scripts.length) problems.push('index.html에서 <script src> 줄을 하나도 찾지 못했다');

// ② sw.js CORE의 js 목록
const sw = readFileSync('sw.js', 'utf8');
const coreBlock = sw.match(/const\s+CORE\s*=\s*\[([\s\S]*?)\]/);
const core = coreBlock
  ? [...coreBlock[1].matchAll(/["']([^"']+)["']/g)].map(m => clean(m[1])).filter(p => p.endsWith('.js'))
  : [];
if (!coreBlock) problems.push('sw.js에서 CORE 목록(const CORE = [ … ])을 찾지 못했다');
else if (!core.length) problems.push('sw.js CORE에 js 파일이 하나도 없다');

// ③ 실제 js/ 폴더
const folder = readdirSync('js', { recursive: true })
  .map(name => 'js/' + String(name).replace(/\\/g, '/'))
  .filter(path => path.endsWith('.js') && statSync(path).isFile());

// 두 번 적힌 줄
for (const [label, list] of [['index.html', scripts], ['sw.js CORE', core]]) {
  const seen = new Set();
  for (const path of list) {
    if (seen.has(path)) problems.push(`${label}에 두 번 있음: ${path}`);
    seen.add(path);
  }
}

// 서로 비교
const inFolder = new Set(folder);
const inHtml = new Set(scripts);
const inCore = new Set(core);
for (const path of folder) {
  if (!inHtml.has(path)) problems.push(`index.html에 없음: ${path}`);
  if (!inCore.has(path)) problems.push(`sw.js CORE에 없음: ${path}`);
}
for (const path of inHtml) if (!inFolder.has(path)) problems.push(`index.html에 있지만 파일이 없음: ${path}`);
for (const path of inCore) if (!inFolder.has(path)) problems.push(`sw.js CORE에 있지만 파일이 없음: ${path}`);

// 결과: 로그에 출력하고, Actions 실행 요약 화면에도 남긴다
const lines = problems.length
  ? [`파일 목록: 문제 ${problems.length}개 (index.html ${inHtml.size} · sw.js CORE ${inCore.size} · js/ 폴더 ${folder.length})`, ...problems.map(p => `  - ${p}`)]
  : [`파일 목록: js ${folder.length}개 일치 (index.html · sw.js CORE · js/ 폴더)`];
(problems.length ? console.error : console.log)(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  const mark = problems.length ? '❌' : '✅';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${mark} ${lines[0]}\n${lines.slice(1).join('\n')}${lines.length > 1 ? '\n' : ''}\n`);
}
if (problems.length) process.exit(1);
