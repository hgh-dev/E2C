import { getVisibleRows } from "./dataProcessor.js";
import { getStoredDecks, setStoredDecks } from "./deckStorage.js";
import { matrixToTable, readFileAsWorkbook, sheetToMatrix } from "./excelReader.js";
import { state } from "./state.js";
import {
  applyDefaultColumns,
  closeDetailModal,
  closeDisplayColumnsModal,
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
  getAllSelectableDisplayColumns,
  getDisplayColumnCheckboxValues,
  getSelectedDisplayColumns,
  getElements,
  openDisplayColumnsModal,
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
  setDisplayColumnCheckboxValues,
  setSidebarTab,
  setupSelectModalTriggers,
  showMessage,
  syncDisplayColumnsModalSummary,
  toggleFilterPanel,
  toggleSortPanel,
  toggleSearchPanel,
} from "./ui.js";

const INITIAL_RENDER_COUNT = 40;
const RENDER_BATCH_SIZE = 30;
const PAGE_SIZE = 40;

const elements = getElements();
let visibleRows = [];
let renderedRowCount = INITIAL_RENDER_COUNT;
let draftState = cloneState(state);
let activeDeckId = "";
let pendingDisplayColumns = [];
let currentPage = 1;
let filterSnapshot = null;
let sortSnapshot = null;

async function init() {
  bindEvents();
  setupLoadMoreObserver();
  renderControls(state);
  renderImportButton(state, Boolean(activeDeckId));
  await refreshDeckList();
  renderDisplayModeControl(state);
  renderFilterSortControls(state);
  renderSearchControl(state);
  renderLabelFilters(state);
  showMessage("사이드바에서 덱을 만들거나 선택하세요.");
}

