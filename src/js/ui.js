/* ==========================================================================
   [모듈] UI 파사드 (ui.js)
   [역할]
   - DOM 요소를 한 곳에서 수집하고 renderer/modal 모듈을 기존 API로 연결합니다.
   - 앱의 다른 컨트롤러가 사용하는 UI 함수 이름을 유지하는 진입점입니다.
   [참고]
   - 새 UI 모듈을 분리하더라도 외부 호출부는 이 파일의 export를 우선 확인합니다.
   ========================================================================== */
import {
  escapeHTML,
  getDisplayTitle,
  getPreviewColumns,
  normalizeValue,
  recommendTitleColumn,
} from "./utils.js";
import { renderCards as renderCardList } from "./cardRenderer.js";
import {
  closeSidebar as closeSidebarPanel,
  openSidebar as openSidebarPanel,
  renderDeckList as renderSidebarDeckList,
  renderLabelFilters as renderSidebarLabelFilters,
  setSidebarTab as setSidebarPanelTab,
} from "./sidebarRenderer.js";
import {
  closeDisplayColumnsModal as closeDisplayColumnsModalPanel,
  closeDisplayModeModal as closeDisplayModeModalPanel,
  closeFilterPanel as closeFilterPanelView,
  closeImportModal as closeImportModalPanel,
  closeLabelPalette as closeLabelPalettePanel,
  closeSearchPanel as closeSearchPanelView,
  closeSettingsModal as closeSettingsModalPanel,
  closeSortPanel as closeSortPanelView,
  openDisplayColumnsModal as openDisplayColumnsModalPanel,
  openDisplayModeModal as openDisplayModeModalPanel,
  openFilterPanel as openFilterPanelView,
  openImportModal as openImportModalPanel,
  openLabelPalette as openLabelPalettePanel,
  openSearchPanel as openSearchPanelView,
  openSettingsModal as openSettingsModalPanel,
  openSortPanel as openSortPanelView,
  toggleFilterPanel as toggleFilterPanelView,
  toggleSearchPanel as toggleSearchPanelView,
  toggleSortPanel as toggleSortPanelView,
} from "./modalUi.js";
import {
  getAllSelectableDisplayColumns as getAllSelectableDisplayColumnsFromState,
  getDisplayColumnCheckboxValues as getDisplayColumnValues,
  getSelectedDisplayColumns as getSelectedDisplayColumnsFromState,
  renderControls as renderImportControls,
  setDisplayColumnCheckboxValues as setDisplayColumnValues,
  syncDisplayColumnsModalSummary as syncDisplayColumnSummary,
} from "./controlsRenderer.js";
import {
  closeSelectModal,
  getMultiSelectLabel,
  populateSelect,
  setupSelectModalTriggers as setupSelectModalController,
} from "./selectModal.js";
import {
  renderDisplayModeControl as renderDisplayModeControlView,
  renderFilterSortControls as renderFilterSortControlsView,
  renderPageControls as renderPageControlsView,
  renderSearchControl as renderSearchControlView,
} from "./viewControlsRenderer.js";

export { closeSelectModal, populateSelect };

