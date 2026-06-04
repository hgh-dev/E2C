/* ==========================================================================
   [모듈] Google Drive 덱 백업 (googleDriveSync.js)
   [역할]
   - 사용자의 Google Drive appDataFolder에 덱 백업 JSON을 저장하고 불러옵니다.
   - 설정 화면의 Google Drive 연결/백업/복원/동기화 버튼을 처리합니다.
   [참고]
   - GOOGLE_CLIENT_ID가 비어 있으면 연결 버튼만 비활성 안내 상태로 표시됩니다.
   - Drive에는 일반 파일 목록이 아닌 앱 전용 appDataFolder에 e2c-decks.json을 저장합니다.
   ========================================================================== */
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_DRIVE_BACKUP_FILE_NAME,
  GOOGLE_DRIVE_SCOPE,
} from "./config.js";
import { getDecks, normalizeImportedDecks } from "./deckRepository.js";
import { escapeHTML } from "./utils.js";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const DRIVE_CONNECTION_KEY = "e2c.googleDriveConnection";
const DRIVE_LAST_OPERATION_KEY = "e2c.googleDriveLastOperation";

let tokenClient = null;
let accessToken = "";
let backupFileMeta = null;
let connectedEmail = "";

/**
 * [함수] bindGoogleDriveSync
 * [역할] 설정 화면의 Google Drive 버튼 이벤트를 연결하고 초기 상태를 표시한다.
 * [원리] 버튼 클릭마다 Drive access token을 확보한 뒤 백업/복원/동기화 전용 함수로 위임한다.
 */
export function bindGoogleDriveSync({ elements, deckController, render }) {
  const rememberedEmail = getRememberedEmail();
  const rememberedOperation = getRememberedLastOperation();
  renderDriveConnection(elements, rememberedEmail || "연결되지 않았습니다.");
  renderDriveOperationResult(
    elements,
    rememberedOperation
      ? formatLastOperation(rememberedOperation.name, rememberedOperation.createdAt)
      : rememberedEmail
        ? "Google Drive 작업을 실행하려면 다시 연결이 필요합니다."
        : "작업 내역이 없습니다.",
  );
  setDriveButtonsEnabled(elements, false);

  if (!GOOGLE_CLIENT_ID) {
    renderDriveConnection(elements, "config.js에 Google OAuth Client ID를 입력하세요.");
    elements.googleDriveConnect.disabled = true;
    setDriveButtonsEnabled(elements, false);
    return;
  }

  elements.googleDriveBrowse.addEventListener("click", () => openDriveFileModal(elements));
  elements.googleDriveBrowse.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDriveFileModal(elements);
  });
  elements.googleDriveConnect.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDriveConnection(elements);
  });
  elements.googleDriveBackup.addEventListener("click", () => backupDecks(elements, deckController));
  elements.googleDriveRestore.addEventListener("click", () => restoreDecks(elements, deckController, render));
  elements.googleDriveSync.addEventListener("click", () => syncDecks(elements, deckController, render));
  elements.googleDriveFileClose.addEventListener("click", () => closeDriveFileModal(elements));
  elements.googleDriveFileConfirm.addEventListener("click", () => closeDriveFileModal(elements));
  document.querySelector("[data-close-google-drive-files]").addEventListener("click", () => closeDriveFileModal(elements));
}

/**
 * [함수] toggleDriveConnection
 * [역할] Google Drive 연결 버튼을 연결/해제 동작으로 토글한다.
 * [원리] accessToken이 있으면 연결을 해제하고, 없으면 Drive 연결 흐름을 실행한다.
 */
async function toggleDriveConnection(elements) {
  if (accessToken) {
    await disconnectDrive(elements);
    return;
  }

  await connectDrive(elements);
}

/**
 * [함수] connectDrive
 * [역할] Google Drive 접근 권한을 요청한다.
 * [원리] Google Identity Services로 access token을 받고 userinfo에서 연결된 이메일을 읽는다.
 */
