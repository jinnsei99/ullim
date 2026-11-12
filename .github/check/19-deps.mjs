// 점검 0-19: U 이름 지도(docs/DEPS.md)가 최신인지.
// 앱 JS(index.html script 순서의 js/ 파일)를 읽어 U.이름마다 만드는 파일 · 쓰는 파일 표를 새로 만들고(lib/unames.mjs),
// 저장소의 docs/DEPS.md와 글자까지 대 본다. 다르거나 없으면 빨강이다. 이때 새 파일을 DEPS_OUT 폴더
// (기본: Actions의 $RUNNER_TEMP/deps)에 써 두고, check.yml이 그것을 Artifacts `deps-커밋-시도`로 올린다.
// 고치는 법: 그 Artifacts의 DEPS.md를 받아 docs/DEPS.md에 덮어쓰고 커밋한다. Node가 있으면 `node .github/check/19-deps.mjs --write`.
// 표에 날짜 · 커밋 · 줄 번호를 넣지 않으므로, U 이름을 붙이거나 쓰는 파일이 바뀔 때만 다시 만들면 된다.
// 이 검사는 순서 어김(읽는 순간 꺼내는 이름이 뒤 파일에서 만들어짐)은 보지 않는다(ROADMAP 0-20).
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appFiles, buildMap, renderDeps } from './lib/unames.mjs';

const DEPS = 'docs/DEPS.md';
const TITLE = '점검 0-19 U 이름 지도';
const write = process.argv.includes('--write');
const problems = [];
let text = '', map = null;

try {
  const folder = readdirSync('js', { recursive: true })
    .map(name => 'js/' + String(name).replace(/\\/g, '/'))
    .filter(path => path.endsWith('.js') && statSync(path).isFile());
  const files = appFiles(readFileSync('index.html', 'utf8'), folder)
    .map(f => ({ label: f.label, src: f.path ? readFileSync(f.path, 'utf8') : f.src }));
  if (!files.length) throw new Error('읽을 앱 JS 파일을 하나도 찾지 못했다');
  map = buildMap(files);
  if (!map.names.length) throw new Error('U 이름을 하나도 찾지 못했다');
  text = renderDeps(map, { tool: '.github/check/lib/unames.mjs', check: '.github/check/19-deps.mjs' });
} catch (err) {
  problems.push(`지도를 만들지 못했다: ${err.message}`);
}

// 저장소의 것과 비교(줄 끝 \r\n은 같게 본다)
let diff = [];
if (text) {
  const old = existsSync(DEPS) ? readFileSync(DEPS, 'utf8').replace(/\r\n/g, '\n') : null;
  if (write) writeFileSync(DEPS, text);
  else if (old === null) problems.push(`${DEPS}가 없다`);
  else if (old !== text) {
    const a = old.split('\n'), b = text.split('\n');
    const inOld = new Set(a), inNew = new Set(b);
    diff = [...a.filter(l => !inNew.has(l)).map(l => `- ${l}`), ...b.filter(l => !inOld.has(l)).map(l => `+ ${l}`)];
    problems.push(`${DEPS}가 코드와 다르다 (저장소 쪽에만 있는 줄 ${a.filter(l => !inNew.has(l)).length}개 · 새로 만든 쪽에만 있는 줄 ${b.filter(l => !inOld.has(l)).length}개${diff.length ? '' : ', 줄 순서 · 빈 줄만 다름'})`);
  }
  if (problems.length) {
    const dir = process.env.DEPS_OUT || join(process.env.RUNNER_TEMP || tmpdir(), 'deps');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'DEPS.md'), text);
    problems.push(`새로 만든 지도: ${join(dir, 'DEPS.md')}${process.env.GITHUB_ACTIONS ? " (이 실행의 Artifacts 'deps-커밋-시도'). 받아서 docs/DEPS.md에 덮어쓰고 커밋한다" : ''}`);
  }
}

// 결과: 로그 · Annotations(::notice / ::error) · Summary
const SHOW = 30;
const stats = map ? `이름 ${map.names.length}개 · 파일 ${map.files.length}개 (따로 볼 이름: 만드는 곳 2곳 이상 ${map.many.length} · 없음 ${map.none.length} · 아무도 안 씀 ${map.unused.length})` : '';
const lines = problems.length
  ? [`U 이름 지도: 문제 ${problems.length - (text ? 1 : 0)}개${stats ? ` · ${stats}` : ''}`, ...problems.map(p => `  - ${p}`),
     ...(diff.length ? ['  달라진 줄:', ...diff.slice(0, SHOW).map(l => `    ${l}`), ...(diff.length > SHOW ? [`    … 그 밖에 ${diff.length - SHOW}줄`] : [])] : [])]
  : [`U 이름 지도: ${write ? `${DEPS}를 새로 씀` : `${DEPS} 최신`} · ${stats}`];
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
