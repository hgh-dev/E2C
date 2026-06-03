/* ==========================================================================
   [모듈] 공통 유틸리티 (utils.js)
   [역할]
   - 문자열 정규화, HTML 이스케이프, 열 이름 추천 같은 순수 함수를 제공합니다.
   - DOM이나 저장소에 의존하지 않는 작은 계산을 모아둡니다.
   [참고]
   - 제목열 자동 추천, 카드 제목 생성, HTML 출력 값 보정 시 확인합니다.
   ========================================================================== */
const TITLE_HINTS = ["성명", "이름", "주소", "지번", "제목", "민원", "대상"];
const PRIORITY_FIELDS = ["상태", "담당자", "주소", "비고", "구분", "지역"];

/**
 * [함수] normalizeValue
 * [역할] 셀 값이나 사용자 입력을 비교/출력하기 좋은 문자열로 정리한다.
 * [원리] null/undefined는 빈 문자열로, 나머지는 문자열 변환 후 trim한다.
 */
export function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * [함수] escapeHTML
 * [역할] HTML에 삽입할 문자열의 특수문자를 안전하게 치환한다.
 * [원리] &, <, >, ", ' 문자를 엔티티로 바꿔 스크립트/마크업 삽입을 막는다.
 */
export function escapeHTML(value) {
  return normalizeValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * [함수] recommendTitleColumn
 * [역할] 카드 제목으로 쓰기 좋은 열을 자동 추천한다.
 * [원리] 성명/주소/제목 같은 힌트 단어가 들어간 열을 우선 찾고 없으면 첫 열을 쓴다.
 */
export function recommendTitleColumn(columns) {
  return (
    columns.find((column) => TITLE_HINTS.some((hint) => column.includes(hint))) ||
    columns[0] ||
    ""
  );
}

/**
 * [함수] getPreviewColumns
 * [역할] 카드 본문에 기본으로 보여줄 열 목록을 고른다.
 * [원리] 제목 계열 열을 제외하고 우선순위 필드를 앞에 둔 뒤 최대 5개만 반환한다.
 */
export function getPreviewColumns(columns, titleColumns) {
  const titleColumnSet = new Set(titleColumns.filter(Boolean));
  const withoutTitle = columns.filter((column) => !titleColumnSet.has(column));
  const preferred = PRIORITY_FIELDS.flatMap((hint) =>
    withoutTitle.filter((column) => column.includes(hint)),
  );
  const ordered = [...new Set([...preferred, ...withoutTitle])];
  return ordered.slice(0, 4);
}

/**
 * [함수] getUniqueValues
 * [역할] 특정 열의 고유 값을 추출한다.
 * [원리] 빈 값은 제외하고 Set으로 중복을 제거한다.
 */
export function getUniqueValues(rows, column) {
  const values = rows
    .map((row) => normalizeValue(row[column]))
    .filter((value) => value.length > 0);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ko"));
}

/**
 * [함수] getDisplayTitle
 * [역할] 카드나 상세 모달에 표시할 제목 문자열을 만든다.
 * [원리] 제목열/부제목열 값을 " | "로 연결하고 값이 없으면 행 번호로 대체한다.
 */
export function getDisplayTitle(row, titleColumns, fallbackIndex) {
  const title = titleColumns
    .map((column) => normalizeValue(row[column]))
    .filter(Boolean)
    .join(" | ");
  return title || `카드 ${fallbackIndex + 1}`;
}

/**
 * [함수] getExcelColumnName
 * [역할] 0부터 시작하는 열 인덱스를 엑셀 열 이름(A, B, AA...)으로 바꾼다.
 * [원리] 26진수처럼 나누되 엑셀 표기 규칙에 맞춰 1부터 시작하는 문자 계산을 사용한다.
 */
export function getExcelColumnName(index) {
  let columnNumber = index + 1;
  let name = "";

  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }

  return name;
}
