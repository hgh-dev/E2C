/* ==========================================================================
   [모듈] 화면 상호작용 컨트롤러 (viewInteractionController.js)
   [역할]
   - 검색어, 라벨 선택, 라벨 필터, 상세 복사 이벤트를 처리합니다.
   - 변경된 상태가 카드 목록에 반영되도록 페이지 초기화와 렌더링을 호출합니다.
   [참고]
   - 라벨 필터나 검색 결과가 즉시 반영되지 않을 때 확인합니다.
   ========================================================================== */
/**
 * [함수] createViewInteractionController
 * [역할] 메인 화면의 검색, 라벨, 복사 이벤트 핸들러 묶음을 만든다.
 * [원리] 외부에서 받은 state/render/autosave 함수를 클로저로 잡아 이벤트마다 상태 갱신 흐름을 공유한다.
 */
export function createViewInteractionController({
  elements,
  state,
  render,
  resetPage,
  autoSaveActiveDeck,
  closeLabelPalette,
  closeSidebar,
  copyTextValue,
}) {
  /**
   * [함수] handleSearchColumnChange
   * [역할] 검색 대상 열 변경을 처리한다.
   * [원리] searchColumn을 갱신하고 첫 페이지부터 다시 보이도록 목록을 렌더링한다.
   */
  function handleSearchColumnChange(event) {
    state.searchColumn = event.target.value;
    resetPage();
    render();
  }

  /**
   * [함수] handleSearchInput
   * [역할] 검색어 입력 변경을 처리한다.
   * [원리] 입력 값을 그대로 searchTerm에 저장하고 검색 결과가 첫 페이지에서 시작되도록 한다.
   */
  function handleSearchInput(event) {
    state.searchTerm = event.target.value;
    resetPage();
    render();
  }

  /**
   * [함수] handleLabelPaletteClick
   * [역할] 카드 라벨 색상 선택을 처리한다.
   * [원리] 같은 색을 다시 누르면 라벨을 삭제하고, 다른 색이면 rowKey별 labelMap 값을 저장한다.
   */
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
    await autoSaveActiveDeck();
    render();
  }

  /**
   * [함수] handleLabelFilterClick
   * [역할] 사이드바 카드 탭의 라벨 필터 선택을 처리한다.
   * [원리] 같은 필터를 다시 누르면 해제하고, 다른 필터는 state.labelFilter에 저장한다.
   */
  function handleLabelFilterClick(event) {
    const button = event.target.closest("[data-label-filter]");
    if (!button) return;

    const nextFilter = button.dataset.labelFilter;
    state.labelFilter = state.labelFilter === nextFilter ? "" : nextFilter;
    resetPage();
    closeSidebar();
    render();
  }

  /**
   * [함수] handleDetailCopyClick
   * [역할] 상세 모달에서 값 클릭 복사를 처리한다.
   * [원리] data-copy-value 속성을 가진 요소를 찾아 공통 복사 함수로 넘긴다.
   */
  function handleDetailCopyClick(event) {
    const copyTarget = event.target.closest("[data-copy-value]");
    if (!copyTarget) return;

    copyTextValue(copyTarget.dataset.copyValue);
  }

  /**
   * [함수] closeLabelPaletteOnOutsideClick
   * [역할] 라벨 팔레트 바깥 클릭 시 팔레트를 닫는다.
   * [원리] 라벨 버튼이나 팔레트 내부 클릭은 무시하고 나머지 클릭만 닫기 처리한다.
   */
  function closeLabelPaletteOnOutsideClick(event) {
    if (event.target.closest("[data-label-button]") || event.target.closest("#labelPalette")) {
      return;
    }

    closeLabelPalette();
  }

  return {
    closeLabelPaletteOnOutsideClick,
    handleDetailCopyClick,
    handleLabelFilterClick,
    handleLabelPaletteClick,
    handleSearchColumnChange,
    handleSearchInput,
  };
}
