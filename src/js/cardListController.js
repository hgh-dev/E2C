/* ==========================================================================
   [모듈] 카드 목록 컨트롤러 (cardListController.js)
   [역할]
   - 검색/필터/정렬이 반영된 행 목록을 카드 목록으로 렌더링합니다.
   - 스크롤 추가 렌더링과 페이지 방식 이동 상태를 관리합니다.
   [참고]
   - 카드가 적게 보이거나 페이지 이동이 이상할 때 확인합니다.
   ========================================================================== */
import { getVisibleRows } from "./dataProcessor.js";

const INITIAL_RENDER_COUNT = 40;
const RENDER_BATCH_SIZE = 30;
const PAGE_SIZE = 40;

/**
 * [함수] createCardListController
 * [역할] 카드 목록 렌더링과 페이지/스크롤 상태를 관리하는 컨트롤러를 만든다.
 * [원리] visibleRows/currentPage/renderedRowCount를 클로저로 보관한다.
 */
export function createCardListController({
  elements,
  state,
  renderApp,
  renderCards,
  renderPageControls,
  showMessage,
  openDetailModal,
  openLabelPalette,
  hasActiveDeck,
}) {
  let visibleRows = [];
  let renderedRowCount = INITIAL_RENDER_COUNT;
  let currentPage = 1;

  /**
   * [함수] setupLoadMoreObserver
   * [역할] 스크롤 모드에서 화면 아래 접근 시 카드를 추가 렌더링하도록 연결한다.
   * [원리] IntersectionObserver를 우선 사용하고, 없으면 scroll 거리 계산으로 대체한다.
   */
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

  /**
   * [함수] renderCardList
   * [역할] 현재 상태에 맞는 카드 목록을 렌더링한다.
   * [원리] 덱/파일 여부를 먼저 검사하고, 표시 방식에 따라 페이지/스크롤 렌더링을 분기한다.
   */
  function renderCardList() {
    if (!hasActiveDeck()) {
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
      showMessage("파일을 가져오세요.");
      return;
    }

    visibleRows = getVisibleRows(state);
    if (state.displayMode === "page") {
      renderPageMode();
      return;
    }

    currentPage = 1;
    renderedRowCount = Math.min(INITIAL_RENDER_COUNT, visibleRows.length);
    renderCards(state, visibleRows, renderedRowCount);
    renderPageControls(state, visibleRows.length, currentPage, PAGE_SIZE);
  }

  /**
   * [함수] resetPage
   * [역할] 페이지 모드의 현재 페이지를 첫 페이지로 되돌린다.
   * [원리] 검색/필터/라벨 조건이 바뀌면 기존 페이지 번호가 유효하지 않을 수 있어 초기화한다.
   */
  function resetPage() {
    currentPage = 1;
  }

  /**
   * [함수] goToFirstPage
   * [역할] 첫 페이지로 이동한다.
   * [원리] currentPage를 1로 바꾸고 전체 렌더링을 다시 요청한다.
   */
  function goToFirstPage() {
    currentPage = 1;
    renderApp();
  }

  /**
   * [함수] goToPreviousPageGroup
   * [역할] 이전 5개 페이지 묶음으로 이동한다.
   * [원리] 현재 페이지 묶음 시작값에서 5를 빼고 최소 1로 제한한다.
   */
  function goToPreviousPageGroup() {
    currentPage = Math.max(1, getPageGroupStart(currentPage) - 5);
    renderApp();
  }

  /**
   * [함수] goToNextPageGroup
   * [역할] 다음 5개 페이지 묶음으로 이동한다.
   * [원리] 현재 페이지 묶음 시작값에 5를 더하고 전체 페이지 수를 넘지 않게 제한한다.
   */
  function goToNextPageGroup() {
    const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    currentPage = Math.min(totalPages, getPageGroupStart(currentPage) + 5);
    renderApp();
  }

  /**
   * [함수] goToLastPage
   * [역할] 마지막 페이지로 이동한다.
   * [원리] 현재 visibleRows 개수와 PAGE_SIZE로 전체 페이지 수를 계산한다.
   */
  function goToLastPage() {
    currentPage = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    renderApp();
  }

  /**
   * [함수] handlePageNumberClick
   * [역할] 페이지 번호 텍스트 클릭을 처리한다.
   * [원리] data-page 값을 currentPage로 저장한 뒤 다시 렌더링한다.
   */
  function handlePageNumberClick(event) {
    const button = event.target.closest("[data-page]");
    if (!button) return;

    currentPage = Number(button.dataset.page);
    renderApp();
  }

  /**
   * [함수] handleCardClick
   * [역할] 카드 클릭과 카드 라벨 버튼 클릭을 처리한다.
   * [원리] 라벨 버튼이면 팔레트를 열고, 카드 제목 버튼이면 visibleRows에서 해당 행을 찾아 상세 모달을 연다.
   */
  function handleCardClick(event) {
    const labelButton = event.target.closest("[data-label-button]");
    if (labelButton) {
      event.stopPropagation();
      const rowKey = labelButton.dataset.rowKey;
      openLabelPalette(labelButton, rowKey, state.labelMap?.[rowKey] || "");
      return;
    }

    const detailButton = event.target.closest("[data-card-detail]");
    if (!detailButton) return;

    const rowIndex = Number(detailButton.dataset.rowIndex);
    const row = visibleRows[rowIndex];
    if (row) openDetailModal(row, state, rowIndex);
  }

  /**
   * [함수] handleCardKeydown
   * [역할] 카드 목록 키보드 이벤트를 보조 처리한다.
   * [원리] 상세보기는 제목 버튼의 기본 키보드 동작으로 열리므로 여기서는 별도 처리를 하지 않는다.
   */
  function handleCardKeydown() {}

  /**
   * [함수] renderPageMode
   * [역할] 페이지 표시 방식의 현재 페이지 카드만 렌더링한다.
   * [원리] currentPage와 PAGE_SIZE로 slice 범위를 계산하고 페이지 컨트롤을 갱신한다.
   */
  function renderPageMode() {
    const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = visibleRows.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
    renderedRowCount = pageRows.length;
    renderCards(state, pageRows, pageRows.length, pageStartIndex, visibleRows.length);
    renderPageControls(state, visibleRows.length, currentPage, PAGE_SIZE);
  }

  /**
   * [함수] loadMoreCards
   * [역할] 스크롤 표시 방식에서 다음 카드 묶음을 추가로 렌더링한다.
   * [원리] renderedRowCount를 배치 크기만큼 늘리고 같은 visibleRows를 다시 렌더링한다.
   */
  function loadMoreCards() {
    if (state.displayMode === "page") return;
    if (renderedRowCount >= visibleRows.length) return;

    renderedRowCount = Math.min(renderedRowCount + RENDER_BATCH_SIZE, visibleRows.length);
    renderCards(state, visibleRows, renderedRowCount);
  }

  /**
   * [함수] handleScrollFallback
   * [역할] IntersectionObserver가 없는 브라우저에서 추가 로딩을 보조한다.
   * [원리] 문서 하단까지 남은 거리가 기준보다 작으면 loadMoreCards를 호출한다.
   */
  function handleScrollFallback() {
    if (state.displayMode === "page") return;
    const distanceToBottom =
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    if (distanceToBottom < 420) {
      loadMoreCards();
    }
  }

  return {
    goToFirstPage,
    goToLastPage,
    goToNextPageGroup,
    goToPreviousPageGroup,
    handleCardClick,
    handleCardKeydown,
    handlePageNumberClick,
    renderCardList,
    resetPage,
    setupLoadMoreObserver,
  };
}

/**
 * [함수] getPageGroupStart
 * [역할] 현재 페이지가 속한 5개 페이지 묶음의 시작 번호를 계산한다.
 * [원리] 1-based 페이지 번호를 5개 단위로 내림 처리한다.
 */
function getPageGroupStart(page) {
  return Math.floor((page - 1) / 5) * 5 + 1;
}
