/* ==========================================================================
   [모듈] 카드 표시 데이터 처리 (dataProcessor.js)
   [역할]
   - 검색, 다중 필터, 라벨 필터, 정렬을 적용해 화면에 표시할 행을 계산합니다.
   - 무작위 정렬은 저장된 seed를 기준으로 같은 조건에서 같은 순서를 유지합니다.
   [참고]
   - 카드 개수, 필터 결과, 정렬 순서가 예상과 다를 때 확인합니다.
   ========================================================================== */
import { EMPTY_FILTER_VALUE } from "./filterConstants.js";
import { getNormalizedSorts } from "./stateSerializer.js";
import { normalizeValue } from "./utils.js";

/**
 * [함수] getVisibleRows
 * [역할] 현재 검색/필터/라벨/정렬 조건을 모두 반영한 카드 행 목록을 반환한다.
 * [원리] 검색과 필터를 먼저 적용한 뒤, 정렬 조건이 있으면 마지막에 정렬한다.
 */
export function getVisibleRows(state) {
  const searchTerm = state.searchTerm.trim().toLowerCase();
  // 검색 범위를 특정 열로 제한하지 않으면 모든 열을 대상으로 검사합니다.
  const searchColumns =
    state.searchColumn && state.columns.includes(state.searchColumn)
      ? [state.searchColumn]
      : state.columns;
  const filters = normalizeFilters(state);

  const filtered = state.rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      searchColumns.some((column) =>
        normalizeValue(row[column]).toLowerCase().includes(searchTerm),
      );

    // 여러 필터는 모두 만족해야 하며, 한 필터 안의 값들은 OR 조건으로 처리합니다.
    const matchesFilter = filters.every((filter) => {
      if (!filter.column || filter.values.length === 0) return true;

      const rowValue = normalizeValue(row[filter.column]);
      return filter.values.some((value) =>
        value === EMPTY_FILTER_VALUE ? rowValue === "" : rowValue === value,
      );
    });

    const rowIndex = state.rows.indexOf(row);
    const rowLabel = state.labelMap?.[rowIndex] || "";
    const matchesLabel =
      !state.labelFilter ||
      (state.labelFilter === "__all_labels" ? Boolean(rowLabel) : rowLabel === state.labelFilter);

    return matchesSearch && matchesFilter && matchesLabel;
  });

  const sorts = getNormalizedSorts(state).filter((sort) => sort.column);
  if (sorts.length === 0) {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    // 정렬1이 최우선이고, 정렬2 이후 조건은 앞 조건 값이 같을 때만 적용됩니다.
    for (let index = 0; index < sorts.length; index += 1) {
      const sort = sorts[index];
      const result = compareRowsBySort(a, b, sort, state);
      if (result !== 0) return result;
    }

    return 0;
  });
}

/**
 * [함수] compareRowsBySort
 * [역할] 단일 정렬 조건으로 두 행의 순서를 비교한다.
 * [원리] 무작위는 seed 기반 키를 비교하고, 일반 정렬은 문자열 localeCompare 결과를 방향에 맞게 반환한다.
 */
function compareRowsBySort(a, b, sort, state) {
  if (sort.direction === "random") {
    const left = getRandomSortKey(a, sort, state);
    const right = getRandomSortKey(b, sort, state);
    return left - right;
  }

  const left = normalizeValue(a[sort.column]);
  const right = normalizeValue(b[sort.column]);
  const result = left.localeCompare(right, "ko", { numeric: true });
  return sort.direction === "desc" ? -result : result;
}

/**
 * [함수] getRandomSortKey
 * [역할] 무작위 정렬에 사용할 안정적인 숫자 키를 만든다.
 * [원리] 현재 seed, 행 위치, 정렬 열 값을 문자열로 묶어 hash 값으로 변환한다.
 */
function getRandomSortKey(row, sort, state) {
  const rowIndex = state.rows.indexOf(row);
  // Math.random()으로 즉시 섞지 않고 seed 기반 hash를 쓰면 같은 설정을 저장/복원해도 순서가 유지됩니다.
  const seed = `${sort.randomSortSeed || "default"}|${rowIndex}|${normalizeValue(row[sort.column])}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(index);
    hash |= 0;
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

/**
 * [함수] normalizeFilters
 * [역할] 구버전 단일 필터와 신버전 다중 필터를 같은 배열 구조로 맞춘다.
 * [원리] filters 배열이 있으면 그대로 보정하고, 없으면 filterColumn/filterValue로 배열을 만든다.
 */
function normalizeFilters(state) {
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
 * [함수] normalizeFilterValues
 * [역할] 필터 값 목록을 배열로 정규화한다.
 * [원리] values 배열이 있으면 빈 값을 제거하고, 구버전 value만 있으면 단일 배열로 감싼다.
 */
function normalizeFilterValues(filter) {
  if (Array.isArray(filter.values)) {
    return filter.values.filter(Boolean);
  }

  return filter.value ? [filter.value] : [];
}
