import {
  escapeHTML,
  getDisplayTitle,
  getPreviewColumns,
  normalizeValue,
  recommendTitleColumn,
} from "./utils.js";

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
  savedList: document.querySelector("#savedList"),
  newDeck: document.querySelector("#newDeck"),
  importSavedInput: document.querySelector("#importSavedInput"),
  saveCurrent: document.querySelector("#saveCurrent"),
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
  sortColumnSelect: document.querySelector("#sortColumnSelect"),
  sortDirectionSelect: document.querySelector("#sortDirectionSelect"),
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

let activeSelect = null;
let activeSelectOptions = [];
let activeSelectSearchable = false;
let pendingSelectValues = [];
let copyToastTimer = null;
const EMPTY_FILTER_VALUE = "__E2C_EMPTY_VALUE__";

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
  upload: `
    <path d="M12 3v12"></path>
    <path d="m7 8 5-5 5 5"></path>
    <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"></path>
  `,
  edit: `
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
  `,
};

function getSelectModalTargets() {
  return [
    elements.sheetSelect,
    elements.headerRowSelect,
    elements.titleColumnSelect,
    elements.subtitleColumn1Select,
    elements.subtitleColumn2Select,
    elements.sortColumnSelect,
    elements.sortDirectionSelect,
    elements.searchColumnSelect,
  ].filter(Boolean);
}

export function getElements() {
  return elements;
}

