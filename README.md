# Body Log

인바디(InBody) 측정 기록과 운동 프로그램을 한곳에서 추적하는 정적 사이트.
빌드 없음 · 의존성 없음 — `data/*.json`만 고치고 push 하면 GitHub Pages가 갱신됩니다.

## 구조

```
index.html          대시보드
assets/             스타일 + 차트 (vanilla JS, SVG)
data/inbody.json    인바디 측정 기록      ← 여기에 계속 추가
data/workout.json   운동 프로그램        ← 여기서 계속 수정
photos/             인바디 결과지 사진 (선택)
```

## 인바디 기록 추가하기

`data/inbody.json`의 `records` 배열에 객체 하나를 추가합니다.
`date`만 필수이고 나머지는 아는 값만 넣으면 됩니다 (빠진 값은 차트에서 자동으로 건너뜁니다).

```json
{
  "date": "2026-08-02",
  "weight": 72.3,
  "smm": 33.1,
  "bfm": 12.5,
  "pbf": 17.3,
  "bmi": 22.4,
  "score": 82,
  "bmr": 1650,
  "visceralFat": 5,
  "note": "아침 공복"
}
```

| 필드 | 의미 | 단위 |
|---|---|---|
| `date` | 측정일 (`YYYY-MM-DD`) | — |
| `weight` | 체중 | kg |
| `smm` | 골격근량 (Skeletal Muscle Mass) | kg |
| `bfm` | 체지방량 (Body Fat Mass) | kg |
| `pbf` | 체지방률 (Percent Body Fat) | % |
| `bmi` | 체질량지수 | — |
| `score` | 인바디 점수 | 점 |
| `bmr` | 기초대사량 | kcal |
| `visceralFat` | 내장지방 레벨 | — |
| `note` | 메모 (공복 여부, 컨디션 등) | — |

측정 조건은 되도록 통일하세요 — 같은 기기, 아침 공복, 화장실 다녀온 뒤. 조건이 다르면
1~2kg는 그냥 흔들립니다.

## 운동 프로그램 수정하기

`data/workout.json`의 `current`가 지금 돌리는 프로그램입니다. `days` 배열을 자유롭게 늘리고
줄이세요. 프로그램을 바꿀 때는 `changelog`에 한 줄 남겨두면 사이트 하단에 이력으로 쌓입니다.

```json
"changelog": [
  { "date": "2026-08-02", "change": "PPL 3분할 → 5분할, 데드리프트 주 1회로 축소" }
]
```

## 로컬에서 보기

`fetch`로 JSON을 읽기 때문에 `file://`로 열면 동작하지 않습니다. 간단한 서버를 띄우세요.

```sh
cd body-log && python3 -m http.server 8000
# → http://localhost:8000
```

## 배포

`main` 브랜치에 push하면 GitHub Pages가 자동 반영합니다 (반영까지 보통 1분 내외).
