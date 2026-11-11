# 견본 프로젝트 (점검 0-14 예전 프로젝트 열기)

`14-old-projects.mjs`가 이 폴더의 `날짜/*.ullim.json`을 모두 지금 앱으로 열어 본다. 트랙 · 리턴 · 장치 · 클립 수가 파일과 같아야 초록이다.
이 폴더는 `.github` 안이라 사이트에 올라가지 않는다. 저장소는 공개이므로 **개인 프로젝트 파일은 넣지 않는다.**

## 규칙
- 한 번 넣은 견본은 고치지 않는다. 그날 형식으로 저장된 "예전 파일"이라서 의미가 있다.
- 프로젝트 형식(`js/model.js` `normalize()`가 맞추는 것)이 바뀌면, 바꾸기 **전** 앱으로 새 날짜 폴더를 하나 더 만든다. 그러면 예전 형식과 새 형식이 모두 점검된다.
- 일부러 무엇을 지우는 변환이라면(예: 안 쓰는 장치 종류를 없앰) 견본을 고치지 말고, 검사가 그 차이를 알고 넘어가도록 검사 쪽에 적는다.

## 지금 있는 견본
| 폴더 | 만든 앱 | 파일 |
|---|---|---|
| `2026-11-11/` | `main` 2e4be66 (`sw.js` `ullim-v33`) | `demo` 데모 곡 '새벽 네 시' + `genre-…` 장르 템플릿 10종(house · techno · trap · dnb · lofi · jazzhop · rock · popband · future · flip) |

모두 앱이 계산해서 만드는 곡이라 오디오 파일을 담지 않는다(`media`가 비어 있고, 소리는 `gen:` 내장 소리).

## 새 날짜 폴더 만들기
1. 저장소 맨 위에서 `python -m http.server`로 앱을 띄우고 크롬으로 http://localhost:8000/ 을 연다.
2. 개발자 도구 콘솔에 아래를 붙여 넣는다. 받기 폴더에 파일 11개가 생긴다(크롬이 "여러 파일 다운로드"를 물으면 허용).
   앱의 '파일로 저장'과 같은 함수(`U.files.build`)로 만들어서, 사람이 저장한 파일과 같다.
3. 파일들을 `.github/check/projects/날짜/`에 넣고 위 표에 한 줄 더한다.

```js
const list = [['demo', U.demoProject()]].concat(U.GENRES.map(g => ['genre-' + g.id, U.genreProject(g.id)]));
for (const [name, p] of list) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await U.files.build(U.normalize(p)));
  a.download = name + '.ullim.json';
  a.click();
  await new Promise(r => setTimeout(r, 300));
}
```