function bindEvents() {
  setupSelectModalTriggers();
  elements.sidebarOpen.addEventListener("click", openSidebar);
  elements.sidebarClose.addEventListener("click", closeSidebar);
  elements.sidebarBackdrop.addEventListener("click", closeSidebar);
  elements.deckTab.addEventListener("click", () => setSidebarTab("deck"));
  elements.cardTab.addEventListener("click", () => setSidebarTab("card"));
  elements.labelFilterList.addEventListener("click", handleLabelFilterClick);
  elements.settingsOpen.addEventListener("click", openSettingsModal);
  elements.settingsClose.addEventListener("click", closeSettingsModal);
  elements.displayModeOpen.addEventListener("click", openDisplayModeModal);
  elements.displayModeClose.addEventListener("click", closeDisplayModeModal);
  document.querySelector("[data-close-display-mode]").addEventListener("click", closeDisplayModeModal);
  elements.displayModeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      state.displayMode = event.target.value;
      currentPage = 1;
      closeDisplayModeModal();
      render();
    });
  });
  elements.savedList.addEventListener("click", handleDeckClick);
  elements.newDeck.addEventListener("click", createDeck);
  elements.importSavedInput.addEventListener("change", importDecks);
  elements.saveCurrent.addEventListener("click", saveCurrentDeck);
  elements.importOpen.addEventListener("click", openImportSettings);
  elements.importClose.addEventListener("click", cancelImportSettings);
  elements.importCancel.addEventListener("click", cancelImportSettings);
  elements.importApply.addEventListener("click", applyImportSettings);
  elements.fileInput.addEventListener("change", handleFileChange);
  elements.sheetSelect.addEventListener("change", handleSheetChange);
  elements.headerRowSelect.addEventListener("change", (event) => {
    draftState.headerRowIndex = Number(event.target.value);
    applyTableFromHeaderRow(draftState);
  });
  elements.titleColumnSelect.addEventListener("change", (event) => {
    draftState.titleColumn = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderControls(draftState);
  });
  elements.subtitleColumn1Select.addEventListener("change", (event) => {
    draftState.subtitleColumn1 = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderControls(draftState);
  });
  elements.subtitleColumn2Select.addEventListener("change", (event) => {
    draftState.subtitleColumn2 = event.target.value;
    syncDisplayColumnsWithTitleColumns();
    renderControls(draftState);
  });
  elements.displayColumnsList.addEventListener("change", handleDisplayColumnsChange);
  elements.displayColumnsOpen.addEventListener("click", openDisplayColumnsSettings);
  elements.displayColumnsAll.addEventListener("change", (event) => {
    const columns = event.target.checked ? getAllSelectableDisplayColumns(draftState) : [];
    setDisplayColumnCheckboxValues(columns);
    pendingDisplayColumns = getDisplayColumnCheckboxValues();
  });
  elements.displayColumnsConfirm.addEventListener("click", applyDisplayColumnsSettings);
  elements.displayColumnsCancel.addEventListener("click", cancelDisplayColumnsSettings);
  elements.filterOpen.addEventListener("click", toggleFilterSettings);
  elements.filterClose.addEventListener("click", cancelFilterSettings);
  elements.filterCancel.addEventListener("click", cancelFilterSettings);
  elements.filterApply.addEventListener("click", applyFilterSettings);
  document.querySelector("[data-close-filter]").addEventListener("click", cancelFilterSettings);
  elements.addFilter.addEventListener("click", addFilter);
  elements.filterList.addEventListener("change", handleFilterChange);
  elements.filterList.addEventListener("click", handleFilterRemove);
  elements.sortOpen.addEventListener("click", toggleSortSettings);
  elements.sortClose.addEventListener("click", cancelSortSettings);
  elements.sortCancel.addEventListener("click", cancelSortSettings);
  elements.sortApply.addEventListener("click", applySortSettings);
  document.querySelector("[data-close-sort]").addEventListener("click", cancelSortSettings);
  elements.sortColumnSelect.addEventListener("change", (event) => {
    state.sortColumn = event.target.value;
    if (state.sortDirection === "random") {
      state.randomSortSeed = createRandomSortSeed();
    }
    render();
  });
  elements.sortDirectionSelect.addEventListener("change", (event) => {
    state.sortDirection = event.target.value;
    state.randomSortSeed = event.target.value === "random" ? createRandomSortSeed() : "";
    render();
  });
  elements.floatingSearchButton.addEventListener("click", toggleSearchPanel);
  elements.floatingSearchClose.addEventListener("click", closeSearchPanel);
  elements.searchColumnSelect.addEventListener("change", (event) => {
    state.searchColumn = event.target.value;
    currentPage = 1;
    render();
  });
  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    currentPage = 1;
    render();
  });
  elements.pageFirst.addEventListener("click", () => {
    currentPage = 1;
    render();
  });
  elements.pagePrev.addEventListener("click", () => {
    currentPage = Math.max(1, getPageGroupStart(currentPage) - 5);
    render();
  });
  elements.pageNext.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    currentPage = Math.min(totalPages, getPageGroupStart(currentPage) + 5);
    render();
  });
  elements.pageLast.addEventListener("click", () => {
    currentPage = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    render();
  });
  elements.pageNumbers.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) return;

    currentPage = Number(button.dataset.page);
    render();
  });
  elements.cardList.addEventListener("click", handleCardClick);
  elements.cardList.addEventListener("keydown", handleCardKeydown);
  elements.labelPaletteList.addEventListener("click", handleLabelPaletteClick);
  elements.detailModal.addEventListener("click", handleDetailCopyClick);
  elements.modalClose.addEventListener("click", closeDetailModal);
  document.querySelector("[data-close-modal]").addEventListener("click", closeDetailModal);
  elements.displayColumnsClose.addEventListener("click", closeDisplayColumnsModal);
  document
    .querySelector("[data-close-display-columns]")
    .addEventListener("click", closeDisplayColumnsModal);
  document.addEventListener("click", closeDeckMenuOnOutsideClick);
  document.addEventListener("click", closeLabelPaletteOnOutsideClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetailModal();
      closeDisplayColumnsModal();
      closeDisplayModeModal();
      cancelFilterSettings();
      closeSelectModal();
      closeSettingsModal();
      cancelSortSettings();
      closeDeckMenus();
      closeLabelPalette();
      closeSearchPanel();
      cancelImportSettings();
      closeSidebar();
    }
  });
}

function closeDeckMenuOnOutsideClick(event) {
  if (event.target.closest("[data-deck-menu]") || event.target.closest("[data-deck-menu-panel]")) {
    return;
  }

  closeDeckMenus();
}

