import type { DataTableFilterMeta } from 'primereact/datatable';

export const REPORT_TABLE_CLEAR_FILTERS_EVENT = 'app:report-table-clear-filters';

export type ReportTableFilterResetDetail = {
  sourceButton?: HTMLElement | null;
};

const clearSingleFilterMeta = (filterMeta: unknown): unknown => {
  if (!filterMeta || typeof filterMeta !== 'object') return filterMeta;
  const recordMeta = filterMeta as Record<string, unknown>;

  if (Array.isArray(recordMeta.constraints)) {
    return {
      ...recordMeta,
      constraints: recordMeta.constraints.map((constraint) => {
        if (!constraint || typeof constraint !== 'object') return constraint;
        return {
          ...(constraint as Record<string, unknown>),
          value: null
        };
      })
    };
  }

  if ('value' in recordMeta) {
    return {
      ...recordMeta,
      value: null
    };
  }

  return filterMeta;
};

export const clearDataTableFilters = (filters: DataTableFilterMeta): DataTableFilterMeta => {
  const nextFilters = {} as DataTableFilterMeta;
  Object.entries(filters).forEach(([key, filterMeta]) => {
    (nextFilters as Record<string, unknown>)[key] = clearSingleFilterMeta(filterMeta);
  });
  return nextFilters;
};

export const dispatchReportTableFilterReset = (sourceButton?: HTMLElement | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ReportTableFilterResetDetail>(REPORT_TABLE_CLEAR_FILTERS_EVENT, {
      detail: { sourceButton: sourceButton ?? null }
    })
  );
};
