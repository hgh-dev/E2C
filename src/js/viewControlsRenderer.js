/* ==========================================================================
   [모듈] 필터/정렬/검색 컨트롤 렌더러 (viewControlsRenderer.js)
   [역할]
   - 필터/정렬 팝업, 검색 바텀시트, 페이지 컨트롤의 현재 상태를 렌더링합니다.
   - 필터 값 목록과 페이지 묶음 표시를 계산합니다.
   [참고]
   - 필터 값 목록, 검색 버튼 상태, 페이지 번호 표시가 이상할 때 확인합니다.
   ========================================================================== */
import { EMPTY_FILTER_VALUE } from "./filterConstants.js";
import {
  getColumnOptions,
  getEmptyFilterValueCount,
  getFilterValueOptions,
} from "./controlsRenderer.js";

/**
 * [함수] renderFilterSortControls
 * [역할] 필터/정렬 버튼과 설정 팝업의 현재 선택 상태를 렌더링한다.
 * [원리] 열 존재 여부, 활성 필터/정렬 여부를 계산해 버튼 상태와 동적 선택 컨트롤을 동기화한다.
 */
export function renderFilterSortControls({
  elements,
  state,
  populateSelect,
  getMultiSelectLabel,
  closeFilterPanel,
  closeSortPanel,
}) {
  const visibleColumns = getVisibleColumns(state);
  const hasColumns = visibleColumns.length > 0;
  const filters = getStateFilters(state);
  const sorts = getStateSorts(state);
  const hasActiveFilter = filters.some((filter) => filter.column && filter.values.length > 0);
  const hasActiveSort = sorts.some((sort) => sort.column);

  elements.filterOpen.disabled = !hasColumns;
  elements.filterOpen.classList.toggle("active", hasActiveFilter);
  elements.sortOpen.disabled = !hasColumns;
  elements.sortOpen.classList.toggle("active", hasActiveSort);

  const columnOptions = getColumnOptions(visibleColumns, state.rows);

  renderFilterRows({
    elements,
    state,
    filters,
    columnOptions,
    hasColumns,
    populateSelect,
    getMultiSelectLabel,
  });

  renderSortRows({
    elements,
    sorts,
    columnOptions,
    hasColumns,
    populateSelect,
  });

  if (!hasColumns) {
    closeFilterPanel();
    closeSortPanel();
  }
}

/**
 * [함수] getStateSorts
 * [역할] 현재 정렬 상태를 배열 형태로 표준화한다.
 * [원리] 새 sorts 배열이 있으면 그대로 보정하고, 예전 단일 정렬 상태도 배열로 변환한다.
 */
function getStateSorts(state) {
  if (Array.isArray(state.sorts)) {
    return state.sorts.map((sort) => ({
      column: sort.column || "",
      direction: ["asc", "desc", "random"].includes(sort.direction) ? sort.direction : "asc",
      randomSortSeed: sort.randomSortSeed || "",
    }));
  }

  return state.sortColumn
    ? [
        {
          column: state.sortColumn,
          direction: state.sortDirection || "asc",
          randomSortSeed: state.randomSortSeed || "",
        },
      ]
    : [];
}

/**
 * [함수] renderSearchControl
 * [역할] 검색 바텀시트와 플로팅 검색 버튼 상태를 렌더링한다.
 * [원리] 검색 대상 열 옵션과 검색어를 DOM에 반영하고 검색 가능 여부에 따라 컨트롤을 비활성화한다.
 */
export function renderSearchControl({
  elements,
  state,
  populateSelect,
  closeSearchPanel,
}) {
  const visibleColumns = getVisibleColumns(state);
  const hasColumns = visibleColumns.length > 0;
  const columnOptions = getColumnOptions(visibleColumns, state.rows);
  populateSelect(elements.searchColumnSelect, columnOptions, state.searchColumn, {
    value: "",
    label: "전체 열",
  });
  elements.searchColumnSelect.disabled = !hasColumns;
  elements.searchInput.disabled = !hasColumns;
  elements.floatingSearchButton.disabled = !hasColumns;
  elements.floatingSearchButton.classList.toggle(
    "has-search",
    Boolean(state.searchTerm.trim() || state.searchColumn),
  );
  elements.searchInput.value = state.searchTerm;

  if (!hasColumns) {
    closeSearchPanel();
  }
}

function getVisibleColumns(state) {
  const hiddenColumns = new Set(state.hiddenColumns || []);
  return state.columns.filter((column) => !hiddenColumns.has(column));
}

/**
 * [함수] renderDisplayModeControl
 * [역할] 가져오기 설정 화면의 표시 방식 값을 렌더링한다.
 * [원리] scroll/page 상태를 한글 텍스트와 라디오 체크 상태에 동시에 반영한다.
 */