function closeLabelPaletteOnOutsideClick(event) {
  if (event.target.closest("[data-label-button]") || event.target.closest("#labelPalette")) {
    return;
  }

  closeLabelPalette();
}

function toggleFilterSettings() {
  if (!elements.filterPanel.hidden) {
    cancelFilterSettings();
    return;
  }

  filterSnapshot = getNormalizedFilters(state);
  toggleFilterPanel();
}

function applyFilterSettings() {
  filterSnapshot = null;
  closeFilterPanel();
}

function cancelFilterSettings() {
  if (filterSnapshot) {
    state.filters = filterSnapshot;
    syncLegacyFilterState();
    currentPage = 1;
    filterSnapshot = null;
    closeFilterPanel();
    render();
    return;
  }

  closeFilterPanel();
}

function toggleSortSettings() {
  if (!elements.sortPanel.hidden) {
    cancelSortSettings();
    return;
  }

  sortSnapshot = {
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    randomSortSeed: state.randomSortSeed,
  };
  toggleSortPanel();
}

function applySortSettings() {
  sortSnapshot = null;
  closeSortPanel();
}

function cancelSortSettings() {
  if (sortSnapshot) {
    state.sortColumn = sortSnapshot.sortColumn;
    state.sortDirection = sortSnapshot.sortDirection;
    state.randomSortSeed = sortSnapshot.randomSortSeed;
    sortSnapshot = null;
    closeSortPanel();
    render();
    return;
  }

  closeSortPanel();
}

function addFilter() {
  state.filters = [...getNormalizedFilters(state), { column: "", value: "", values: [] }];
  currentPage = 1;
  render();
}

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
  syncLegacyFilterState();
  currentPage = 1;
  render();
}

function handleFilterRemove(event) {
  const button = event.target.closest("[data-filter-remove]");
  if (!button) return;

  const index = Number(button.dataset.filterRemove);
  const filters = getNormalizedFilters(state).filter((_, filterIndex) => filterIndex !== index);
  state.filters = filters;
  syncLegacyFilterState();
  currentPage = 1;
  render();
}

function closeDeckMenus() {
  elements.savedList.querySelectorAll("[data-deck-menu-panel]").forEach((panel) => {
    panel.hidden = true;
  });
}

async function createDeck() {
  const name = window.prompt("새 덱 이름을 입력하세요.", "새 덱");
  if (!name?.trim()) return;

  const now = new Date().toISOString();
  const deck = {
    id: `${Date.now()}`,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    data: null,
  };
  const decks = [deck, ...(await getDecks())];
  activeDeckId = deck.id;
  await saveDecks(decks);
  copyState(createEmptyState(), state);
  draftState = cloneState(state);
  renderDeckList(decks, activeDeckId);
  closeSidebar();
  render();
}

async function saveCurrentDeck() {
  if (!activeDeckId || state.columns.length === 0) return;

  const decks = await getDecks();
  const deckIndex = decks.findIndex((deck) => deck.id === activeDeckId);
  if (deckIndex < 0) return;

  decks[deckIndex] = {
    ...decks[deckIndex],
    name: decks[deckIndex].name || state.fileName || "이름 없는 덱",
    updatedAt: new Date().toISOString(),
    data: serializeState(state),
  };

  try {
    await saveDecks(decks);
    renderDeckList(await getDecks(), activeDeckId);
    openSidebar();
  } catch {
    showMessage("브라우저 저장소에 저장하지 못했습니다.");
  }
}

async function persistActiveDeckData() {
  if (!activeDeckId || state.columns.length === 0) return;

  const decks = await getDecks();
  const deckIndex = decks.findIndex((deck) => deck.id === activeDeckId);
  if (deckIndex < 0) return;

  decks[deckIndex] = {
    ...decks[deckIndex],
    updatedAt: new Date().toISOString(),
    data: serializeState(state),
  };
  await saveDecks(decks);
}

