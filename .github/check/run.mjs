// 울림 스튜디오 점검: 이 폴더의 검사 파일(`11-이름.mjs`처럼 숫자로 시작)을 번호 순서대로 하나씩 돌린다.
// 검사 파일은 저장소 맨 위에서 실행되고, 문제가 있으면 0이 아닌 값으로 끝나면 된다(예: process.exit(1)).
// 하나라도 실패하면 끝까지 다 돌린 뒤 실패한 목록을 알리고 1로 끝난다(Actions에서 빨강).
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const checks = readdirSync(here)
  .filter(name => /^\d+-.+\.mjs$/.test(name))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));

const failed = [];
for (const name of checks) {
  const result = spawnSync(process.execPath, [join(here, name)], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) failed.push(name);
}

if (failed.length) {
  console.error(`점검 실패 ${failed.length}개: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('점검 틀이 돌았다');