async function connectDrive(elements) {
  try {
    await ensureAccessToken({ prompt: getRememberedEmail() ? "" : "consent" });
    connectedEmail = await fetchConnectedEmail();
    rememberConnection(connectedEmail);
    const file = await retryWithFreshTokenOnForbidden(() => findBackupFile());
    backupFileMeta = file;
    renderDriveConnection(elements, connectedEmail || "연결된 Google 계정");
    const rememberedOperation = getRememberedLastOperation();
    renderDriveOperationResult(
      elements,
      rememberedOperation
        ? formatLastOperation(rememberedOperation.name, rememberedOperation.createdAt)
        : file
          ? formatLastOperation("백업", file.modifiedTime)
          : "작업 내역이 없습니다.",
    );
    setDriveButtonsEnabled(elements, true);
  } catch (error) {
    console.warn("Google Drive 연결 실패:", error);
    renderDriveConnection(elements, "Google 계정 권한을 확인하세요.");
  }
}

/**
 * [함수] disconnectDrive
 * [역할] 현재 Google Drive 연결을 해제한다.
 * [원리] Google OAuth revoke를 요청하고 앱 내부 accessToken과 연결 메타를 초기화한다.
 */
async function disconnectDrive(elements) {
  const tokenToRevoke = accessToken;
  accessToken = "";
  tokenClient = null;
  connectedEmail = "";
  backupFileMeta = null;
  forgetConnection();

  try {
    if (tokenToRevoke && window.google?.accounts?.oauth2?.revoke) {
      await new Promise((resolve) => {
        window.google.accounts.oauth2.revoke(tokenToRevoke, resolve);
      });
    }
  } catch {
    // revoke 실패와 무관하게 앱 내부 연결 상태는 해제합니다.
  }

  renderDriveConnection(elements, "연결되지 않았습니다.");
  renderDriveOperationResult(elements, "작업 내역이 없습니다.");
  setDriveButtonsEnabled(elements, false);
}

/**
 * [함수] backupDecks
 * [역할] 현재 로컬 덱 목록을 Google Drive에 백업한다.
 * [원리] 활성 덱을 먼저 로컬 저장한 뒤 appDataFolder의 기존 백업 파일을 생성 또는 업데이트한다.
 */
async function backupDecks(elements, deckController) {
  try {
    const shouldBackup = window.confirm(
      "클라우드의 데이터를 현재 기기의 데이터로 교체합니다.\n클라우드에만 있는 데이터는 삭제됩니다.",
    );
    if (!shouldBackup) return;

    await ensureAccessToken();
    await deckController.autoSaveActiveDeck();

    const payload = createBackupPayload(await getDecks());
    const file = await retryWithFreshTokenOnForbidden(() => upsertBackupFile(payload));
    backupFileMeta = file;
    renderAndRememberLastOperation(elements, "백업");
  } catch (error) {
    console.warn("Google Drive 백업 실패:", error);
    renderDriveOperationResult(elements, "백업 실패 · 네트워크 또는 Google 권한을 확인하세요.");
  }
}

/**
 * [함수] restoreDecks
 * [역할] Google Drive 백업 파일의 덱을 로컬 저장소로 복원한다.
 * [원리] Drive JSON을 읽고 현재 기기의 덱 목록을 백업 덱 목록으로 교체한다.
 */
async function restoreDecks(elements, deckController, render) {
  try {
    const shouldRestore = window.confirm(
      "현재 기기의 데이터를 클라우드의 데이터로 교체합니다.\n현재 기기에만 있는 데이터는 삭제됩니다.",
    );
    if (!shouldRestore) return;

    await ensureAccessToken();
    const backup = await retryWithFreshTokenOnForbidden(() => readBackupPayload());
    if (!backup) {
      renderDriveOperationResult(elements, "복원 불가 · Drive에 백업 파일이 없습니다.");
      return;
    }

    const importedDecks = normalizeImportedDecks(backup);
    await deckController.applyDeckBackup(importedDecks);
    renderAndRememberLastOperation(elements, "복원");
  } catch (error) {
    console.warn("Google Drive 복원 실패:", error);
    renderDriveOperationResult(elements, "복원 실패 · 백업 JSON을 읽지 못했습니다.");
  }
}