async function handleDeckClick(event) {
  const menuButton = event.target.closest("[data-deck-menu]");
  if (menuButton) {
    toggleDeckMenu(menuButton.dataset.deckMenu);
    return;
  }

  const actionButton = event.target.closest("[data-deck-action]");
  if (actionButton) {
    await handleDeckAction(actionButton.dataset.deckAction, actionButton.dataset.deckId);
    return;
  }

  const deckButton = event.target.closest("[data-deck-select]");
  if (!deckButton) return;

  const deck = (await getDecks()).find((deckItem) => deckItem.id === deckButton.dataset.deckSelect);
  if (!deck) return;

  activeDeckId = deck.id;
  copyState(deck.data ? deserializeState(deck.data) : createEmptyState(), state);
  draftState = cloneState(state);
  closeSidebar();
  render();
}

function toggleDeckMenu(deckId) {
  elements.savedList.querySelectorAll("[data-deck-menu-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.deckMenuPanel === deckId ? !panel.hidden : true;
  });
}

async function handleDeckAction(action, deckId) {
  closeDeckMenus();

  if (action === "rename") {
    await renameDeck(deckId);
    return;
  }

  if (action === "export") {
    await exportDeck(deckId);
    return;
  }

  if (action === "delete") {
    await deleteDeck(deckId);
  }
}

async function renameDeck(deckId) {
  const decks = await getDecks();
  const deck = decks.find((deckItem) => deckItem.id === deckId);
  if (!deck) return;

  const nextName = window.prompt("덱 이름을 입력하세요.", deck.name);
  if (!nextName?.trim()) return;

  deck.name = nextName.trim();
  deck.updatedAt = new Date().toISOString();
  await saveDecks(decks);
  renderDeckList(decks, activeDeckId);
}

async function exportDeck(deckId) {
  const deck = (await getDecks()).find((deckItem) => deckItem.id === deckId);
  if (!deck) return;

  const payload = {
    app: "E2C",
    type: "decks",
    version: 2,
    exportedAt: new Date().toISOString(),
    decks: [deck],
  };
  downloadJson(payload, `e2c-deck-${sanitizeFileName(deck.name)}-${new Date().toISOString().slice(0, 10)}.json`);
}

async function deleteDeck(deckId) {
  const decks = await getDecks();
  const deck = decks.find((deckItem) => deckItem.id === deckId);
  if (!deck) return;

  if (!window.confirm(`'${deck.name}' 덱을 삭제할까요?`)) return;

  const nextDecks = decks.filter((deckItem) => deckItem.id !== deckId);
  await saveDecks(nextDecks);

  if (activeDeckId === deckId) {
    activeDeckId = "";
    copyState(createEmptyState(), state);
    draftState = cloneState(state);
    render();
    return;
  }

  renderDeckList(nextDecks, activeDeckId);
}

function downloadJson(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "deck";
}

async function importDecks(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const importedDecks = normalizeImportedDecks(payload);
    const mergedDecks = mergeDecks(importedDecks, await getDecks());
    await saveDecks(mergedDecks);
    renderDeckList(mergedDecks, activeDeckId);
    event.target.value = "";
  } catch {
    showMessage("JSON 파일을 불러오지 못했습니다.");
  }
}

function handleDisplayColumnsChange() {
  pendingDisplayColumns = getDisplayColumnCheckboxValues();
  syncDisplayColumnsModalSummary();
}

function syncDisplayColumnsWithTitleColumns() {
  draftState.displayColumns = getSelectedDisplayColumns(draftState);
}

function openDisplayColumnsSettings() {
  pendingDisplayColumns = getSelectedDisplayColumns(draftState);
  renderControls(draftState);
  setDisplayColumnCheckboxValues(pendingDisplayColumns);
  openDisplayColumnsModal();
}

function applyDisplayColumnsSettings() {
  draftState.displayColumns = [...pendingDisplayColumns];
  renderControls(draftState);
  closeDisplayColumnsModal();
}

function cancelDisplayColumnsSettings() {
  pendingDisplayColumns = getSelectedDisplayColumns(draftState);
  renderControls(draftState);
  closeDisplayColumnsModal();
}

function openImportSettings() {
  if (!activeDeckId) {
    openSidebar();
    return;
  }

  draftState = cloneState(state);
  renderControls(draftState);
  openImportModal();
}

function cancelImportSettings() {
  draftState = cloneState(state);
  renderControls(state);
  closeDisplayColumnsModal();
  closeImportModal();
}

function applyImportSettings() {
  copyState(draftState, state);
  closeDisplayColumnsModal();
  closeImportModal();
  render();
}

