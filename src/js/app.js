/* ==========================================================================
   [모듈] 앱 진입점 (app.js)
   [역할]
   - 각 컨트롤러를 조립하고 전역 이벤트를 연결합니다.
   - 앱 시작 시 초기 렌더링, 버전 확인, 덱 목록 로딩 흐름을 실행합니다.
   [참고]
   - 기능별 실제 로직은 controller/renderer 모듈에 있으며, 여기서는 연결만 확인합니다.
   ========================================================================== */
import { createCardListController } from "./cardListController.js";
import { createDeckController } from "./deckController.js";
import { createFilterSortController } from "./filterSortController.js";
import { bindGoogleDriveSync } from "./googleDriveSync.js";
import { createImportController } from "./importController.js";
import { state } from "./state.js";
import { bindVersionUpdate, checkAppVersion } from "./versionUpdate.js";
import { createViewInteractionController } from "./viewInteractionController.js";
import {
  applyDefaultColumns,
  closeDetailModal,
  closeDisplayColumnsModal,
  closeHeaderSettingsModal,
  closeDisplayModeModal,
  closeFilterPanel,
  closeImportModal,
  closeLabelPalette,
  closeSearchPanel,
  closeSelectModal,
  closeSettingsModal,
  closeSortPanel,
  closeSidebar,
  copyTextValue,
  cancelDetailEditMode,
  enterDetailEditMode,
  getAllSelectableDisplayColumns,
  getDisplayColumnCheckboxValues,
  getSelectedDisplayColumns,
  getElements,
  handleDetailTouchEnd,
  handleDetailTouchMove,
  handleDetailTouchStart,
  openDisplayColumnsModal,
  openHeaderSettingsModal,
  openDisplayModeModal,
  openImportModal,
  openLabelPalette,
  openDetailModal,
  openSidebar,
  openSettingsModal,
  renderCards,
  renderControls,
  renderDisplayModeControl,
  renderFilterSortControls,
  renderImportButton,
  renderLabelFilters,
  renderDeckList,
  renderPageControls,
  renderSearchControl,
  saveDetailEdits,
  setDisplayColumnCheckboxValues,
  setSidebarTab,
  setupSelectModalTriggers,
  showNextDetailCard,
  showPreviousDetailCard,
  showMessage,
  syncDisplayColumnsModalSummary,
  toggleFilterPanel,
  toggleSortPanel,
  toggleSearchPanel,
} from "./ui.js";

const elements = getElements();
let deckController = null;
let cardListController = null;
let viewInteractionController = null;
const importController = createImportController({
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
  closeHeaderSettingsModal,
  openDisplayModeModal,
  closeDisplayModeModal,
  openHeaderSettingsModal,
  openImportModal,
  closeImportModal,
  openSidebar,
  hasActiveDeck: () => deckController.hasActiveDeck(),
  autoSaveActiveDeck: () => deckController.autoSaveActiveDeck(),
  resetPage: () => cardListController.resetPage(),
});
deckController = createDeckController({
  elements,
  state,
  render,
  resetDraftFromState: importController.resetDraftFromState,
  renderDeckList,
  showMessage,
  closeSidebar,
});
cardListController = createCardListController({
  elements,
  state,
  renderApp: render,
  renderCards,
  renderPageControls,
  showMessage,
  openDetailModal,
  openLabelPalette,
  hasActiveDeck: () => deckController.hasActiveDeck(),
});
const filterSortController = createFilterSortController({
  elements,
  state,
  render,
  resetPage: cardListController.resetPage,
  autoSaveActiveDeck: () => deckController.autoSaveActiveDeck(),
  closeFilterPanel,
  closeSortPanel,
  toggleFilterPanel,
  toggleSortPanel,
});
viewInteractionController = createViewInteractionController({
  elements,
  state,
  render,
  resetPage: cardListController.resetPage,
  autoSaveActiveDeck: () => deckController.autoSaveActiveDeck(),
  closeLabelPalette,
  closeSidebar,
  copyTextValue,
});

/* ==========================================================================
   1) 앱 초기화
   ========================================================================== */
/**
 * [함수] init
 * [역할] 앱 시작 시 필요한 이벤트, 저장된 덱, 기본 화면 상태를 초기화한다.
 * [원리] 컨트롤러를 연결한 뒤 IndexedDB 덱 목록과 버전 정보를 비동기로 확인한다.
 */
async function init() {
  bindEvents();
  bindVersionUpdate(elements);
  bindGoogleDriveSync({ elements, deckController, render });
  cardListController.setupLoadMoreObserver();
  renderControls(state);
  renderImportButton(state, deckController.hasActiveDeck());
  await deckController.refreshDeckList();
  renderDisplayModeControl(state);
  renderFilterSortControls(state);
  renderSearchControl(state);
  renderLabelFilters(state);
  checkAppVersion(elements);
  showMessage("사이드바에서 덱을 만들거나 선택하세요.");
}

/* ==========================================================================
   2) 전역 이벤트 연결
   ========================================================================== */
