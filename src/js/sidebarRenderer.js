/* ==========================================================================
   [모듈] 사이드바 렌더러 (sidebarRenderer.js)
   [역할]
   - 덱 목록, 라벨 필터 목록, 사이드바 탭 상태를 렌더링합니다.
   - 덱별 메뉴 버튼과 라벨별 카드 개수를 화면에 표시합니다.
   [참고]
   - 사이드바 덱/카드 탭 UI나 라벨 개수가 이상할 때 확인합니다.
   ========================================================================== */
import { escapeHTML } from "./utils.js";

/**
 * [함수] renderDeckList
 * [역할] 사이드바 덱 탭의 덱 목록을 렌더링한다.
 * [원리] activeDeckId와 일치하는 항목에 active class를 붙이고 덱 메뉴 버튼을 포함한다.
 */
export function renderDeckList(elements, decks, activeDeckId) {
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

/**
 * [함수] renderLabelFilters
 * [역할] 사이드바 카드 탭의 라벨 필터 목록을 렌더링한다.
 * [원리] state.labelMap을 집계해 색상별 카드 개수를 계산한다.
 */
export function renderLabelFilters(elements, state, labelOptions) {
  const activeFilter = state.labelFilter || "";
  const labelCounts = labelOptions.reduce((counts, option) => {
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
    ${labelOptions.map((option) => {
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

/**
 * [함수] openSidebar
 * [역할] 사이드바를 연다.
 * [원리] sidebar hidden 상태를 false로 바꾼다.
 */
export function openSidebar(elements) {
  elements.sidebar.hidden = false;
}

/**
 * [함수] closeSidebar
 * [역할] 사이드바를 닫는다.
 * [원리] sidebar hidden 상태를 true로 바꾼다.
 */
export function closeSidebar(elements) {
  elements.sidebar.hidden = true;
}

/**
 * [함수] setSidebarTab
 * [역할] 사이드바의 덱/카드 탭 표시 상태를 전환한다.
 * [원리] 탭 버튼의 active/aria-selected와 패널 hidden 상태를 함께 동기화한다.
 */
export function setSidebarTab(elements, tabName) {
  const isCardTab = tabName === "card";
  elements.deckTab.classList.toggle("is-active", !isCardTab);
  elements.cardTab.classList.toggle("is-active", isCardTab);
  elements.deckTab.setAttribute("aria-selected", String(!isCardTab));
  elements.cardTab.setAttribute("aria-selected", String(isCardTab));
  elements.deckTabPanel.hidden = isCardTab;
  elements.cardTabPanel.hidden = !isCardTab;
}