/**
 * [함수] syncDecks
 * [역할] 로컬 덱과 Drive 백업을 덱 id 기준으로 합쳐 양쪽을 같은 상태로 맞춘다.
 * [원리] 같은 id의 덱은 updatedAt이 더 최신인 쪽을 선택하고, 병합 결과를 로컬과 Drive에 모두 저장한다.
 */
async function syncDecks(elements, deckController, render) {
  try {
    const shouldSync = window.confirm(
      "현재 기기와 클라우드의 데이터를 병합합니다.\n중복되는 데이터는 최신 데이터만 남깁니다.",
    );
    if (!shouldSync) return;

    await ensureAccessToken();
    await deckController.autoSaveActiveDeck();

    const localDecks = await getDecks();
    const localUpdatedAt = getDecksUpdatedAt(localDecks);
    const backup = await retryWithFreshTokenOnForbidden(() => readBackupPayload());
    const remoteUpdatedAt = backup ? getBackupUpdatedAt(backup) : "";

    const mergedDecks = backup
      ? mergeDecksByUpdatedAt(normalizeImportedDecks(backup), localDecks)
      : localDecks;
    await deckController.applyDeckBackup(mergedDecks);

    const payload = createBackupPayload(mergedDecks);
    const file = await retryWithFreshTokenOnForbidden(() => upsertBackupFile(payload));
    backupFileMeta = file;
    renderAndRememberLastOperation(elements, "동기화");
  } catch (error) {
    console.warn("Google Drive 동기화 실패:", error);
    renderDriveOperationResult(elements, "동기화 실패 · Drive 백업 상태를 확인하지 못했습니다.");
  }
}

/**
 * [함수] openDriveFileModal
 * [역할] Google Drive 앱 전용 저장공간의 백업 파일 정보를 팝업으로 표시한다.
 * [원리] 연결된 access token으로 e2c-decks.json을 조회하고 파일 메타와 덱 목록을 렌더링한다.
 */
async function openDriveFileModal(elements) {
  elements.googleDriveFileModal.hidden = false;
  elements.googleDriveFileContent.innerHTML = `
    <div class="google-drive-file-state">Google Drive 백업 파일을 확인하는 중입니다.</div>
  `;
  elements.googleDriveFileClose.focus();

  if (!accessToken) {
    renderDriveFileMessage(elements, "Google Drive에 먼저 연결하세요.");
    return;
  }

  try {
    const file = await retryWithFreshTokenOnForbidden(() => findBackupFile());
    backupFileMeta = file;

    if (!file) {
      renderDriveFileMessage(elements, "Google Drive에 백업 파일이 없습니다.");
      return;
    }

    const backup = await retryWithFreshTokenOnForbidden(() => readBackupPayload());
    renderDriveFileContent(elements, file, backup);
  } catch (error) {
    console.warn("Google Drive 파일 확인 실패:", error);
    renderDriveFileMessage(elements, "파일을 확인하지 못했습니다. Google 권한이나 네트워크 상태를 확인하세요.");
  }
}

/**
 * [함수] closeDriveFileModal
 * [역할] Google Drive 파일 확인 팝업을 닫는다.
 * [원리] 모달 hidden 상태를 true로 바꾼다.
 */
function closeDriveFileModal(elements) {
  elements.googleDriveFileModal.hidden = true;
}

/**
 * [함수] ensureAccessToken
 * [역할] Drive API 호출에 필요한 access token을 확보한다.
 * [원리] 기존 token이 있으면 재사용하고 없으면 Google token client를 초기화해 권한 요청을 띄운다.
 */