/**
 * [함수] bindEvents
 * [역할] 화면 전체의 클릭/입력/키보드 이벤트를 각 컨트롤러에 연결한다.
 * [원리] DOM 이벤트는 app.js에서 한 번만 바인딩하고 실제 상태 변경은 전용 컨트롤러로 위임한다.
 */
function bindEvents() {
  setupSelectModalTriggers();
  const mainArea = document.querySelector("main");
  mainArea.addEventListener("dragover", handleMainFileDragOver);
  mainArea.addEventListener("drop", importController.handleFileDrop);
  elements.sidebarOpen.addEventListener("click", openSidebar);
  elements.sidebarClose.addEventListener("click", closeSidebar);
  elements.sidebarBackdrop.addEventListener("click", closeSidebar);
  elements.deckTab.addEventListener("click", () => setSidebarTab("deck"));
  elements.cardTab.addEventListener("click", () => setSidebarTab("card"));
  elements.labelFilterList.addEventListener("click", viewInteractionController.handleLabelFilterClick);
  elements.settingsOpen.addEventListener("click", openSettingsModal);
  elements.settingsClose.addEventListener("click", closeSettingsModal);
  elements.displayModeOpen.addEventListener("click", importController.openDisplayModeSettings);
  elements.displayModeClose.addEventListener("click", closeDisplayModeModal);
  document.querySelector("[data-close-display-mode]").addEventListener("click", closeDisplayModeModal);
  elements.displayModeInputs.forEach((input) => {
    input.addEventListener("change", importController.handleDisplayModeChange);
  });
  elements.savedList.addEventListener("click", deckController.handleDeckClick);
  elements.exportFormatClose.addEventListener("click", deckController.closeExportFormatModal);
  document.querySelector("[data-close-export-format]").addEventListener("click", deckController.closeExportFormatModal);
  elements.exportJson.addEventListener("click", deckController.exportDeckAsJson);
  elements.exportExcel.addEventListener("click", deckController.exportDeckAsExcel);
  elements.newDeck.addEventListener("click", deckController.createDeck);
  elements.importSavedInput.addEventListener("change", deckController.importDecks);
  elements.importOpen.addEventListener("click", importController.openImportSettings);
  elements.importClose.addEventListener("click", importController.cancelImportSettings);
  elements.importCancel.addEventListener("click", importController.cancelImportSettings);
  elements.importApply.addEventListener("click", importController.applyImportSettings);
  elements.fileInput.addEventListener("change", importController.handleFileChange);
  elements.sheetSelect.addEventListener("change", importController.handleSheetChange);
  elements.headerRowSelect.addEventListener("change", importController.handleHeaderRowChange);
  elements.headerSettingsOpen.addEventListener("click", importController.openHeaderSettings);
  elements.headerSettingsClose.addEventListener("click", importController.closeHeaderSettings);
  elements.headerSettingsDone.addEventListener("click", importController.closeHeaderSettings);
  document.querySelector("[data-close-header-settings]").addEventListener("click", importController.closeHeaderSettings);
  elements.headerAddColumn.addEventListener("click", importController.addHeaderColumn);
  elements.headerSettingsList.addEventListener("click", importController.handleHeaderSettingsAction);
  elements.headerSettingsList.addEventListener("pointerdown", importController.handleHeaderReorderPointerDown);
  elements.titleColumnSelect.addEventListener("change", importController.handleTitleColumnChange);
  elements.subtitleColumn1Select.addEventListener("change", importController.handleSubtitleColumn1Change);
  elements.subtitleColumn2Select.addEventListener("change", importController.handleSubtitleColumn2Change);
  elements.subtitleColumn3Select.addEventListener("change", importController.handleSubtitleColumn3Change);
  elements.subtitleColumn4Select.addEventListener("change", importController.handleSubtitleColumn4Change);
  elements.addTitleColumn.addEventListener("click", importController.addTitleColumn);
  elements.titleColumnsList.addEventListener("click", importController.removeTitleColumn);
  elements.displayColumnsList.addEventListener("change", importController.handleDisplayColumnsChange);
  elements.displayColumnsOpen.addEventListener("click", importController.openDisplayColumnsSettings);
  elements.displayColumnsAll.addEventListener("change", importController.handleDisplayColumnsAllChange);
  elements.displayColumnsConfirm.addEventListener("click", importController.applyDisplayColumnsSettings);
  elements.displayColumnsCancel.addEventListener("click", importController.cancelDisplayColumnsSettings);
  elements.filterOpen.addEventListener("click", filterSortController.toggleFilterSettings);
  elements.filterClose.addEventListener("click", filterSortController.cancelFilterSettings);
  elements.filterCancel.addEventListener("click", filterSortController.cancelFilterSettings);
  elements.filterApply.addEventListener("click", filterSortController.applyFilterSettings);
  document.querySelector("[data-close-filter]").addEventListener("click", filterSortController.cancelFilterSettings);
  elements.addFilter.addEventListener("click", filterSortController.addFilter);
  elements.filterList.addEventListener("change", filterSortController.handleFilterChange);
  elements.filterList.addEventListener("click", filterSortController.handleFilterRemove);
  elements.sortOpen.addEventListener("click", filterSortController.toggleSortSettings);
  elements.sortClose.addEventListener("click", filterSortController.cancelSortSettings);
  elements.sortCancel.addEventListener("click", filterSortController.cancelSortSettings);
  elements.sortApply.addEventListener("click", filterSortController.applySortSettings);
  document.querySelector("[data-close-sort]").addEventListener("click", filterSortController.cancelSortSettings);
  elements.addSort.addEventListener("click", filterSortController.addSort);
  elements.sortList.addEventListener("change", filterSortController.handleSortColumnChange);
  elements.sortList.addEventListener("change", filterSortController.handleSortDirectionChange);
  elements.sortList.addEventListener("click", filterSortController.handleSortRemove);
  elements.floatingSearchButton.addEventListener("click", toggleSearchPanel);
  elements.floatingSearchClose.addEventListener("click", closeSearchPanel);
  elements.searchColumnSelect.addEventListener("change", viewInteractionController.handleSearchColumnChange);
  elements.searchInput.addEventListener("input", viewInteractionController.handleSearchInput);
  elements.pageFirst.addEventListener("click", cardListController.goToFirstPage);
  elements.pagePrev.addEventListener("click", cardListController.goToPreviousPageGroup);
  elements.pageNext.addEventListener("click", cardListController.goToNextPageGroup);
  elements.pageLast.addEventListener("click", cardListController.goToLastPage);
  elements.pageNumbers.addEventListener("click", cardListController.handlePageNumberClick);
  elements.cardList.addEventListener("click", cardListController.handleCardClick);
  elements.cardList.addEventListener("keydown", cardListController.handleCardKeydown);
  elements.labelPaletteList.addEventListener("click", viewInteractionController.handleLabelPaletteClick);
  elements.detailModal.addEventListener("click", viewInteractionController.handleDetailCopyClick);
  elements.detailModal.addEventListener("touchstart", handleDetailTouchStart, { passive: true });
  elements.detailModal.addEventListener("touchmove", handleDetailTouchMove);
  elements.detailModal.addEventListener("touchend", handleDetailTouchEnd);
  elements.detailEdit.addEventListener("click", enterDetailEditMode);
  elements.detailEditCancel.addEventListener("click", cancelDetailEditMode);
  elements.detailEditSave.addEventListener("click", async () => {
    const saved = saveDetailEdits();
    if (!saved) return;

    await deckController.autoSaveActiveDeck();
    render();
  });
  elements.modalClose.addEventListener("click", closeDetailModal);
  document.querySelector("[data-close-modal]").addEventListener("click", closeDetailModal);
  elements.displayColumnsClose.addEventListener("click", closeDisplayColumnsModal);
  document
    .querySelector("[data-close-display-columns]")
    .addEventListener("click", closeDisplayColumnsModal);
  document.addEventListener("click", deckController.closeDeckMenuOnOutsideClick);
  document.addEventListener("click", viewInteractionController.closeLabelPaletteOnOutsideClick);
  document.addEventListener("keydown", (event) => {
    if (!elements.detailModal.hidden && event.key === "ArrowLeft") {
      showPreviousDetailCard();
      return;
    }

    if (!elements.detailModal.hidden && event.key === "ArrowRight") {
      showNextDetailCard();
      return;
    }

    if (event.key === "Escape") {
      // Escape는 현재 열릴 수 있는 모든 임시 UI를 닫는 공통 취소 동작입니다.
      closeDetailModal();
      closeDisplayColumnsModal();
      closeDisplayModeModal();
      filterSortController.cancelFilterSettings();
      closeSelectModal();
      closeSettingsModal();
      filterSortController.cancelSortSettings();
      deckController.closeDeckMenus();
      closeLabelPalette();
      closeSearchPanel();
      closeHeaderSettingsModal();
      importController.cancelImportSettings();
      deckController.closeExportFormatModal();
      closeSidebar();
    }
  });
}

/**
 * [함수] handleMainFileDragOver
 * [역할] 메인 화면에서 파일 드롭이 가능하도록 브라우저 기본 동작을 막는다.
 * [원리] dragover에서 preventDefault를 호출해야 이후 drop 이벤트가 정상 발생한다.
 */
function handleMainFileDragOver(event) {
  if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

/* ==========================================================================
   3) 전체 화면 렌더링
   ========================================================================== */
/**
 * [함수] render
 * [역할] 현재 state를 기준으로 화면 전체를 다시 그린다.
 * [원리] 가져오기, 덱, 설정, 필터/정렬, 검색, 카드 목록 렌더러를 순서대로 호출한다.
 */
function render() {
  renderControls(state);
  renderImportButton(state, deckController.hasActiveDeck());
  deckController.refreshDeckList();
  renderDisplayModeControl(state);
  renderFilterSortControls(state);
  renderSearchControl(state);
  renderLabelFilters(state);
  cardListController.renderCardList();
}

init();