const elements = {
  sidebarOpen: document.querySelector("#sidebarOpen"),
  sidebar: document.querySelector("#sidebar"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  sidebarClose: document.querySelector("#sidebarClose"),
  deckTab: document.querySelector("#deckTab"),
  cardTab: document.querySelector("#cardTab"),
  deckTabPanel: document.querySelector("#deckTabPanel"),
  cardTabPanel: document.querySelector("#cardTabPanel"),
  labelFilterList: document.querySelector("#labelFilterList"),
  labelPalette: document.querySelector("#labelPalette"),
  labelPaletteList: document.querySelector("#labelPaletteList"),
  settingsOpen: document.querySelector("#settingsOpen"),
  settingsModal: document.querySelector("#settingsModal"),
  settingsClose: document.querySelector("#settingsClose"),
  appVersionDisplay: document.querySelector("#appVersionDisplay"),
  latestVersionDisplay: document.querySelector("#latestVersionDisplay"),
  appUpdateButton: document.querySelector("#appUpdateButton"),
  displayModeOpen: document.querySelector("#displayModeOpen"),
  displayModeValue: document.querySelector("#displayModeValue"),
  displayModeModal: document.querySelector("#displayModeModal"),
  displayModeClose: document.querySelector("#displayModeClose"),
  displayModeInputs: document.querySelectorAll("input[name='displayMode']"),
  googleDriveDetail: document.querySelector("#googleDriveDetail"),
  googleDriveConnect: document.querySelector("#googleDriveConnect"),
  googleDriveBackup: document.querySelector("#googleDriveBackup"),
  googleDriveRestore: document.querySelector("#googleDriveRestore"),
  googleDriveSync: document.querySelector("#googleDriveSync"),
  googleDriveOperationStatus: document.querySelector("#googleDriveOperationStatus"),
  savedList: document.querySelector("#savedList"),
  newDeck: document.querySelector("#newDeck"),
  importSavedInput: document.querySelector("#importSavedInput"),
  importOpen: document.querySelector("#importOpen"),
  importOpenIcon: document.querySelector("#importOpenIcon"),
  importOpenLabel: document.querySelector("#importOpenLabel"),
  importModal: document.querySelector("#importModal"),
  importClose: document.querySelector("#importClose"),
  importCancel: document.querySelector("#importCancel"),
  importApply: document.querySelector("#importApply"),
  fileInput: document.querySelector("#fileInput"),
  fileName: document.querySelector("#fileName"),
  sheetSelect: document.querySelector("#sheetSelect"),
  headerRowSelect: document.querySelector("#headerRowSelect"),
  titleColumnSelect: document.querySelector("#titleColumnSelect"),
  subtitleColumn1Select: document.querySelector("#subtitleColumn1Select"),
  subtitleColumn2Select: document.querySelector("#subtitleColumn2Select"),
  displayColumnsOpen: document.querySelector("#displayColumnsOpen"),
  displayColumnsSummary: document.querySelector("#displayColumnsSummary"),
  displayColumnsModal: document.querySelector("#displayColumnsModal"),
  displayColumnsList: document.querySelector("#displayColumnsList"),
  displayColumnsAll: document.querySelector("#displayColumnsAll"),
  displayColumnsCount: document.querySelector("#displayColumnsCount"),
  displayColumnsCancel: document.querySelector("#displayColumnsCancel"),
  displayColumnsConfirm: document.querySelector("#displayColumnsConfirm"),
  displayColumnsClose: document.querySelector("#displayColumnsClose"),
  filterList: document.querySelector("#filterList"),
  addFilter: document.querySelector("#addFilter"),
  sortList: document.querySelector("#sortList"),
  addSort: document.querySelector("#addSort"),
  filterOpen: document.querySelector("#filterOpen"),
  filterPanel: document.querySelector("#filterPanel"),
  filterClose: document.querySelector("#filterClose"),
  filterCancel: document.querySelector("#filterCancel"),
  filterApply: document.querySelector("#filterApply"),
  sortOpen: document.querySelector("#sortOpen"),
  sortPanel: document.querySelector("#sortPanel"),
  sortClose: document.querySelector("#sortClose"),
  sortCancel: document.querySelector("#sortCancel"),
  sortApply: document.querySelector("#sortApply"),
  floatingSearchButton: document.querySelector("#floatingSearchButton"),
  floatingSearchPanel: document.querySelector("#floatingSearchPanel"),
  floatingSearchClose: document.querySelector("#floatingSearchClose"),
  searchColumnSelect: document.querySelector("#searchColumnSelect"),
  searchInput: document.querySelector("#searchInput"),
  cardCount: document.querySelector("#cardCount"),
  message: document.querySelector("#message"),
  cardList: document.querySelector("#cardList"),
  loadMoreSentinel: document.querySelector("#loadMoreSentinel"),
  pageControls: document.querySelector("#pageControls"),
  pageFirst: document.querySelector("#pageFirst"),
  pagePrev: document.querySelector("#pagePrev"),
  pageNext: document.querySelector("#pageNext"),
  pageLast: document.querySelector("#pageLast"),
  pageNumbers: document.querySelector("#pageNumbers"),
  selectModal: document.querySelector("#selectModal"),
  selectModalTitle: document.querySelector("#selectModalTitle"),
  selectModalSearchField: document.querySelector("#selectModalSearchField"),
  selectModalSearch: document.querySelector("#selectModalSearch"),
  selectModalList: document.querySelector("#selectModalList"),
  selectModalActions: document.querySelector("#selectModalActions"),
  selectModalCancel: document.querySelector("#selectModalCancel"),
  selectModalApply: document.querySelector("#selectModalApply"),
  selectModalClose: document.querySelector("#selectModalClose"),
  detailModal: document.querySelector("#detailModal"),
  modalTitle: document.querySelector("#modalTitle"),
  modalContent: document.querySelector("#modalContent"),
  modalClose: document.querySelector("#modalClose"),
  copyToast: document.querySelector("#copyToast"),
};

let copyToastTimer = null;

export const LABEL_OPTIONS = [
  { value: "red", label: "빨간색", color: "#ef4444" },
  { value: "orange", label: "주황색", color: "#f97316" },
  { value: "yellow", label: "노란색", color: "#facc15" },
  { value: "green", label: "초록색", color: "#22c55e" },
  { value: "blue", label: "파란색", color: "#0b7af3" },
  { value: "indigo", label: "남색", color: "#4054b2" },
  { value: "purple", label: "보라색", color: "#a855f7" },
  { value: "gray", label: "회색", color: "#8b8f97" },
];

const importOpenIcons = {
  edit: `
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
  `,
};

/**
 * [함수] getSelectModalTargets
 * [역할] 중앙 선택 모달로 대체할 선택 버튼 목록을 반환한다.
 * [원리] 가져오기/검색/정렬 관련 select-button 요소만 모아 null 요소를 제거한다.
 */
function getSelectModalTargets() {
  return [
    elements.sheetSelect,
    elements.headerRowSelect,
    elements.titleColumnSelect,
    elements.subtitleColumn1Select,
    elements.subtitleColumn2Select,
    elements.searchColumnSelect,
  ].filter(Boolean);
}

/**
 * [함수] getElements
 * [역할] 앱 전체에서 공유하는 DOM 요소 참조 묶음을 반환한다.
 * [원리] 파일 로드 시 수집한 elements 객체를 그대로 노출해 컨트롤러가 재사용하게 한다.
 */
export function getElements() {
  return elements;
}

/**
 * [함수] setupSelectModalTriggers
 * [역할] 드롭다운처럼 보이는 버튼이 중앙 선택 모달을 열도록 연결한다.
 * [원리] ui.js가 가진 대상 목록을 selectModal 컨트롤러에 전달한다.
 */
export function setupSelectModalTriggers() {
  setupSelectModalController(elements, getSelectModalTargets());
}

/**
 * [함수] renderControls
 * [역할] 가져오기 설정 화면의 컨트롤을 렌더링한다.
 * [원리] controlsRenderer에 DOM 요소와 제목열 계산 함수를 넘겨 실제 렌더링을 위임한다.
 */
export function renderControls(state) {
  renderImportControls({
    elements,
    state,
    populateSelect,
    getTitleColumns,
    syncDisplayColumnsModalSummary,
  });
}

/**
 * [함수] renderFilterSortControls
 * [역할] 필터/정렬 팝업의 상태를 렌더링한다.
 * [원리] viewControlsRenderer에 선택 모달 헬퍼와 패널 닫기 함수를 함께 전달한다.
 */
export function renderFilterSortControls(state) {
  renderFilterSortControlsView({
    elements,
    state,
    populateSelect,
    getMultiSelectLabel,
    closeFilterPanel,
    closeSortPanel,
  });
}

/**
 * [함수] renderSearchControl
 * [역할] 검색 바텀시트와 검색 버튼 상태를 렌더링한다.
 * [원리] 검색 열 선택 옵션은 populateSelect로 만들고 패널 닫기는 공통 UI 함수로 처리한다.
 */
export function renderSearchControl(state) {
  renderSearchControlView({
    elements,
    state,
    populateSelect,
    closeSearchPanel,
  });
}

/**
 * [함수] renderDisplayModeControl
 * [역할] 가져오기 설정의 표시 방식 UI를 현재 state로 갱신한다.
 * [원리] viewControlsRenderer의 표시 방식 렌더러에 elements와 state를 전달한다.
 */
export function renderDisplayModeControl(state) {
  renderDisplayModeControlView(elements, state);
}

/**
 * [함수] openDisplayModeModal
 * [역할] 표시 방식 선택 모달을 연다.
 * [원리] modalUi의 모달 열기 함수에 공통 elements 객체를 전달한다.
 */
export function openDisplayModeModal() {
  openDisplayModeModalPanel(elements);
}

/**
 * [함수] closeDisplayModeModal
 * [역할] 표시 방식 선택 모달을 닫는다.
 * [원리] modalUi의 모달 닫기 함수에 공통 elements 객체를 전달한다.
 */
export function closeDisplayModeModal() {
  closeDisplayModeModalPanel(elements);
}

/**
 * [함수] renderPageControls
 * [역할] 페이지 방식 하단 컨트롤을 렌더링한다.
 * [원리] 페이지 관련 계산과 DOM 갱신은 viewControlsRenderer로 위임한다.
 */
export function renderPageControls(state, totalRows, currentPage, pageSize) {
  renderPageControlsView(elements, state, totalRows, currentPage, pageSize);
}

/**
 * [함수] renderImportButton
 * [역할] 상단 가져오기/수정 버튼의 표시와 사용 가능 여부를 갱신한다.
 * [원리] 현재 정책에 맞춰 항상 수정 아이콘/문구를 쓰고 활성 덱이 없으면 비활성화한다.
 */
export function renderImportButton(state, hasActiveDeck = false) {
  elements.importOpenLabel.textContent = "수정";
  elements.importOpenIcon.innerHTML = importOpenIcons.edit;
  elements.importOpen.setAttribute(
    "aria-label",
    hasActiveDeck ? "가져오기 설정 수정" : "덱을 먼저 선택하세요",
  );
  elements.importOpen.disabled = !hasActiveDeck;
}

/**
 * [함수] renderDeckList
 * [역할] 사이드바 덱 목록을 렌더링한다.
 * [원리] sidebarRenderer에 덱 배열과 현재 선택 덱 id를 넘긴다.
 */
export function renderDeckList(decks, activeDeckId) {
  renderSidebarDeckList(elements, decks, activeDeckId);
}

/**
 * [함수] renderLabelFilters
 * [역할] 사이드바 카드 탭의 라벨 필터 목록을 렌더링한다.
 * [원리] 공통 라벨 옵션과 현재 state를 sidebarRenderer로 전달한다.
 */
export function renderLabelFilters(state) {
  renderSidebarLabelFilters(elements, state, LABEL_OPTIONS);
}

/**
 * [함수] openSidebar
 * [역할] 사이드바를 연다.
 * [원리] sidebarRenderer의 openSidebar 구현을 호출한다.
 */
export function openSidebar() {
  openSidebarPanel(elements);
}

/**
 * [함수] closeSidebar
 * [역할] 사이드바를 닫는다.
 * [원리] sidebarRenderer의 closeSidebar 구현을 호출한다.
 */
export function closeSidebar() {
  closeSidebarPanel(elements);
}

/**
 * [함수] setSidebarTab
 * [역할] 사이드바의 덱/카드 탭을 전환한다.
 * [원리] 탭 이름을 sidebarRenderer로 넘겨 active와 hidden 상태를 갱신한다.
 */
export function setSidebarTab(tabName) {
  setSidebarPanelTab(elements, tabName);
}

/**
 * [함수] openLabelPalette
 * [역할] 카드 라벨 색상 팔레트를 연다.
 * [원리] 클릭한 라벨 버튼 위치, rowKey, 현재 라벨 값을 modalUi로 전달한다.
 */
export function openLabelPalette(anchor, rowKey, selectedLabel = "") {
  openLabelPalettePanel(elements, LABEL_OPTIONS, anchor, rowKey, selectedLabel);
}

/**
 * [함수] closeLabelPalette
 * [역할] 라벨 색상 팔레트를 닫는다.
 * [원리] modalUi의 닫기 함수로 팔레트 hidden 상태를 갱신한다.
 */
export function closeLabelPalette() {
  closeLabelPalettePanel(elements);
}

/**
 * [함수] openSettingsModal
 * [역할] 전체 화면 설정 창을 연다.
 * [원리] modalUi의 설정 모달 열기 함수를 호출한다.
 */
export function openSettingsModal() {
  openSettingsModalPanel(elements);
}

/**
 * [함수] closeSettingsModal
 * [역할] 전체 화면 설정 창을 닫는다.
 * [원리] modalUi의 설정 모달 닫기 함수를 호출한다.
 */
export function closeSettingsModal() {
  closeSettingsModalPanel(elements);
}

/**
 * [함수] openSearchPanel
 * [역할] 검색 바텀시트를 연다.
 * [원리] 검색을 열 때 필터/정렬 패널은 닫히도록 닫기 함수를 함께 전달한다.
 */
export function openSearchPanel() {
  openSearchPanelView(elements, closeFilterPanel, closeSortPanel);
}

/**
 * [함수] closeSearchPanel
 * [역할] 검색 바텀시트를 닫는다.
 * [원리] modalUi의 검색 패널 닫기 함수를 호출한다.
 */
export function closeSearchPanel() {
  closeSearchPanelView(elements);
}

/**
 * [함수] toggleSearchPanel
 * [역할] 검색 바텀시트 열림 상태를 토글한다.
 * [원리] modalUi의 토글 함수에 열기/닫기 래퍼를 넘긴다.
 */
export function toggleSearchPanel() {
  toggleSearchPanelView(elements, openSearchPanel, closeSearchPanel);
}

/**
 * [함수] openFilterPanel
 * [역할] 필터 설정 모달을 연다.
 * [원리] 필터를 열 때 검색/정렬 패널은 닫히도록 닫기 함수를 함께 전달한다.
 */
export function openFilterPanel() {
  openFilterPanelView(elements, closeSearchPanel, closeSortPanel);
}

/**
 * [함수] closeFilterPanel
 * [역할] 필터 설정 모달을 닫는다.
 * [원리] modalUi의 필터 패널 닫기 함수를 호출한다.
 */
export function closeFilterPanel() {
  closeFilterPanelView(elements);
}

/**
 * [함수] toggleFilterPanel
 * [역할] 필터 설정 모달 열림 상태를 토글한다.
 * [원리] modalUi의 토글 함수에 열기/닫기 래퍼를 넘긴다.
 */
export function toggleFilterPanel() {
  toggleFilterPanelView(elements, openFilterPanel, closeFilterPanel);
}

/**
 * [함수] openSortPanel
 * [역할] 정렬 설정 모달을 연다.
 * [원리] 정렬을 열 때 검색/필터 패널은 닫히도록 닫기 함수를 함께 전달한다.
 */
export function openSortPanel() {
  openSortPanelView(elements, closeSearchPanel, closeFilterPanel);
}

/**
 * [함수] closeSortPanel
 * [역할] 정렬 설정 모달을 닫는다.
 * [원리] modalUi의 정렬 패널 닫기 함수를 호출한다.
 */
export function closeSortPanel() {
  closeSortPanelView(elements);
}

/**
 * [함수] toggleSortPanel
 * [역할] 정렬 설정 모달 열림 상태를 토글한다.
 * [원리] modalUi의 토글 함수에 열기/닫기 래퍼를 넘긴다.
 */
export function toggleSortPanel() {
  toggleSortPanelView(elements, openSortPanel, closeSortPanel);
}

/**
 * [함수] applyDefaultColumns
 * [역할] 새 표를 읽었을 때 제목열, 표시열, 필터/정렬/검색 기본값을 설정한다.
 * [원리] 열 이름 기반 추천 함수를 사용하고 표 구조가 바뀌면 이전 조건은 초기화한다.
 */
export function applyDefaultColumns(state) {
  state.titleColumn = recommendTitleColumn(state.columns);
  state.subtitleColumn1 = "";
  state.subtitleColumn2 = "";
  state.displayColumns = getPreviewColumns(state.columns, getTitleColumns(state));
  state.filterColumn = "";
  state.filterValue = "";
  state.filters = [{ column: "", value: "", values: [] }];
  state.sorts = [];
  state.sortColumn = "";
  state.sortDirection = "asc";
  state.randomSortSeed = "";
  state.searchColumn = "";
  state.searchTerm = "";
}

/**
 * [함수] renderCards
 * [역할] 현재 조건에 맞는 행을 카드 목록으로 렌더링한다.
 * [원리] cardRenderer에 라벨 옵션, 제목열 계산, 표시열 계산, 메시지 표시 함수를 주입한다.
 */
export function renderCards(
  state,
  visibleRows,
  renderedCount = visibleRows.length,
  startIndex = 0,
  totalCount = visibleRows.length,
) {
  renderCardList({
    elements,
    state,
    visibleRows,
    renderedCount,
    startIndex,
    totalCount,
    labelOptions: LABEL_OPTIONS,
    getSelectedDisplayColumns,
    getTitleColumns,
    showMessage,
  });
}

/**
 * [함수] showMessage
 * [역할] 카드 목록 영역에 안내 메시지를 표시한다.
 * [원리] 메시지 영역을 보이고 카드 목록과 무한 스크롤 sentinel은 숨긴다.
 */
export function showMessage(text) {
  elements.message.textContent = text;
  elements.message.hidden = false;
  elements.cardList.hidden = true;
  elements.cardList.innerHTML = "";
  elements.loadMoreSentinel.hidden = true;
}

/**
 * [함수] openDetailModal
 * [역할] 카드 상세 정보를 중앙 모달로 연다.
 * [원리] 제목과 모든 열 값을 버튼 형태로 렌더링해 클릭 복사가 가능하게 한다.
 */
export function openDetailModal(row, state, rowIndex) {
  const title = getDisplayTitle(row, getTitleColumns(state), rowIndex);
  elements.modalTitle.textContent = title;
  elements.modalTitle.dataset.copyValue = title;
  elements.modalContent.innerHTML = state.columns
    .map((column) => {
      const value = normalizeValue(row[column]) || "-";
      return `
        <button class="detail-field" type="button" data-copy-value="${escapeHTML(value)}">
          <span class="field-name">${escapeHTML(column)}</span>
          <span class="field-value">${escapeHTML(value)}</span>
        </button>
      `;
    })
    .join("");
  elements.detailModal.hidden = false;
  elements.modalClose.focus();
}

/**
 * [함수] closeDetailModal
 * [역할] 카드 상세 모달을 닫는다.
 * [원리] detailModal hidden 상태만 true로 바꾼다.
 */
export function closeDetailModal() {
  elements.detailModal.hidden = true;
}

/**
 * [함수] copyTextValue
 * [역할] 상세 모달에서 클릭한 값을 클립보드에 복사한다.
 * [원리] Clipboard API를 우선 사용하고 실패하면 textarea fallback으로 복사한 뒤 토스트를 띄운다.
 */
export async function copyTextValue(value) {
  const text = normalizeValue(value);
  if (!text || text === "-") return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copyTextWithFallback(text);
  }

  showCopyToast();
}