async function ensureAccessToken({ prompt = null } = {}) {
  if (accessToken) return accessToken;

  await loadGoogleIdentityScript();
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      include_granted_scopes: false,
      callback: () => {},
    });
  }

  accessToken = await requestAccessToken(prompt);
  return accessToken;
}

/**
 * [함수] retryWithFreshTokenOnForbidden
 * [역할] Drive API 권한 오류가 났을 때 새 토큰으로 한 번 재시도한다.
 * [원리] 403이면 메모리의 accessToken/tokenClient를 버리고 consent 토큰을 다시 받아 같은 작업을 반복한다.
 */
async function retryWithFreshTokenOnForbidden(task) {
  try {
    return await task();
  } catch (error) {
    if (error.message !== "DRIVE_API_403") {
      throw error;
    }

    accessToken = "";
    tokenClient = null;
    await ensureAccessToken({ prompt: "consent" });
    return await task();
  }
}

/**
 * [함수] requestAccessToken
 * [역할] Google Identity Services에서 access token을 요청한다.
 * [원리] token client callback을 Promise로 감싸 비동기 흐름에서 await할 수 있게 한다.
 */
function requestAccessToken(prompt = null) {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }

      accessToken = response.access_token;
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: prompt ?? (accessToken ? "" : "consent") });
  });
}

/**
 * [함수] fetchConnectedEmail
 * [역할] 현재 access token에 연결된 Google 이메일을 조회한다.
 * [원리] userinfo endpoint를 호출해 email 필드를 읽고 없으면 빈 문자열을 반환한다.
 */
async function fetchConnectedEmail() {
  try {
    const response = await driveFetch(GOOGLE_USERINFO_URL);
    const profile = await response.json();
    return profile.email || "";
  } catch {
    return "";
  }
}

/**
 * [함수] loadGoogleIdentityScript
 * [역할] Google Identity Services 스크립트를 동적으로 로드한다.
 * [원리] 이미 google.accounts가 있으면 즉시 반환하고, 없으면 script 태그 로드 완료를 기다린다.
 */
function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

/**
 * [함수] findBackupFile
 * [역할] Drive appDataFolder 안의 E2C 백업 파일을 찾는다.
 * [원리] spaces=appDataFolder와 파일명 q 검색을 함께 사용해 앱 전용 백업만 조회한다.
 */
async function findBackupFile() {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    fields: "files(id,name,modifiedTime)",
    q: `name='${GOOGLE_DRIVE_BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`,
  });
  const data = await driveFetchJson(`${DRIVE_FILES_URL}?${params.toString()}`);
  return data.files?.[0] || null;
}

/**
 * [함수] readBackupPayload
 * [역할] Drive 백업 JSON 내용을 읽어 객체로 반환한다.
 * [원리] 백업 파일 id를 찾은 뒤 alt=media로 원본 JSON 파일 내용을 다운로드한다.
 */
async function readBackupPayload() {
  const file = backupFileMeta || (await findBackupFile());
  backupFileMeta = file;
  if (!file) return null;

  const response = await driveFetch(`${DRIVE_FILES_URL}/${file.id}?alt=media`);
  return await response.json();
}

/**
 * [함수] upsertBackupFile
 * [역할] Drive 백업 파일을 생성하거나 기존 파일 내용을 갱신한다.
 * [원리] 파일이 있으면 media upload PATCH를 쓰고, 없으면 multipart upload로 appDataFolder 부모를 지정한다.
 */
