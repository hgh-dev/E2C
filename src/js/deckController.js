/* ==========================================================================
   [모듈] 덱 컨트롤러 (deckController.js)
   [역할]
   - 덱 생성, 선택, 이름 수정, 삭제, JSON 내보내기/가져오기를 처리합니다.
   - 현재 덱에 카드 설정과 엑셀 변환 결과를 자동 저장합니다.
   [참고]
   - 사이드바 덱 목록, 자동 저장, 백업 JSON 동작이 이상할 때 확인합니다.
   ========================================================================== */
import { getDecks, mergeDecks, normalizeImportedDecks, saveDecks } from "./deckRepository.js";
import { copyState, createEmptyState, deserializeState, serializeState } from "./stateSerializer.js";

/**
 * [함수] createDeckController
 * [역할] 덱 관련 이벤트에서 사용할 동작 묶음을 생성한다.
 * [원리] activeDeckId를 클로저로 보관하고 저장소/상태/UI 콜백을 조합한다.
 */
export function createDeckController({
  elements,
  state,
  render,
  resetDraftFromState,
  renderDeckList,
  showMessage,
  closeSidebar,
}) {
  let activeDeckId = "";

  /**
   * [함수] refreshDeckList
   * [역할] 저장소의 덱 목록을 다시 읽어 사이드바 목록을 갱신한다.
   * [원리] 현재 activeDeckId를 함께 넘겨 선택된 덱 표시를 유지한다.
   */
  async function refreshDeckList() {
    renderDeckList(await getDecks(), activeDeckId);
  }

  /**
   * [함수] createDeck
   * [역할] 새 덱을 만들고 현재 작업 덱으로 선택한다.
   * [원리] 사용자 입력 이름으로 덱 메타를 만든 뒤 빈 상태를 화면에 반영한다.
   */
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
    // 새 덱은 아직 파일이 없는 빈 작업 공간이므로 화면 상태도 함께 초기화합니다.
    copyState(createEmptyState(), state);
    resetDraftFromState();
    renderDeckList(decks, activeDeckId);
    closeSidebar();
    render();
  }

  /**
   * [함수] persistActiveDeckData
   * [역할] 현재 화면 상태를 활성 덱 data에 저장한다.
   * [원리] 활성 덱을 찾아 serializeState 결과와 updatedAt을 덮어쓴다.
   */
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
    // 저장 후 사이드바 메타 정보(수정 시간/카드 수)를 즉시 맞춥니다.
    await saveDecks(decks);
    renderDeckList(decks, activeDeckId);
  }

  /**
   * [함수] autoSaveActiveDeck
   * [역할] 사용자 설정 변경 후 현재 덱을 자동 저장한다.
   * [원리] 저장 실패는 사용자 메시지로 안내하고 앱 흐름은 중단하지 않는다.
   */
  async function autoSaveActiveDeck() {
    try {
      await persistActiveDeckData();
    } catch {
      showMessage("브라우저 저장소에 저장하지 못했습니다.");
    }
  }

  /**
   * [함수] handleDeckClick
   * [역할] 사이드바 덱 목록의 선택/메뉴/메뉴 액션 클릭을 처리한다.
   * [원리] 클릭 대상의 data 속성을 기준으로 메뉴 토글, 액션, 덱 선택을 분기한다.
   */
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
    resetDraftFromState();
    closeSidebar();
    render();
  }

  /**
   * [함수] closeDeckMenus
   * [역할] 열려 있는 덱 점세개 메뉴를 모두 닫는다.
   * [원리] savedList 내부 메뉴 패널의 hidden 값을 일괄 true로 바꾼다.
   */
  function closeDeckMenus() {
    elements.savedList.querySelectorAll("[data-deck-menu-panel]").forEach((panel) => {
      panel.hidden = true;
    });
  }

  /**
   * [함수] closeDeckMenuOnOutsideClick
   * [역할] 메뉴 바깥 영역 클릭 시 덱 메뉴를 닫는다.
   * [원리] 클릭 대상이 메뉴 버튼/패널 내부가 아니면 closeDeckMenus를 호출한다.
   */
  function closeDeckMenuOnOutsideClick(event) {
    if (event.target.closest("[data-deck-menu]") || event.target.closest("[data-deck-menu-panel]")) {
      return;
    }

    closeDeckMenus();
  }

  /**
   * [함수] getActiveDeckId
   * [역할] 현재 선택된 덱 id를 반환한다.
   * [원리] 컨트롤러 내부 activeDeckId 클로저 값을 그대로 노출한다.
   */
  function getActiveDeckId() {
    return activeDeckId;
  }

  /**
   * [함수] hasActiveDeck
   * [역할] 현재 선택된 덱이 있는지 여부를 반환한다.
   * [원리] activeDeckId가 비어 있지 않은지 Boolean으로 변환한다.
   */
  function hasActiveDeck() {
    return Boolean(activeDeckId);
  }

  /**
   * [함수] importDecks
   * [역할] JSON 백업 파일에서 덱 목록을 가져온다.
   * [원리] 파일 텍스트를 JSON으로 파싱하고 기존 덱과 병합해 저장한다.
   */
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

  /**
   * [함수] applyDeckBackup
   * [역할] 외부 백업에서 받은 덱 목록을 현재 앱 저장소와 화면에 적용한다.
   * [원리] 덱 목록을 저장한 뒤 첫 번째 덱을 선택하고 해당 data를 현재 state로 복원한다.
   */
  async function applyDeckBackup(nextDecks) {
    await saveDecks(nextDecks);
    activeDeckId = nextDecks[0]?.id || "";
    const activeDeck = nextDecks.find((deck) => deck.id === activeDeckId);
    copyState(activeDeck?.data ? deserializeState(activeDeck.data) : createEmptyState(), state);
    resetDraftFromState();
    renderDeckList(nextDecks, activeDeckId);
    render();
  }

  /**
   * [함수] toggleDeckMenu
   * [역할] 특정 덱의 점세개 메뉴를 열거나 닫는다.
   * [원리] 대상 패널만 토글하고 다른 덱 메뉴는 닫는다.
   */
  function toggleDeckMenu(deckId) {
    elements.savedList.querySelectorAll("[data-deck-menu-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.deckMenuPanel === deckId ? !panel.hidden : true;
    });
  }

  /**
   * [함수] handleDeckAction
   * [역할] 덱 메뉴의 수정/내보내기/삭제 액션을 실행한다.
   * [원리] action 문자열을 기준으로 전용 함수에 위임한다.
   */
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

  /**
   * [함수] renameDeck
   * [역할] 덱 이름을 수정한다.
   * [원리] prompt 결과가 유효하면 덱 메타와 updatedAt을 갱신한다.
   */
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

  /**
   * [함수] exportDeck
   * [역할] 선택한 덱 하나를 JSON 파일로 내보낸다.
   * [원리] 백업 메타 정보와 덱 배열을 만들고 downloadJson으로 내려받게 한다.
   */
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

  /**
   * [함수] deleteDeck
   * [역할] 선택한 덱을 삭제한다.
   * [원리] 사용자 확인 후 목록에서 제거하고, 현재 덱이면 화면 상태도 초기화한다.
   */
  async function deleteDeck(deckId) {
    const decks = await getDecks();
    const deck = decks.find((deckItem) => deckItem.id === deckId);
    if (!deck) return;

    if (!window.confirm(`'${deck.name}' 덱을 삭제할까요?`)) return;

    const nextDecks = decks.filter((deckItem) => deckItem.id !== deckId);
    await saveDecks(nextDecks);

    if (activeDeckId === deckId) {
      activeDeckId = "";
      // 현재 보고 있던 덱을 삭제하면 화면도 "덱 미선택" 상태로 되돌립니다.
      copyState(createEmptyState(), state);
      resetDraftFromState();
      render();
      return;
    }

    renderDeckList(nextDecks, activeDeckId);
  }

  return {
    autoSaveActiveDeck,
    closeDeckMenuOnOutsideClick,
    closeDeckMenus,
    createDeck,
    getActiveDeckId,
    handleDeckClick,
    hasActiveDeck,
    importDecks,
    applyDeckBackup,
    refreshDeckList,
  };
}

/**
 * [함수] downloadJson
 * [역할] 객체 데이터를 JSON 파일로 브라우저 다운로드한다.
 * [원리] Blob URL을 임시 a 태그에 연결해 클릭 후 URL을 해제한다.
 */
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

/**
 * [함수] sanitizeFileName
 * [역할] 덱 이름을 파일명으로 사용할 수 있게 보정한다.
 * [원리] 파일 시스템에서 문제가 되는 문자를 밑줄로 바꾸고 길이를 제한한다.
 */
function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "deck";
}