/**
 * [함수] copyTextWithFallback
 * [역할] Clipboard API를 사용할 수 없을 때 텍스트를 복사한다.
 * [원리] 임시 textarea를 만들고 선택한 뒤 execCommand("copy")를 실행한다.
 */
function copyTextWithFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

/**
 * [함수] showCopyToast
 * [역할] 복사 완료 알림을 짧게 표시한다.
 * [원리] 기존 타이머를 지우고 1.4초 뒤 자동으로 숨기는 새 타이머를 등록한다.
 */
function showCopyToast() {
  window.clearTimeout(copyToastTimer);
  elements.copyToast.hidden = false;
  copyToastTimer = window.setTimeout(() => {
    elements.copyToast.hidden = true;
  }, 1400);
}

/**
 * [함수] getTitleColumns
 * [역할] 카드명에 사용할 제목열과 부제목열 목록을 반환한다.
 * [원리] 빈 값은 제거하고 Set으로 중복 열을 한 번만 남긴다.
 */
export function getTitleColumns(state) {
  return [...new Set([state.titleColumn, state.subtitleColumn1, state.subtitleColumn2].filter(Boolean))];
}

/**
 * [함수] getSelectedDisplayColumns
 * [역할] 현재 카드 본문에 표시할 열 목록을 반환한다.
 * [원리] controlsRenderer의 표시열 계산 함수에 제목열 계산 함수를 함께 넘긴다.
 */