export function setupSelectModalTriggers() {
  getSelectModalTargets().forEach((control) => {
    control.addEventListener("click", (event) => {
      if (control.disabled) return;

      event.preventDefault();
      event.stopPropagation();
      openSelectModal(control);
    });

    control.addEventListener("keydown", (event) => {
      if (control.disabled || !["Enter", " ", "ArrowDown"].includes(event.key)) return;

      event.preventDefault();
      openSelectModal(control);
    });
  });

  elements.selectModalClose.addEventListener("click", closeSelectModal);
  elements.selectModalCancel.addEventListener("click", closeSelectModal);
  elements.selectModalApply.addEventListener("click", applyMultiSelectModal);
  document.querySelector("[data-close-select-modal]").addEventListener("click", closeSelectModal);
  elements.selectModalList.addEventListener("click", handleSelectModalChoice);
  elements.selectModalSearch.addEventListener("input", () => {
    renderSelectModalOptions(elements.selectModalSearch.value);
  });
  elements.filterList.addEventListener("click", (event) => {
    const control = event.target.closest("[data-dynamic-select]");
    if (!control || control.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    openSelectModal(control);
  });
  elements.filterList.addEventListener("keydown", (event) => {
    const control = event.target.closest("[data-dynamic-select]");
    if (!control || control.disabled || !["Enter", " ", "ArrowDown"].includes(event.key)) return;

    event.preventDefault();
    openSelectModal(control);
  });
}

export function populateSelect(control, options, selectedValue = "", includeEmpty = null) {
  const normalizedOptions = includeEmpty ? [includeEmpty, ...options] : options;
  const selectOptions = normalizedOptions.map((option) => ({
    value: typeof option === "string" ? option : option.value,
    label: typeof option === "string" ? option : option.label,
    preview: typeof option === "string" ? "" : option.preview || "",
    disabled: typeof option === "string" ? false : Boolean(option.disabled),
  }));
  const selectedOption =
    selectOptions.find((option) => option.value === selectedValue) || selectOptions[0] || {
      value: "",
      label: "",
      preview: "",
    };

  control.selectOptions = selectOptions;
  control.value = selectedOption.value;
  control.textContent = selectedOption.label || "선택";
}

export function openSelectModal(control) {
  activeSelect = control;
  activeSelectOptions = control.selectOptions || [];
  activeSelectSearchable = control.dataset.filterField === "value";
  pendingSelectValues = activeSelectSearchable
    ? control.selectedValues?.length
      ? [...control.selectedValues]
      : getAllSelectableFilterValues()
    : [];
  const label = control.closest(".field")?.querySelector("span")?.textContent || "선택";

  elements.selectModalTitle.textContent = label;
  elements.selectModal.classList.toggle("is-multi-select", activeSelectSearchable);
  elements.selectModalSearchField.hidden = !activeSelectSearchable;
  elements.selectModalActions.hidden = !activeSelectSearchable;
  elements.selectModalSearch.value = "";
  renderSelectModalOptions("");
  elements.selectModal.hidden = false;

  if (activeSelectSearchable) {
    elements.selectModalSearch.focus();
    return;
  }

  const selectedOption = elements.selectModalList.querySelector(".select-option.selected");
  if (selectedOption) {
    selectedOption.focus();
    selectedOption.scrollIntoView({ block: "nearest" });
    return;
  }

  elements.selectModalClose.focus();
}

function renderSelectModalOptions(searchTerm = "") {
  const normalizedSearchTerm = normalizeValue(searchTerm).toLowerCase();
  const baseOptions = activeSelectSearchable ? activeSelectOptions.slice(1) : activeSelectOptions;
  const allSelectableValues = getAllSelectableFilterValues();
  const searchedOptions = activeSelectSearchable
    ? baseOptions.filter(
        (option) =>
          !normalizedSearchTerm ||
          (option.value !== EMPTY_FILTER_VALUE &&
            `${option.label} ${option.preview}`.toLowerCase().includes(normalizedSearchTerm)),
      )
    : activeSelectOptions;
  const searchResultValues = getSearchResultValues(normalizedSearchTerm);
  const allSearchResultsSelected =
    normalizedSearchTerm &&
    searchResultValues.length > 0 &&
    searchResultValues.every((value) => pendingSelectValues.includes(value));
  const options =
    activeSelectSearchable && normalizedSearchTerm
      ? [
          {
            value: "__E2C_SELECT_SEARCH_RESULTS__",
            label: "모든 검색 결과 선택",
            preview: `${searchedOptions.filter((option) => option.value !== EMPTY_FILTER_VALUE).length}개 항목`,
          },
          ...searchedOptions,
        ]
      : activeSelectSearchable
        ? activeSelectOptions
        : searchedOptions;

  elements.selectModalList.innerHTML = options.length
    ? options
        .map((option) => {
          const selected = activeSelectSearchable
            ? option.value === "__E2C_SELECT_SEARCH_RESULTS__"
              ? allSearchResultsSelected
                ? " selected"
                : ""
              : option.value === ""
                ? pendingSelectValues.length === allSelectableValues.length
                  ? " selected"
                  : ""
                : pendingSelectValues.includes(option.value)
              ? " selected"
              : ""
            : option.value === activeSelect.value
              ? " selected"
              : "";
          const preview = option.preview;
          const disabled = option.disabled ? " disabled" : "";
          return `
            <button class="select-option${selected}" type="button" data-select-value="${escapeHTML(option.value)}" ${disabled}>
              <span class="select-option-title">${escapeHTML(option.label)}</span>
              ${preview ? `<span class="select-option-preview">${escapeHTML(preview)}</span>` : ""}
            </button>
          `;
        })
        .join("")
    : '<div class="select-option-empty">검색 결과가 없습니다.</div>';
}

export function closeSelectModal() {
  elements.selectModal.hidden = true;
  elements.selectModal.classList.remove("is-multi-select");
  activeSelect = null;
  activeSelectOptions = [];
  activeSelectSearchable = false;
  pendingSelectValues = [];
  elements.selectModalActions.hidden = true;
}

function handleSelectModalChoice(event) {
  const optionButton = event.target.closest("[data-select-value]");
  if (!optionButton || !activeSelect) return;
  if (optionButton.disabled) return;

  if (activeSelectSearchable) {
    handleMultiSelectChoice(optionButton.dataset.selectValue);
    return;
  }

  activeSelect.value = optionButton.dataset.selectValue;
  activeSelect.textContent =
    activeSelect.selectOptions?.find((option) => option.value === activeSelect.value)?.label || "선택";
  activeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  closeSelectModal();
}

function handleMultiSelectChoice(value) {
  if (value === "") {
    const allSelectableValues = getAllSelectableFilterValues();
    const allSelected = allSelectableValues.every((selectableValue) =>
      pendingSelectValues.includes(selectableValue),
    );
    pendingSelectValues = allSelected ? [] : allSelectableValues;
    renderSelectModalOptions(elements.selectModalSearch.value);
    return;
  }

  if (value === "__E2C_SELECT_SEARCH_RESULTS__") {
    const searchTerm = normalizeValue(elements.selectModalSearch.value).toLowerCase();
    const searchValues = getSearchResultValues(searchTerm);
    const selectedSet = new Set(pendingSelectValues);
    const allSelected = searchValues.length > 0 && searchValues.every((searchValue) => selectedSet.has(searchValue));

    if (allSelected) {
      searchValues.forEach((searchValue) => selectedSet.delete(searchValue));
    } else {
      searchValues.forEach((searchValue) => selectedSet.add(searchValue));
    }

    pendingSelectValues = [...selectedSet];
    renderSelectModalOptions(elements.selectModalSearch.value);
    return;
  }

  const selectedSet = new Set(pendingSelectValues);
  if (selectedSet.has(value)) {
    selectedSet.delete(value);
  } else {
    selectedSet.add(value);
  }
  pendingSelectValues = [...selectedSet];
  renderSelectModalOptions(elements.selectModalSearch.value);
}

function getSearchResultValues(searchTerm) {
  if (!searchTerm) return [];

  return activeSelectOptions
    .filter(
      (option) =>
        option.value &&
        option.value !== EMPTY_FILTER_VALUE &&
        `${option.label} ${option.preview}`.toLowerCase().includes(searchTerm),
    )
    .map((option) => option.value);
}

function getAllSelectableFilterValues() {
  return activeSelectOptions
    .filter((option) => option.value && !option.disabled)
    .map((option) => option.value);
}

function applyMultiSelectModal() {
  if (!activeSelect || !activeSelectSearchable) return;

  const allSelectableValues = getAllSelectableFilterValues();
  const valuesToApply =
    pendingSelectValues.length === allSelectableValues.length ? [] : [...pendingSelectValues];
  activeSelect.selectedValues = valuesToApply;
  activeSelect.value = valuesToApply[0] || "";
  activeSelect.textContent = getMultiSelectLabel(activeSelect.selectOptions || [], valuesToApply);
  activeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  closeSelectModal();
}

export function renderControls(state) {
  const hasColumns = state.columns.length > 0;
  const hasWorkbook = state.sheetNames.length > 0;

  elements.fileName.textContent = state.fileName || "엑셀 파일을 선택하세요.";

  populateSelect(elements.sheetSelect, state.sheetNames, state.activeSheetName);
  elements.sheetSelect.disabled = !hasWorkbook;

  const headerRowOptions = getHeaderRowOptions(state.sheetMatrix);
  populateSelect(elements.headerRowSelect, headerRowOptions, String(state.headerRowIndex));
  elements.headerRowSelect.disabled = headerRowOptions.length === 0;

  const columnOptions = getColumnOptions(state.columns, state.rows);

  populateSelect(elements.titleColumnSelect, columnOptions, state.titleColumn);
  elements.titleColumnSelect.disabled = !hasColumns;

  populateSelect(elements.subtitleColumn1Select, columnOptions, state.subtitleColumn1, {
    value: "",
    label: "사용 안 함",
  });
  elements.subtitleColumn1Select.disabled = !hasColumns;

  populateSelect(elements.subtitleColumn2Select, columnOptions, state.subtitleColumn2, {
    value: "",
    label: "사용 안 함",
  });
  elements.subtitleColumn2Select.disabled = !hasColumns;

  renderDisplayColumnOptions(state);

}

export function renderFilterSortControls(state) {
  const hasColumns = state.columns.length > 0;
  const filters = getStateFilters(state);
  const hasActiveFilter = filters.some((filter) => filter.column && filter.values.length > 0);
  const hasActiveSort = Boolean(state.sortColumn);

  elements.filterOpen.disabled = !hasColumns;
  elements.filterOpen.classList.toggle("active", hasActiveFilter);
  elements.sortOpen.disabled = !hasColumns;
  elements.sortOpen.classList.toggle("active", hasActiveSort);

  const columnOptions = getColumnOptions(state.columns, state.rows);

  renderFilterRows(state, filters, columnOptions, hasColumns);

  populateSelect(elements.sortColumnSelect, columnOptions, state.sortColumn, {
    value: "",
    label: "사용 안 함",
  });
  elements.sortColumnSelect.disabled = !hasColumns;
  populateSelect(
    elements.sortDirectionSelect,
    [
      { value: "asc", label: "오름차순" },
      { value: "desc", label: "내림차순" },
      { value: "random", label: "무작위" },
    ],
    state.sortDirection,
  );
  elements.sortDirectionSelect.disabled = !hasColumns || !state.sortColumn;

  if (!hasColumns) {
    closeFilterPanel();
    closeSortPanel();
  }
}

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

function renderFilterRows(state, filters, columnOptions, hasColumns) {
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

export function renderSearchControl(state) {
  const hasColumns = state.columns.length > 0;
  const columnOptions = getColumnOptions(state.columns, state.rows);
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

export function renderDisplayModeControl(state) {
  const mode = state.displayMode || "scroll";
  elements.displayModeValue.textContent = mode === "page" ? "페이지" : "스크롤";
  elements.displayModeInputs.forEach((input) => {
    input.checked = input.value === mode;
  });
}

export function openDisplayModeModal() {
  elements.displayModeModal.hidden = false;
  elements.displayModeModal.querySelector("input[name='displayMode']:checked")?.focus();
}

export function closeDisplayModeModal() {
  elements.displayModeModal.hidden = true;
}

export function renderPageControls(state, totalRows, currentPage, pageSize) {
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

function getVisiblePageNumbers(currentPage, totalPages) {
  const visibleCount = 5;
  const start = getPageGroupStart(currentPage);
  const end = Math.min(totalPages, start + visibleCount - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getPageGroupStart(page) {
  return Math.floor((page - 1) / 5) * 5 + 1;
}

export function renderImportButton(state, hasActiveDeck = false) {
  const hasImportedFile = Boolean(state.fileName);
  elements.importOpenLabel.textContent = hasImportedFile ? "수정" : "파일 가져오기";
  elements.importOpenIcon.innerHTML = hasImportedFile ? importOpenIcons.edit : importOpenIcons.upload;
  elements.importOpen.setAttribute(
    "aria-label",
    hasActiveDeck
      ? hasImportedFile
        ? "가져오기 설정 수정"
        : "파일 가져오기"
      : "덱을 먼저 선택하세요",
  );
  elements.importOpen.disabled = !hasActiveDeck;
  elements.saveCurrent.disabled = !hasActiveDeck || state.columns.length === 0;
}

export function renderDeckList(decks, activeDeckId) {
  elements.savedList.innerHTML = decks.length
    ? decks
        .map((deck) => {
          const date = new Date(deck.updatedAt || deck.createdAt).toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          const activeClass = deck.id === activeDeckId ? " active" : "";
          const rowCount = deck.data?.rows?.length || 0;
          return `
            <div class="saved-item${activeClass}" data-deck-id="${escapeHTML(deck.id)}">
              <button class="saved-main" type="button" data-deck-select="${escapeHTML(deck.id)}">
                <span class="saved-name">${escapeHTML(deck.name)}</span>
                <span class="saved-meta">${escapeHTML(date)} · ${rowCount}개 카드</span>
              </button>
              <button class="deck-menu-button" type="button" data-deck-menu="${escapeHTML(deck.id)}" aria-label="덱 메뉴 열기">
                <span></span>
                <span></span>
                <span></span>
              </button>
              <div class="deck-menu" data-deck-menu-panel="${escapeHTML(deck.id)}" hidden>
                <button type="button" data-deck-action="rename" data-deck-id="${escapeHTML(deck.id)}">수정</button>
                <button type="button" data-deck-action="export" data-deck-id="${escapeHTML(deck.id)}">내보내기</button>
                <button type="button" data-deck-action="delete" data-deck-id="${escapeHTML(deck.id)}">삭제하기</button>
              </div>
            </div>
          `;
        })
        .join("")
    : '<div class="saved-empty">덱이 없습니다.</div>';
}

export function renderLabelFilters(state) {
  const activeFilter = state.labelFilter || "";
  const labelCounts = LABEL_OPTIONS.reduce((counts, option) => {
    counts[option.value] = 0;
    return counts;
  }, {});
  Object.values(state.labelMap || {}).forEach((labelValue) => {
    if (labelCounts[labelValue] !== undefined) {
      labelCounts[labelValue] += 1;
    }
  });
  const totalLabelCount = Object.values(labelCounts).reduce((total, count) => total + count, 0);
  const allActiveClass = activeFilter === "__all_labels" ? " active" : "";
  elements.labelFilterList.innerHTML = `
    ${LABEL_OPTIONS.map((option) => {
      const activeClass = activeFilter === option.value ? " active" : "";
      return `
        <button class="label-filter-item${activeClass}" type="button" data-label-filter="${escapeHTML(option.value)}">
          <span class="label-dot" style="--label-color: ${option.color}"></span>
          <span>${escapeHTML(option.label)} (${labelCounts[option.value]})</span>
        </button>
      `;
    }).join("")}
    <button class="label-filter-item${allActiveClass}" type="button" data-label-filter="__all_labels">
      <span class="label-all-icon" aria-hidden="true"></span>
      <span>모든 라벨 (${totalLabelCount})</span>
    </button>
  `;
}

export function openSidebar() {
  elements.sidebar.hidden = false;
}

export function closeSidebar() {
  elements.sidebar.hidden = true;
}

export function setSidebarTab(tabName) {
  const isCardTab = tabName === "card";
  elements.deckTab.classList.toggle("is-active", !isCardTab);
  elements.cardTab.classList.toggle("is-active", isCardTab);
  elements.deckTab.setAttribute("aria-selected", String(!isCardTab));
  elements.cardTab.setAttribute("aria-selected", String(isCardTab));
  elements.deckTabPanel.hidden = isCardTab;
  elements.cardTabPanel.hidden = !isCardTab;
}

export function openLabelPalette(anchor, rowKey, selectedLabel = "") {
  const rect = anchor.getBoundingClientRect();
  elements.labelPalette.dataset.rowKey = rowKey;
  elements.labelPaletteList.innerHTML = LABEL_OPTIONS.map((option) => {
    const activeClass = selectedLabel === option.value ? " active" : "";
    return `
      <button class="label-palette-option${activeClass}" type="button" data-label-value="${escapeHTML(option.value)}" aria-label="${escapeHTML(option.label)}">
        <span style="--label-color: ${option.color}"></span>
      </button>
    `;
  }).join("");
  elements.labelPalette.hidden = false;
  const paletteRect = elements.labelPalette.getBoundingClientRect();
  const left = Math.min(window.innerWidth - paletteRect.width - 10, Math.max(10, rect.right - paletteRect.width));
  const top = Math.min(window.innerHeight - paletteRect.height - 10, rect.bottom + 8);
  elements.labelPalette.style.left = `${left}px`;
  elements.labelPalette.style.top = `${top}px`;
}

export function closeLabelPalette() {
  elements.labelPalette.hidden = true;
  elements.labelPalette.dataset.rowKey = "";
}

export function openSettingsModal() {
  elements.settingsModal.hidden = false;
  elements.settingsClose.focus();
}

export function closeSettingsModal() {
  elements.settingsModal.hidden = true;
}

export function openSearchPanel() {
  if (elements.floatingSearchButton.disabled) return;

  closeFilterPanel();
  closeSortPanel();
  elements.floatingSearchPanel.hidden = false;
  elements.searchInput.focus();
}

export function closeSearchPanel() {
  elements.floatingSearchPanel.hidden = true;
}

export function toggleSearchPanel() {
  if (elements.floatingSearchPanel.hidden) {
    openSearchPanel();
    return;
  }

  closeSearchPanel();
}

export function openFilterPanel() {
  if (elements.filterOpen.disabled) return;

  closeSearchPanel();
  closeSortPanel();
  elements.filterPanel.hidden = false;
  elements.filterList.querySelector("[data-dynamic-select]")?.focus();
}

export function closeFilterPanel() {
  elements.filterPanel.hidden = true;
}

export function toggleFilterPanel() {
  if (elements.filterPanel.hidden) {
    openFilterPanel();
    return;
  }

  closeFilterPanel();
}

export function openSortPanel() {
  if (elements.sortOpen.disabled) return;

  closeSearchPanel();
  closeFilterPanel();
  elements.sortPanel.hidden = false;
  elements.sortColumnSelect.focus();
}

export function closeSortPanel() {
  elements.sortPanel.hidden = true;
}

export function toggleSortPanel() {
  if (elements.sortPanel.hidden) {
    openSortPanel();
    return;
  }

  closeSortPanel();
}

function getHeaderRowOptions(matrix) {
  return matrix
    .map((row, index) => {
      const preview = row
        .map((cell) => normalizeValue(cell))
        .filter(Boolean)
        .slice(0, 4)
        .join(" / ");
      return {
        value: String(index),
        label: `${index + 1}행`,
        preview: preview ? `${preview} / ...` : "",
      };
    })
    .slice(0, 100);
}

function getColumnOptions(columns, rows) {
  return columns.map((column) => ({
    value: column,
    label: column,
    preview: getColumnPreview(rows, column),
  }));
}

function getColumnPreview(rows, column) {
  const values = rows
    .map((row) => normalizeValue(row[column]))
    .filter(Boolean);
  const uniqueValues = [...new Set(values)].slice(0, 4);

  return uniqueValues.length ? `${uniqueValues.join(" / ")} / ...` : "";
}

function getFilterValueOptions(rows, column) {
  const counts = rows.reduce((map, row) => {
    const value = normalizeValue(row[column]);
    if (!value) return map;

    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([value, count]) => ({
      value,
      label: value,
      preview: `${count}개 카드`,
    }));
}

function getEmptyFilterValueCount(rows, column) {
  return rows.filter((row) => normalizeValue(row[column]) === "").length;
}

function getMultiSelectLabel(options, values) {
  if (!values.length) return "전체";
  if (values.length === 1) {
    return options.find((option) => option.value === values[0])?.label || "1개 선택";
  }

  return `${values.length}개 선택`;
}

function normalizeFilterValues(filter) {
  if (Array.isArray(filter.values)) {
    return filter.values.filter(Boolean);
  }

  return filter.value ? [filter.value] : [];
}

export function applyDefaultColumns(state) {
  state.titleColumn = recommendTitleColumn(state.columns);
  state.subtitleColumn1 = "";
  state.subtitleColumn2 = "";
  state.displayColumns = getPreviewColumns(state.columns, getTitleColumns(state));
  state.filterColumn = "";
  state.filterValue = "";
  state.filters = [{ column: "", value: "", values: [] }];
  state.sortColumn = "";
  state.sortDirection = "asc";
  state.randomSortSeed = "";
  state.searchColumn = "";
  state.searchTerm = "";
}

export function renderCards(
  state,
  visibleRows,
  renderedCount = visibleRows.length,
  startIndex = 0,
  totalCount = visibleRows.length,
) {
  const rowsToRender = visibleRows.slice(0, renderedCount);
  elements.cardCount.textContent = `${totalCount}개 카드`;

  if (state.columns.length === 0 || state.rows.length === 0) {
    showMessage("표시할 데이터가 없습니다.");
    return;
  }

  if (visibleRows.length === 0) {
    showMessage("조건에 맞는 카드가 없습니다.");
    return;
  }

  elements.message.hidden = true;
  elements.cardList.hidden = false;
  elements.loadMoreSentinel.hidden =
    state.displayMode === "page" || startIndex + rowsToRender.length >= totalCount;
  const titleColumns = getTitleColumns(state);
  const displayColumns = getSelectedDisplayColumns(state);

  elements.cardList.innerHTML = rowsToRender
    .map((row, index) => {
      const visibleIndex = startIndex + index;
      const rowKey = state.rows.indexOf(row);
      return renderCard(
        row,
        visibleIndex,
        rowKey,
        titleColumns,
        displayColumns,
        state.columns,
        state.labelMap?.[rowKey] || "",
      );
    })
    .join("");
}

export function showMessage(text) {
  elements.message.textContent = text;
  elements.message.hidden = false;
  elements.cardList.hidden = true;
  elements.cardList.innerHTML = "";
  elements.loadMoreSentinel.hidden = true;
}

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

export function closeDetailModal() {
  elements.detailModal.hidden = true;
}

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

function showCopyToast() {
  window.clearTimeout(copyToastTimer);
  elements.copyToast.hidden = false;
  copyToastTimer = window.setTimeout(() => {
    elements.copyToast.hidden = true;
  }, 1400);
}

function getTitleColumns(state) {
  return [...new Set([state.titleColumn, state.subtitleColumn1, state.subtitleColumn2].filter(Boolean))];
}

function getSelectableDisplayColumns(state) {
  const titleColumnSet = new Set(getTitleColumns(state));
  return state.columns.filter((column) => !titleColumnSet.has(column));
}

export function getSelectedDisplayColumns(state) {
  const selectableColumns = getSelectableDisplayColumns(state);
  return state.displayColumns.filter((column) => selectableColumns.includes(column));
}

export function getAllSelectableDisplayColumns(state) {
  return getSelectableDisplayColumns(state);
}

function renderDisplayColumnOptions(state) {
  const selectableColumns = getSelectableDisplayColumns(state);
  const selectedColumns = new Set(getSelectedDisplayColumns(state));
  const hasColumns = selectableColumns.length > 0;

  elements.displayColumnsList.innerHTML = hasColumns
    ? selectableColumns
        .map((column) => {
          const checked = selectedColumns.has(column) ? "checked" : "";
          const preview = getColumnPreview(state.rows, column);
          return `
            <label class="checkbox-option">
              <input type="checkbox" value="${escapeHTML(column)}" ${checked} />
              <span class="checkbox-option-text">
                <span class="checkbox-option-title">${escapeHTML(column)}</span>
                ${preview ? `<span class="checkbox-option-preview">${escapeHTML(preview)}</span>` : ""}
              </span>
            </label>
          `;
        })
        .join("")
    : '<span class="checkbox-empty">선택 가능한 열이 없습니다.</span>';

  syncDisplayColumnsModalSummary();
  elements.displayColumnsOpen.disabled = !hasColumns;
  elements.displayColumnsOpen.textContent = selectedColumns.size
    ? getSelectedDisplayColumns(state).join(", ")
    : "선택된 열 없음";
  elements.displayColumnsSummary.textContent = `${selectedColumns.size} / ${selectableColumns.length}개 선택`;
}

export function openDisplayColumnsModal() {
  syncDisplayColumnsModalSummary();
  elements.displayColumnsModal.hidden = false;
  elements.displayColumnsClose.focus();
}

export function closeDisplayColumnsModal() {
  elements.displayColumnsModal.hidden = true;
}

export function getDisplayColumnCheckboxValues() {
  return [...elements.displayColumnsList.querySelectorAll("input:checked")].map((input) => input.value);
}

export function setDisplayColumnCheckboxValues(columns) {
  const selectedColumns = new Set(columns);
  elements.displayColumnsList.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = selectedColumns.has(input.value);
  });
  syncDisplayColumnsModalSummary();
}

export function syncDisplayColumnsModalSummary() {
  const checkboxes = [...elements.displayColumnsList.querySelectorAll("input[type='checkbox']")];
  const selectedCount = checkboxes.filter((input) => input.checked).length;
  const totalCount = checkboxes.length;

  elements.displayColumnsAll.disabled = totalCount === 0;
  elements.displayColumnsAll.checked = totalCount > 0 && selectedCount === totalCount;
  elements.displayColumnsAll.indeterminate = selectedCount > 0 && selectedCount < totalCount;
  elements.displayColumnsCount.textContent = `${selectedCount} / ${totalCount}개 선택`;
}

export function openImportModal() {
  elements.importModal.hidden = false;
  elements.importClose.focus();
}

export function closeImportModal() {
  elements.importModal.hidden = true;
}

function renderCard(
  row,
  index,
  rowKey,
  titleColumns,
  displayColumns,
  columns,
  labelValue,
) {
  const title = getDisplayTitle(row, titleColumns, index);
  const labelOption = LABEL_OPTIONS.find((option) => option.value === labelValue);
  const labelStyle = labelOption ? `style="--label-color: ${labelOption.color}"` : "";
  const labelClass = labelOption ? " selected" : "";
  const labelText = labelOption ? `${labelOption.label} 라벨` : "라벨 선택";
  const fields = displayColumns
    .filter((column) => row[column])
    .map((column) => {
      return `
        <div class="card-field">
          <span class="field-name">${escapeHTML(column)}</span>
          <span class="field-value">${escapeHTML(row[column])}</span>
        </div>
      `;
    })
    .join("");

  return `
    <article class="data-card" role="button" tabindex="0" data-row-index="${index}">
      <button class="card-label-button${labelClass}" type="button" data-label-button data-row-key="${rowKey}" aria-label="${escapeHTML(labelText)}" ${labelStyle}></button>
      <div class="card-title-row">
        <h2 class="card-title">${escapeHTML(title)}</h2>
      </div>
      <div class="field-list">${fields || '<span class="field-value">표시할 열을 선택하세요.</span>'}</div>
    </article>
  `;
}