export function renderDisplayModeControl(elements, state) {
  const mode = state.displayMode || "scroll";
  elements.displayModeValue.textContent = mode === "page" ? "페이지" : "스크롤";
  elements.displayModeInputs.forEach((input) => {
    input.checked = input.value === mode;
  });
}

/**
 * [함수] renderPageControls
 * [역할] 페이지 방식에서 하단 페이지 이동 컨트롤을 렌더링한다.
 * [원리] 전체 페이지 수와 현재 페이지 묶음을 계산해 페이지 번호와 이동 버튼 상태를 갱신한다.
 */
export function renderPageControls(elements, state, totalRows, currentPage, pageSize) {
  const isPageMode = state.displayMode === "page";
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  elements.pageControls.hidden = !isPageMode || totalRows === 0;
  elements.pageNumbers.innerHTML = getVisiblePageNumbers(currentPage, totalPages)
    .map((page) => {
      const activeClass = page === currentPage ? " active" : "";
      return `<button class="page-number${activeClass}" type="button" data-page="${page}" aria-label="${page} 페이지">${page}</button>`;
    })
    .join("");
  elements.pageFirst.disabled = currentPage <= 1;
  elements.pagePrev.disabled = getPageGroupStart(currentPage) <= 1;
  elements.pageNext.disabled = getPageGroupStart(currentPage) + 5 > totalPages;
  elements.pageLast.disabled = currentPage >= totalPages;
}

/**
 * [함수] getStateFilters
 * [역할] 현재 필터 상태를 배열 형태로 표준화한다.
 * [원리] 새 filters 배열이 있으면 그대로 정규화하고, 예전 단일 필터 상태도 배열로 변환한다.
 */
function getStateFilters(state) {
  const filters = Array.isArray(state.filters) ? state.filters : [];
  if (Array.isArray(state.filters)) {
    return filters.map((filter) => ({
      column: filter.column || "",
      value: filter.value || "",
      values: normalizeFilterValues(filter),
    }));
  }

  return [
    {
      column: state.filterColumn || "",
      value: state.filterValue || "",
      values: state.filterValue ? [state.filterValue] : [],
    },
  ];
}

/**
 * [함수] renderFilterRows
 * [역할] 필터 팝업 안의 필터1, 필터2... 행을 렌더링한다.
 * [원리] 필터별 열/값 선택 버튼을 만들고 이미 선택된 열은 다른 필터에서 비활성화한다.
 */
function renderFilterRows({
  elements,
  state,
  filters,
  columnOptions,
  hasColumns,
  populateSelect,
  getMultiSelectLabel,
}) {
  const normalizedFilters = filters;
  elements.filterList.innerHTML = normalizedFilters.length
    ? normalizedFilters
        .map((filter, index) => {
          return `
            <div class="filter-row" data-filter-index="${index}">
              <div class="filter-row-header">
                <strong>필터${index + 1}</strong>
                <button class="filter-remove-button" type="button" data-filter-remove="${index}" aria-label="필터${index + 1} 삭제">삭제</button>
              </div>
              <div class="filter-row-controls">
                <label class="field">
                  <span>필터 열</span>
                  <button class="select-button" type="button" data-dynamic-select data-filter-field="column" data-filter-index="${index}" ${
                    hasColumns ? "" : "disabled"
                  }></button>
                </label>
                <label class="field">
                  <span>필터 값</span>
                  <button class="select-button" type="button" data-dynamic-select data-filter-field="value" data-filter-index="${index}" ${
                    hasColumns && filter.column ? "" : "disabled"
                  }></button>
                </label>
              </div>
            </div>
          `;
        })
        .join("")
    : '<div class="filter-empty">필터가 없습니다.</div>';

  elements.filterList.querySelectorAll("[data-filter-field='column']").forEach((control) => {
    const index = Number(control.dataset.filterIndex);
    const selectedColumns = new Set(
      normalizedFilters
        .map((filter, filterIndex) => (filterIndex === index ? "" : filter.column))
        .filter(Boolean),
    );
    const rowColumnOptions = columnOptions.map((option) => ({
      ...option,
      disabled: Boolean(option.value && selectedColumns.has(option.value)),
      preview: option.value && selectedColumns.has(option.value) ? "이미 선택된 필터 열" : option.preview,
    }));
    populateSelect(control, rowColumnOptions, normalizedFilters[index]?.column || "", {
      value: "",
      label: "사용 안 함",
    });
    control.disabled = !hasColumns;
  });

  elements.filterList.querySelectorAll("[data-filter-field='value']").forEach((control) => {
    const index = Number(control.dataset.filterIndex);
    const column = normalizedFilters[index]?.column || "";
    const filterValues = column
      ? [
          {
            value: EMPTY_FILTER_VALUE,
            label: "값 없음",
            preview: `${getEmptyFilterValueCount(state.rows, column)}개 카드`,
          },
          ...getFilterValueOptions(state.rows, column),
        ]
      : [];
    populateSelect(control, filterValues, normalizedFilters[index]?.value || "", {
      value: "",
      label: "전체",
    });
    const selectedValues = normalizedFilters[index]?.values || [];
    control.selectedValues = [...selectedValues];
    control.value = selectedValues[0] || "";
    control.textContent = getMultiSelectLabel(control.selectOptions || [], selectedValues);
    control.disabled = !hasColumns || !column;
  });

  elements.addFilter.disabled = !hasColumns;
}

