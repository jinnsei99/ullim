# U 이름 지도

> 도구가 만든 파일이다. 손으로 고치지 않는다. 만드는 도구: `.github/check/lib/unames.mjs`, 점검 `.github/check/19-deps.mjs` (ROADMAP 0-19).
> 코드와 다르면 '점검'이 빨강이 되고, 그 실행의 Artifacts `deps-커밋-시도`에 새 파일이 올라간다. 받아서 이 파일에 덮어쓰고 커밋한다.

- 읽은 파일 43개: `index.html`의 script 순서(그 밖의 `js/` 파일은 뒤에). 파일 이름은 `js/`를 뺀 것이다.
- 이름 312개. 따로 볼 이름: 만드는 곳 2곳 이상 2개 · 만드는 곳 없음 0개 · 아무도 안 씀 34개.
- **만드는 파일**: `U.이름 = …`(`+=` · `||=` 같은 대입 포함) 또는 `Object.assign(U, { 이름 })`가 있는 파일. 함수 안에서 실행 중에 바꾸는 것도 센다.
- **쓰는 파일**: 만드는 파일 말고, `U.이름`을 읽거나(`U.이름.속 = …`도 포함) `const { 이름 } = U`로 꺼내는 파일. 적는 순서는 script 순서다.
- 주석 · 문자열 안의 `U.이름`은 세지 않는다. `U`를 통째로 다른 이름에 담거나 넘긴 뒤 쓰는 것, `U[이름]`처럼 이름을 계산하는 것은 셀 수 없다 (지금 그런 곳 0).

## 따로 볼 이름 (고치지 않았다)

### 만드는 곳이 2곳 이상 (2개)

script 순서로 뒤에 읽히는 파일이 앞 값을 덮어쓸 수 있다. '(이어 받음)'은 같은 문장에서 앞 값 `U.이름`을 읽어 이어 붙이는 곳이다.

