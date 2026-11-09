# 점검 (자동 검사)

- `main`에 푸시할 때, PR을 열거나 PR에 커밋을 올릴 때 GitHub Actions의 **점검**(`.github/workflows/check.yml`)이 돈다. Actions 탭에서 손으로 돌릴 수도 있다.
- 실행 명령은 `node .github/check/run.mjs` 하나다(저장소 맨 위에서). Node 24로 돈다. 이 컴퓨터에는 Node가 없어서 Actions에서만 돌린다.
- 이 폴더는 `.github` 안에 있어서 사이트에 올라가지 않는다. 앱 파일이 아니므로 `sw.js` `CORE`에도 넣지 않는다.

## 검사 더하기
1. 이 폴더에 `숫자-이름.mjs` 파일을 만든다. 숫자는 ROADMAP 번호를 쓴다(예: 0-11 → `11-file-list.mjs`). `run.mjs`가 숫자 순서대로 돌린다.
2. 검사는 저장소 맨 위에서 실행된다. 결과를 한두 줄로 출력하고, 문제가 있으면 `process.exit(1)`로 끝낸다.
3. 일부러 틀리게 해서 빨강이 뜨는 것을 확인한 뒤 되돌린다(ROADMAP 0-C 완료 기준).
