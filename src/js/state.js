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
  subtitleColumn1: "",
  subtitleColumn2: "",
  displayColumns: [],
  filterColumn: "",
  filterValue: "",
  filters: [{ column: "", value: "", values: [] }],
  sortColumn: "",
  sortDirection: "asc",
  randomSortSeed: "",
  searchColumn: "",
  searchTerm: "",
  displayMode: "scroll",
  labelMap: {},
  labelFilter: "",
};

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
  state.subtitleColumn1 = "";
  state.subtitleColumn2 = "";
  state.displayColumns = [];
  state.filterColumn = "";
  state.filterValue = "";
  state.filters = [{ column: "", value: "", values: [] }];
  state.sortColumn = "";
  state.sortDirection = "asc";
  state.randomSortSeed = "";
  state.searchColumn = "";
  state.searchTerm = "";
  state.displayMode = "scroll";
  state.labelMap = {};
  state.labelFilter = "";
}