export function getSelectedDisplayColumns(state) {
  return getSelectedDisplayColumnsFromState(state, getTitleColumns);
}

/**
 * [함수] getAllSelectableDisplayColumns
 * [역할] 표시할 열로 선택 가능한 전체 열 목록을 반환한다.
 * [원리] controlsRenderer의 후보 계산 함수에 제목열 계산 함수를 함께 넘긴다.
 */
export function getAllSelectableDisplayColumns(state) {
  return getAllSelectableDisplayColumnsFromState(state, getTitleColumns);
}

/**
 * [함수] openDisplayColumnsModal
 * [역할] 표시할 열 선택 모달을 연다.
 * [원리] 모달을 열면서 선택 개수 요약을 동기화할 콜백을 전달한다.
 */
export function openDisplayColumnsModal() {
  openDisplayColumnsModalPanel(elements, syncDisplayColumnsModalSummary);
}

/**
 * [함수] closeDisplayColumnsModal
 * [역할] 표시할 열 선택 모달을 닫는다.
 * [원리] modalUi의 닫기 함수를 호출한다.
 */
export function closeDisplayColumnsModal() {
  closeDisplayColumnsModalPanel(elements);
}

/**
 * [함수] getDisplayColumnCheckboxValues
 * [역할] 표시할 열 모달에서 선택된 열 목록을 읽는다.
 * [원리] controlsRenderer의 checkbox 값 수집 함수를 호출한다.
 */
