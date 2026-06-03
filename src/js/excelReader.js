/* ==========================================================================
   [모듈] 엑셀/CSV 읽기 (excelReader.js)
   [역할]
   - xlsx, xls, csv 파일을 SheetJS 워크북과 2차원 배열로 변환합니다.
   - 선택한 표 시작 행을 기준으로 헤더와 데이터 행을 JSON 형태로 만듭니다.
   [참고]
   - 파일 형식 지원, 한글 CSV 인코딩, 열 이름 보정 문제가 있을 때 확인합니다.
   ========================================================================== */
import { getExcelColumnName, normalizeValue } from "./utils.js";

const SUPPORTED_FILE_TYPES = {
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  csv: ["text/csv", "text/comma-separated-values", "application/csv", "text/plain"],
};

/**
 * [함수] readFileAsWorkbook
 * [역할] 사용자가 선택한 xlsx/xls/csv 파일을 SheetJS workbook으로 읽는다.
 * [원리] 확장자와 MIME을 확인한 뒤 CSV는 텍스트 디코딩, 엑셀은 ArrayBuffer로 파싱한다.
 */
export async function readFileAsWorkbook(file) {
  const extension = getFileKind(file);

  if (!["xlsx", "xls", "csv"].includes(extension)) {
    throw new Error("UNSUPPORTED_FILE");
  }

  if (extension === "csv") {
    return readCsvWorkbook(file);
  }

  if (!window.XLSX) {
    throw new Error("SHEETJS_NOT_LOADED");
  }

  const buffer = await file.arrayBuffer();
  return window.XLSX.read(buffer, { type: "array", cellDates: true });
}

/**
 * [함수] sheetToMatrix
 * [역할] 선택한 시트를 2차원 배열로 변환한다.
 * [원리] SheetJS의 header: 1 옵션으로 셀 값을 행/열 배열 형태로 가져온다.
 */
export function sheetToMatrix(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !window.XLSX) {
    return sheet?.__csvRows || [];
  }

  return window.XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

/**
 * [함수] sheetToTable
 * [역할] 선택한 시트를 카드 변환용 columns/rows 구조로 변환한다.
 * [원리] 시트를 matrix로 만든 뒤 표 시작 행을 기준으로 matrixToTable에 위임한다.
 */
export function sheetToTable(workbook, sheetName, headerRowIndex = 0) {
  return matrixToTable(sheetToMatrix(workbook, sheetName), headerRowIndex);
}

/**
 * [함수] getExtension
 * [역할] 파일명에서 확장자를 소문자로 추출한다.
 * [원리] 마지막 점 이후 문자열을 사용하고, 점이 없으면 빈 문자열을 반환한다.
 */
function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

/**
 * [함수] getFileKind
 * [역할] 파일이 엑셀인지 CSV인지 판별한다.
 * [원리] 확장자를 우선 확인하고, 보조로 MIME 타입의 csv 포함 여부를 본다.
 */
function getFileKind(file) {
  const extension = getExtension(file.name || "");
  if (["xlsx", "xls", "csv"].includes(extension)) return extension;

  const mimeType = normalizeValue(file.type).toLowerCase();
  return (
    Object.entries(SUPPORTED_FILE_TYPES).find(([, types]) => types.includes(mimeType))?.[0] || ""
  );
}

/**
 * [함수] readCsvWorkbook
 * [역할] CSV 파일을 SheetJS workbook 형태로 감싼다.
 * [원리] 텍스트를 먼저 안정적으로 디코딩한 뒤 XLSX.read에 csv 타입으로 넘긴다.
 */
async function readCsvWorkbook(file) {
  const text = await readCsvText(file);
  const rows = parseCsv(text);
  const sheetName = "CSV";
  return {
    SheetNames: [sheetName],
    Sheets: {
      [sheetName]: window.XLSX
        ? window.XLSX.utils.aoa_to_sheet(rows)
        : { __csvRows: rows },
    },
  };
}

