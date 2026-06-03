# E2C: Excel to Card

E2C는 `.xlsx`, `.xls`, `.csv` 파일을 브라우저 안에서 읽고 각 행을 모바일 친화적인 카드로 보여주는 정적 웹앱입니다. 서버 업로드 없이 로컬 파일만 처리합니다.

## 실행

`index.html`을 브라우저에서 열면 됩니다.

로컬 서버로 확인하려면:

```bash
python3 -m http.server 8000
```

그리고 `http://localhost:8000`으로 접속합니다.

## 구조

```text
index.html
src/
  styles.css
  js/
    app.js
    dataProcessor.js
    excelReader.js
    state.js
    ui.js
    utils.js
```

## 구현된 MVP

- 엑셀/CSV 파일 선택
- 첫 번째 시트 자동 읽기
- 시트 선택
- 행 데이터를 카드 목록으로 표시
- 카드 제목 열 선택
- 전체 열 검색
- 열 기준 필터
- 열 기준 문자열 정렬
- 카드 상세보기 모달
- 모바일 우선 반응형 CSS
