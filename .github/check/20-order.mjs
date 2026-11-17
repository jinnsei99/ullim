// 점검 0-20: 순서 어김.
// 앱 JS는 index.html script 순서대로 읽히면서 바로 실행된다. 파일이 읽히는 순간 꺼내는 U.이름(파일 맨 위의
// `const { h, ui } = U`, 맨 위 객체 안의 `U.pref(…)`, `class A extends U.B` 등)을, 그보다 앞 파일이 읽는 순간 만들지 않았으면 빨강이다.
// 함수 안에서 나중에 쓰는 U.이름은 불릴 때 읽히므로 보지 않는다. 둘을 가르는 규칙은 lib/unames.mjs의 `whenRead` 맨 위.
// 빨강 까닭 셋: 만드는 파일이 뒤에 있음 · 앞 파일이 함수 안에서만 만듦(불려야 생김) · 만드는 곳 없음.
// 고치는 법: 만드는 파일을 index.html에서 앞으로 옮기거나(sw.js CORE 순서는 상관없다), 꺼내는 것을 함수 안으로 옮긴다.
import { appendFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { appFiles, findOrder } from './lib/unames.mjs';

const TITLE = '점검 0-20 순서 어김';
const problems = [];
let result = null;

try {
  const folder = readdirSync('js', { recursive: true })
    .map(name => 'js/' + String(name).replace(/\\/g, '/'))
    .filter(path => path.endsWith('.js') && statSync(path).isFile());
  const files = appFiles(readFileSync('index.html', 'utf8'), folder)
    .map(f => ({ label: f.label, src: f.path ? readFileSync(f.path, 'utf8') : f.src }));
  if (!files.length) throw new Error('읽을 앱 JS 파일을 하나도 찾지 못했다');
  result = findOrder(files);
  if (!result.reads) throw new Error('읽는 순간 읽는 U 이름을 하나도 찾지 못했다(찾는 규칙이 고장 났을 수 있다)');
} catch (err) {
  problems.push(`순서를 보지 못했다: ${err.message}`);
}

const WHY = {
  after: g => `만드는 파일 ${g.makers.map(m => `${m.file}(${m.pos}번째)`).join(' · ')}가 이 파일(${g.pos}번째)보다 뒤에 있다`,
  later: g => `${g.makers.map(m => `${m.file}(${m.pos}번째)`).join(' · ')}가 함수 안에서만 만든다(불려야 생긴다)`,
  none: () => '만드는 파일이 없다',
};
if (result) {
  for (const g of result.groups) {
    problems.push(`${g.file} ${g.line}줄: ${g.names.map(n => 'U.' + n).join(' · ')}${g.take ? ' (맨 위에서 꺼냄)' : ''} — ${WHY[g.kind](g)}`);
  }
}

// 결과: 로그 · Annotations(::notice / ::error) · Summary
const SHOW = 30;
const stats = result ? `읽는 순간 읽는 자리 ${result.reads}곳 (이름 ${result.names}개 · 파일 ${result.files}개)` : '';
const count = result ? result.problems.length : 0;
const lines = problems.length
  ? [result && count ? `순서 어김: ${count}곳 · ${stats}` : '순서 어김: 검사하지 못함',
     ...problems.slice(0, SHOW).map(p => `  - ${p}`),
     ...(problems.length > SHOW ? [`  … 그 밖에 ${problems.length - SHOW}줄`] : []),
     ...(count ? ['  고치는 법: index.html에서 만드는 파일을 앞으로 옮기거나, 꺼내는 것을 함수 안으로 옮긴다'] : [])]
  : [`순서 어김: 0곳 · ${stats} 모두 앞 파일이 만든 뒤`];
(problems.length ? console.error : console.log)(lines.join('\n'));
if (process.env.GITHUB_ACTIONS) {
  const data = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const prop = s => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
  console.log(problems.length ? `::error title=${prop(TITLE)}::${data(lines.join('\n'))}` : `::notice title=${prop(TITLE)}::${data(lines[0])}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const mark = problems.length ? '❌' : '✅';
  const body = lines.slice(1).join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${mark} ${lines[0]}\n${body ? '```\n' + body + '\n```\n' : ''}\n`);
}
if (problems.length) process.exit(1);
