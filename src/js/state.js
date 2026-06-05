/* ==========================================================================
   [모듈] 전역 앱 상태 (state.js)
   [역할]
   - 현재 열려 있는 덱의 엑셀 데이터, 표시 설정, 검색/필터/정렬 상태를 보관합니다.
   - 새 덱 선택이나 데이터 초기화 시 기본 상태로 되돌리는 함수를 제공합니다.
   [참고]
   - 상태 필드를 추가하면 stateSerializer의 저장/복원 필드도 함께 확인합니다.
   ========================================================================== */
export const state = {
  workbook: null,
  fileName: "",
  sheetNames: [],
  activeSheetName: "",
  sheetMatrix: [],
  headerRowIndex: 0,
  columns: [],
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

/**
 * [함수] resetDataState
 * [역할] 현재 덱의 엑셀 데이터와 화면 설정을 빈 상태로 되돌린다.
 * [원리] state 객체 참조는 유지한 채 각 필드만 초기값으로 다시 할당한다.
 */
export function resetDataState() {
  state.workbook = null;
  state.fileName = "";
  state.sheetNames = [];
  state.activeSheetName = "";
  state.sheetMatrix = [];
  state.headerRowIndex = 0;
  state.columns = [];
  state.rows = [];
  state.titleColumn = "";
  state.titleColumnCount = 1;
  state.subtitleColumn1 = "";
  state.subtitleColumn2 = "";
  state.subtitleColumn3 = "";
  state.subtitleColumn4 = "";
  state.displayColumns = [];
  state.filterColumn = "";
  state.filterValue = "";
  state.filters = [{ column: "", value: "", values: [] }];
  state.sorts = [];
  state.sortColumn = "";
  state.sortDirection = "asc";
  state.randomSortSeed = "";
  state.searchColumn = "";
  state.searchTerm = "";
  state.displayMode = "scroll";
  state.labelMap = {};
  state.labelFilter = "";
}
