/* ==========================================================================
   [모듈] 가져오기/표시열 컨트롤 렌더러 (controlsRenderer.js)
   [역할]
   - 시트, 표 시작 행, 제목열, 부제목열, 표시할 열 선택 UI를 렌더링합니다.
   - 열/행 샘플 미리보기와 표시할 열 체크박스 상태를 계산합니다.
   [참고]
   - 가져오기 설정의 선택 목록이나 표시할 열 개수가 이상할 때 확인합니다.
   ========================================================================== */
import { escapeHTML, normalizeValue } from "./utils.js";

/**
 * [함수] renderControls
 * [역할] 가져오기 설정 화면의 시트/행/열 선택 컨트롤을 현재 상태로 렌더링한다.
 * [원리] state의 workbook/columns 존재 여부에 따라 선택 버튼을 채우고 비활성화 상태를 동기화한다.
 */
export function renderControls({
  elements,
  state,
  populateSelect,
  getTitleColumns,
  syncDisplayColumnsModalSummary,
}) {
  const hasColumns = state.columns.length > 0;
  const hasWorkbook = state.sheetNames.length > 0;

  elements.fileName.textContent = state.fileName || "엑셀 파일을 선택하세요.";

  populateSelect(elements.sheetSelect, state.sheetNames, state.activeSheetName);
  elements.sheetSelect.disabled = !hasWorkbook;

  const headerRowOptions = getHeaderRowOptions(state.sheetMatrix);
  populateSelect(elements.headerRowSelect, headerRowOptions, String(state.headerRowIndex));
  elements.headerRowSelect.disabled = headerRowOptions.length === 0;

  const columnOptions = getColumnOptions(state.columns, state.rows);

  populateSelect(elements.titleColumnSelect, columnOptions, state.titleColumn);
  elements.titleColumnSelect.disabled = !hasColumns;

  populateSelect(elements.subtitleColumn1Select, columnOptions, state.subtitleColumn1, {
    value: "",
    label: "사용 안 함",
  });
  elements.subtitleColumn1Select.disabled = !hasColumns;

  populateSelect(elements.subtitleColumn2Select, columnOptions, state.subtitleColumn2, {
    value: "",
    label: "사용 안 함",
  });
  elements.subtitleColumn2Select.disabled = !hasColumns;

  renderDisplayColumnOptions(elements, state, getTitleColumns, syncDisplayColumnsModalSummary);
}

/**
 * [함수] getHeaderRowOptions
 * [역할] 표 시작 행 선택 팝업에 표시할 행 옵션을 만든다.
 * [원리] 각 행의 앞쪽 셀 값을 샘플로 묶고 최대 100행까지만 선택 후보로 반환한다.
 */
export function getHeaderRowOptions(matrix) {
  return matrix
    .map((row, index) => {
      const preview = row
        .map((cell) => normalizeValue(cell))
        .filter(Boolean)
        .slice(0, 4)
        .join(" / ");
      return {
        value: String(index),
        label: `${index + 1}행`,
        preview: preview ? `${preview} / ...` : "",
      };
    })
    .slice(0, 100);
}

/**
 * [함수] getColumnOptions
 * [역할] 열 선택 팝업에 표시할 열 옵션을 만든다.
 * [원리] 열 이름과 해당 열의 실제 값 샘플을 함께 반환한다.
 */
export function getColumnOptions(columns, rows) {
  return columns.map((column) => ({
    value: column,
    label: column,
    preview: getColumnPreview(rows, column),
  }));
}

/**
 * [함수] getFilterValueOptions
 * [역할] 필터 값 선택 팝업에 표시할 고유값 목록을 만든다.
 * [원리] 빈 값은 제외하고 값별 카드 개수를 집계한 뒤 가나다순으로 정렬한다.
 */