export function getDisplayColumnCheckboxValues() {
  return getDisplayColumnValues(elements);
}

/**
 * [함수] setDisplayColumnCheckboxValues
 * [역할] 표시할 열 모달의 선택 상태를 지정한 열 목록으로 설정한다.
 * [원리] controlsRenderer에 elements와 요약 동기화 콜백을 전달한다.
 */
export function setDisplayColumnCheckboxValues(columns) {
  setDisplayColumnValues(elements, columns, syncDisplayColumnsModalSummary);
}

/**
 * [함수] syncDisplayColumnsModalSummary
 * [역할] 표시할 열 모달의 전체 선택 체크박스와 선택 개수 표시를 갱신한다.
 * [원리] controlsRenderer의 요약 계산 함수를 호출한다.
 */
export function syncDisplayColumnsModalSummary() {
  syncDisplayColumnSummary(elements);
}

/**
 * [함수] openImportModal
 * [역할] 가져오기 설정 전체 창을 연다.
 * [원리] modalUi의 가져오기 모달 열기 함수를 호출한다.
 */
export function openImportModal() {
  openImportModalPanel(elements);
}

/**
 * [함수] closeImportModal
 * [역할] 가져오기 설정 전체 창을 닫는다.
 * [원리] modalUi의 가져오기 모달 닫기 함수를 호출한다.
 */
export function closeImportModal() {
  closeImportModalPanel(elements);
}
