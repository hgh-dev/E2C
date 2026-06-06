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

  renderHeaderSettingsControls(elements, state, hasColumns);

  const columnOptions = getColumnOptions(getVisibleColumns(state), state.rows);

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

  populateSelect(elements.subtitleColumn3Select, columnOptions, state.subtitleColumn3, {
    value: "",
    label: "사용 안 함",
  });
  elements.subtitleColumn3Select.disabled = !hasColumns;

  populateSelect(elements.subtitleColumn4Select, columnOptions, state.subtitleColumn4, {
    value: "",
    label: "사용 안 함",
  });
  elements.subtitleColumn4Select.disabled = !hasColumns;

  renderTitleColumnControls(elements, state, hasColumns);
  renderDisplayColumnOptions(elements, state, getTitleColumns, syncDisplayColumnsModalSummary);
}

/**
 * [함수] renderHeaderSettingsControls
 * [역할] 헤더 설정 버튼 요약과 항목 설정 목록을 렌더링한다.
 * [원리] 숨김 상태를 포함한 columns 순서를 기준으로 일반 모드와 순서 변경 모드 목록을 만든다.
 */
function renderHeaderSettingsControls(elements, state, hasColumns) {
  const hiddenColumns = new Set(state.hiddenColumns || []);
  const visibleColumns = state.columns.filter((column) => !hiddenColumns.has(column));
  elements.headerSettingsOpen.disabled = !hasColumns;
  elements.headerSettingsOpen.textContent = visibleColumns.length
    ? getColumnSummary(visibleColumns)
    : state.columns.length
      ? "모든 항목 숨김"
      : "헤더 설정";
  elements.headerAddColumn.disabled = !hasColumns;
  elements.headerSettingsList.innerHTML = state.columns.length
    ? state.columns.map((column, index) => `
        <div class="header-setting-item${hiddenColumns.has(column) ? " is-hidden" : ""}" data-header-drag-column="${escapeHTML(column)}">
          <div class="header-setting-main">
            <div class="header-setting-name">
              <button type="button" class="header-setting-drag-handle" data-header-drag-handle data-column="${escapeHTML(column)}" aria-label="${escapeHTML(column)} 순서 변경">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 7h14"></path>
                  <path d="M5 12h14"></path>
                  <path d="M5 17h14"></path>
                </svg>
              </button>
              <strong>${escapeHTML(column)}</strong>
              <button type="button" class="header-setting-edit" data-header-action="rename" data-column="${escapeHTML(column)}" aria-label="${escapeHTML(column)} 항목명 수정">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
                </svg>
              </button>
            </div>
            <button type="button" class="header-setting-visibility${hiddenColumns.has(column) ? " is-hidden" : ""}" data-header-action="toggle" data-column="${escapeHTML(column)}">
              ${hiddenColumns.has(column) ? "숨김" : "표시"}
            </button>
          </div>
        </div>
      `).join("")
    : '<div class="checkbox-empty">설정할 헤더가 없습니다.</div>';
}

/**
 * [함수] renderTitleColumnControls
 * [역할] 제목 열 1~5 입력칸 중 현재 필요한 개수만 표시한다.
 * [원리] titleColumnCount와 실제 선택된 제목열 위치를 함께 계산하고 추가 버튼은 최대 5개까지만 노출한다.
 */
function renderTitleColumnControls(elements, state, hasColumns) {
  const titleColumnCount = getTitleColumnCount(state);
  state.titleColumnCount = titleColumnCount;

  elements.titleColumnFields.forEach((field, index) => {
    field.hidden = index >= titleColumnCount;
  });
  elements.addTitleColumn.hidden = titleColumnCount >= 5;
  elements.addTitleColumn.disabled = !hasColumns || titleColumnCount >= 5;
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
  renderDisplayColumnsOpenButton(elements, state, getTitleColumns);
}

/**
 * [함수] renderDisplayColumnsOpenButton
 * [역할] 표시할 열 선택 상태를 설정 화면에서 짧게 요약한다.
 * [원리] 버튼에는 선택 개수만, 보조 문구에는 앞쪽 열 이름만 보여 화면 밀도를 낮춘다.
 */
function renderDisplayColumnsOpenButton(elements, state, getTitleColumns) {
  const selectedDisplayColumns = getSelectedDisplayColumns(state, getTitleColumns);
  const summary = getColumnSummary(selectedDisplayColumns);
  elements.displayColumnsOpen.classList.remove("has-control-preview", "has-display-column-chips");
  elements.displayColumnsOpen.textContent = selectedDisplayColumns.length ? summary : "선택된 열 없음";
  elements.displayColumnsSummary.textContent = "";
}

/**
 * [함수] getSelectableDisplayColumns
 * [역할] 카드 본문 표시열 후보를 계산한다.
 * [원리] 카드명에 이미 쓰이는 제목/부제목 열을 제외한 열만 반환한다.
 */
function getSelectableDisplayColumns(state, getTitleColumns) {
  const titleColumnSet = new Set(getTitleColumns(state));
  const hiddenColumns = new Set(state.hiddenColumns || []);
  return state.columns.filter((column) => !titleColumnSet.has(column) && !hiddenColumns.has(column));
}

function getVisibleColumns(state) {
  const hiddenColumns = new Set(state.hiddenColumns || []);
  return state.columns.filter((column) => !hiddenColumns.has(column));
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

/**
 * [함수] getColumnSummary
 * [역할] 표시할 열 선택 상태를 설정 화면용 짧은 문장으로 만든다.
 * [원리] 앞쪽 열 이름만 보여주고 나머지는 개수로 접어 화면 밀도를 낮춘다.
 */
function getColumnSummary(columns) {
  if (!columns.length) return "0개 선택";
  const visibleColumns = columns.slice(0, 3).join(", ");
  const restCount = columns.length - 3;
  return restCount > 0 ? `${visibleColumns} 외 ${restCount}개` : visibleColumns;
}

/**
 * [함수] getTitleColumnCount
 * [역할] 가져오기 설정에서 표시할 제목 입력칸 개수를 계산한다.
 * [원리] 저장된 개수와 실제 선택된 제목열 위치를 함께 보고 1~5 범위로 제한한다.
 */
function getTitleColumnCount(state) {
  const titleColumns = [
    state.titleColumn,
    state.subtitleColumn1,
    state.subtitleColumn2,
    state.subtitleColumn3,
    state.subtitleColumn4,
  ];
  const lastSelectedIndex = titleColumns.reduce(
    (lastIndex, column, index) => (column ? index : lastIndex),
    0,
  );
  const requestedCount = Number(state.titleColumnCount) || 1;
  return Math.min(5, Math.max(1, requestedCount, lastSelectedIndex + 1));
}