async function upsertBackupFile(payload) {
  const file = backupFileMeta || (await findBackupFile());
  const content = JSON.stringify(payload, null, 2);

  if (file) {
    await driveFetch(`${DRIVE_UPLOAD_URL}/${file.id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: content,
    });
    return await getFileMeta(file.id);
  }

  const createdFile = await createBackupFile(content);
  return await getFileMeta(createdFile.id);
}

/**
 * [함수] createBackupFile
 * [역할] appDataFolder에 새 백업 파일을 생성한다.
 * [원리] metadata와 JSON 본문을 multipart/related 요청으로 함께 업로드한다.
 */
async function createBackupFile(content) {
  const boundary = `e2c-${Date.now()}`;
  const metadata = {
    name: GOOGLE_DRIVE_BACKUP_FILE_NAME,
    parents: ["appDataFolder"],
    mimeType: "application/json",
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return await driveFetchJson(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

/**
 * [함수] getFileMeta
 * [역할] Drive 파일의 기본 메타 정보를 다시 조회한다.
 * [원리] 파일 id로 name/modifiedTime 필드만 요청해 UI 표시용 정보를 얻는다.
 */
async function getFileMeta(fileId) {
  return await driveFetchJson(`${DRIVE_FILES_URL}/${fileId}?fields=id,name,modifiedTime`);
}

/**
 * [함수] driveFetchJson
 * [역할] Drive API 응답을 JSON으로 읽는다.
 * [원리] driveFetch로 인증 요청을 보낸 뒤 response.json()을 반환한다.
 */
async function driveFetchJson(url, options = {}) {
  const response = await driveFetch(url, options);
  return await response.json();
}

/**
 * [함수] driveFetch
 * [역할] Drive API에 access token이 포함된 fetch 요청을 보낸다.
 * [원리] Authorization 헤더를 붙이고 401이면 token을 버려 다음 요청에서 재발급되도록 한다.
 */
async function driveFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    accessToken = "";
  }

  if (!response.ok) {
    throw new Error(`DRIVE_API_${response.status}`);
  }

  return response;
}

/**
 * [함수] createBackupPayload
 * [역할] Drive에 저장할 덱 백업 JSON 구조를 만든다.
 * [원리] 앱/파일 타입/버전/시간 메타와 현재 덱 배열을 하나의 객체로 묶는다.
 */
function createBackupPayload(decks) {
  const now = new Date().toISOString();
  return {
    app: "E2C",
    type: "decks",
    version: 2,
    exportedAt: now,
    updatedAt: getDecksUpdatedAt(decks) || now,
    decks,
  };
}

/**
 * [함수] mergeDecksByUpdatedAt
 * [역할] Drive 덱과 로컬 덱을 중복 없이 병합한다.
 * [원리] id별로 묶은 뒤 updatedAt이 더 늦은 덱을 남기고 최신 수정 순서로 정렬한다.
 */
function mergeDecksByUpdatedAt(remoteDecks, localDecks) {
  const deckMap = new Map();

  [...remoteDecks, ...localDecks].forEach((deck) => {
    const previousDeck = deckMap.get(deck.id);
    if (!previousDeck || getDeckTime(deck) >= getDeckTime(previousDeck)) {
      deckMap.set(deck.id, deck);
    }
  });

  return [...deckMap.values()].sort((a, b) => getDeckTime(b) - getDeckTime(a));
}

/**
 * [함수] getDeckTime
 * [역할] 덱의 수정 시각을 숫자 timestamp로 변환한다.
 * [원리] updatedAt, createdAt 순서로 날짜를 읽고 유효하지 않으면 0을 반환한다.
 */
function getDeckTime(deck) {
  const time = new Date(deck.updatedAt || deck.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

/**
 * [함수] getDecksUpdatedAt
 * [역할] 덱 목록에서 가장 최근 수정 시각을 구한다.
 * [원리] updatedAt/createdAt 중 유효한 날짜만 timestamp로 변환해 최댓값을 ISO 문자열로 반환한다.
 */
function getDecksUpdatedAt(decks) {
  const latestTime = decks.reduce((latest, deck) => {
    const time = new Date(deck.updatedAt || deck.createdAt || 0).getTime();
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, 0);
  return latestTime ? new Date(latestTime).toISOString() : "";
}

/**
 * [함수] getBackupUpdatedAt
 * [역할] 백업 JSON에서 비교 기준이 되는 최신 시각을 가져온다.
 * [원리] 백업 메타 updatedAt/exportedAt을 우선 사용하고 없으면 덱 목록의 최신 시각을 계산한다.
 */
function getBackupUpdatedAt(backup) {
  return backup.updatedAt || backup.exportedAt || getDecksUpdatedAt(backup.decks || []);
}

/**
 * [함수] getRememberedEmail
 * [역할] 이전에 연결했던 Google 계정 이메일을 읽는다.
 * [원리] localStorage에 저장된 연결 메타 JSON을 파싱하고 email 필드만 반환한다.
 */
function getRememberedEmail() {
  try {
    const data = JSON.parse(localStorage.getItem(DRIVE_CONNECTION_KEY) || "{}");
    return data.email || "";
  } catch {
    return "";
  }
}

/**
 * [함수] rememberConnection
 * [역할] Google Drive 연결 계정을 다음 접속 때 복원할 수 있게 기록한다.
 * [원리] 이메일과 저장 시각만 localStorage에 저장하고 access token은 저장하지 않는다.
 */
function rememberConnection(email) {
  if (!email) return;

  localStorage.setItem(
    DRIVE_CONNECTION_KEY,
    JSON.stringify({
      email,
      connectedAt: new Date().toISOString(),
    }),
  );
}

/**
 * [함수] getRememberedLastOperation
 * [역할] 기기에 저장된 마지막 Google Drive 작업 내역을 읽는다.
 * [원리] 작업명과 작업 성공 시각을 localStorage에서 파싱하고 값이 없으면 null을 반환한다.
 */
function getRememberedLastOperation() {
  try {
    const data = JSON.parse(localStorage.getItem(DRIVE_LAST_OPERATION_KEY) || "null");
    if (!data?.name || !data?.createdAt) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * [함수] rememberLastOperation
 * [역할] 마지막 Google Drive 작업 내역을 현재 기기에 저장한다.
 * [원리] Drive 파일 modifiedTime 대신 작업이 성공한 순간의 기기 시간을 기준으로 기록한다.
 */
function rememberLastOperation(name, createdAt = new Date().toISOString()) {
  localStorage.setItem(
    DRIVE_LAST_OPERATION_KEY,
    JSON.stringify({
      name,
      createdAt,
    }),
  );
}

/**
 * [함수] forgetConnection
 * [역할] 저장된 Google Drive 연결 기억을 삭제한다.
 * [원리] localStorage의 연결 메타 키를 제거한다.
 */
function forgetConnection() {
  localStorage.removeItem(DRIVE_CONNECTION_KEY);
}

/**
 * [함수] renderDriveConnection
 * [역할] 설정 화면의 Google Drive 연결 상태를 표시한다.
 * [원리] 연결된 이메일 또는 안내 문구를 설명 줄에 넣고 연결 버튼 문구/class를 동기화한다.
 */
function renderDriveConnection(elements, detail) {
  elements.googleDriveDetail.textContent = detail;
  const hasRememberedEmail = Boolean(getRememberedEmail());
  elements.googleDriveConnect.textContent = accessToken
    ? "연결해제"
    : hasRememberedEmail
      ? "다시 연결"
      : "연결하기";
  elements.googleDriveConnect.classList.toggle("connected", Boolean(accessToken));
}

/**
 * [함수] renderDriveOperationResult
 * [역할] 백업/복원/동기화 결과를 Google Drive 설명 줄에 보조 표시한다.
 * [원리] 연결된 이메일이 있으면 이메일 뒤에 작업 결과를 함께 붙여 사용자가 마지막 상태를 확인하게 한다.
 */
function renderDriveOperationResult(elements, message) {
  elements.googleDriveOperationStatus.textContent = message;
}

/**
 * [함수] renderDriveFileMessage
 * [역할] Google Drive 파일 팝업에 단순 안내 문구를 표시한다.
 * [원리] 파일이 없거나 오류가 났을 때 공통 빈 상태 UI를 넣는다.
 */
function renderDriveFileMessage(elements, message) {
  elements.googleDriveFileContent.innerHTML = `
    <div class="google-drive-file-state">${escapeHTML(message)}</div>
  `;
}

/**
 * [함수] renderDriveFileContent
 * [역할] Google Drive 백업 파일의 덱 목록과 수정 시간을 표시한다.
 * [원리] 백업 JSON의 decks 배열을 리스트로 만들고 Drive 파일 수정 시간은 하단 보조 문구로 표시한다.
 */
function renderDriveFileContent(elements, file, backup) {
  const decks = Array.isArray(backup?.decks) ? backup.decks : [];
  const deckItems = decks.length
    ? decks.map((deck) => `
        <li>
          <strong>${escapeHTML(deck.name || "이름 없는 덱")}</strong>
          <small>${escapeHTML(formatDeckMeta(deck))}</small>
        </li>
      `).join("")
    : `<li class="empty-drive-file-item">저장된 덱이 없습니다.</li>`;

  elements.googleDriveFileContent.innerHTML = `
    <section class="google-drive-file-list-section">
      <ul class="google-drive-file-list">${deckItems}</ul>
      <p class="google-drive-file-modified">Drive 수정 시간 : ${escapeHTML(formatOperationDate(file.modifiedTime))}</p>
    </section>
  `;
}

/**
 * [함수] formatDeckMeta
 * [역할] 덱 목록에 표시할 카드 수와 수정 시간을 만든다.
 * [원리] deck.rows 길이와 updatedAt/createdAt을 읽어 짧은 설명 문자열로 합친다.
 */
function formatDeckMeta(deck) {
  const cardCount = Array.isArray(deck.rows) ? deck.rows.length : 0;
  const time = deck.updatedAt || deck.createdAt || "";
  const formattedTime = time ? formatOperationDate(time) : "수정 시간 없음";
  return `${cardCount.toLocaleString("ko-KR")}개 카드 · ${formattedTime}`;
}

/**
 * [함수] renderAndRememberLastOperation
 * [역할] 작업 성공 시 마지막 작업 내역을 저장하고 화면에 즉시 반영한다.
 * [원리] 한 번 만든 ISO 시각을 저장과 렌더링에 같이 사용해 기기별 표시가 흔들리지 않게 한다.
 */
function renderAndRememberLastOperation(elements, operationName) {
  const createdAt = new Date().toISOString();
  rememberLastOperation(operationName, createdAt);
  renderDriveOperationResult(elements, formatLastOperation(operationName, createdAt));
}

/**
 * [함수] formatLastOperation
 * [역할] Google Drive 작업 내역 영역에 표시할 마지막 작업 문구를 만든다.
 * [원리] 작업 시각과 작업 종류를 "마지막 작업 : 날짜 작업명" 형식으로 조립한다.
 */
function formatLastOperation(operationName, value = new Date()) {
  return `마지막 작업 : ${formatOperationDate(value)} ${operationName}`;
}

/**
 * [함수] setDriveButtonsEnabled
 * [역할] Drive 작업 버튼의 활성 상태를 일괄 변경한다.
 * [원리] 연결 버튼은 항상 두고 백업/복원/동기화 버튼만 disabled 값을 반전해 적용한다.
 */
function setDriveButtonsEnabled(elements, enabled) {
  elements.googleDriveBackup.disabled = !enabled;
  elements.googleDriveRestore.disabled = !enabled;
  elements.googleDriveSync.disabled = !enabled;
}

/**
 * [함수] formatOperationDate
 * [역할] 마지막 작업 시각을 초 단위까지 포함한 한국어 날짜로 변환한다.
 * [원리] ko-KR locale의 year/month/day/hour/minute/second 옵션을 사용한다.
 */
function formatOperationDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return validDate.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
