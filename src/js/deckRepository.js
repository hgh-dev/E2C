/* ==========================================================================
   [모듈] 덱 저장소 어댑터 (deckRepository.js)
   [역할]
   - 브라우저 저장소의 덱 데이터를 앱 내부 포맷으로 정규화합니다.
   - JSON 백업에서 가져온 덱과 기존 덱을 충돌 없이 병합합니다.
   [참고]
   - 저장된 덱 구조가 바뀌거나 백업 파일 호환성을 확인할 때 사용합니다.
   ========================================================================== */
import { getStoredDecks, setStoredDecks } from "./deckStorage.js";
import { deserializeState, serializeState } from "./stateSerializer.js";

/**
 * [함수] getDecks
 * [역할] 저장소의 덱 목록을 앱 내부 포맷으로 읽어온다.
 * [원리] 저장소 결과를 normalizeImportedDecks로 한 번 통과시켜 구조를 보정한다.
 */
export async function getDecks() {
  const decks = await getStoredDecks();
  return normalizeImportedDecks({ decks });
}

/**
 * [함수] saveDecks
 * [역할] 덱 목록을 브라우저 저장소에 저장한다.
 * [원리] 실제 저장 방식은 deckStorage에 위임한다.
 */
export async function saveDecks(decks) {
  await setStoredDecks(decks);
}

/**
 * [함수] normalizeImportedDecks
 * [역할] 백업 JSON이나 저장소 데이터의 덱 배열을 표준 구조로 맞춘다.
 * [원리] data 필드는 deserialize/serialize를 거쳐 현재 앱 버전의 상태 구조로 변환한다.
 */
export function normalizeImportedDecks(payload) {
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

/**
 * [함수] mergeDecks
 * [역할] 가져온 덱 목록을 기존 덱 목록 앞에 합친다.
 * [원리] id가 겹치면 타임스탬프를 붙여 기존 덱을 덮어쓰지 않게 한다.
 */
export function mergeDecks(importedDecks, currentDecks) {
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
