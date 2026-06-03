const DB_NAME = "e2c-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const DECKS_KEY = "decks";
const LEGACY_DECKS_KEY = "e2c.decks";
const LEGACY_SAVED_ITEMS_KEY = "e2c.savedItems";

let dbPromise = null;

export async function getStoredDecks() {
  const decks = await getValue(DECKS_KEY);
  if (Array.isArray(decks)) return decks;

  const legacyDecks = readLegacyDecks();
  if (legacyDecks.length > 0) {
    await setStoredDecks(legacyDecks);
    return legacyDecks;
  }

  return [];
}

export async function setStoredDecks(decks) {
  await setValue(DECKS_KEY, decks);
}

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

async function getValue(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setValue(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(STORE_NAME).put(value, key);
  });
}

function openDatabase() {
  if (dbPromise) return dbPromise;

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
