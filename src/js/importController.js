/* ==========================================================================
   [모듈] 가져오기 설정 컨트롤러 (importController.js)
   [역할]
   - 파일 선택, 시트 선택, 표 시작 행, 제목/부제목/표시열 설정을 관리합니다.
   - 적용 전 변경사항은 draftState에 보관하고, 적용 시 현재 덱에 저장합니다.
   [참고]
   - 가져오기 설정을 취소했는데 값이 남거나, 적용 후 카드가 바뀌지 않을 때 확인합니다.
   ========================================================================== */
import { matrixToTable, readFileAsWorkbook, sheetToMatrix } from "./excelReader.js";
import { cloneState, copyState, createEmptyState } from "./stateSerializer.js";

/**
 * [함수] createImportController
 * [역할] 가져오기 설정 화면에서 쓰는 이벤트 핸들러 묶음을 생성한다.
 * [원리] draftState에 임시 변경을 모아두고 적용 시 전역 state로 복사한다.
 */
export function createImportController({
  state,
  render,
  renderControls,
  renderDisplayModeControl,
  showMessage,
  applyDefaultColumns,
  getAllSelectableDisplayColumns,
  getDisplayColumnCheckboxValues,
  getSelectedDisplayColumns,
  setDisplayColumnCheckboxValues,
  syncDisplayColumnsModalSummary,
  openDisplayColumnsModal,
  closeDisplayColumnsModal,
  openDisplayModeModal,
  closeDisplayModeModal,
  openHeaderSettingsModal,
  closeHeaderSettingsModal,
  openImportModal,
  closeImportModal,
  openSidebar,
  hasActiveDeck,
  autoSaveActiveDeck,
  resetPage,
}) {
  let draftState = cloneState(state);
  let pendingDisplayColumns = [];
  let headerDragState = null;

  /**
   * [함수] renderDraftControls
   * [역할] 가져오기 설정 화면의 초안 상태를 모든 관련 컨트롤에 렌더링한다.
   * [원리] 파일/열 설정 컨트롤과 표시 방식 컨트롤을 같은 draftState 기준으로 갱신한다.
   */
  function renderDraftControls() {
    renderControls(draftState);
    renderDisplayModeControl(draftState);
  }

  /**
   * [함수] resetDraftFromState
   * [역할] 현재 전역 상태를 기준으로 가져오기 초안을 다시 만든다.
   * [원리] 덱 선택/취소 시 cloneState로 draftState를 현재 상태와 맞춘다.
   */
  function resetDraftFromState() {
    draftState = cloneState(state);
    clearHeaderDragState();
  }

  /**
   * [함수] handleHeaderRowChange
   * [역할] 표 시작 행 변경을 처리한다.
   * [원리] 선택된 행 번호로 headerRowIndex를 바꾸고 표 구조를 다시 계산한다.
   */
  function handleHeaderRowChange(event) {
    draftState.headerRowIndex = Number(event.target.value);
    applyTableFromHeaderRow(draftState);
  }

  /**
   * [함수] handleTitleColumnChange
   * [역할] 카드 제목열 변경을 처리한다.
   * [원리] 제목열이 표시할 열에서 빠지도록 표시열 선택 상태를 다시 동기화한다.
   */
  function handleTitleColumnChange(event) {
    draftState.titleColumn = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderDraftControls();
  }

  /**
   * [함수] handleSubtitleColumn1Change
   * [역할] 첫 번째 부제목열 변경을 처리한다.
   * [원리] 제목 계열 열 목록을 기준으로 표시열 선택 상태를 재계산한다.
   */
  function handleSubtitleColumn1Change(event) {
    draftState.subtitleColumn1 = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderDraftControls();
  }

  /**
   * [함수] handleSubtitleColumn2Change
   * [역할] 두 번째 부제목열 변경을 처리한다.
   * [원리] 부제목열도 카드 제목 영역에 쓰이므로 표시할 열에서 제외되게 맞춘다.
   */
  function handleSubtitleColumn2Change(event) {
    draftState.subtitleColumn2 = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderDraftControls();
  }

  /**
   * [함수] handleSubtitleColumn3Change
   * [역할] 세 번째 부제목열 변경을 처리한다.
   * [원리] 부제목열도 카드 제목 영역에 쓰이므로 표시할 열에서 제외되게 맞춘다.
   */
  function handleSubtitleColumn3Change(event) {
    draftState.subtitleColumn3 = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderDraftControls();
  }

  /**
   * [함수] handleSubtitleColumn4Change
   * [역할] 네 번째 부제목열 변경을 처리한다.
   * [원리] 부제목열도 카드 제목 영역에 쓰이므로 표시할 열에서 제외되게 맞춘다.
   */
  function handleSubtitleColumn4Change(event) {
    draftState.subtitleColumn4 = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderDraftControls();
  }

  /**
   * [함수] addTitleColumn
   * [역할] 카드 제목 열 입력칸을 하나 추가로 표시한다.
   * [원리] titleColumnCount를 최대 5까지 늘리고 draft 컨트롤을 다시 렌더링한다.
   */
  function addTitleColumn() {
    draftState.titleColumnCount = Math.min(5, getTitleColumnCount(draftState) + 1);
    renderDraftControls();
  }

  /**
   * [함수] removeTitleColumn
   * [역할] 제목 열 2~5 중 사용자가 누른 제목 입력칸을 삭제한다.
   * [원리] 삭제 위치 뒤의 제목열 값을 앞으로 당기고 마지막 칸은 비운 뒤 표시열 중복을 다시 정리한다.
   */
  function removeTitleColumn(event) {
    const button = event.target.closest("[data-remove-title-column]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const titleIndex = Number(button.dataset.removeTitleColumn);
    if (titleIndex <= 1 || titleIndex > 5) return;

    const fields = getTitleColumnFields();
    const fieldIndex = titleIndex - 1;
    for (let index = fieldIndex; index < fields.length - 1; index += 1) {
      draftState[fields[index]] = draftState[fields[index + 1]] || "";
    }
    draftState[fields[fields.length - 1]] = "";
    draftState.titleColumnCount = Math.max(1, getTitleColumnCount(draftState) - 1);
    syncDisplayColumnsWithTitleColumns();
    renderDraftControls();
  }

  /**
   * [함수] syncDisplayColumnsWithTitleColumns
   * [역할] 제목/부제목으로 선택한 열이 표시할 열 목록에 중복 표시되지 않도록 정리한다.
   * [원리] getSelectedDisplayColumns가 계산한 실제 표시 가능 열만 draftState와 pendingDisplayColumns에 다시 저장한다.
   */
  function syncDisplayColumnsWithTitleColumns() {
    const displayColumns = getSelectedDisplayColumns(draftState);
    draftState.displayColumns = [...displayColumns];
    pendingDisplayColumns = [...displayColumns];
  }

  /**
   * [함수] handleDisplayColumnsChange
   * [역할] 표시할 열 체크박스 변경을 임시 선택 목록에 반영한다.
   * [원리] 현재 체크된 값들을 읽고 선택 개수 요약을 갱신한다.
   */
  function handleDisplayColumnsChange() {
    pendingDisplayColumns = getDisplayColumnCheckboxValues();
    syncDisplayColumnsModalSummary();
  }

  /**
   * [함수] handleDisplayColumnsAllChange
   * [역할] 표시할 열 전체 선택 체크박스 변경을 처리한다.
   * [원리] 체크 상태에 따라 선택 가능한 모든 열 또는 빈 배열을 체크박스에 반영한다.
   */
  function handleDisplayColumnsAllChange(event) {
    const columns = event.target.checked ? getAllSelectableDisplayColumns(draftState) : [];
    setDisplayColumnCheckboxValues(columns);
    pendingDisplayColumns = getDisplayColumnCheckboxValues();
  }

  /**
   * [함수] openHeaderSettings
   * [역할] 헤더 설정 모달을 연다.
   * [원리] 현재 draftState 기준으로 목록을 다시 렌더링한 뒤 모달을 표시한다.
   */
  function openHeaderSettings() {
    renderDraftControls();
    openHeaderSettingsModal();
  }

  /**
   * [함수] closeHeaderSettings
   * [역할] 헤더 설정 모달을 닫는다.
   * [원리] draftState 변경은 유지하고 모달만 숨긴다.
   */
  function closeHeaderSettings() {
    clearHeaderDragState();
    renderDraftControls();
    closeHeaderSettingsModal();
  }

  /**
   * [함수] addHeaderColumn
   * [역할] 새 헤더 항목을 추가한다.
   * [원리] 열 이름을 입력받아 columns와 모든 row에 빈 값을 추가한다.
   */
  function addHeaderColumn() {
    const columnName = window.prompt("추가할 항목 이름을 입력하세요.", "새 항목");
    if (!columnName?.trim()) return;

    const nextColumn = getUniqueColumnName(draftState.columns, columnName.trim());
    draftState.columns = [...draftState.columns, nextColumn];
    draftState.rows = draftState.rows.map((row) => ({ ...row, [nextColumn]: "" }));
    renderDraftControls();
  }

  /**
   * [함수] handleHeaderSettingsAction
   * [역할] 헤더 설정 목록의 수정/숨김/순서 버튼을 처리한다.
   * [원리] data-header-action과 data-column을 읽어 draftState의 열 구조를 변경한다.
   */
  function handleHeaderSettingsAction(event) {
    const button = event.target.closest("[data-header-action]");
    if (!button) return;

    const column = button.dataset.column;
    const action = button.dataset.headerAction;
    if (!column || !draftState.columns.includes(column)) return;

    if (action === "rename") renameHeaderColumn(column);
    if (action === "toggle") toggleHeaderColumn(column);
  }

  /**
   * [함수] handleHeaderReorderPointerDown
   * [역할] 세줄 핸들을 누른 상태에서 드래그 시작 지점을 기록한다.
   * [원리] 핸들로 시작한 pointer만 캡처하고 이동 중 겹치는 항목을 찾아 columns 순서를 바꾼다.
   */
  function handleHeaderReorderPointerDown(event) {
    if (event.button > 0) return;

    const handle = event.target.closest("[data-header-drag-handle]");
    if (!handle) return;

    const item = handle.closest("[data-header-drag-column]");
    if (!item) return;

    const column = item.dataset.headerDragColumn;
    if (!column || !draftState.columns.includes(column)) return;

    event.preventDefault();
    item.setPointerCapture?.(event.pointerId);
    item.classList.add("is-dragging");
    headerDragState = {
      column,
      pointerId: event.pointerId,
      item,
      startX: event.clientX,
      startY: event.clientY,
    };
    window.addEventListener("pointermove", handleHeaderReorderPointerMove);
    window.addEventListener("pointerup", handleHeaderReorderPointerUp);
    window.addEventListener("pointercancel", handleHeaderReorderPointerUp);
  }

  /**
   * [함수] handleHeaderReorderPointerMove
   * [역할] 드래그 중 포인터 아래의 항목 위치로 헤더 순서를 이동한다.
   * [원리] elementFromPoint로 현재 항목을 찾고, 원본 열을 그 위치로 재배치한 뒤 목록을 다시 그린다.
   */
  function handleHeaderReorderPointerMove(event) {
    if (!headerDragState || event.pointerId !== headerDragState.pointerId) return;

    const deltaX = event.clientX - headerDragState.startX;
    const deltaY = event.clientY - headerDragState.startY;
    headerDragState.item.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-header-drag-column]");
    const targetColumn = target?.dataset.headerDragColumn;
    if (!targetColumn || targetColumn === headerDragState.column) return;

    moveHeaderColumnNearTarget(headerDragState, target, event);
  }

  /**
   * [함수] handleHeaderReorderPointerUp
   * [역할] 헤더 순서 드래그를 종료한다.
   * [원리] 드래그 상태와 시각 상태를 정리한다.
   */
  function handleHeaderReorderPointerUp(event) {
    if (!headerDragState || event.pointerId !== headerDragState.pointerId) return;

    clearHeaderDragState();
    renderDraftControls();
  }

  /**
   * [함수] clearHeaderDragState
   * [역할] 헤더 순서 드래그 상태와 전역 포인터 이벤트를 정리한다.
   * [원리] 렌더링 중 DOM이 바뀌어도 남아 있을 수 있는 window 이벤트를 항상 해제한다.
   */
  function clearHeaderDragState() {
    if (headerDragState?.item) {
      headerDragState.item.classList.remove("is-dragging");
      headerDragState.item.style.transform = "";
    }
    headerDragState = null;
    window.removeEventListener("pointermove", handleHeaderReorderPointerMove);
    window.removeEventListener("pointerup", handleHeaderReorderPointerUp);
    window.removeEventListener("pointercancel", handleHeaderReorderPointerUp);
  }

  /**
   * [함수] openDisplayColumnsSettings
   * [역할] 표시할 열 선택 모달을 연다.
   * [원리] 현재 draftState의 표시열을 pendingDisplayColumns로 복사한 뒤 체크박스에 반영한다.
   */
  function openDisplayColumnsSettings() {
    pendingDisplayColumns = getSelectedDisplayColumns(draftState);
    renderDraftControls();
    setDisplayColumnCheckboxValues(pendingDisplayColumns);
    openDisplayColumnsModal();
  }

  /**
   * [함수] applyDisplayColumnsSettings
   * [역할] 표시할 열 선택 모달의 변경을 draftState에 적용한다.
   * [원리] pendingDisplayColumns를 draftState.displayColumns로 복사하고 모달을 닫는다.
   */
  function applyDisplayColumnsSettings() {
    draftState.displayColumns = [...pendingDisplayColumns];
    renderDraftControls();
    closeDisplayColumnsModal();
  }

  /**
   * [함수] cancelDisplayColumnsSettings
   * [역할] 표시할 열 선택 변경을 취소한다.
   * [원리] draftState 기준 선택값으로 되돌린 뒤 모달만 닫는다.
   */
  function cancelDisplayColumnsSettings() {
    pendingDisplayColumns = getSelectedDisplayColumns(draftState);
    renderDraftControls();
    closeDisplayColumnsModal();
  }

  /**
   * [함수] openDisplayModeSettings
   * [역할] 가져오기 설정 안에서 표시 방식 선택 모달을 연다.
   * [원리] 현재 draftState.displayMode를 라디오 상태에 반영한 뒤 공통 표시 방식 모달을 띄운다.
   */
  function openDisplayModeSettings() {
    renderDisplayModeControl(draftState);
    openDisplayModeModal();
  }

  /**
   * [함수] handleDisplayModeChange
   * [역할] 표시 방식 라디오 변경을 가져오기 초안에 반영한다.
   * [원리] 전역 state는 건드리지 않고 draftState.displayMode만 바꾼 뒤 모달과 표시값을 갱신한다.
   */
  function handleDisplayModeChange(event) {
    draftState.displayMode = event.target.value;
    renderDisplayModeControl(draftState);
    closeDisplayModeModal();
  }

  /**
   * [함수] openImportSettings
   * [역할] 가져오기 설정 화면을 연다.
   * [원리] 덱이 없으면 사이드바를 열고, 덱이 있으면 현재 상태를 draftState로 복사한다.
   */
  function openImportSettings() {
    if (!hasActiveDeck()) {
      openSidebar();
      return;
    }

    draftState = cloneState(state);
    renderDraftControls();
    openImportModal();
  }

  /**
   * [함수] cancelImportSettings
   * [역할] 가져오기 설정 변경을 취소한다.
   * [원리] draftState를 현재 state로 되돌리고 관련 모달을 닫는다.
   */
  function cancelImportSettings() {
    draftState = cloneState(state);
    renderControls(state);
    renderDisplayModeControl(state);
    closeDisplayColumnsModal();
    closeDisplayModeModal();
    closeImportModal();
  }

  /**
   * [함수] applyImportSettings
   * [역할] 가져오기 설정 변경을 현재 덱에 적용한다.
   * [원리] draftState를 전역 state로 복사하고 자동 저장 후 화면을 다시 그린다.
   */
  async function applyImportSettings() {
    // 가져오기 설정은 적용 버튼을 누르기 전까지 draftState에만 반영합니다.
    copyState(draftState, state);
    closeDisplayColumnsModal();
    closeDisplayModeModal();
    closeImportModal();
    resetPage();
    await autoSaveActiveDeck();
    render();
  }

  /**
   * [함수] handleFileChange
   * [역할] 사용자가 선택한 엑셀/CSV 파일을 읽어 draftState에 반영한다.
   * [원리] workbook을 읽고 첫 시트를 자동 선택한 뒤 표 구조를 계산한다.
   */
  async function handleFileChange(event) {
    const file = event.target.files[0];
    const previousDisplayMode = draftState.displayMode || "scroll";

    if (!file) {
      draftState = createEmptyState();
      draftState.displayMode = previousDisplayMode;
      renderDraftControls();
      return;
    }

    await loadFileIntoDraft(file, previousDisplayMode);
  }

  /**
   * [함수] handleFileDrop
   * [역할] 메인 화면에 드롭한 엑셀/CSV 파일을 가져오기 설정 초안으로 읽는다.
   * [원리] 활성 덱이 있을 때만 파일을 읽고, 읽기 성공 후 가져오기 설정 화면을 자동으로 연다.
   */
  async function handleFileDrop(event) {
    event.preventDefault();

    if (!hasActiveDeck()) {
      openSidebar();
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    draftState = cloneState(state);
    const previousDisplayMode = draftState.displayMode || "scroll";
    const loaded = await loadFileIntoDraft(file, previousDisplayMode);
    if (!loaded) return;

    openImportModal();
  }

  /**
   * [함수] loadFileIntoDraft
   * [역할] 파일 객체를 읽어 가져오기 초안 상태에 반영한다.
   * [원리] input 선택과 드래그앤드롭이 같은 파일 파싱/기본 열 추천 흐름을 공유한다.
   */
  async function loadFileIntoDraft(file, previousDisplayMode) {
    try {
      const workbook = await readFileAsWorkbook(file);
      draftState = createEmptyState();
      draftState.displayMode = previousDisplayMode;
      draftState.workbook = workbook;
      draftState.fileName = file.name;
      draftState.sheetNames = workbook.SheetNames;
      draftState.activeSheetName = workbook.SheetNames[0] || "";
      loadActiveSheet(draftState);
      return true;
    } catch (error) {
      draftState = createEmptyState();
      draftState.displayMode = previousDisplayMode;
      renderDraftControls();
      if (error.message === "UNSUPPORTED_FILE") {
        showMessage("xlsx, xls, csv 파일만 지원합니다.");
        return false;
      }
      if (error.message === "SHEETJS_NOT_LOADED") {
        showMessage("엑셀 파서가 로드되지 않았습니다. 네트워크 연결을 확인하세요.");
        return false;
      }
      showMessage("파일을 읽는 중 문제가 발생했습니다.");
      return false;
    }
  }

  /**
   * [함수] handleSheetChange
   * [역할] 가져오기 설정의 시트 선택 변경을 처리한다.
   * [원리] activeSheetName을 바꾸고 해당 시트 matrix를 다시 읽는다.
   */
  function handleSheetChange(event) {
    draftState.activeSheetName = event.target.value;
    loadActiveSheet(draftState);
  }

  /**
   * [함수] loadActiveSheet
   * [역할] 현재 선택된 시트를 draftState에 로드한다.
   * [원리] workbook에서 matrix를 만들고 첫 데이터 행을 표 시작 행으로 추천한다.
   */
  function loadActiveSheet(targetState) {
    if (!targetState.workbook) {
      applyTableFromHeaderRow(targetState);
      return;
    }

    targetState.sheetMatrix = sheetToMatrix(targetState.workbook, targetState.activeSheetName);
    targetState.headerRowIndex = findFirstDataRowIndex(targetState.sheetMatrix);
    applyTableFromHeaderRow(targetState);
  }

  /**
   * [함수] applyTableFromHeaderRow
   * [역할] 표 시작 행 기준으로 columns/rows를 다시 만든다.
   * [원리] matrixToTable 결과를 반영하고 기존 필터/라벨처럼 행 구조 의존 상태를 초기화한다.
   */
  function applyTableFromHeaderRow(targetState) {
    const table = matrixToTable(targetState.sheetMatrix, targetState.headerRowIndex);
    targetState.columns = table.columns;
    targetState.hiddenColumns = [];
    targetState.rows = table.rows;
    // 표 구조가 바뀌면 기존 행 기준 라벨/필터는 의미가 달라지므로 초기화합니다.
    targetState.labelMap = {};
    targetState.labelFilter = "";
    targetState.filters = [{ column: "", value: "", values: [] }];
    targetState.filterColumn = "";
    targetState.filterValue = "";
    applyDefaultColumns(targetState);
    renderDraftControls();
  }

  /**
   * [함수] renameHeaderColumn
   * [역할] 헤더 항목 이름을 수정한다.
   * [원리] columns, rows, 제목/표시/필터/정렬 설정 안의 기존 열 이름을 새 이름으로 치환한다.
   */
  function renameHeaderColumn(column) {
    const nextName = window.prompt("항목 이름을 입력하세요.", column);
    if (!nextName?.trim() || nextName.trim() === column) return;

    const nextColumn = getUniqueColumnName(draftState.columns.filter((item) => item !== column), nextName.trim());
    draftState.columns = draftState.columns.map((item) => (item === column ? nextColumn : item));
    draftState.rows = draftState.rows.map((row) => renameRowKey(row, column, nextColumn));
    draftState.hiddenColumns = replaceColumnRefs(draftState.hiddenColumns || [], column, nextColumn);
    replaceColumnSettingRefs(column, nextColumn);
    renderDraftControls();
  }

  /**
   * [함수] toggleHeaderColumn
   * [역할] 헤더 항목을 카드/상세내용 표시 대상에서 숨기거나 다시 표시한다.
   * [원리] 숨김 시 경고를 표시하고 hiddenColumns에 추가하며, 표시 시 목록에서 제거한다.
   */
  function toggleHeaderColumn(column) {
    const hiddenColumns = new Set(draftState.hiddenColumns || []);
    if (hiddenColumns.has(column)) {
      hiddenColumns.delete(column);
      draftState.hiddenColumns = [...hiddenColumns];
      renderDraftControls();
      return;
    }

    if (!window.confirm(`'${column}' 항목을 숨기면 카드와 상세내용에 표시되지 않습니다.\n데이터는 삭제되지 않습니다.`)) return;

    hiddenColumns.add(column);
    draftState.hiddenColumns = [...hiddenColumns];
    removeColumnFromVisibleSettings(column);
    renderDraftControls();
  }

  /**
   * [함수] moveHeaderColumnNearTarget
   * [역할] 드래그한 헤더 항목을 포인터가 겹친 대상 항목 앞/뒤로 이동한다.
   * [원리] DOM 순서를 즉시 바꾸고 columns 배열도 같은 순서로 맞춘다. 전체 렌더링은 드래그 종료 시점에만 한다.
   */
  function moveHeaderColumnNearTarget(dragState, target, event) {
    const targetRect = target.getBoundingClientRect();
    const shouldPlaceAfter = event.clientY > targetRect.top + targetRect.height / 2;
    const referenceNode = shouldPlaceAfter ? target.nextElementSibling : target;
    if (referenceNode === dragState.item) return;

    const beforeRect = dragState.item.getBoundingClientRect();
    target.parentElement.insertBefore(dragState.item, referenceNode);
    const afterRect = dragState.item.getBoundingClientRect();
    dragState.startX += afterRect.left - beforeRect.left;
    dragState.startY += afterRect.top - beforeRect.top;
    dragState.item.style.transform = `translate3d(${event.clientX - dragState.startX}px, ${event.clientY - dragState.startY}px, 0)`;

    const nextColumns = [...target.parentElement.querySelectorAll("[data-header-drag-column]")]
      .map((item) => item.dataset.headerDragColumn)
      .filter(Boolean);
    if (nextColumns.length !== draftState.columns.length || nextColumns.join("\u0000") === draftState.columns.join("\u0000")) {
      return;
    }

    draftState.columns = nextColumns;
  }

  function replaceColumnSettingRefs(oldColumn, newColumn) {
    getTitleColumnFields().forEach((field) => {
      if (draftState[field] === oldColumn) draftState[field] = newColumn;
    });
    draftState.displayColumns = replaceColumnRefs(draftState.displayColumns || [], oldColumn, newColumn);
    draftState.filters = (draftState.filters || []).map((filter) => ({
      ...filter,
      column: filter.column === oldColumn ? newColumn : filter.column,
    }));
    draftState.filterColumn = draftState.filterColumn === oldColumn ? newColumn : draftState.filterColumn;
    draftState.sorts = (draftState.sorts || []).map((sort) => ({
      ...sort,
      column: sort.column === oldColumn ? newColumn : sort.column,
    }));
    draftState.sortColumn = draftState.sortColumn === oldColumn ? newColumn : draftState.sortColumn;
    draftState.searchColumn = draftState.searchColumn === oldColumn ? newColumn : draftState.searchColumn;
  }

  function removeColumnFromVisibleSettings(column) {
    getTitleColumnFields().forEach((field) => {
      if (draftState[field] === column) draftState[field] = "";
    });
    draftState.displayColumns = (draftState.displayColumns || []).filter((item) => item !== column);
    draftState.filters = (draftState.filters || []).filter((filter) => filter.column !== column);
    if (draftState.filterColumn === column) {
      draftState.filterColumn = "";
      draftState.filterValue = "";
    }
    draftState.sorts = (draftState.sorts || []).filter((sort) => sort.column !== column);
    if (draftState.sortColumn === column) {
      draftState.sortColumn = "";
      draftState.sortDirection = "asc";
      draftState.randomSortSeed = "";
    }
    if (draftState.searchColumn === column) draftState.searchColumn = "";
    syncDisplayColumnsWithTitleColumns();
  }

  return {
    applyDisplayColumnsSettings,
    applyImportSettings,
    addTitleColumn,
    cancelDisplayColumnsSettings,
    cancelImportSettings,
    handleDisplayColumnsAllChange,
    handleDisplayColumnsChange,
    handleDisplayModeChange,
    handleFileDrop,
    handleFileChange,
    handleHeaderSettingsAction,
    handleHeaderRowChange,
    handleSheetChange,
    handleSubtitleColumn1Change,
    handleSubtitleColumn2Change,
    handleSubtitleColumn3Change,
    handleSubtitleColumn4Change,
    handleTitleColumnChange,
    addHeaderColumn,
    closeHeaderSettings,
    handleHeaderReorderPointerDown,
    handleHeaderReorderPointerMove,
    handleHeaderReorderPointerUp,
    openDisplayColumnsSettings,
    openDisplayModeSettings,
    openHeaderSettings,
    openImportSettings,
    removeTitleColumn,
    resetDraftFromState,
  };
}

/**
 * [함수] getTitleColumnFields
 * [역할] 제목 열 1~5가 저장되는 상태 필드명을 순서대로 반환한다.
 * [원리] 제목 삭제 시 뒤 필드 값을 앞으로 당기기 위한 공통 순서 목록이다.
 */
function getTitleColumnFields() {
  return [
    "titleColumn",
    "subtitleColumn1",
    "subtitleColumn2",
    "subtitleColumn3",
    "subtitleColumn4",
  ];
}

/**
 * [함수] getTitleColumnCount
 * [역할] 제목 입력칸을 몇 개 표시해야 하는지 계산한다.
 * [원리] titleColumnCount와 실제 선택된 제목열 위치를 함께 보고 1~5 범위로 제한한다.
 */
function getTitleColumnCount(source) {
  const fields = getTitleColumnFields();
  const lastSelectedIndex = fields.reduce(
    (lastIndex, field, index) => (source[field] ? index : lastIndex),
    0,
  );
  const requestedCount = Number(source.titleColumnCount) || 1;
  return Math.min(5, Math.max(1, requestedCount, lastSelectedIndex + 1));
}

function getUniqueColumnName(columns, name) {
  if (!columns.includes(name)) return name;

  let index = 2;
  while (columns.includes(`${name} ${index}`)) {
    index += 1;
  }
  return `${name} ${index}`;
}

function renameRowKey(row, oldColumn, newColumn) {
  return Object.entries(row).reduce((nextRow, [key, value]) => {
    nextRow[key === oldColumn ? newColumn : key] = value;
    return nextRow;
  }, {});
}

function replaceColumnRefs(columns, oldColumn, newColumn) {
  return columns.map((column) => (column === oldColumn ? newColumn : column));
}

/**
 * [함수] findFirstDataRowIndex
 * [역할] 시트에서 처음으로 값이 있는 행을 표 시작 행 후보로 찾는다.
 * [원리] 행 안의 셀 중 하나라도 값이 있으면 해당 행 인덱스를 반환한다.
 */
function findFirstDataRowIndex(matrix) {
  const firstNonEmptyRowIndex = matrix.findIndex((row) =>
    row.some((cell) => String(cell ?? "").trim().length > 0),
  );
  return Math.max(0, firstNonEmptyRowIndex);
}