/**
 * [함수] renderSortRows
 * [역할] 정렬 팝업 안의 정렬1, 정렬2... 행을 렌더링한다.
 * [원리] 정렬별 열/방향 선택 버튼을 만들고 이미 선택된 열은 다른 정렬에서 비활성화한다.
 */
function renderSortRows({
  elements,
  sorts,
  columnOptions,
  hasColumns,
  populateSelect,
}) {
  elements.sortList.innerHTML = sorts.length
    ? sorts
        .map((sort, index) => {
          return `
            <div class="filter-row" data-sort-index="${index}">
              <div class="filter-row-header">
                <strong>정렬${index + 1}</strong>
                <button class="filter-remove-button" type="button" data-sort-remove="${index}" aria-label="정렬${index + 1} 삭제">삭제</button>
              </div>
              <div class="filter-row-controls">
                <label class="field">
                  <span>정렬 열</span>
                  <button class="select-button" type="button" data-dynamic-select data-sort-field="column" data-sort-index="${index}" ${
                    hasColumns ? "" : "disabled"
                  }></button>
                </label>
                <label class="field">
                  <span>정렬 방향</span>
                  <button class="select-button" type="button" data-dynamic-select data-sort-field="direction" data-sort-index="${index}" ${
                    hasColumns && sort.column ? "" : "disabled"
                  }></button>
                </label>
              </div>
            </div>
          `;
        })
        .join("")
    : '<div class="filter-empty">정렬이 없습니다.</div>';

  elements.sortList.querySelectorAll("[data-sort-field='column']").forEach((control) => {
    const index = Number(control.dataset.sortIndex);
    const selectedColumns = new Set(
      sorts
        .map((sort, sortIndex) => (sortIndex === index ? "" : sort.column))
        .filter(Boolean),
    );
    const rowColumnOptions = columnOptions.map((option) => ({
      ...option,
      disabled: Boolean(option.value && selectedColumns.has(option.value)),
      preview: option.value && selectedColumns.has(option.value) ? "이미 선택된 정렬 열" : option.preview,
    }));
    populateSelect(control, rowColumnOptions, sorts[index]?.column || "", {
      value: "",
      label: "사용 안 함",
    });
    control.disabled = !hasColumns;
  });

  const directionOptions = [
    { value: "asc", label: "오름차순" },
    { value: "desc", label: "내림차순" },
    { value: "random", label: "무작위" },
  ];

  elements.sortList.querySelectorAll("[data-sort-field='direction']").forEach((control) => {
    const index = Number(control.dataset.sortIndex);
    populateSelect(control, directionOptions, sorts[index]?.direction || "asc");
    control.disabled = !hasColumns || !sorts[index]?.column;
  });

  elements.addSort.disabled = !hasColumns;
}

/**
 * [함수] normalizeFilterValues
 * [역할] 필터 값 상태를 다중 선택 배열로 정규화한다.
 * [원리] values 배열이 있으면 빈 값을 제거하고, 예전 value 문자열은 단일 배열로 변환한다.
 */
function normalizeFilterValues(filter) {
  if (Array.isArray(filter.values)) {
    return filter.values.filter(Boolean);
  }

  return filter.value ? [filter.value] : [];
}

/**
 * [함수] getVisiblePageNumbers
 * [역할] 현재 보여줄 5개 단위 페이지 번호 목록을 계산한다.
 * [원리] 현재 페이지의 묶음 시작 번호부터 최대 5개를 전체 페이지 수 안에서 반환한다.
 */
function getVisiblePageNumbers(currentPage, totalPages) {
  const visibleCount = 5;
  const start = getPageGroupStart(currentPage);
  const end = Math.min(totalPages, start + visibleCount - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * [함수] getPageGroupStart
 * [역할] 현재 페이지가 속한 5개 단위 묶음의 시작 페이지를 계산한다.
 * [원리] 페이지 번호를 0 기반으로 바꿔 5로 나눈 뒤 다시 1 기반 시작값으로 되돌린다.
 */
function getPageGroupStart(page) {
  return Math.floor((page - 1) / 5) * 5 + 1;
}