function setupLoadMoreObserver() {
  if (!("IntersectionObserver" in window)) {
    window.addEventListener("scroll", handleScrollFallback, { passive: true });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMoreCards();
      }
    },
    { rootMargin: "360px 0px" },
  );
  observer.observe(elements.loadMoreSentinel);
}

async function handleFileChange(event) {
  const file = event.target.files[0];

  if (!file) {
    draftState = createEmptyState();
    renderControls(draftState);
    return;
  }

  try {
    const workbook = await readFileAsWorkbook(file);
    draftState = createEmptyState();
    draftState.workbook = workbook;
    draftState.fileName = file.name;
    draftState.sheetNames = workbook.SheetNames;
    draftState.activeSheetName = workbook.SheetNames[0] || "";
    loadActiveSheet(draftState);
  } catch (error) {
    draftState = createEmptyState();
    renderControls(draftState);
    if (error.message === "UNSUPPORTED_FILE") {
      showMessage("xlsx, xls, csv 파일만 지원합니다.");
      return;
    }
    if (error.message === "SHEETJS_NOT_LOADED") {
      showMessage("엑셀 파서가 로드되지 않았습니다. 네트워크 연결을 확인하세요.");
      return;
    }
    showMessage("파일을 읽는 중 문제가 발생했습니다.");
  }
}

function handleSheetChange(event) {
  draftState.activeSheetName = event.target.value;
  loadActiveSheet(draftState);
}

function loadActiveSheet(targetState) {
  if (!targetState.workbook) {
    applyTableFromHeaderRow(targetState);
    return;
  }

  targetState.sheetMatrix = sheetToMatrix(targetState.workbook, targetState.activeSheetName);
  targetState.headerRowIndex = findFirstDataRowIndex(targetState.sheetMatrix);
  applyTableFromHeaderRow(targetState);
}

function applyTableFromHeaderRow(targetState) {
  const table = matrixToTable(targetState.sheetMatrix, targetState.headerRowIndex);
  targetState.columns = table.columns;
  targetState.rows = table.rows;
  targetState.labelMap = {};
  targetState.labelFilter = "";
  targetState.filters = [{ column: "", value: "", values: [] }];
  targetState.filterColumn = "";
  targetState.filterValue = "";
  applyDefaultColumns(targetState);
  renderControls(targetState);
}

function findFirstDataRowIndex(matrix) {
  const firstNonEmptyRowIndex = matrix.findIndex((row) =>
    row.some((cell) => String(cell ?? "").trim().length > 0),
  );
  return Math.max(0, firstNonEmptyRowIndex);
}

function render() {
  renderControls(state);
  renderImportButton(state, Boolean(activeDeckId));
  refreshDeckList();
  renderDisplayModeControl(state);
  renderFilterSortControls(state);
  renderSearchControl(state);
  renderLabelFilters(state);
  if (!activeDeckId) {
    visibleRows = [];
    renderedRowCount = 0;
    renderPageControls(state, 0, 1, PAGE_SIZE);
    showMessage("사이드바에서 덱을 만들거나 선택하세요.");
    return;
  }

  if (state.columns.length === 0) {
    visibleRows = [];
    renderedRowCount = 0;
    renderPageControls(state, 0, 1, PAGE_SIZE);
    showMessage("파일을 가져와 덱에 저장하세요.");
    return;
  }

  visibleRows = getVisibleRows(state);
  if (state.displayMode === "page") {
    const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = visibleRows.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
    renderedRowCount = pageRows.length;
    renderCards(state, pageRows, pageRows.length, pageStartIndex, visibleRows.length);
    renderPageControls(state, visibleRows.length, currentPage, PAGE_SIZE);
    return;
  }

  currentPage = 1;
  renderedRowCount = Math.min(INITIAL_RENDER_COUNT, visibleRows.length);
  renderCards(state, visibleRows, renderedRowCount);
  renderPageControls(state, visibleRows.length, currentPage, PAGE_SIZE);
}

function loadMoreCards() {
  if (state.displayMode === "page") return;
  if (renderedRowCount >= visibleRows.length) return;

  renderedRowCount = Math.min(renderedRowCount + RENDER_BATCH_SIZE, visibleRows.length);
  renderCards(state, visibleRows, renderedRowCount);
}

