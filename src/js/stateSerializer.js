/* ==========================================================================
   [모듈] 앱 상태 직렬화 (stateSerializer.js)
   [역할]
   - 화면 상태와 엑셀 변환 결과를 덱 저장용 JSON 구조로 변환합니다.
   - 구버전 단일 필터 상태와 신버전 다중 필터 상태를 서로 맞춥니다.
   [참고]
   - 저장된 덱을 열었을 때 설정이 복원되지 않으면 이 파일을 확인합니다.
   ========================================================================== */
/**
 * [함수] createEmptyState
 * [역할] 덱이 선택되지 않았거나 새 덱을 만들 때 사용할 빈 상태를 만든다.
 * [원리] state.js의 필드 구조와 같은 기본값 객체를 새로 반환한다.
 */
export function createEmptyState() {
  return {
    workbook: null,
    fileName: "",
    sheetNames: [],
    activeSheetName: "",
    sheetMatrix: [],
    headerRowIndex: 0,
    columns: [],
    hiddenColumns: [],
    rows: [],
    titleColumn: "",
    titleColumnCount: 1,
    subtitleColumn1: "",
    subtitleColumn2: "",
    subtitleColumn3: "",
    subtitleColumn4: "",
    displayColumns: [],
    filterColumn: "",
    filterValue: "",
    filters: [{ column: "", value: "", values: [] }],
    sorts: [],
    sortColumn: "",
    sortDirection: "asc",
    randomSortSeed: "",
    searchColumn: "",
    searchTerm: "",
    displayMode: "scroll",
    labelMap: {},
    labelFilter: "",
  };
}

/**
 * [함수] cloneState
 * [역할] 현재 상태를 편집용 초안 상태로 복제한다.
 * [원리] 배열/객체 필드는 얕은 복사해 원본 상태가 즉시 바뀌지 않게 한다.
 */
export function cloneState(source) {
  const sorts = getNormalizedSorts(source);
  const firstSort = sorts.find((sort) => sort.column) || { column: "", direction: "asc", randomSortSeed: "" };
  return {
    workbook: source.workbook,
    fileName: source.fileName,
    sheetNames: [...source.sheetNames],
    activeSheetName: source.activeSheetName,
    sheetMatrix: source.sheetMatrix.map((row) => [...row]),
    headerRowIndex: source.headerRowIndex,
    columns: [...source.columns],
    hiddenColumns: [...(source.hiddenColumns || [])],
    rows: source.rows.map((row) => ({ ...row })),
    titleColumn: source.titleColumn,
    titleColumnCount: getTitleColumnCount(source),
    subtitleColumn1: source.subtitleColumn1 || "",
    subtitleColumn2: source.subtitleColumn2 || "",
    subtitleColumn3: source.subtitleColumn3 || "",
    subtitleColumn4: source.subtitleColumn4 || "",
    displayColumns: [...source.displayColumns],
    filterColumn: source.filterColumn,
    filterValue: source.filterValue,
    filters: getNormalizedFilters(source),
    sorts,
    sortColumn: firstSort.column,
    sortDirection: firstSort.direction,
    randomSortSeed: firstSort.randomSortSeed || "",
    searchColumn: "",
    searchTerm: "",
    displayMode: source.displayMode || "scroll",
    labelMap: { ...(source.labelMap || {}) },
    labelFilter: source.labelFilter || "",
  };
}

/**
 * [함수] copyState
 * [역할] source 상태를 target 상태 객체에 덮어쓴다.
 * [원리] 전역 state 객체 참조는 유지하면서 필드 값만 교체한다.
 */
export function copyState(source, target) {
  const sorts = getNormalizedSorts(source);
  const firstSort = sorts.find((sort) => sort.column) || { column: "", direction: "asc", randomSortSeed: "" };
  target.workbook = source.workbook;
  target.fileName = source.fileName;
  target.sheetNames = [...source.sheetNames];
  target.activeSheetName = source.activeSheetName;
  target.sheetMatrix = source.sheetMatrix.map((row) => [...row]);
  target.headerRowIndex = source.headerRowIndex;
  target.columns = [...source.columns];
  target.hiddenColumns = [...(source.hiddenColumns || [])];
  target.rows = source.rows.map((row) => ({ ...row }));
  target.titleColumn = source.titleColumn;
  target.titleColumnCount = getTitleColumnCount(source);
  target.subtitleColumn1 = source.subtitleColumn1 || "";
  target.subtitleColumn2 = source.subtitleColumn2 || "";
  target.subtitleColumn3 = source.subtitleColumn3 || "";
  target.subtitleColumn4 = source.subtitleColumn4 || "";
  target.displayColumns = [...source.displayColumns];
  target.filterColumn = source.filterColumn;
  target.filterValue = source.filterValue;
  target.filters = getNormalizedFilters(source);
  target.sorts = sorts;
  target.sortColumn = firstSort.column;
  target.sortDirection = firstSort.direction;
  target.randomSortSeed = firstSort.randomSortSeed || "";
  target.searchColumn = source.searchColumn || "";
  target.searchTerm = source.searchTerm;
  target.displayMode = source.displayMode || "scroll";
  target.labelMap = { ...(source.labelMap || {}) };
  target.labelFilter = source.labelFilter || "";
}