| 이름 | 만드는 파일 | 쓰는 파일 |
|---|---|---|
| `U.DEVICE_CLASSES` | `instruments.js` (이어 받음) · `acoustic.js` (이어 받음) | `effects.js` · `media.js` · `engine.js` (3) |
| `U.project` | `model.js` · `main.js` | `files.js` · `mysounds.js` · `recorder.js` · `tools.js` · `oldsample.js` · `ui-core.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `input.js` · `ui-midi.js` (24) |

### 만드는 곳이 없음 (0개)

쓰는 곳은 있는데 붙이는 곳을 찾지 못한 이름이다. 오타이거나, 위에서 셀 수 없다고 한 방법으로 붙였을 수 있다.

없음.

### 아무도 안 쓰는 이름 (34개)

만드는 파일 밖에서 읽는 곳이 없다. '자기 파일에서'가 '씀'이면 만든 파일 안에서는 `U.이름`으로 읽는다.

| 이름 | 만드는 파일 | 자기 파일에서 |
|---|---|---|
| `U.$` | `util.js` | 안 씀 |
| `U.$$` | `util.js` | 안 씀 |
| `U.add` | `util.js` | 안 씀 |
| `U.AMP_MODELS` | `effects.js` | 안 씀 |
| `U.AudioFx` | `effects.js` | 안 씀 |
| `U.autoValue` | `engine.js` | 안 씀 |
| `U.carve` | `engine.js` | 안 씀 |
| `U.crc32` | `export.js` | 안 씀 |
| `U.cssVar` | `util.js` | 안 씀 |
| `U.dnd` | `ui-core.js` | 안 씀 |
| `U.dragValue` | `ui-core.js` | 안 씀 |
| `U.DRUM_RECIPES` | `dsp.js` | 안 씀 |
| `U.EPS` | `util.js` | 안 씀 |
| `U.fixClip` | `model.js` | 안 씀 |
| `U.GRID_STEPS` | `util.js` | 안 씀 |
| `U.hashString` | `util.js` | 안 씀 |
| `U.isMac` | `util.js` | 안 씀 |
| `U.lerp` | `util.js` | 안 씀 |
| `U.MidiFx` | `instruments.js` | 안 씀 |
| `U.mySoundMenu` | `ui-shape.js` | 안 씀 |
| `U.newTrack` | `model.js` | 안 씀 |
| `U.nextFrame` | `util.js` | 안 씀 |
| `U.noiseBuffer` | `dsp.js` | 안 씀 |
| `U.off` | `util.js` | 안 씀 |
| `U.peakOf` | `export.js` | 안 씀 |
| `U.prefs` | `util.js` | 안 씀 |
| `U.ROLE_NAMES` | `templates.js` | 안 씀 |
| `U.sceneLabel` | `model.js` | 안 씀 |
| `U.setSrcFilter` | `ui-devices.js` | 씀 |
| `U.shapeMacros` | `ui-shape.js` | 안 씀 |
| `U.srcInfo` | `content.js` | 안 씀 |
| `U.TrackNode` | `engine.js` | 안 씀 |
| `U.unmapTarget` | `input.js` | 씀 |
| `U.verSeg` | `ui-devices.js` | 안 씀 |

## 이름 표 (312개, 이름 순)

| 이름 | 만드는 파일 | 쓰는 파일 (수) |
|---|---|---|
| `U.$` | `util.js` | — |
| `U.$$` | `util.js` | — |
| `U.acousticDSP` | `acoustic.js` | `instruments.js` · `content.js` · `ui-devices.js` (3) |
| `U.act` | `actions.js` | `oldsample.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-pads.js` · `input.js` · `main.js` (14) |
| `U.add` | `util.js` | — |
| `U.addReturn` | `model.js` | `actions.js` (1) |
| `U.addTrack` | `model.js` | `content.js` · `templates.js` · `actions.js` (3) |
| `U.allSounds` | `mysounds.js` | `quick.js` · `ui-devices.js` · `ui-shape.js` · `ui-browser.js` (4) |
| `U.allTracks` | `model.js` | `engine.js` (1) |
| `U.alpha` | `util.js` | `ui-arrange.js` · `ui-steps.js` · `ui-devices.js` · `ui-pads.js` (4) |
| `U.AMP_MODELS` | `effects.js` | — |
| `U.appCmds` | `main.js` | `quick.js` (1) |
| `U.appMenu` | `main.js` | `ui-shell.js` · `ui-transport.js` (2) |
| `U.arrangementEnd` | `model.js` | `ui-arrange.js` · `ui-start.js` · `main.js` (3) |
| `U.arrangementNotes` | `export.js` | `main.js` (1) |
| `U.arrangeView` | `ui-arrange.js` | `input.js` · `main.js` (2) |
| `U.ask` | `ui-core.js` | `quick.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `ui-shape.js` · `input.js` · `main.js` (7) |
| `U.audioEditor` | `ui-audioedit.js` | `ui-shell.js` · `ui-clip.js` · `ui-devices.js` · `ui-browser.js` · `ui-pads.js` (5) |
| `U.AudioFx` | `effects.js` | — |
| `U.audioRec` | `recorder.js` | `actions.js` · `main.js` (2) |
| `U.audioSession` | `gestures.js` | `recorder.js` (1) |
| `U.autoTouch` | `gestures.js` | `main.js` (1) |
| `U.autoValue` | `engine.js` | — |
| `U.barLen` | `util.js` | `templates.js` · `engine.js` · `recorder.js` · `tools.js` · `actions.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-start.js` · `main.js` (10) |
| `U.beatUnit` | `util.js` | `engine.js` · `ui-arrange.js` · `ui-clip.js` (3) |
| `U.bindInfo` | `ui-core.js` | `main.js` (1) |
| `U.browserView` | `ui-browser.js` | `quick.js` · `input.js` · `main.js` (3) |
| `U.btn` | `ui-core.js` | `oldsample.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `ui-midi.js` · `main.js` (18) |
| `U.canRedo` | `model.js` | `ui-shell.js` · `main.js` (2) |
| `U.canUndo` | `model.js` | `ui-shell.js` · `main.js` (2) |
| `U.carve` | `engine.js` | — |
| `U.chords` | `chords.js` | `content.js` · `oldsample.js` · `ui-clip.js` · `ui-keys.js` · `ui-play.js` (5) |
| `U.clamp` | `util.js` | `devices.js` · `dsp.js` · `instruments.js` · `effects.js` · `acoustic.js` · `model.js` · `templates.js` · `engine.js` · `export.js` · `tools.js` · `oldsample.js` · `ui-core.js` · `actions.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-keys.js` · `ui-play.js` · `ui-kit.js` · `ui-pads.js` · `input.js` · `ui-midi.js` · `main.js` (27) |
| `U.clear` | `util.js` | `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-devices.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-kit.js` · `ui-pads.js` · `ui-start.js` · `ui-midi.js` · `main.js` (16) |
| `U.clipCurve` | `dsp.js` | `effects.js` (1) |
| `U.clipKey` | `tools.js` | `ui-clip.js` (1) |
| `U.clipPasses` | `engine.js` | `ui-arrange.js` (1) |
| `U.clipRef` | `ui-core.js` | `actions.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-audioedit.js` · `input.js` · `main.js` (8) |
| `U.clipRegion` | `tools.js` | `ui-clip.js` (1) |
| `U.CLIPS` | `content.js` | `ui-browser.js` (1) |
| `U.clipScale` | `model.js` | `templates.js` · `engine.js` · `actions.js` · `ui-arrange.js` · `ui-clip.js` · `ui-audioedit.js` (6) |
| `U.clipSpan` | `model.js` | `templates.js` · `actions.js` · `ui-arrange.js` · `ui-audioedit.js` (4) |
| `U.clipView` | `ui-clip.js` | `ui-steps.js` · `input.js` · `main.js` (3) |
| `U.clone` | `util.js` | `devices.js` · `model.js` · `content.js` · `mysounds.js` · `tools.js` · `ui-devices.js` · `ui-pads.js` (7) |
| `U.cloneClip` | `model.js` | `content.js` · `templates.js` · `engine.js` · `actions.js` · `ui-session.js` · `ui-arrange.js` (6) |
| `U.cloneDevice` | `model.js` | `ui-devices.js` (1) |
| `U.cloneTrack` | `model.js` | `actions.js` (1) |
| `U.closeMenu` | `ui-core.js` | `quick.js` · `ui-shell.js` · `main.js` (3) |
| `U.colorMenu` | `ui-core.js` | `ui-session.js` · `ui-arrange.js` (2) |
| `U.colorOf` | `util.js` | `ui-shell.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-keys.js` · `ui-play.js` · `ui-kit.js` · `ui-pads.js` (11) |
| `U.COLORS` | `util.js` | `model.js` · `ui-core.js` · `ui-clip.js` (3) |
| `U.colors` | `ui-core.js` | `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-pads.js` (6) |
| `U.commit` | `model.js` | `engine.js` · `files.js` · `mysounds.js` · `recorder.js` · `oldsample.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-pads.js` · `ui-start.js` · `input.js` · `main.js` (18) |
| `U.confirm` | `ui-core.js` | `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` (3) |
| `U.control` | `ui-core.js` | `ui-clip.js` · `ui-devices.js` (2) |
| `U.crc32` | `export.js` | — |
| `U.cssVar` | `util.js` | — |
| `U.dbToGain` | `util.js` | `dsp.js` · `instruments.js` · `effects.js` · `engine.js` · `ui-arrange.js` · `ui-clip.js` (6) |
| `U.dbToPos` | `engine.js` | `content.js` · `ui-core.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `input.js` (6) |
| `U.debounce` | `util.js` | `effects.js` · `mysounds.js` · `ui-shell.js` · `ui-devices.js` · `input.js` · `main.js` (6) |
| `U.DEFAULT_KIT` | `content.js` | `devices.js` · `model.js` · `ui-devices.js` (3) |
| `U.DEFAULT_LOOPKIT` | `content.js` | `devices.js` · `templates.js` · `ui-pads.js` (3) |
| `U.defaults` | `devices.js` | `model.js` · `actions.js` (2) |
| `U.degreeToPitch` | `util.js` | `instruments.js` · `content.js` · `templates.js` · `tools.js` · `ui-keys.js` (5) |
| `U.demoProject` | `content.js` | `main.js` (1) |
| `U.design` | `ui-shell.js` | `quick.js` · `ui-start.js` · `main.js` (3) |
| `U.designs` | `ui-shell.js` | `quick.js` · `ui-start.js` · `main.js` (3) |
| `U.detailShown` | `ui-shell.js` | `main.js` (1) |
| `U.DEV` | `devices.js` | `instruments.js` · `model.js` · `content.js` · `engine.js` · `mysounds.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `ui-devices.js` · `ui-shape.js` · `ui-browser.js` · `ui-play.js` · `input.js` (15) |
| `U.Device` | `instruments.js` | `effects.js` (1) |
| `U.DEVICE_CLASSES` | `instruments.js` (이어 받음) · `acoustic.js` (이어 받음) | `effects.js` · `media.js` · `engine.js` (3) |
| `U.deviceById` | `model.js` | `actions.js` · `input.js` (2) |
| `U.deviceView` | `ui-devices.js` | `ui-shell.js` · `ui-shape.js` · `main.js` (3) |
| `U.devName` | `devices.js` | `actions.js` · `ui-shell.js` · `ui-arrange.js` · `ui-devices.js` · `ui-pads.js` (5) |
| `U.devSrc` | `content.js` | `ui-devices.js` · `ui-browser.js` (2) |
| `U.dialog` | `ui-core.js` | `store.js` · `files.js` · `oldsample.js` · `ui-shell.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-start.js` · `ui-midi.js` · `main.js` (9) |
| `U.divBeats` | `util.js` | `instruments.js` · `effects.js` · `engine.js` · `tools.js` · `ui-clip.js` · `ui-devices.js` (6) |
| `U.dnd` | `ui-core.js` | — |
| `U.dragStart` | `ui-core.js` | `ui-session.js` · `ui-devices.js` · `ui-browser.js` (3) |
| `U.dragValue` | `ui-core.js` | — |
| `U.dropAt` | `ui-core.js` | `main.js` (1) |
| `U.dropTarget` | `ui-core.js` | `ui-session.js` · `ui-arrange.js` · `ui-devices.js` · `ui-pads.js` (4) |
| `U.DRUM_RECIPES` | `dsp.js` | — |
| `U.DRUM_SETS` | `samples.js` | `instruments.js` (1) |
| `U.drumPattern` | `content.js` | `templates.js` (1) |
| `U.drumRec` | `instruments.js` | `model.js` · `content.js` · `ui-devices.js` (3) |
| `U.editInline` | `ui-core.js` | `ui-shell.js` · `ui-session.js` · `ui-arrange.js` (3) |
| `U.emit` | `util.js` | `gestures.js` · `instruments.js` · `acoustic.js` · `model.js` · `media.js` · `engine.js` · `store.js` · `files.js` · `mysounds.js` · `ui-core.js` · `quick.js` · `ui-session.js` · `ui-arrange.js` · `ui-devices.js` · `ui-keys.js` · `ui-play.js` · `input.js` (17) |
| `U.encodeWav` | `export.js` | `media.js` · `main.js` (2) |
| `U.Engine` | `engine.js` | `export.js` · `main.js` (2) |
| `U.engine` | `main.js` | `gestures.js` · `recorder.js` · `oldsample.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `input.js` (19) |
| `U.ensureAudio` | `main.js` | `oldsample.js` · `actions.js` · `quick.js` · `ui-session.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `input.js` (15) |
| `U.envEnd` | `dsp.js` | `instruments.js` · `acoustic.js` (2) |
| `U.envOff` | `dsp.js` | `instruments.js` · `acoustic.js` (2) |
| `U.envOn` | `dsp.js` | `instruments.js` · `acoustic.js` (2) |
| `U.EPS` | `util.js` | — |
| `U.eqBiquad` | `devices.js` | `effects.js` (1) |
| `U.fader` | `ui-core.js` | `ui-session.js` (1) |
| `U.favs` | `quick.js` | `actions.js` · `ui-devices.js` · `ui-browser.js` (3) |
| `U.files` | `files.js` | `quick.js` · `ui-browser.js` · `ui-start.js` · `input.js` · `main.js` (5) |
| `U.fitCanvas` | `util.js` | `ui-core.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-pads.js` (7) |
| `U.fixClip` | `model.js` | — |
| `U.fixLoopPad` | `devices.js` | `model.js` (1) |
| `U.flushSave` | `main.js` | `files.js` (1) |
| `U.fmtLen` | `util.js` | `ui-transport.js` · `ui-clip.js` · `ui-steps.js` · `main.js` (4) |
| `U.fmtParam` | `devices.js` | `ui-core.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` (4) |
| `U.fmtPos` | `util.js` | `ui-transport.js` · `ui-clip.js` (2) |
| `U.fmtTime` | `util.js` | `ui-shell.js` · `ui-clip.js` · `ui-browser.js` · `ui-start.js` (4) |
| `U.forEachNote` | `engine.js` | `export.js` · `actions.js` (2) |
| `U.frame` | `ui-core.js` | `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-pads.js` (10) |
| `U.fromNorm` | `devices.js` | `engine.js` · `ui-core.js` · `ui-arrange.js` · `ui-devices.js` · `ui-shape.js` · `input.js` (6) |
| `U.FX_PRESETS` | `content.js` | `ui-devices.js` · `ui-browser.js` (2) |
| `U.gainNode` | `dsp.js` | `instruments.js` · `effects.js` · `acoustic.js` · `media.js` · `engine.js` (5) |
| `U.gainToDb` | `util.js` | `ui-core.js` · `ui-shell.js` (2) |
| `U.GEN` | `content.js` | `media.js` · `ui-browser.js` (2) |
| `U.genreProject` | `templates.js` | `main.js` (1) |
| `U.GENRES` | `templates.js` | `quick.js` · `ui-browser.js` · `ui-start.js` (3) |
| `U.gestures` | `gestures.js` | `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-audioedit.js` (4) |
| `U.goHistory` | `model.js` | `actions.js` (1) |
| `U.GRID_STEPS` | `util.js` | — |
| `U.guessSections` | `templates.js` | `ui-start.js` (1) |
| `U.guitar` | `content.js` | `templates.js` (1) |
| `U.h` | `util.js` | `store.js` · `files.js` · `oldsample.js` · `ui-core.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-kit.js` · `ui-pads.js` · `ui-start.js` · `ui-midi.js` · `main.js` (23) |
| `U.hashBytes` | `util.js` | `media.js` (1) |
| `U.hashString` | `util.js` | — |
| `U.history` | `model.js` | `actions.js` · `quick.js` (2) |
| `U.icon` | `ui-core.js` | `files.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-devices.js` · `ui-browser.js` · `main.js` (10) |
| `U.importAudioTo` | `main.js` | `ui-session.js` · `ui-arrange.js` (2) |
| `U.info` | `ui-core.js` | `files.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-kit.js` · `ui-pads.js` · `ui-midi.js` · `main.js` (18) |
| `U.input` | `input.js` | `actions.js` · `ui-clip.js` · `ui-pads.js` · `ui-midi.js` · `main.js` (5) |
| `U.inScale` | `util.js` | `tools.js` · `ui-clip.js` · `ui-keys.js` · `ui-play.js` (4) |
| `U.inspShown` | `ui-shell.js` | `ui-devices.js` · `main.js` (2) |
| `U.instDemo` | `acoustic.js` | `ui-devices.js` (1) |
| `U.instMeta` | `acoustic.js` | `ui-browser.js` · `ui-play.js` (2) |
| `U.Instrument` | `instruments.js` | `acoustic.js` (1) |
| `U.instrumentOf` | `model.js` | `export.js` · `mysounds.js` · `tools.js` · `actions.js` · `ui-shell.js` · `ui-session.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `input.js` · `ui-midi.js` · `main.js` (17) |
| `U.inval` | `ui-core.js` | `files.js` · `recorder.js` · `oldsample.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-devices.js` · `ui-shape.js` · `ui-pads.js` · `input.js` · `main.js` (14) |
| `U.isIOS` | `gestures.js` | `store.js` · `input.js` · `ui-midi.js` (3) |
| `U.isMac` | `util.js` | — |
| `U.isPlayable` | `model.js` | `actions.js` · `quick.js` · `ui-session.js` · `ui-arrange.js` (4) |
| `U.isTouch` | `gestures.js` | `quick.js` · `ui-shell.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `main.js` (12) |
| `U.isTyping` | `ui-core.js` | `ui-audioedit.js` · `input.js` (2) |
| `U.keyLabel` | `devices.js` | `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-kit.js` · `ui-pads.js` (5) |
| `U.kitById` | `content.js` | `templates.js` (1) |
| `U.kitDevice` | `content.js` | `templates.js` · `actions.js` · `ui-browser.js` (3) |
| `U.KITS` | `content.js` | `model.js` · `quick.js` · `ui-browser.js` · `ui-pads.js` (4) |
| `U.kitSrc` | `content.js` | `quick.js` · `ui-browser.js` (2) |
| `U.kitView` | `ui-kit.js` | `ui-pads.js` (1) |
| `U.knob` | `ui-core.js` | `ui-shell.js` · `ui-session.js` · `ui-devices.js` · `ui-pads.js` (4) |
| `U.lastPointer` | `gestures.js` | `ui-session.js` (1) |
| `U.layout` | `ui-shell.js` | `ui-arrange.js` · `main.js` (2) |
| `U.layoutSong` | `templates.js` | `ui-start.js` (1) |
| `U.lerp` | `util.js` | — |
| `U.loadProjectData` | `main.js` | `files.js` (1) |
| `U.loopKitData` | `content.js` | `devices.js` (1) |
| `U.loopKitDevice` | `content.js` | `templates.js` · `actions.js` · `ui-browser.js` (3) |
| `U.LOOPKITS` | `content.js` | `templates.js` · `quick.js` · `ui-browser.js` · `ui-pads.js` (4) |
| `U.lpad` | `devices.js` | `content.js` (1) |
| `U.makeDevice` | `devices.js` | `model.js` · `media.js` · `content.js` · `templates.js` · `actions.js` · `ui-shape.js` · `ui-browser.js` (7) |
| `U.makeIR` | `dsp.js` | `effects.js` · `media.js` (2) |
| `U.mapFor` | `input.js` | `ui-core.js` (1) |
| `U.media` | `media.js` | `instruments.js` · `content.js` · `templates.js` · `engine.js` · `files.js` · `recorder.js` · `oldsample.js` · `actions.js` · `ui-shell.js` · `ui-arrange.js` · `ui-clip.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-pads.js` · `main.js` (16) |
| `U.menu` | `ui-core.js` | `files.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-browser.js` · `ui-pads.js` · `main.js` (13) |
| `U.midiFile` | `export.js` | `main.js` (1) |
| `U.MidiFx` | `instruments.js` | — |
| `U.midiLearn` | `input.js` | `ui-core.js` (1) |
| `U.midiPanel` | `ui-midi.js` | `quick.js` · `main.js` (2) |
| `U.mixerStrip` | `ui-session.js` | `ui-mixer.js` (1) |
| `U.mixerView` | `ui-mixer.js` | `main.js` (1) |
| `U.MOD` | `util.js` | `files.js` · `quick.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-audioedit.js` · `main.js` (9) |
| `U.modKey` | `util.js` | `ui-audioedit.js` · `input.js` (2) |
| `U.mtof` | `util.js` | `instruments.js` · `acoustic.js` · `media.js` (3) |
| `U.mySoundItems` | `ui-shape.js` | `ui-devices.js` · `ui-browser.js` (2) |
| `U.mySoundMenu` | `ui-shape.js` | — |
| `U.mySounds` | `mysounds.js` | `ui-devices.js` · `ui-shape.js` (2) |
| `U.newAudioClip` | `model.js` | `content.js` · `templates.js` · `recorder.js` · `actions.js` · `ui-arrange.js` · `ui-browser.js` · `main.js` (7) |
| `U.newMidiClip` | `model.js` | `content.js` · `templates.js` · `engine.js` · `actions.js` · `ui-arrange.js` · `ui-browser.js` (6) |
| `U.newProject` | `model.js` | `content.js` · `templates.js` · `main.js` (3) |
| `U.newProjectDialog` | `ui-start.js` | `quick.js` · `main.js` (2) |
| `U.newProjectFlow` | `main.js` | `quick.js` · `ui-browser.js` · `ui-start.js` (3) |
| `U.newScene` | `model.js` | `content.js` · `templates.js` · `engine.js` · `recorder.js` · `actions.js` (5) |
| `U.newTrack` | `model.js` | — |
| `U.nextFrame` | `util.js` | — |
| `U.noiseBuffer` | `dsp.js` | — |
| `U.noiseSource` | `dsp.js` | `instruments.js` · `acoustic.js` · `media.js` (3) |
| `U.normalize` | `model.js` | `export.js` · `files.js` · `main.js` (3) |
| `U.normalizeAudio` | `export.js` | `main.js` (1) |
| `U.NOTE_NAMES` | `util.js` | `ui-keys.js` · `ui-play.js` (2) |
| `U.noteName` | `util.js` | `devices.js` · `ui-clip.js` · `ui-devices.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-midi.js` (7) |
| `U.numBox` | `ui-core.js` | `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-pads.js` · `ui-start.js` · `ui-midi.js` (8) |
| `U.off` | `util.js` | — |
| `U.OFF_DB` | `model.js` | `content.js` · `engine.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `input.js` (6) |
| `U.OfflineCtx` | `dsp.js` | `acoustic.js` · `media.js` · `export.js` (3) |
| `U.oldSample` | `oldsample.js` | `quick.js` · `ui-browser.js` · `ui-pads.js` · `main.js` (4) |
| `U.on` | `util.js` | `files.js` · `ui-shell.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-devices.js` · `ui-shape.js` · `ui-browser.js` · `ui-pads.js` · `ui-midi.js` · `main.js` (12) |
| `U.openDemo` | `main.js` | `quick.js` · `ui-browser.js` (2) |
| `U.openProject` | `main.js` | `files.js` · `ui-browser.js` (2) |
| `U.pad` | `devices.js` | `content.js` (1) |
| `U.PAD_LAYOUTS` | `devices.js` | `content.js` · `ui-pads.js` (2) |
| `U.PAD_MODES` | `devices.js` | `ui-pads.js` (1) |
| `U.PAD_TYPES` | `devices.js` | `ui-devices.js` (1) |
| `U.padKeyOk` | `devices.js` | `ui-pads.js` (1) |
| `U.padsShown` | `ui-shell.js` | `ui-transport.js` · `ui-pads.js` · `input.js` (3) |
| `U.padsUI` | `ui-pads.js` | `ui-clip.js` · `ui-steps.js` · `ui-devices.js` (3) |
| `U.padsView` | `ui-pads.js` | `ui-shell.js` · `ui-keys.js` · `ui-play.js` · `input.js` · `main.js` (5) |
| `U.parsePos` | `util.js` | `ui-transport.js` · `ui-clip.js` (2) |
| `U.peakOf` | `export.js` | — |
| `U.pitchToDegree` | `util.js` | `instruments.js` · `tools.js` · `ui-keys.js` (3) |
| `U.play` | `ui-play.js` | `ui-pads.js` · `input.js` (2) |
| `U.posToDb` | `engine.js` | `ui-core.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `input.js` (5) |
| `U.pref` | `util.js` | `gestures.js` · `engine.js` · `ui-core.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `input.js` · `main.js` (16) |
| `U.prefs` | `util.js` | — |
| `U.project` | `model.js` · `main.js` | `files.js` · `mysounds.js` · `recorder.js` · `tools.js` · `oldsample.js` · `ui-core.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `input.js` · `ui-midi.js` (24) |
| `U.quantBeats` | `util.js` | `instruments.js` · `engine.js` (2) |
| `U.QUANTS` | `util.js` | `ui-transport.js` · `ui-clip.js` (2) |
| `U.quick` | `quick.js` | `ui-shell.js` · `ui-transport.js` · `input.js` · `main.js` (4) |
| `U.redo` | `model.js` | `actions.js` (1) |
| `U.removeReturn` | `model.js` | `actions.js` (1) |
| `U.renderDrum` | `dsp.js` | `instruments.js` · `media.js` · `content.js` (3) |
| `U.renderer` | `ui-core.js` | `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-browser.js` · `ui-pads.js` · `main.js` (8) |
| `U.renderOffline` | `export.js` | `main.js` (1) |
| `U.resetHistory` | `model.js` | `main.js` (1) |
| `U.returnLetter` | `model.js` | `ui-shell.js` · `ui-session.js` · `ui-arrange.js` (3) |
| `U.rng` | `util.js` | `dsp.js` · `instruments.js` · `media.js` · `templates.js` · `tools.js` · `oldsample.js` (6) |
| `U.ROLE_NAMES` | `templates.js` | — |
| `U.ROOT_NAMES` | `util.js` | `devices.js` · `chords.js` · `oldsample.js` · `quick.js` · `ui-transport.js` · `ui-clip.js` (6) |
| `U.round` | `util.js` | `dsp.js` · `media.js` · `content.js` · `templates.js` · `engine.js` · `store.js` · `tools.js` · `ui-core.js` · `actions.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-shape.js` · `ui-browser.js` · `ui-pads.js` · `input.js` (20) |
| `U.runTool` | `tools.js` | `ui-clip.js` (1) |
| `U.safeName` | `export.js` | `files.js` · `main.js` (2) |
| `U.SAMPLE_SETS` | `samples.js` | `acoustic.js` (1) |
| `U.satCurve` | `dsp.js` | `effects.js` · `media.js` · `ui-devices.js` (3) |
| `U.saveMySound` | `ui-shape.js` | `ui-devices.js` (1) |
| `U.saveNow` | `main.js` | `files.js` (1) |
| `U.scaleLabel` | `util.js` | `quick.js` · `ui-transport.js` · `ui-clip.js` · `ui-browser.js` · `ui-keys.js` · `ui-start.js` (6) |
| `U.scaleOf` | `util.js` | `content.js` · `chords.js` · `oldsample.js` · `ui-keys.js` · `ui-play.js` (5) |
| `U.SCALES` | `util.js` | `devices.js` · `ui-transport.js` · `ui-clip.js` (3) |
| `U.sceneLabel` | `model.js` | — |
| `U.seg` | `ui-core.js` | `oldsample.js` · `ui-shell.js` · `ui-clip.js` · `ui-devices.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `ui-start.js` · `ui-midi.js` · `main.js` (10) |
| `U.select` | `ui-core.js` | `oldsample.js` · `ui-transport.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-pads.js` · `ui-start.js` · `main.js` (9) |
| `U.selectTrack` | `ui-core.js` | `quick.js` · `ui-shell.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-pads.js` (6) |
| `U.selTrack` | `ui-core.js` | `actions.js` · `quick.js` · `ui-shell.js` · `ui-devices.js` · `ui-browser.js` · `ui-pads.js` · `input.js` · `main.js` (8) |
| `U.sessionView` | `ui-session.js` | `ui-shell.js` · `ui-mixer.js` · `ui-arrange.js` · `input.js` · `main.js` (5) |
| `U.setAutoMode` | `input.js` | `quick.js` · `ui-transport.js` (2) |
| `U.setDetail` | `ui-core.js` | `ui-shell.js` · `main.js` (2) |
| `U.setDraw` | `input.js` | `quick.js` · `ui-transport.js` · `ui-clip.js` (3) |
| `U.setInfo` | `ui-core.js` | `ui-clip.js` · `ui-pads.js` · `input.js` (3) |
| `U.setKeyboard` | `input.js` | `quick.js` · `ui-transport.js` (2) |
| `U.setMapMode` | `input.js` | `ui-transport.js` (1) |
| `U.setPref` | `util.js` | `gestures.js` · `store.js` · `ui-core.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` · `input.js` · `main.js` (16) |
| `U.setPressed` | `ui-core.js` | `ui-transport.js` · `ui-arrange.js` · `ui-clip.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-pads.js` (7) |
| `U.setProject` | `model.js` | `main.js` (1) |
| `U.setSrcFilter` | `ui-devices.js` | — |
| `U.setUIMode` | `gestures.js` | `quick.js` · `ui-start.js` · `main.js` (3) |
| `U.setView` | `main.js` | `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-pads.js` · `ui-start.js` · `input.js` (7) |
| `U.shade` | `util.js` | `ui-arrange.js` · `ui-clip.js` (2) |
| `U.shapeKnob` | `ui-shape.js` | `input.js` (1) |
| `U.shapeMacros` | `ui-shape.js` | — |
| `U.shapePanel` | `ui-shape.js` | `ui-shell.js` · `ui-devices.js` (2) |
| `U.shell` | `ui-shell.js` | `quick.js` · `ui-start.js` · `main.js` (3) |
| `U.showClip` | `ui-core.js` | `actions.js` · `ui-session.js` · `ui-arrange.js` (3) |
| `U.sleep` | `util.js` | `store.js` (1) |
| `U.smooth` | `dsp.js` | `instruments.js` · `effects.js` · `acoustic.js` · `engine.js` (4) |
| `U.snapToScale` | `util.js` | `instruments.js` · `tools.js` · `ui-clip.js` (3) |
| `U.songDialog` | `ui-start.js` | `quick.js` · `ui-shell.js` · `ui-session.js` · `main.js` (4) |
| `U.sound` | `content.js` | `templates.js` · `oldsample.js` (2) |
| `U.soundAs` | `content.js` | `ui-devices.js` · `ui-browser.js` (2) |
| `U.soundDevices` | `content.js` | `templates.js` · `actions.js` (2) |
| `U.soundGroups` | `content.js` | `ui-devices.js` · `ui-browser.js` (2) |
| `U.soundPanel` | `ui-devices.js` | `quick.js` (1) |
| `U.soundPicker` | `ui-devices.js` | `ui-shell.js` · `ui-pads.js` · `main.js` (3) |
| `U.soundRole` | `content.js` | `mysounds.js` · `ui-browser.js` (2) |
| `U.SOUNDS` | `content.js` | `mysounds.js` · `ui-browser.js` (2) |
| `U.soundSrc` | `content.js` | `quick.js` · `ui-devices.js` · `ui-browser.js` (3) |
| `U.SRC_LABEL` | `content.js` | `quick.js` · `ui-devices.js` (2) |
| `U.srcFilter` | `ui-devices.js` | `ui-browser.js` (1) |
| `U.srcFilterSeg` | `ui-devices.js` | `ui-browser.js` (1) |
| `U.srcInfo` | `content.js` | — |
| `U.srcMatch` | `content.js` | `ui-devices.js` · `ui-browser.js` (2) |
| `U.srcTag` | `content.js` | `ui-browser.js` (1) |
| `U.stepView` | `ui-steps.js` | `ui-clip.js` (1) |
| `U.stopAt` | `dsp.js` | `instruments.js` · `acoustic.js` · `engine.js` (3) |
| `U.store` | `store.js` | `media.js` · `files.js` · `mysounds.js` · `ui-devices.js` · `ui-browser.js` · `ui-pads.js` · `main.js` (7) |
| `U.stripMeters` | `ui-session.js` | `ui-mixer.js` (1) |
| `U.svg` | `util.js` | `ui-core.js` (1) |
| `U.SYNC_DIVS` | `util.js` | `devices.js` (1) |
| `U.toast` | `ui-core.js` | `media.js` · `store.js` · `files.js` · `recorder.js` · `oldsample.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-session.js` · `ui-arrange.js` · `ui-clip.js` · `ui-devices.js` · `ui-shape.js` · `ui-audioedit.js` · `ui-browser.js` · `ui-pads.js` · `ui-start.js` · `input.js` · `main.js` (19) |
| `U.toggleBrowser` | `ui-core.js` | `quick.js` · `input.js` · `main.js` (3) |
| `U.toggleDetail` | `ui-core.js` | `ui-shell.js` · `ui-pads.js` · `main.js` (3) |
| `U.toggleDetailKind` | `ui-shell.js` | `input.js` (1) |
| `U.togglePads` | `ui-shell.js` | `ui-transport.js` · `input.js` (2) |
| `U.toggleSongView` | `ui-shell.js` | `input.js` (1) |
| `U.toNorm` | `devices.js` | `content.js` · `ui-core.js` · `ui-arrange.js` · `ui-shape.js` · `input.js` (5) |
| `U.toolDefaults` | `tools.js` | `ui-clip.js` (1) |
| `U.TOOLS` | `tools.js` | `ui-clip.js` (1) |
| `U.touch` | `model.js` | `engine.js` · `actions.js` · `ui-transport.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-shape.js` (7) |
| `U.touchKeys` | `ui-keys.js` | `ui-clip.js` · `ui-pads.js` · `input.js` (3) |
| `U.trackById` | `model.js` | `engine.js` · `recorder.js` · `oldsample.js` · `ui-core.js` · `actions.js` · `ui-session.js` · `ui-arrange.js` · `ui-devices.js` · `ui-pads.js` · `input.js` · `ui-midi.js` · `main.js` (12) |
| `U.trackLabel` | `model.js` | `export.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-pads.js` · `input.js` · `ui-midi.js` · `main.js` (14) |
| `U.TrackNode` | `engine.js` | — |
| `U.transportBar` | `ui-transport.js` | `ui-arrange.js` · `main.js` (2) |
| `U.trimBuffer` | `dsp.js` | `media.js` (1) |
| `U.ui` | `ui-core.js` | `oldsample.js` · `actions.js` · `quick.js` · `ui-shell.js` · `ui-transport.js` · `ui-session.js` · `ui-mixer.js` · `ui-arrange.js` · `ui-clip.js` · `ui-steps.js` · `ui-devices.js` · `ui-browser.js` · `ui-keys.js` · `ui-play.js` · `ui-kit.js` · `ui-pads.js` · `input.js` · `main.js` (18) |
| `U.uid` | `util.js` | `devices.js` · `model.js` · `content.js` · `templates.js` · `engine.js` · `files.js` · `mysounds.js` · `recorder.js` · `actions.js` · `ui-arrange.js` · `ui-shape.js` · `main.js` (12) |
| `U.uiMode` | `gestures.js` | `quick.js` · `main.js` (2) |
| `U.uiModeName` | `gestures.js` | `main.js` (1) |
| `U.undo` | `model.js` | `actions.js` (1) |
| `U.unmapTarget` | `input.js` | — |
| `U.velGain` | `dsp.js` | `instruments.js` · `acoustic.js` (2) |
| `U.verChips` | `ui-devices.js` | `ui-browser.js` (1) |
| `U.verSeg` | `ui-devices.js` | — |
| `U.visible` | `devices.js` | `ui-devices.js` (1) |
| `U.zip` | `export.js` | `store.js` · `main.js` (2) |