function handleScrollFallback() {
  if (state.displayMode === "page") return;
  const distanceToBottom =
    document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  if (distanceToBottom < 420) {
    loadMoreCards();
  }
}

function handleCardClick(event) {
  const labelButton = event.target.closest("[data-label-button]");
  if (labelButton) {
    event.stopPropagation();
    const rowKey = labelButton.dataset.rowKey;
    openLabelPalette(labelButton, rowKey, state.labelMap?.[rowKey] || "");
    return;
  }

  const card = event.target.closest(".data-card");
  if (!card) return;

  const rowIndex = Number(card.dataset.rowIndex);
  const row = visibleRows[rowIndex];
  if (row) openDetailModal(row, state, rowIndex);
}

function handleCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("[data-label-button]")) return;

  const card = event.target.closest(".data-card");
  if (!card) return;

  event.preventDefault();
  const rowIndex = Number(card.dataset.rowIndex);
  const row = visibleRows[rowIndex];
  if (row) openDetailModal(row, state, rowIndex);
}

async function handleLabelPaletteClick(event) {
  const button = event.target.closest("[data-label-value]");
  if (!button) return;

  const rowKey = elements.labelPalette.dataset.rowKey;
  if (rowKey === "") return;

  const nextLabelMap = { ...(state.labelMap || {}) };
  if (nextLabelMap[rowKey] === button.dataset.labelValue) {
    delete nextLabelMap[rowKey];
  } else {
    nextLabelMap[rowKey] = button.dataset.labelValue;
  }
  state.labelMap = nextLabelMap;
  closeLabelPalette();
  await persistActiveDeckData();
  render();
}

function handleLabelFilterClick(event) {
  const button = event.target.closest("[data-label-filter]");
  if (!button) return;

  const nextFilter = button.dataset.labelFilter;
  state.labelFilter = state.labelFilter === nextFilter ? "" : nextFilter;
  currentPage = 1;
  closeSidebar();
  render();
}

function handleDetailCopyClick(event) {
  const copyTarget = event.target.closest("[data-copy-value]");
  if (!copyTarget) return;

  copyTextValue(copyTarget.dataset.copyValue);
}

function getPageGroupStart(page) {
  return Math.floor((page - 1) / 5) * 5 + 1;
}

function createRandomSortSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

init();