/**
 * [함수] serializeState
 * [역할] 현재 앱 상태를 덱 저장용 JSON 구조로 변환한다.
 * [원리] workbook 같은 원본 객체는 제외하고 복원 가능한 데이터와 설정만 저장한다.
 */
export function serializeState(source) {
  const sorts = getNormalizedSorts(source);
  const firstSort = sorts.find((sort) => sort.column) || { column: "", direction: "asc", randomSortSeed: "" };
  // workbook 원본 객체는 저장하지 않고, 복원 가능한 표 데이터와 설정만 덱에 보관합니다.
  return {
    fileName: source.fileName,
    sheetNames: [source.activeSheetName || source.sheetNames[0] || "저장된 시트"],
    activeSheetName: source.activeSheetName || source.sheetNames[0] || "저장된 시트",
    sheetMatrix: source.sheetMatrix,
    headerRowIndex: source.headerRowIndex,
    columns: source.columns,
    hiddenColumns: source.hiddenColumns || [],
    rows: source.rows,
    titleColumn: source.titleColumn,
    titleColumnCount: getTitleColumnCount(source),
    subtitleColumn1: source.subtitleColumn1 || "",
    subtitleColumn2: source.subtitleColumn2 || "",
    subtitleColumn3: source.subtitleColumn3 || "",
    subtitleColumn4: source.subtitleColumn4 || "",
    displayColumns: source.displayColumns,
    filterColumn: source.filterColumn,
    filterValue: source.filterValue,
    filters: getNormalizedFilters(source),
    sorts,
    sortColumn: firstSort.column,
    sortDirection: firstSort.direction,
    randomSortSeed: firstSort.randomSortSeed || "",
    searchColumn: "",
    searchTerm: "",
    displayMode: source.displayMode || "scroll",
    labelMap: source.labelMap || {},
    labelFilter: source.labelFilter || "",
  };
}

/**
 * [함수] deserializeState
 * [역할] 저장된 덱 JSON을 앱에서 사용할 상태 객체로 복원한다.
 * [원리] 누락된 필드는 기본값으로 채우고 필터 구조는 신버전 형태로 보정한다.
 */
export function deserializeState(data) {
  return {
    ...createEmptyState(),
    ...data,
    workbook: null,
    sheetNames: data.sheetNames?.length ? data.sheetNames : [data.activeSheetName || "저장된 시트"],
    sheetMatrix: data.sheetMatrix || [],
    columns: data.columns || [],
    hiddenColumns: data.hiddenColumns || [],
    rows: data.rows || [],
    displayColumns: data.displayColumns || [],
    filters: normalizeSerializedFilters(data),
    sorts: normalizeSerializedSorts(data),
    searchColumn: "",
    searchTerm: "",
    labelMap: data.labelMap || {},
    labelFilter: data.labelFilter || "",
  };
}

/**
 * [함수] getNormalizedFilters
 * [역할] 상태의 필터를 다중 필터 배열 형태로 반환한다.
 * [원리] filters 배열을 우선 사용하고, 구버전 필드는 단일 필터 배열로 변환한다.
 */
export function getNormalizedFilters(source) {
  const filters = Array.isArray(source.filters) ? source.filters : [];
  if (Array.isArray(source.filters)) {
    return filters.map((filter) => ({
      column: filter.column || "",
      value: filter.value || "",
      values: normalizeFilterValues(filter),
    }));
  }

  return [
    {
      column: source.filterColumn || "",
      value: source.filterValue || "",
      values: source.filterValue ? [source.filterValue] : [],
    },
  ];
}

/**
 * [함수] syncLegacyFilterState
 * [역할] 신버전 filters 값을 구버전 filterColumn/filterValue 필드에도 동기화한다.
 * [원리] 첫 번째 필터 값을 대표값으로 복사해 기존 코드/저장 데이터 호환성을 유지한다.
 */
