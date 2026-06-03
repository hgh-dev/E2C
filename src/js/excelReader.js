import { getExcelColumnName, normalizeValue } from "./utils.js";

const SUPPORTED_FILE_TYPES = {
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  csv: ["text/csv", "text/comma-separated-values", "application/csv", "text/plain"],
};

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

export function sheetToTable(workbook, sheetName, headerRowIndex = 0) {
  return matrixToTable(sheetToMatrix(workbook, sheetName), headerRowIndex);
}

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function getFileKind(file) {
  const extension = getExtension(file.name || "");
  if (["xlsx", "xls", "csv"].includes(extension)) return extension;

  const mimeType = normalizeValue(file.type).toLowerCase();
  return (
    Object.entries(SUPPORTED_FILE_TYPES).find(([, types]) => types.includes(mimeType))?.[0] || ""
  );
}

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

export function sheetToCsvFallbackTable(sheet) {
  return matrixToTable(sheet?.__csvRows || []);
}

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

function decodeText(buffer, encoding) {
  try {
    return new TextDecoder(encoding, { fatal: encoding === "utf-8" }).decode(buffer);
  } catch {
    return "";
  }
}

function hasBrokenKoreanEncoding(text) {
  return text.includes("\uFFFD");
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

export function matrixToTable(matrix, headerRowIndex = 0) {
  if (!matrix.some((row) => row.some((cell) => normalizeValue(cell).length > 0))) {
    return { columns: [], rows: [] };
  }

  const headerRow = matrix[headerRowIndex] || [];
  const columns = makeUniqueColumns(headerRow.map((cell, index) => {
    const label = normalizeValue(cell);
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

function makeUniqueColumns(columns) {
  const counts = new Map();
  return columns.map((column) => {
    const count = counts.get(column) || 0;
    counts.set(column, count + 1);
    return count === 0 ? column : `${column} ${count + 1}`;
  });
}

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
