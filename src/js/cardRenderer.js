/* ==========================================================================
   [모듈] 카드 렌더러 (cardRenderer.js)
   [역할]
   - 엑셀 행 데이터를 모바일 카드 HTML로 변환합니다.
   - 카드 제목, 라벨 버튼, 표시할 열 필드를 조립합니다.
   [참고]
   - 카드 UI 구조나 카드 안의 표시 항목을 바꿀 때 확인합니다.
   ========================================================================== */
import { escapeHTML, getDisplayTitle } from "./utils.js";

/**
 * [함수] renderCards
 * [역할] 표시 대상 행 배열을 카드 리스트 HTML로 렌더링한다.
 * [원리] 표시 개수와 시작 인덱스를 기준으로 일부 행만 잘라 cardList에 주입한다.
 */
export function renderCards({
  elements,
  state,
  visibleRows,
  labelOptions,
  getSelectedDisplayColumns,
  getTitleColumns,
  showMessage,
  renderedCount = visibleRows.length,
  startIndex = 0,
  totalCount = visibleRows.length,
}) {
  const rowsToRender = visibleRows.slice(0, renderedCount);
  elements.cardCount.textContent = `${totalCount}개 카드`;

  if (state.columns.length === 0 || state.rows.length === 0) {
    showMessage("표시할 데이터가 없습니다.");
    return;
  }

  if (visibleRows.length === 0) {
    showMessage("조건에 맞는 카드가 없습니다.");
    return;
  }

  elements.message.hidden = true;
  elements.cardList.hidden = false;
  elements.loadMoreSentinel.hidden =
    state.displayMode === "page" || startIndex + rowsToRender.length >= totalCount;
  const titleColumns = getTitleColumns(state);
  const displayColumns = getSelectedDisplayColumns(state);

  elements.cardList.innerHTML = rowsToRender
    .map((row, index) => {
      const visibleIndex = startIndex + index;
      const rowKey = state.rows.indexOf(row);
      return renderCard({
        row,
        index: visibleIndex,
        rowKey,
        titleColumns,
        displayColumns,
        labelOptions,
        labelValue: state.labelMap?.[rowKey] || "",
      });
    })
    .join("");
}

/**
 * [함수] renderCard
 * [역할] 행 하나를 카드 article HTML로 변환한다.
 * [원리] 제목열/부제목열로 제목을 만들고, 선택한 표시열만 필드로 출력한다.
 */
function renderCard({
  row,
  index,
  rowKey,
  titleColumns,
  displayColumns,
  labelOptions,
  labelValue,
}) {
  const title = getDisplayTitle(row, titleColumns, index);
  const labelOption = labelOptions.find((option) => option.value === labelValue);
  const labelStyle = labelOption ? `style="--label-color: ${labelOption.color}"` : "";
  const labelClass = labelOption ? " selected" : "";
  const labelText = labelOption ? `${labelOption.label} 라벨` : "라벨 선택";
  const fields = displayColumns
    .filter((column) => row[column])
    .map((column) => {
      return `
        <div class="card-field">
          <span class="field-name">${escapeHTML(column)}</span>
          <span class="field-value">${escapeHTML(row[column])}</span>
        </div>
      `;
    })
    .join("");

  return `
    <article class="data-card" data-row-index="${index}">
      <button class="card-label-button${labelClass}" type="button" data-label-button data-row-key="${rowKey}" aria-label="${escapeHTML(labelText)}" ${labelStyle}></button>
      <div class="card-title-row">
        <button class="card-title-button" type="button" data-card-detail data-row-index="${index}">
          <span class="card-title">${escapeHTML(title)}</span>
        </button>
      </div>
      <div class="field-list">${fields}</div>
    </article>
  `;
}