export function syncLegacyFilterState(targetState) {
  const firstFilter = getNormalizedFilters(targetState)[0] || { column: "", value: "", values: [] };
  targetState.filterColumn = firstFilter.column;
  targetState.filterValue = firstFilter.values[0] || firstFilter.value || "";
}

/**
 * [함수] getNormalizedSorts
 * [역할] 상태의 정렬 조건을 다중 정렬 배열 형태로 반환한다.
 * [원리] sorts 배열을 우선 사용하고, 구버전 단일 정렬 필드는 단일 배열로 변환한다.
 */
export function getNormalizedSorts(source) {
  if (Array.isArray(source.sorts)) {
    return source.sorts.map(normalizeSort);
  }

  return source.sortColumn
    ? [
        {
          column: source.sortColumn,
          direction: source.sortDirection || "asc",
          randomSortSeed: source.randomSortSeed || "",
        },
      ]
    : [];
}

/**
 * [함수] syncLegacySortState
 * [역할] 신버전 sorts 값을 구버전 sortColumn/sortDirection 필드에도 동기화한다.
 * [원리] 첫 번째 정렬 조건을 대표값으로 복사해 기존 저장 데이터 호환성을 유지한다.
 */
export function syncLegacySortState(targetState) {
  const firstSort = getNormalizedSorts(targetState).find((sort) => sort.column) || { column: "", direction: "asc", randomSortSeed: "" };
  targetState.sortColumn = firstSort.column;
  targetState.sortDirection = firstSort.direction || "asc";
  targetState.randomSortSeed = firstSort.randomSortSeed || "";
}

/**
 * [함수] normalizeSerializedSorts
 * [역할] 저장 데이터에서 정렬 목록을 안전하게 읽어온다.
 * [원리] 배열이면 각 항목을 보정하고, 없으면 구버전 단일 정렬 필드로 대체한다.
 */
function normalizeSerializedSorts(data) {
  if (Array.isArray(data.sorts)) {
    return data.sorts.map(normalizeSort);
  }

  return data.sortColumn
    ? [
        {
          column: data.sortColumn,
          direction: data.sortDirection || "asc",
          randomSortSeed: data.randomSortSeed || "",
        },
      ]
    : [];
}

/**
 * [함수] normalizeSort
 * [역할] 정렬 조건 객체를 표준 필드명으로 보정한다.
 * [원리] column, direction, randomSortSeed만 남기고 direction 기본값은 asc로 둔다.
 */
function normalizeSort(sort) {
  const source = sort || {};
  const direction = ["asc", "desc", "random"].includes(source.direction) ? source.direction : "asc";
  return {
    column: source.column || "",
    direction,
    randomSortSeed: source.randomSortSeed || "",
  };
}

/**
 * [함수] normalizeSerializedFilters
 * [역할] 저장 데이터에서 필터 목록을 안전하게 읽어온다.
 * [원리] 배열이면 각 항목을 보정하고, 없으면 구버전 단일 필터 필드로 대체한다.
 */
function normalizeSerializedFilters(data) {
  if (Array.isArray(data.filters)) {
    return data.filters.map((filter) => ({
      column: filter.column || "",
      value: filter.value || "",
      values: normalizeFilterValues(filter),
    }));
  }

  return [
    {
      column: data.filterColumn || "",
      value: data.filterValue || "",
      values: data.filterValue ? [data.filterValue] : [],
    },
  ];
}

/**
 * [함수] normalizeFilterValues
 * [역할] 필터 값들을 빈 값 없는 배열로 정리한다.
 * [원리] values 배열을 우선 사용하고, 없으면 value 단일 값을 배열로 변환한다.
 */
function normalizeFilterValues(filter) {
  if (Array.isArray(filter.values)) {
    return filter.values.filter(Boolean);
  }

  return filter.value ? [filter.value] : [];
}

/**
 * [함수] getTitleColumnCount
 * [역할] 제목 열 입력칸을 몇 개까지 보여줄지 계산한다.
 * [원리] 저장된 titleColumnCount와 실제 선택된 제목/부제목 위치를 함께 보고 1~5 범위로 제한한다.
 */
function getTitleColumnCount(source) {
  const selectedColumns = [
    source.titleColumn,
    source.subtitleColumn1,
    source.subtitleColumn2,
    source.subtitleColumn3,
    source.subtitleColumn4,
  ];
  const lastSelectedIndex = selectedColumns.reduce(
    (lastIndex, column, index) => (column ? index : lastIndex),
    0,
  );
  const requestedCount = Number(source.titleColumnCount) || 1;
  return Math.min(5, Math.max(1, requestedCount, lastSelectedIndex + 1));
}
