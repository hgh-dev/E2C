const TITLE_HINTS = ["성명", "이름", "주소", "지번", "제목", "민원", "대상"];
const PRIORITY_FIELDS = ["상태", "담당자", "주소", "비고", "구분", "지역"];

export function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function escapeHTML(value) {
  return normalizeValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function recommendTitleColumn(columns) {
  return (
    columns.find((column) => TITLE_HINTS.some((hint) => column.includes(hint))) ||
    columns[0] ||
    ""
  );
}

export function getPreviewColumns(columns, titleColumns) {
  const titleColumnSet = new Set(titleColumns.filter(Boolean));
  const withoutTitle = columns.filter((column) => !titleColumnSet.has(column));
  const preferred = PRIORITY_FIELDS.flatMap((hint) =>
    withoutTitle.filter((column) => column.includes(hint)),
  );
  const ordered = [...new Set([...preferred, ...withoutTitle])];
  return ordered.slice(0, 4);
}

export function getUniqueValues(rows, column) {
  const values = rows
    .map((row) => normalizeValue(row[column]))
    .filter((value) => value.length > 0);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ko"));
}

export function getDisplayTitle(row, titleColumns, fallbackIndex) {
  const title = titleColumns
    .map((column) => normalizeValue(row[column]))
    .filter(Boolean)
    .join(" ");
  return title || `카드 ${fallbackIndex + 1}`;
}

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