function createEmptyState() {
  return {
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
}

function cloneState(source) {
  return {
    workbook: source.workbook,
    fileName: source.fileName,
    sheetNames: [...source.sheetNames],
    activeSheetName: source.activeSheetName,
    sheetMatrix: source.sheetMatrix.map((row) => [...row]),
    headerRowIndex: source.headerRowIndex,
    columns: [...source.columns],
    rows: source.rows.map((row) => ({ ...row })),
    titleColumn: source.titleColumn,
    subtitleColumn1: source.subtitleColumn1,
    subtitleColumn2: source.subtitleColumn2,
    displayColumns: [...source.displayColumns],
    filterColumn: source.filterColumn,
    filterValue: source.filterValue,
    filters: getNormalizedFilters(source),
    sortColumn: source.sortColumn,
    sortDirection: source.sortDirection,
    randomSortSeed: source.randomSortSeed || "",
    searchColumn: source.searchColumn || "",
    searchTerm: source.searchTerm,
    displayMode: source.displayMode || "scroll",
    labelMap: { ...(source.labelMap || {}) },
    labelFilter: source.labelFilter || "",
  };
}

function copyState(source, target) {
  target.workbook = source.workbook;
  target.fileName = source.fileName;
  target.sheetNames = [...source.sheetNames];
  target.activeSheetName = source.activeSheetName;
  target.sheetMatrix = source.sheetMatrix.map((row) => [...row]);
  target.headerRowIndex = source.headerRowIndex;
  target.columns = [...source.columns];
  target.rows = source.rows.map((row) => ({ ...row }));
  target.titleColumn = source.titleColumn;
  target.subtitleColumn1 = source.subtitleColumn1;
  target.subtitleColumn2 = source.subtitleColumn2;
  target.displayColumns = [...source.displayColumns];
  target.filterColumn = source.filterColumn;
  target.filterValue = source.filterValue;
  target.filters = getNormalizedFilters(source);
  target.sortColumn = source.sortColumn;
  target.sortDirection = source.sortDirection;
  target.randomSortSeed = source.randomSortSeed || "";
  target.searchColumn = source.searchColumn || "";
  target.searchTerm = source.searchTerm;
  target.displayMode = source.displayMode || "scroll";
  target.labelMap = { ...(source.labelMap || {}) };
  target.labelFilter = source.labelFilter || "";
}

async function getDecks() {
  const decks = await getStoredDecks();
  return normalizeImportedDecks({ decks });
}

async function saveDecks(decks) {
  await setStoredDecks(decks);
}

async function refreshDeckList() {
  renderDeckList(await getDecks(), activeDeckId);
}

function normalizeImportedDecks(payload) {
  const decks = Array.isArray(payload) ? payload : payload?.decks || payload?.items;
  if (!Array.isArray(decks)) {
    throw new Error("INVALID_BACKUP");
  }

  return decks
    .filter((deck) => deck?.data === null || deck?.data?.columns)
    .map((deck, index) => {
      const data = deck.data ? deserializeState(deck.data) : null;
      const now = new Date().toISOString();
      return {
        id: deck.id ? String(deck.id) : `${Date.now()}-${index}`,
        name: deck.name || data?.fileName || "가져온 덱",
        createdAt: deck.createdAt || deck.savedAt || now,
        updatedAt: deck.updatedAt || deck.savedAt || now,
        data: data ? serializeState(data) : null,
      };
    });
}

function mergeDecks(importedDecks, currentDecks) {
  const usedIds = new Set(currentDecks.map((deck) => deck.id));
  const normalizedImportedDecks = importedDecks.map((deck) => {
    if (!usedIds.has(deck.id)) {
      usedIds.add(deck.id);
      return deck;
    }

    const nextDeck = { ...deck, id: `${deck.id}-${Date.now()}` };
    usedIds.add(nextDeck.id);
    return nextDeck;
  });

  return [...normalizedImportedDecks, ...currentDecks];
}

function serializeState(source) {
  return {
    fileName: source.fileName,
    sheetNames: [source.activeSheetName || source.sheetNames[0] || "저장된 시트"],
    activeSheetName: source.activeSheetName || source.sheetNames[0] || "저장된 시트",
    sheetMatrix: source.sheetMatrix,
    headerRowIndex: source.headerRowIndex,
    columns: source.columns,
    rows: source.rows,
    titleColumn: source.titleColumn,
    subtitleColumn1: source.subtitleColumn1,
    subtitleColumn2: source.subtitleColumn2,
    displayColumns: source.displayColumns,
    filterColumn: source.filterColumn,
    filterValue: source.filterValue,
    filters: getNormalizedFilters(source),
    sortColumn: source.sortColumn,
    sortDirection: source.sortDirection,
    randomSortSeed: source.randomSortSeed || "",
    searchColumn: source.searchColumn || "",
    searchTerm: source.searchTerm,
    displayMode: source.displayMode || "scroll",
    labelMap: source.labelMap || {},
    labelFilter: source.labelFilter || "",
  };
}

function deserializeState(data) {
  return {
    ...createEmptyState(),
    ...data,
    workbook: null,
    sheetNames: data.sheetNames?.length ? data.sheetNames : [data.activeSheetName || "저장된 시트"],
    sheetMatrix: data.sheetMatrix || [],
    columns: data.columns || [],
    rows: data.rows || [],
    displayColumns: data.displayColumns || [],
    filters: normalizeSerializedFilters(data),
    labelMap: data.labelMap || {},
    labelFilter: data.labelFilter || "",
  };
}

function getNormalizedFilters(source) {
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

function syncLegacyFilterState() {
  const firstFilter = getNormalizedFilters(state)[0] || { column: "", value: "", values: [] };
  state.filterColumn = firstFilter.column;
  state.filterValue = firstFilter.values[0] || firstFilter.value || "";
}

function normalizeFilterValues(filter) {
  if (Array.isArray(filter.values)) {
    return filter.values.filter(Boolean);
  }

  return filter.value ? [filter.value] : [];
}
