/* ==========================================================================
   [모듈] 덱 브라우저 저장소 (deckStorage.js)
   [역할]
   - IndexedDB에 덱 목록을 읽고 씁니다.
   - 예전 localStorage 덱 데이터가 있으면 최초 1회 IndexedDB로 이전합니다.
   [참고]
   - 저장공간 부족, 저장 데이터 초기화, 레거시 데이터 이전 시 확인합니다.
   ========================================================================== */
const DB_NAME = "e2c-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const DECKS_KEY = "decks";
const LEGACY_DECKS_KEY = "e2c.decks";
const LEGACY_SAVED_ITEMS_KEY = "e2c.savedItems";

let dbPromise = null;

/**
 * [함수] getStoredDecks
 * [역할] IndexedDB에서 저장된 덱 목록을 읽는다.
 * [원리] 신버전 저장값이 없으면 legacy localStorage 데이터를 찾아 한 번 이전한다.
 */
export async function getStoredDecks() {
  const decks = await getValue(DECKS_KEY);
  if (Array.isArray(decks)) return decks;

  // 예전 localStorage 기반 덱을 발견하면 IndexedDB로 한 번 이전해 이후부터 같은 경로로 읽습니다.
  const legacyDecks = readLegacyDecks();
  if (legacyDecks.length > 0) {
    await setStoredDecks(legacyDecks);
    return legacyDecks;
  }

  return [];
}

/**
 * [함수] setStoredDecks
 * [역할] 덱 목록을 IndexedDB에 저장한다.
 * [원리] kv store의 고정 키(DECKS_KEY)에 전체 배열을 put한다.
 */
export async function setStoredDecks(decks) {
  await setValue(DECKS_KEY, decks);
}

/**
 * [함수] readLegacyDecks
 * [역할] 예전 localStorage 키에 남아 있는 덱 데이터를 읽는다.
 * [원리] 알려진 legacy 키를 순서대로 검사하고 유효한 배열이 있으면 반환한다.
 */
function readLegacyDecks() {
  for (const key of [LEGACY_DECKS_KEY, LEGACY_SAVED_ITEMS_KEY]) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(value) && value.length > 0) return value;
    } catch {
      // Ignore malformed legacy data.
    }
  }
  return [];
}

/**
 * [함수] getValue
 * [역할] IndexedDB kv store에서 특정 키의 값을 읽는다.
 * [원리] readonly transaction을 만들고 request 성공/실패를 Promise로 감싼다.
 */
async function getValue(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * [함수] setValue
 * [역할] IndexedDB kv store에 특정 키와 값을 저장한다.
 * [원리] readwrite transaction 완료 시 저장 성공으로 처리한다.
 */
async function setValue(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(STORE_NAME).put(value, key);
  });
}

/**
 * [함수] openDatabase
 * [역할] E2C 전용 IndexedDB 연결을 열거나 재사용한다.
 * [원리] 최초 연결 Promise를 보관해 이후 호출에서 같은 연결 생성 흐름을 공유한다.
 */
function openDatabase() {
  if (dbPromise) return dbPromise;

  // 같은 세션에서 여러 저장 요청이 동시에 와도 DB 연결은 하나만 생성해 재사용합니다.
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}
