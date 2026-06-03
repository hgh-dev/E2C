/* ==========================================================================
   [모듈] 모달/패널 UI (modalUi.js)
   [역할]
   - 라벨 팔레트, 설정, 검색, 필터, 정렬, 가져오기 관련 패널을 열고 닫습니다.
   - 서로 겹치면 안 되는 패널은 열기 전에 기존 패널을 닫습니다.
   [참고]
   - 팝업 위치, 포커스 이동, 패널 중복 표시 문제가 있을 때 확인합니다.
   ========================================================================== */
import { escapeHTML } from "./utils.js";

/**
 * [함수] openLabelPalette
 * [역할] 카드 라벨 색상 선택 팔레트를 연다.
 * [원리] 클릭한 라벨 버튼 위치를 기준으로 화면 안쪽에 팔레트 좌표를 배치한다.
 */
export function openLabelPalette(elements, labelOptions, anchor, rowKey, selectedLabel = "") {
  const rect = anchor.getBoundingClientRect();
  elements.labelPalette.dataset.rowKey = rowKey;
  elements.labelPaletteList.innerHTML = labelOptions.map((option) => {
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

/**
 * [함수] closeLabelPalette
 * [역할] 라벨 팔레트를 닫고 대상 행 정보를 초기화한다.
 * [원리] hidden 처리 후 dataset.rowKey를 빈 값으로 되돌린다.
 */
export function closeLabelPalette(elements) {
  elements.labelPalette.hidden = true;
  elements.labelPalette.dataset.rowKey = "";
}

/**
 * [함수] openSettingsModal
 * [역할] 설정 화면을 연다.
 * [원리] 모달을 표시하고 닫기 버튼으로 포커스를 이동한다.
 */
export function openSettingsModal(elements) {
  elements.settingsModal.hidden = false;
  elements.settingsClose.focus();
}

/**
 * [함수] closeSettingsModal
 * [역할] 설정 화면을 닫는다.
 * [원리] settingsModal hidden 상태를 true로 바꾼다.
 */
export function closeSettingsModal(elements) {
  elements.settingsModal.hidden = true;
}

/**
 * [함수] openDisplayModeModal
 * [역할] 표시 방식 선택 모달을 연다.
 * [원리] 현재 체크된 라디오 버튼에 포커스를 맞춰 키보드 조작을 돕는다.
 */
export function openDisplayModeModal(elements) {
  elements.displayModeModal.hidden = false;
  elements.displayModeModal.querySelector("input[name='displayMode']:checked")?.focus();
}

/**
 * [함수] closeDisplayModeModal
 * [역할] 표시 방식 선택 모달을 닫는다.
 * [원리] displayModeModal hidden 상태를 true로 바꾼다.
 */
export function closeDisplayModeModal(elements) {
  elements.displayModeModal.hidden = true;
}

/**
 * [함수] openSearchPanel
 * [역할] 검색 바텀시트를 연다.
 * [원리] 필터/정렬 패널을 먼저 닫고 검색 입력칸에 포커스를 준다.
 */
export function openSearchPanel(elements, closeFilterPanel, closeSortPanel) {
  if (elements.floatingSearchButton.disabled) return;

  closeFilterPanel();
  closeSortPanel();
  elements.floatingSearchPanel.hidden = false;
  elements.searchInput.focus();
}

/**
 * [함수] closeSearchPanel
 * [역할] 검색 바텀시트를 닫는다.
 * [원리] floatingSearchPanel hidden 상태를 true로 바꾼다.
 */
export function closeSearchPanel(elements) {
  elements.floatingSearchPanel.hidden = true;
}

/**
 * [함수] toggleSearchPanel
 * [역할] 검색 바텀시트 열림 상태를 토글한다.
 * [원리] 현재 hidden 상태를 기준으로 열기/닫기 함수를 선택 호출한다.
 */
export function toggleSearchPanel(elements, openSearchPanel, closeSearchPanel) {
  if (elements.floatingSearchPanel.hidden) {
    openSearchPanel();
    return;
  }

  closeSearchPanel();
}

/**
 * [함수] openFilterPanel
 * [역할] 필터 설정 패널을 연다.
 * [원리] 검색/정렬 패널을 닫고 첫 필터 선택 버튼에 포커스를 준다.
 */
export function openFilterPanel(elements, closeSearchPanel, closeSortPanel) {
  if (elements.filterOpen.disabled) return;

  closeSearchPanel();
  closeSortPanel();
  elements.filterPanel.hidden = false;
  elements.filterList.querySelector("[data-dynamic-select]")?.focus();
}

/**
 * [함수] closeFilterPanel
 * [역할] 필터 설정 패널을 닫는다.
 * [원리] filterPanel hidden 상태를 true로 바꾼다.
 */
export function closeFilterPanel(elements) {
  elements.filterPanel.hidden = true;
}

/**
 * [함수] toggleFilterPanel
 * [역할] 필터 설정 패널 열림 상태를 토글한다.
 * [원리] 현재 hidden 상태에 따라 openFilterPanel 또는 closeFilterPanel을 호출한다.
 */
export function toggleFilterPanel(elements, openFilterPanel, closeFilterPanel) {
  if (elements.filterPanel.hidden) {
    openFilterPanel();
    return;
  }

  closeFilterPanel();
}

/**
 * [함수] openSortPanel
 * [역할] 정렬 설정 패널을 연다.
 * [원리] 검색/필터 패널을 닫고 첫 정렬 선택 버튼 또는 추가 버튼에 포커스를 준다.
 */
export function openSortPanel(elements, closeSearchPanel, closeFilterPanel) {
  if (elements.sortOpen.disabled) return;

  closeSearchPanel();
  closeFilterPanel();
  elements.sortPanel.hidden = false;
  elements.sortList.querySelector("[data-dynamic-select]")?.focus();
  if (!elements.sortList.querySelector("[data-dynamic-select]")) {
    elements.addSort.focus();
  }
}

/**
 * [함수] closeSortPanel
 * [역할] 정렬 설정 패널을 닫는다.
 * [원리] sortPanel hidden 상태를 true로 바꾼다.
 */
export function closeSortPanel(elements) {
  elements.sortPanel.hidden = true;
}

/**
 * [함수] toggleSortPanel
 * [역할] 정렬 설정 패널 열림 상태를 토글한다.
 * [원리] 현재 hidden 상태에 따라 openSortPanel 또는 closeSortPanel을 호출한다.
 */
export function toggleSortPanel(elements, openSortPanel, closeSortPanel) {
  if (elements.sortPanel.hidden) {
    openSortPanel();
    return;
  }

  closeSortPanel();
}

/**
 * [함수] openDisplayColumnsModal
 * [역할] 표시할 열 선택 모달을 연다.
 * [원리] 체크박스 요약을 먼저 동기화하고 닫기 버튼에 포커스를 준다.
 */
export function openDisplayColumnsModal(elements, syncDisplayColumnsModalSummary) {
  syncDisplayColumnsModalSummary();
  elements.displayColumnsModal.hidden = false;
  elements.displayColumnsClose.focus();
}

/**
 * [함수] closeDisplayColumnsModal
 * [역할] 표시할 열 선택 모달을 닫는다.
 * [원리] displayColumnsModal hidden 상태를 true로 바꾼다.
 */
export function closeDisplayColumnsModal(elements) {
  elements.displayColumnsModal.hidden = true;
}

/**
 * [함수] openImportModal
 * [역할] 가져오기 설정 화면을 연다.
 * [원리] importModal을 표시하고 닫기 버튼으로 포커스를 이동한다.
 */
export function openImportModal(elements) {
  elements.importModal.hidden = false;
  elements.importClose.focus();
}

/**
 * [함수] closeImportModal
 * [역할] 가져오기 설정 화면을 닫는다.
 * [원리] importModal hidden 상태를 true로 바꾼다.
 */
export function closeImportModal(elements) {
  elements.importModal.hidden = true;
}
