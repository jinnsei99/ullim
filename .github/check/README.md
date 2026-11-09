# 점검 (자동 검사)

- `main`에 푸시할 때, PR을 열거나 PR에 커밋을 올릴 때 GitHub Actions의 **점검**(`.github/workflows/check.yml`)이 돈다. Actions 탭에서 손으로 돌릴 수도 있다.
- 실행 명령은 `node .github/check/run.mjs` 하나다(저장소 맨 위에서). Node 24로 돈다. 이 컴퓨터에는 Node가 없어서 Actions에서만 돌린다.
- 이 폴더는 `.github` 안에 있어서 사이트에 올라가지 않는다. 앱 파일이 아니므로 `sw.js` `CORE`에도 넣지 않는다.

## 지금 있는 검사
| 파일 | ROADMAP | 빨강이 되는 경우 | 초록일 때 요약 |
|---|---|---|---|
| `11-file-list.mjs` | 0-11 | `index.html` script · `sw.js` `CORE`의 js · 실제 `js/` 파일이 서로 다르거나, 한 목록에 두 번 있거나, 목록을 못 찾는다 | `파일 목록: js 43개 일치 (index.html · sw.js CORE · js/ 폴더)` |

## 검사 더하기
1. 이 폴더에 `숫자-이름.mjs` 파일을 만든다. 숫자는 ROADMAP 번호를 쓴다(예: 0-11 → `11-file-list.mjs`). `run.mjs`가 숫자 순서대로 돌린다.
2. 검사는 저장소 맨 위에서 실행된다. 결과를 한두 줄로 출력하고, 문제가 있으면 `process.exit(1)`로 끝낸다.
   사람이 읽을 요약 한 줄(예: `js 43개 일치`)은 실행 화면에도 남긴다(`11-file-list.mjs` 끝부분을 그대로 따라 쓴다).
   - `::notice title=…::요약` / `::error title=…::내용` 줄을 출력하면 실행 화면의 **Annotations** 칸에 뜬다. 로그인하지 않아도 보이고 PR 화면에도 뜬다. 내용의 `%` · 줄바꿈, title의 `:` · `,`는 바꿔 적어야 한다.
   - `GITHUB_STEP_SUMMARY` 파일에 덧붙이면 **Summary** 칸에 뜬다. 이 칸과 로그는 로그인해야 보인다.
   목록을 찾지 못해 아무것도 검사하지 못한 경우도 빨강으로 한다(조용히 초록이 되지 않게).
3. 일부러 틀리게 해서 빨강이 뜨는 것을 확인한 뒤 되돌린다(ROADMAP 0-C 완료 기준).
