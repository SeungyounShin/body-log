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

파일 상단의 `profile`에는 신장(`height`, cm)과 성별(`sex`)이 들어갑니다. 인바디 화면에 BMI나
체지방량이 안 뜨는 기종이면 이 신장값으로 계산해서 채워 넣으면 됩니다
(`BMI = 체중 ÷ (신장m)²`, `체지방량 = 체중 × 체지방률`).

> 인바디 결과지·기기 화면 사진에는 **회원번호(대개 휴대폰 번호)**가 같이 찍힙니다.
> 이 레포는 public이므로 사진은 커밋하지 말고, 수치만 옮겨 적으세요.

측정 조건은 되도록 통일하세요 — 같은 기기, 아침 공복, 화장실 다녀온 뒤. 조건이 다르면
1~2kg는 그냥 흔들립니다.

## 운동 프로그램 수정하기

`data/workout.json`의 `current`가 지금 돌리는 프로그램입니다. `days` 배열을 자유롭게 늘리고
줄이세요. 하루에 두 번 운동하면 `sessions`로 나눠 적습니다 (없으면 `exercises`를 바로 써도 됩니다).

```json
{
  "name": "Day 1 · 월요일",
  "focus": "상체 근력",
  "sessions": [
    { "time": "AM · 45분", "name": "Zone 2 러닝", "exercises": [ … ] },
    { "time": "PM · 80분", "name": "상체 근력",   "exercises": [ … ] }
  ]
}
```

프로그램을 바꿀 때는 `changelog`에 한 줄 남겨두면 사이트에 이력으로 쌓입니다 (오래된 것부터
적으면 화면에는 최신순으로 뒤집혀 나옵니다).

```json
"changelog": [
  { "date": "2026-08-02", "change": "주 6일 → 주 4일 2세션 구조로 재편" }
]
```

## 목표와 퍼포먼스 기록

- `data/goals.json` — 체성분 목표(`body`)와 퍼포먼스 목표(`performance`). 체성분은
  `from`(시작값) → 최신 인바디 → `target`으로 진행률 미터가 자동 계산됩니다.
- `data/performance.json` — 테스트한 날의 기록. `key`는 `goals.json`의 퍼포먼스 `key`와
  맞춰야 목표 표의 '현재' 칸에 반영됩니다.

```json
{ "records": [
  { "date": "2026-08-09", "key": "bench",  "value": 60, "note": "10회 3세트" },
  { "date": "2026-08-09", "key": "pullup", "value": 8,  "note": "" }
] }
```

`bench` 기록이 2개 이상 쌓이면 목표 탭에 추이 차트가 생깁니다.

## 로컬에서 보기

`fetch`로 JSON을 읽기 때문에 `file://`로 열면 동작하지 않습니다. 간단한 서버를 띄우세요.

```sh
cd body-log && python3 -m http.server 8000
# → http://localhost:8000
```

## 배포

`main` 브랜치에 push하면 GitHub Pages가 자동 반영합니다 (반영까지 보통 1분 내외).
