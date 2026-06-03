import { normalizeValue } from "./utils.js";

const EMPTY_FILTER_VALUE = "__E2C_EMPTY_VALUE__";

export function getVisibleRows(state) {
  const searchTerm = state.searchTerm.trim().toLowerCase();
  const searchColumns =
    state.searchColumn && state.columns.includes(state.searchColumn)
      ? [state.searchColumn]
      : state.columns;
  const filters = normalizeFilters(state);

  const filtered = state.rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      searchColumns.some((column) =>
        normalizeValue(row[column]).toLowerCase().includes(searchTerm),
      );

    const matchesFilter = filters.every((filter) => {
      if (!filter.column || filter.values.length === 0) return true;

      const rowValue = normalizeValue(row[filter.column]);
      return filter.values.some((value) =>
        value === EMPTY_FILTER_VALUE ? rowValue === "" : rowValue === value,
      );
    });

    const rowIndex = state.rows.indexOf(row);
    const rowLabel = state.labelMap?.[rowIndex] || "";
    const matchesLabel =
      !state.labelFilter ||
      (state.labelFilter === "__all_labels" ? Boolean(rowLabel) : rowLabel === state.labelFilter);

    return matchesSearch && matchesFilter && matchesLabel;
  });

  if (!state.sortColumn) {
    return filtered;
  }

  if (state.sortDirection === "random") {
    return [...filtered].sort((a, b) => {
      const left = getRandomSortKey(a, state);
      const right = getRandomSortKey(b, state);
      return left - right;
    });
  }

  return [...filtered].sort((a, b) => {
    const left = normalizeValue(a[state.sortColumn]);
    const right = normalizeValue(b[state.sortColumn]);
    const result = left.localeCompare(right, "ko", { numeric: true });
    return state.sortDirection === "desc" ? -result : result;
  });
}

function getRandomSortKey(row, state) {
  const rowIndex = state.rows.indexOf(row);
  const seed = `${state.randomSortSeed || "default"}|${rowIndex}|${normalizeValue(row[state.sortColumn])}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(index);
    hash |= 0;
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

function normalizeFilters(state) {
  const filters = Array.isArray(state.filters) ? state.filters : [];
  if (Array.isArray(state.filters)) {
    return filters.map((filter) => ({
      column: filter.column || "",
      value: filter.value || "",
      values: normalizeFilterValues(filter),
    }));
  }

  return [
    {
      column: state.filterColumn || "",
      value: state.filterValue || "",
      values: state.filterValue ? [state.filterValue] : [],
    },
  ];
}

function normalizeFilterValues(filter) {
  if (Array.isArray(filter.values)) {
    return filter.values.filter(Boolean);
  }

  return filter.value ? [filter.value] : [];
}