/**
 * [함수] sheetToCsvFallbackTable
 * [역할] SheetJS 시트를 CSV 문자열 경유로 표 구조로 변환한다.
 * [원리] sheet_to_csv 결과를 직접 파싱해 matrixToTable을 호출한다.
 */
export function sheetToCsvFallbackTable(sheet) {
  return matrixToTable(sheet?.__csvRows || []);
}

/**
 * [함수] readCsvText
 * [역할] CSV 텍스트를 한글이 깨지지 않도록 디코딩한다.
 * [원리] UTF-8을 먼저 시도하고 깨짐 문자가 있으면 EUC-KR을 보조로 시도한다.
 */
async function readCsvText(file) {
  const buffer = await file.arrayBuffer();
  const utf8Text = decodeText(buffer, "utf-8");

  if (utf8Text && !hasBrokenKoreanEncoding(utf8Text)) {
    return stripBom(utf8Text);
  }

  const koreanText = decodeText(buffer, "euc-kr");
  if (koreanText) {
    return stripBom(koreanText);
  }

  return stripBom(utf8Text || "");
}

/**
 * [함수] decodeText
 * [역할] ArrayBuffer를 지정한 문자 인코딩으로 문자열화한다.
 * [원리] TextDecoder 실패 시 빈 문자열을 반환해 다음 후보 인코딩으로 넘어가게 한다.
 */
function decodeText(buffer, encoding) {
  try {
    return new TextDecoder(encoding, { fatal: encoding === "utf-8" }).decode(buffer);
  } catch {
    return "";
  }
}

/**
 * [함수] hasBrokenKoreanEncoding
 * [역할] 텍스트에 인코딩 실패 흔적이 있는지 확인한다.
 * [원리] TextDecoder가 만든 대체 문자(U+FFFD) 포함 여부를 검사한다.
 */
function hasBrokenKoreanEncoding(text) {
  return text.includes("\uFFFD");
}

/**
 * [함수] stripBom
 * [역할] CSV 앞에 붙을 수 있는 BOM 문자를 제거한다.
 * [원리] 문자열 시작 위치의 U+FEFF만 정규식으로 제거한다.
 */
function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

/**
 * [함수] matrixToTable
 * [역할] 2차원 배열을 카드 데이터의 columns/rows 구조로 변환한다.
 * [원리] 표 시작 행을 헤더로 쓰고, 그 아래 비어 있지 않은 행만 객체로 만든다.
 */
export function matrixToTable(matrix, headerRowIndex = 0) {
  if (!matrix.some((row) => row.some((cell) => normalizeValue(cell).length > 0))) {
    return { columns: [], rows: [] };
  }

  const headerRow = matrix[headerRowIndex] || [];
  const columns = makeUniqueColumns(headerRow.map((cell, index) => {
    const label = normalizeValue(cell);
    // 헤더 셀이 비어 있으면 엑셀 열 표기(A열, B열...)로 대체해 사용자가 위치를 알 수 있게 합니다.
    return label || `${getExcelColumnName(index)}열`;
  }));

  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => normalizeValue(cell).length > 0))
    .map((row) => {
      return columns.reduce((record, column, index) => {
        record[column] = normalizeValue(row[index]);
        return record;
      }, {});
    });

  return { columns, rows };
}

/**
 * [함수] makeUniqueColumns
 * [역할] 중복된 열 이름을 고유한 열 이름으로 보정한다.
 * [원리] 이미 나온 이름이면 뒤에 2, 3처럼 번호를 붙여 객체 키 충돌을 막는다.
 */
function makeUniqueColumns(columns) {
  const counts = new Map();
  return columns.map((column) => {
    const count = counts.get(column) || 0;
    counts.set(column, count + 1);
    // 같은 열 이름이 여러 번 나오면 객체 키가 덮어써지므로 뒤쪽 열에 번호를 붙입니다.
    return count === 0 ? column : `${column} ${count + 1}`;
  });
}

/**
 * [함수] parseCsv
 * [역할] CSV 문자열을 2차원 배열로 직접 파싱한다.
 * [원리] 따옴표 안 쉼표/줄바꿈을 구분하면서 셀 단위로 누적한다.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
