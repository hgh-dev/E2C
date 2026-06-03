/* ==========================================================================
   [모듈] 필터/정렬 컨트롤러 (filterSortController.js)
   [역할]
   - 필터 추가/삭제/변경과 정렬 조건 변경을 처리합니다.
   - 팝업 적용 전 임시 변경을 취소할 수 있도록 스냅샷을 관리합니다.
   [참고]
   - 필터 적용/취소, 중복 필터 열, 무작위 정렬 동작이 이상할 때 확인합니다.
   ========================================================================== */
import {
  getNormalizedFilters,
  getNormalizedSorts,
  syncLegacyFilterState,
  syncLegacySortState,
} from "./stateSerializer.js";

/**
 * [함수] createFilterSortController
 * [역할] 필터/정렬 팝업의 변경, 적용, 취소 동작을 묶어 반환한다.
 * [원리] 팝업을 열 때 현재 상태를 스냅샷으로 저장해 취소 시 복원한다.
 */
export function createFilterSortController({
  elements,
  state,
  render,
  resetPage,
  autoSaveActiveDeck,
  closeFilterPanel,
  closeSortPanel,
  toggleFilterPanel,
  toggleSortPanel,
}) {
  let filterSnapshot = null;
  let sortSnapshot = null;

  /**
   * [함수] toggleFilterSettings
   * [역할] 필터 팝업을 열거나 닫는다.
   * [원리] 열 때 현재 filters를 복사해 취소 복원용 스냅샷으로 보관한다.
   */
  function toggleFilterSettings() {
    if (!elements.filterPanel.hidden) {
      cancelFilterSettings();
      return;
    }

    filterSnapshot = getNormalizedFilters(state);
    toggleFilterPanel();
  }

  /**
   * [함수] applyFilterSettings
   * [역할] 필터 팝업의 변경 사항을 확정하고 저장한다.
   * [원리] 스냅샷을 비운 뒤 활성 덱 자동 저장을 실행한다.
   */
  async function applyFilterSettings() {
    filterSnapshot = null;
    await autoSaveActiveDeck();
    closeFilterPanel();
  }

  /**
   * [함수] cancelFilterSettings
   * [역할] 필터 변경을 취소하고 팝업 열기 전 상태로 되돌린다.
   * [원리] 저장해 둔 스냅샷을 state.filters에 복원하고 구버전 필드도 동기화한다.
   */
  function cancelFilterSettings() {
    if (filterSnapshot) {
      state.filters = filterSnapshot;
      syncLegacyFilterState(state);
      resetPage();
      filterSnapshot = null;
      closeFilterPanel();
      render();
      return;
    }

    closeFilterPanel();
  }

  /**
   * [함수] toggleSortSettings
   * [역할] 정렬 팝업을 열거나 닫는다.
   * [원리] 정렬 조건 배열을 스냅샷으로 저장한다.
   */
  function toggleSortSettings() {
    if (!elements.sortPanel.hidden) {
      cancelSortSettings();
      return;
    }

    sortSnapshot = getNormalizedSorts(state);
    toggleSortPanel();
  }

  /**
   * [함수] applySortSettings
   * [역할] 정렬 변경 사항을 확정하고 저장한다.
   * [원리] 정렬 스냅샷을 비우고 활성 덱 자동 저장을 실행한다.
   */
  async function applySortSettings() {
    sortSnapshot = null;
    await autoSaveActiveDeck();
    closeSortPanel();
  }

  /**
   * [함수] cancelSortSettings
   * [역할] 정렬 변경을 취소하고 팝업 열기 전 상태로 되돌린다.
   * [원리] sortSnapshot의 정렬 조건 배열을 state에 복원한다.
   */
  function cancelSortSettings() {
    if (sortSnapshot) {
      state.sorts = sortSnapshot;
      syncLegacySortState(state);
      sortSnapshot = null;
      closeSortPanel();
      render();
      return;
    }

    closeSortPanel();
  }

  /**
   * [함수] addFilter
   * [역할] 비어 있는 필터 조건을 하나 추가한다.
   * [원리] 현재 필터 배열 뒤에 빈 필터 객체를 붙이고 페이지를 초기화한다.
   */
  function addFilter() {
    state.filters = [...getNormalizedFilters(state), { column: "", value: "", values: [] }];
    resetPage();
    render();
  }

  /**
   * [함수] handleFilterChange
   * [역할] 필터 열 또는 필터 값 선택 변경을 state에 반영한다.
   * [원리] data-filter-index/field로 대상 필터를 찾아 column 또는 values를 갱신한다.
   */
  function handleFilterChange(event) {
    const control = event.target.closest("[data-filter-field]");
    if (!control) return;

    const filters = getNormalizedFilters(state);
    const index = Number(control.dataset.filterIndex);
    const field = control.dataset.filterField;
    if (!filters[index]) return;

    if (field === "column") {
      filters[index] = { column: control.value, value: "", values: [] };
    } else {
      const values = [...(control.selectedValues || [])];
      filters[index] = { ...filters[index], value: values[0] || "", values };
    }

    state.filters = filters;
    syncLegacyFilterState(state);
    resetPage();
    render();
  }

  /**
   * [함수] handleFilterRemove
   * [역할] 선택한 필터 조건을 삭제한다.
   * [원리] data-filter-remove 인덱스를 제외한 새 필터 배열을 만든다.
   */
  function handleFilterRemove(event) {
    const button = event.target.closest("[data-filter-remove]");
    if (!button) return;

    const index = Number(button.dataset.filterRemove);
    const filters = getNormalizedFilters(state).filter((_, filterIndex) => filterIndex !== index);
    state.filters = filters;
    syncLegacyFilterState(state);
    resetPage();
    render();
  }

  /**
   * [함수] addSort
   * [역할] 비어 있는 정렬 조건을 하나 추가한다.
   * [원리] 현재 정렬 배열 뒤에 빈 정렬 객체를 붙이고 화면을 다시 렌더링한다.
   */
  function addSort() {
    state.sorts = [...getNormalizedSorts(state), { column: "", direction: "asc", randomSortSeed: "" }];
    syncLegacySortState(state);
    resetPage();
    render();
  }

  /**
   * [함수] handleSortRemove
   * [역할] 선택한 정렬 조건을 삭제한다.
   * [원리] data-sort-remove 인덱스를 제외한 새 정렬 배열을 만든다.
   */
  function handleSortRemove(event) {
    const button = event.target.closest("[data-sort-remove]");
    if (!button) return;

    const index = Number(button.dataset.sortRemove);
    state.sorts = getNormalizedSorts(state).filter((_, sortIndex) => sortIndex !== index);
    syncLegacySortState(state);
    resetPage();
    render();
  }

  /**
   * [함수] handleSortColumnChange
   * [역할] 정렬 기준 열 변경을 처리한다.
   * [원리] data-sort-index로 대상 정렬을 찾아 column을 바꾸고 무작위면 seed를 새로 만든다.
   */
  function handleSortColumnChange(event) {
    const control = event.target.closest("[data-sort-field='column']");
    if (!control) return;

    const sorts = getSortsWithIndex(state, Number(control.dataset.sortIndex));
    const index = Number(control.dataset.sortIndex);
    sorts[index] = {
      ...sorts[index],
      column: control.value,
      randomSortSeed: sorts[index].direction === "random" ? createRandomSortSeed() : "",
    };
    state.sorts = sorts;
    syncLegacySortState(state);
    resetPage();
    render();
  }

  /**
   * [함수] handleSortDirectionChange
   * [역할] 정렬 방향 변경을 처리한다.
   * [원리] data-sort-index로 대상 정렬을 찾아 direction을 바꾸고 무작위 seed를 관리한다.
   */
  function handleSortDirectionChange(event) {
    const control = event.target.closest("[data-sort-field='direction']");
    if (!control) return;

    const sorts = getSortsWithIndex(state, Number(control.dataset.sortIndex));
    const index = Number(control.dataset.sortIndex);
    sorts[index] = {
      ...sorts[index],
      direction: control.value,
      randomSortSeed: control.value === "random" ? createRandomSortSeed() : "",
    };
    state.sorts = sorts;
    syncLegacySortState(state);
    resetPage();
    render();
  }

  return {
    addFilter,
    addSort,
    applyFilterSettings,
    applySortSettings,
    cancelFilterSettings,
    cancelSortSettings,
    handleFilterChange,
    handleFilterRemove,
    handleSortColumnChange,
    handleSortDirectionChange,
    handleSortRemove,
    toggleFilterSettings,
    toggleSortSettings,
  };
}

/**
 * [함수] getSortsWithIndex
 * [역할] 특정 인덱스가 존재하는 정렬 배열을 반환한다.
 * [원리] 정렬 배열이 비어 있거나 인덱스가 없으면 빈 정렬 객체를 채워 변경 가능하게 한다.
 */
function getSortsWithIndex(state, index) {
  const sorts = getNormalizedSorts(state);
  while (sorts.length <= index) {
    sorts.push({ column: "", direction: "asc", randomSortSeed: "" });
  }
  return sorts;
}

/**
 * [함수] createRandomSortSeed
 * [역할] 무작위 정렬 순서 계산에 사용할 seed를 만든다.
 * [원리] 현재 시간과 난수를 합쳐 같은 세션 안에서도 새 순서가 나오게 한다.
 */
function createRandomSortSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