export function getFilterValueOptions(rows, column) {
  const counts = rows.reduce((map, row) => {
    const value = normalizeValue(row[column]);
    if (!value) return map;

    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([value, count]) => ({
      value,
      label: value,
      preview: `${count}개 카드`,
    }));
}

/**
 * [함수] getEmptyFilterValueCount
 * [역할] 특정 열에서 값이 비어 있는 카드 개수를 계산한다.
 * [원리] normalizeValue 결과가 빈 문자열인 행만 센다.
 */
export function getEmptyFilterValueCount(rows, column) {
  return rows.filter((row) => normalizeValue(row[column]) === "").length;
}

/**
 * [함수] getSelectedDisplayColumns
 * [역할] 현재 실제로 카드에 표시할 열 목록을 반환한다.
 * [원리] 저장된 표시열 중 제목/부제목열과 충돌하지 않는 열만 남긴다.
 */
export function getSelectedDisplayColumns(state, getTitleColumns) {
  const selectableColumns = getSelectableDisplayColumns(state, getTitleColumns);
  return state.displayColumns.filter((column) => selectableColumns.includes(column));
}

/**
 * [함수] getAllSelectableDisplayColumns
 * [역할] 표시할 열로 선택 가능한 전체 열 목록을 반환한다.
 * [원리] 제목/부제목으로 쓰는 열은 카드 본문 중복을 피하기 위해 제외한다.
 */
export function getAllSelectableDisplayColumns(state, getTitleColumns) {
  return getSelectableDisplayColumns(state, getTitleColumns);
}

/**
 * [함수] getDisplayColumnCheckboxValues
 * [역할] 표시할 열 모달에서 체크된 열 값을 읽는다.
 * [원리] 체크 상태인 checkbox input의 value만 배열로 수집한다.
 */
export function getDisplayColumnCheckboxValues(elements) {
  return [...elements.displayColumnsList.querySelectorAll("input:checked")].map((input) => input.value);
}

/**
 * [함수] setDisplayColumnCheckboxValues
 * [역할] 표시할 열 모달의 체크 상태를 지정한 열 목록으로 맞춘다.
 * [원리] 선택 열 Set을 만든 뒤 각 checkbox checked 값을 갱신하고 요약도 다시 계산한다.
 */
export function setDisplayColumnCheckboxValues(elements, columns, syncDisplayColumnsModalSummary) {
  const selectedColumns = new Set(columns);
  elements.displayColumnsList.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = selectedColumns.has(input.value);
  });
  syncDisplayColumnsModalSummary();
}

/**
 * [함수] syncDisplayColumnsModalSummary
 * [역할] 표시할 열 모달의 전체 선택 상태와 선택 개수 문구를 갱신한다.
 * [원리] 전체 checkbox 수와 선택 checkbox 수로 checked/indeterminate 상태를 계산한다.
 */
export function syncDisplayColumnsModalSummary(elements) {
  const checkboxes = [...elements.displayColumnsList.querySelectorAll("input[type='checkbox']")];
  const selectedCount = checkboxes.filter((input) => input.checked).length;
  const totalCount = checkboxes.length;

  elements.displayColumnsAll.disabled = totalCount === 0;
  elements.displayColumnsAll.checked = totalCount > 0 && selectedCount === totalCount;
  elements.displayColumnsAll.indeterminate = selectedCount > 0 && selectedCount < totalCount;
  elements.displayColumnsCount.textContent = `${selectedCount} / ${totalCount}개 선택`;
}

/**
 * [함수] renderDisplayColumnOptions
 * [역할] 표시할 열 선택 모달의 체크박스 목록과 버튼 요약을 렌더링한다.
 * [원리] 선택 가능한 열을 기준으로 체크박스 HTML을 만들고 현재 선택값을 버튼 텍스트에 반영한다.
 */
function renderDisplayColumnOptions(elements, state, getTitleColumns, syncDisplayColumnsModalSummary) {
  const selectableColumns = getSelectableDisplayColumns(state, getTitleColumns);
  const selectedColumns = new Set(getSelectedDisplayColumns(state, getTitleColumns));
  const hasColumns = selectableColumns.length > 0;

  elements.displayColumnsList.innerHTML = hasColumns
    ? selectableColumns
        .map((column) => {
          const checked = selectedColumns.has(column) ? "checked" : "";
          const preview = getColumnPreview(state.rows, column);
          return `
            <label class="checkbox-option">
              <input type="checkbox" value="${escapeHTML(column)}" ${checked} />
              <span class="checkbox-option-text">
                <span class="checkbox-option-title">${escapeHTML(column)}</span>
                ${preview ? `<span class="checkbox-option-preview">${escapeHTML(preview)}</span>` : ""}
              </span>
            </label>
          `;
        })
        .join("")
    : '<span class="checkbox-empty">선택 가능한 열이 없습니다.</span>';

  syncDisplayColumnsModalSummary();
  elements.displayColumnsOpen.disabled = !hasColumns;
  elements.displayColumnsOpen.textContent = selectedColumns.size
    ? getSelectedDisplayColumns(state, getTitleColumns).join(", ")
    : "선택된 열 없음";
  elements.displayColumnsSummary.textContent = `${selectedColumns.size} / ${selectableColumns.length}개 선택`;
}

/**
 * [함수] getSelectableDisplayColumns
 * [역할] 카드 본문 표시열 후보를 계산한다.
 * [원리] 카드명에 이미 쓰이는 제목/부제목 열을 제외한 열만 반환한다.
 */
function getSelectableDisplayColumns(state, getTitleColumns) {
  const titleColumnSet = new Set(getTitleColumns(state));
  return state.columns.filter((column) => !titleColumnSet.has(column));
}

/**
 * [함수] getColumnPreview
 * [역할] 열 선택 목록에 보여줄 실제 값 샘플을 만든다.
 * [원리] 해당 열의 빈 값 제외 고유값 앞 4개를 " / "로 연결한다.
 */
function getColumnPreview(rows, column) {
  const values = rows
    .map((row) => normalizeValue(row[column]))
    .filter(Boolean);
  const uniqueValues = [...new Set(values)].slice(0, 4);

  return uniqueValues.length ? `${uniqueValues.join(" / ")} / ...` : "";
}
