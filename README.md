# 부캉이 수학 탈출 - 개발용 버전

## 파일 구조
- `index.html`
- `style.css`
- `game.js`
- `assets/`

## 실행 방법
### 방법 1) 그냥 열기
`index.html`을 브라우저로 열기

### 방법 2) 로컬 서버 추천
터미널에서 이 폴더로 이동 후:

```bash
python -m http.server 8000
```

브라우저에서:
`http://localhost:8000`

## 이번 버전 수정 사항
- HTML/CSS/JS 분리
- 궁구미 응원단 실제 PNG 사용
- 궁구미 크기 키움
- 수로 벽 메시지 잘림 방지: 메시지 위치를 위쪽 말풍선으로 이동
- HUD 정리
