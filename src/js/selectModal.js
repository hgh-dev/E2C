/* ==========================================================================
   [모듈] 선택 모달 (selectModal.js)
   [역할]
   - 실제 select 대신 버튼+중앙 모달 방식의 선택 UI를 제공합니다.
   - 필터 값 선택에서는 검색 결과 다중 선택과 전체 선택 상태를 관리합니다.
   [참고]
   - 모바일에서 드롭다운이 닫히거나 필터 값 다중 선택이 이상할 때 확인합니다.
   ========================================================================== */
import { EMPTY_FILTER_VALUE } from "./filterConstants.js";
import { escapeHTML, normalizeValue } from "./utils.js";

const SELECT_SEARCH_RESULTS_VALUE = "__E2C_SELECT_SEARCH_RESULTS__";

let elements = null;
let activeSelect = null;
let activeSelectOptions = [];
let activeSelectSearchable = false;
let pendingSelectValues = [];

/**
 * [함수] setupSelectModalTriggers
 * [역할] 가짜 select 버튼과 선택 모달 이벤트를 연결한다.
 * [원리] 정적 선택 버튼과 동적 필터 버튼을 모두 같은 openSelectModal 흐름으로 보낸다.
 */
export function setupSelectModalTriggers(nextElements, targets = []) {
  elements = nextElements;

  targets.forEach((control) => {
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
  document.querySelector("[data-close-select-modal]")?.addEventListener("click", closeSelectModal);
  elements.selectModalList.addEventListener("click", handleSelectModalChoice);
  elements.selectModalSearch.addEventListener("input", () => {
    renderSelectModalOptions(elements.selectModalSearch.value);
  });
  [elements.filterList, elements.sortList].filter(Boolean).forEach((list) => {
    list.addEventListener("click", (event) => {
      const control = event.target.closest("[data-dynamic-select]");
      if (!control || control.disabled) return;

      event.preventDefault();
      event.stopPropagation();
      openSelectModal(control);
    });

    list.addEventListener("keydown", (event) => {
      const control = event.target.closest("[data-dynamic-select]");
      if (!control || control.disabled || !["Enter", " ", "ArrowDown"].includes(event.key)) return;

      event.preventDefault();
      openSelectModal(control);
    });
  });
}

/**
 * [함수] populateSelect
 * [역할] 버튼형 select 컨트롤에 선택 옵션과 현재 값을 주입한다.
 * [원리] option 배열을 표준 구조로 바꾸고 선택된 label을 버튼 텍스트로 표시한다.
 */
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
  renderSelectControlValue(control, selectedOption);
}

/**
 * [함수] closeSelectModal
 * [역할] 중앙 선택 모달을 닫고 임시 선택 상태를 초기화한다.
 * [원리] activeSelect와 pendingSelectValues를 비워 다음 선택 동작과 섞이지 않게 한다.
 */
export function closeSelectModal() {
  if (!elements) return;

  elements.selectModal.hidden = true;
  elements.selectModal.classList.remove("is-multi-select");
  activeSelect = null;
  activeSelectOptions = [];
  activeSelectSearchable = false;
  pendingSelectValues = [];
  elements.selectModalActions.hidden = true;
}

/**
 * [함수] getMultiSelectLabel
 * [역할] 다중 선택된 필터 값을 버튼에 표시할 짧은 문구로 만든다.
 * [원리] 0개는 전체, 1개는 실제 라벨, 여러 개는 개수로 표시한다.
 */
export function getMultiSelectLabel(options, values) {
  if (!values.length) return "전체";
  if (values.length === 1) {
    return options.find((option) => option.value === values[0])?.label || "1개 선택";
  }

  return `${values.length}개 선택`;
}

/**
 * [함수] openSelectModal
 * [역할] 특정 버튼형 select의 옵션을 중앙 모달로 표시한다.
 * [원리] 필터 값 선택인지 여부에 따라 단일/다중 선택 UI 상태를 설정한다.
 */
function openSelectModal(control) {
  activeSelect = control;
  activeSelectOptions = control.selectOptions || [];
  activeSelectSearchable = control.dataset.filterField === "value";
  // 필터 값 선택은 기본적으로 "전체 선택" 상태로 보여주고, 적용 시 전체면 빈 배열로 저장합니다.
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

/**
 * [함수] renderSelectModalOptions
 * [역할] 선택 모달 안의 옵션 버튼 목록을 렌더링한다.
 * [원리] 검색어와 다중 선택 상태를 반영해 선택됨/비활성/검색 결과 전체 선택 버튼을 만든다.
 */
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
            value: SELECT_SEARCH_RESULTS_VALUE,
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
        .map((option) => renderSelectOption(option, allSelectableValues, allSearchResultsSelected))
        .join("")
    : '<div class="select-option-empty">검색 결과가 없습니다.</div>';
}

/**
 * [함수] renderSelectOption
 * [역할] 선택 모달 옵션 하나의 HTML을 만든다.
 * [원리] 현재 선택 상태와 비활성 상태를 class/disabled 속성으로 반영한다.
 */
function renderSelectOption(option, allSelectableValues, allSearchResultsSelected) {
  const selected = activeSelectSearchable
    ? getMultiSelectOptionSelectedClass(option, allSelectableValues, allSearchResultsSelected)
    : option.value === activeSelect.value
      ? " selected"
      : "";
  const disabled = option.disabled ? " disabled" : "";

  return `
    <button class="select-option${selected}" type="button" data-select-value="${escapeHTML(option.value)}" ${disabled}>
      <span class="select-option-title">${escapeHTML(option.label)}</span>
      ${option.preview ? `<span class="select-option-preview">${escapeHTML(option.preview)}</span>` : ""}
    </button>
  `;
}

/**
 * [함수] getMultiSelectOptionSelectedClass
 * [역할] 다중 선택 옵션의 selected class 여부를 계산한다.
 * [원리] 전체, 검색 결과 전체, 개별 값의 선택 기준을 각각 분기한다.
 */
function getMultiSelectOptionSelectedClass(option, allSelectableValues, allSearchResultsSelected) {
  if (option.value === SELECT_SEARCH_RESULTS_VALUE) {
    return allSearchResultsSelected ? " selected" : "";
  }

  if (option.value === "") {
    return pendingSelectValues.length === allSelectableValues.length ? " selected" : "";
  }

  return pendingSelectValues.includes(option.value) ? " selected" : "";
}

/**
 * [함수] handleSelectModalChoice
 * [역할] 선택 모달의 옵션 클릭을 처리한다.
 * [원리] 다중 선택이면 임시 선택값만 토글하고, 단일 선택이면 값을 확정 후 모달을 닫는다.
 */
function handleSelectModalChoice(event) {
  const optionButton = event.target.closest("[data-select-value]");
  if (!optionButton || !activeSelect) return;
  if (optionButton.disabled) return;

  if (activeSelectSearchable) {
    handleMultiSelectChoice(optionButton.dataset.selectValue);
    return;
  }

  activeSelect.value = optionButton.dataset.selectValue;
  renderSelectControlValue(
    activeSelect,
    activeSelect.selectOptions?.find((option) => option.value === activeSelect.value) || {
      label: "선택",
      preview: "",
    },
  );
  activeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  closeSelectModal();
}

/**
 * [함수] renderSelectControlValue
 * [역할] 버튼형 select에 현재 선택 라벨과 미리보기 내용을 표시한다.
 * [원리] preview가 있으면 두 줄 구조로, 없으면 기존처럼 한 줄 라벨만 렌더링한다.
 */
function renderSelectControlValue(control, option) {
  const label = option.label || "선택";
  const preview = control.dataset.showPreview === "false" ? "" : option.preview || "";
  control.classList.toggle("has-select-preview", Boolean(preview));
  control.innerHTML = preview
    ? `
      <span class="select-button-label">${escapeHTML(label)}</span>
      <span class="select-button-preview">${escapeHTML(preview)}</span>
    `
    : escapeHTML(label);
}

/**
 * [함수] handleMultiSelectChoice
 * [역할] 필터 값 다중 선택 상태를 토글한다.
 * [원리] 전체/검색 결과 전체/개별 값 선택을 분리해 pendingSelectValues를 갱신한다.
 */
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

  if (value === SELECT_SEARCH_RESULTS_VALUE) {
    // 검색 결과 전체 선택은 현재 검색어에 매칭되는 값만 토글합니다.
    toggleSearchResults();
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

/**
 * [함수] toggleSearchResults
 * [역할] 현재 검색 결과에 해당하는 필터 값들을 한 번에 선택/해제한다.
 * [원리] 검색 결과 값들이 모두 선택되어 있으면 제거하고, 아니면 Set에 추가한다.
 */
function toggleSearchResults() {
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
}

/**
 * [함수] getSearchResultValues
 * [역할] 검색어와 일치하는 필터 값 목록을 반환한다.
 * [원리] 값 없음 항목은 제외하고 label/preview 문자열에서 검색한다.
 */
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

/**
 * [함수] getAllSelectableFilterValues
 * [역할] 현재 필터 값 목록 중 실제 선택 가능한 값만 반환한다.
 * [원리] 전체 버튼과 disabled 옵션은 제외하고 value가 있는 항목만 추린다.
 */
function getAllSelectableFilterValues() {
  return activeSelectOptions
    .filter((option) => option.value && !option.disabled)
    .map((option) => option.value);
}

/**
 * [함수] applyMultiSelectModal
 * [역할] 필터 값 다중 선택 결과를 버튼 컨트롤에 확정한다.
 * [원리] 모든 값이 선택된 상태는 저장값을 빈 배열로 두어 "전체"와 같은 의미로 처리한다.
 */
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
