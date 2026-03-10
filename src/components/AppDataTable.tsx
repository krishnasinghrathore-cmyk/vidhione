import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from 'primereact/button';
import type { MenuItem } from 'primereact/menuitem';
import { SplitButton } from 'primereact/splitbutton';
import { DataTable, type DataTableFilterEvent, type DataTableFilterMeta, type DataTableProps } from 'primereact/datatable';
import { classNames } from 'primereact/utils';
import { Skeleton } from 'primereact/skeleton';
import { focusNextElement, isEnterWithoutModifiers, shouldSkipEnterAsTabTarget } from '@/lib/enterNavigation';
import { exportReportCsv, exportReportExcel, exportReportPdf } from '@/lib/reportExport';
import {
  clearDataTableFilters,
  REPORT_TABLE_CLEAR_FILTERS_EVENT,
  type ReportTableFilterResetDetail
} from '@/lib/reportTableFilterReset';

type AppDataTableRow = Record<string, unknown>;

type AppDataTableProps<T extends AppDataTableRow = AppDataTableRow> = DataTableProps<T[]> & {
  children?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  recordSummary?: string;
  skeletonRows?: number;
  showSkeleton?: boolean;
  exportFileName?: string;
  topSummaryRows?: T[];
};

type ColumnLikeElementProps = {
  header?: React.ReactNode;
  field?: string;
  exportable?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  frozen?: boolean;
  alignFrozen?: 'left' | 'right';
};

type ExportColumnDef = {
  header: string;
  field: string;
};

const ACTIONS_HEADER_PATTERN = /\bactions?\b/i;

const resolveNodeText = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) return node.map(resolveNodeText).join(' ');
  if (!React.isValidElement(node)) return '';
  return resolveNodeText(node.props.children);
};

const hasActionColumnHeader = (header: React.ReactNode): boolean => {
  const headerText = resolveNodeText(header).trim();
  if (!headerText) return false;
  return ACTIONS_HEADER_PATTERN.test(headerText);
};

const readActionMeta = (label: string, icon: string) => {
  const normalizedLabel = label.toLowerCase().trim();
  const normalizedIcon = icon.toLowerCase().trim();
  const isPrint = normalizedLabel === 'print' || normalizedIcon.includes('pi-print');
  const isRefresh = normalizedLabel === 'refresh' || normalizedIcon.includes('pi-refresh');
  const isExport =
    normalizedLabel === 'export' ||
    normalizedLabel.startsWith('export ') ||
    normalizedIcon.includes('pi-download');
  return { isPrint, isRefresh, isExport };
};

const hasExportActionInNode = (node: React.ReactNode): boolean => {
  if (node == null || typeof node === 'boolean') return false;
  if (Array.isArray(node)) return node.some((child) => hasExportActionInNode(child));
  if (!React.isValidElement(node)) return false;
  if (node.type === React.Fragment) return hasExportActionInNode(node.props.children);
  const label = typeof node.props.label === 'string' ? node.props.label : '';
  const icon = typeof node.props.icon === 'string' ? node.props.icon : '';
  return readActionMeta(label, icon).isExport;
};

const getNestedValue = (row: Record<string, unknown>, field: string): unknown => {
  if (!field.includes('.')) return row[field];
  return field.split('.').reduce<unknown>((value, part) => {
    if (value == null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[part];
  }, row);
};

const toExportValue = (value: unknown): string | number | boolean | null | undefined => {
  if (value == null) return value as null | undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const createSyntheticMouseEvent = () =>
  ({
    preventDefault: () => undefined,
    stopPropagation: () => undefined
  }) as React.MouseEvent<HTMLButtonElement>;

/**
 * Shared table wrapper to keep header/actions/summary consistent across screens.
 * - headerLeft: filters/search (left-aligned).
 * - headerRight: actions/summary (right-aligned).
 * - recordSummary: small text under the header on the right.
 * - children: Column definitions.
 * Styling stays token-based (Prime/Vidhione variables) for theme compatibility.
 */
const AppDataTableInner = function AppDataTable<T extends AppDataTableRow = AppDataTableRow>(
  {
    headerLeft,
    headerRight,
    recordSummary,
    className,
    children,
    skeletonRows,
    showSkeleton = true,
    exportFileName,
    topSummaryRows,
    frozenValue: restFrozenValue,
    ...rest
  }: AppDataTableProps<T>,
  ref: React.ForwardedRef<any>
) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const loading = Boolean(rest.loading);
  const valueLength = Array.isArray(rest.value) ? rest.value.length : 0;
  const hasRows = valueLength > 0;
  const shouldDisplayLoadingOverlay = loading && !hasRows;
  const hasCustomLoadingIcon = rest.loadingIcon != null;
  const shouldShowSkeleton = showSkeleton && shouldDisplayLoadingOverlay && !hasCustomLoadingIcon;
  const processedChildren = useMemo(() => {
    const items = React.Children.toArray(children);
    if (items.length === 0) return children;

    let actionColumnIndex = -1;
    items.forEach((child, index) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as ColumnLikeElementProps;
      if (!hasActionColumnHeader(props.header)) return;
      actionColumnIndex = index;
    });

    if (actionColumnIndex < 0) return children;

    return items.map((child, index) => {
      if (!React.isValidElement(child) || index !== actionColumnIndex) return child;

      const props = child.props as ColumnLikeElementProps;
      const shouldFreezeActionColumn = rest.scrollable === true || props.frozen === true;

      const typedChild = child as React.ReactElement<ColumnLikeElementProps>;
      return React.cloneElement(typedChild, {
        className: classNames(props.className, 'app-data-table-action-column'),
        headerClassName: classNames(props.headerClassName, 'app-data-table-action-column'),
        bodyClassName: classNames(props.bodyClassName, 'app-data-table-action-column'),
        ...(shouldFreezeActionColumn
          ? {
              frozen: props.frozen ?? true,
              alignFrozen: props.alignFrozen ?? 'right'
            }
          : {})
      });
    });
  }, [children, rest.scrollable]);

  const columnCount = useMemo(() => {
    const items = React.Children.toArray(processedChildren);
    const count = items.filter((child) => React.isValidElement(child)).length;
    return Math.max(count, 1);
  }, [processedChildren]);

  const resolvedSkeletonRows = useMemo(() => {
    if (typeof skeletonRows === 'number' && skeletonRows > 0) return skeletonRows;
    if (typeof rest.rows === 'number' && rest.rows > 0) return Math.min(rest.rows, 8);
    return 6;
  }, [rest.rows, skeletonRows]);
  const exportColumns = useMemo<ExportColumnDef[]>(() => {
    const items = React.Children.toArray(processedChildren);
    if (!items.length) return [];

    const columnsByField = new Map<string, string>();
    items.forEach((child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as ColumnLikeElementProps;
      if (props.exportable === false) return;
      const field = typeof props.field === 'string' ? props.field.trim() : '';
      if (!field) return;
      if (columnsByField.has(field)) return;
      const headerText = resolveNodeText(props.header).trim();
      if (!headerText || hasActionColumnHeader(props.header)) return;
      columnsByField.set(field, headerText);
    });

    return Array.from(columnsByField.entries()).map(([field, header]) => ({ field, header }));
  }, [processedChildren]);
  const exportRows = useMemo<Record<string, unknown>[]>(() => {
    if (!Array.isArray(rest.value)) return [];
    return rest.value as unknown as Record<string, unknown>[];
  }, [rest.value]);
  const hasHeaderExportAction = useMemo(() => hasExportActionInNode(headerRight), [headerRight]);
  const resolvedRowsPerPageOptions = useMemo(() => {
    if (!rest.paginator || !hasHeaderExportAction) return rest.rowsPerPageOptions;
    if (!Array.isArray(rest.rowsPerPageOptions) || rest.rowsPerPageOptions.length === 0) return rest.rowsPerPageOptions;
    const normalized = Array.from(
      new Set(
        rest.rowsPerPageOptions
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0 && value <= 2000)
      )
    ).sort((a, b) => a - b);
    if (!normalized.length) return rest.rowsPerPageOptions;
    if (!normalized.includes(2000)) normalized.push(2000);
    return normalized;
  }, [hasHeaderExportAction, rest.paginator, rest.rowsPerPageOptions]);
  const resolvedExportFileName = useMemo(() => {
    const trimmed = exportFileName?.trim();
    if (trimmed) return trimmed;
    return 'table-export';
  }, [exportFileName]);
  const runAutoExport = useCallback(
    async (mode: 'csv' | 'excel' | 'pdf') => {
      if (!exportRows.length || !exportColumns.length) return;
      const options = {
        fileName: resolvedExportFileName,
        title: resolvedExportFileName,
        rows: exportRows,
        columns: exportColumns.map((column) => ({
          header: column.header,
          value: (row: Record<string, unknown>) => toExportValue(getNestedValue(row, column.field))
        }))
      };
      if (mode === 'csv') {
        exportReportCsv(options);
        return;
      }
      if (mode === 'excel') {
        await exportReportExcel(options);
        return;
      }
      exportReportPdf(options);
    },
    [exportColumns, exportRows, resolvedExportFileName]
  );

  const skeletonLoadingIcon = useMemo(() => {
    if (!shouldShowSkeleton) return rest.loadingIcon;
    const rows = Array.from({ length: resolvedSkeletonRows }, (_, rowIndex) => (
      <div
        key={`skeleton-row-${rowIndex}`}
        className="app-data-table-skeleton-row"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columnCount }, (_, colIndex) => (
          <Skeleton key={`skeleton-cell-${rowIndex}-${colIndex}`} height="0.85rem" />
        ))}
      </div>
    ));
    return <div className="app-data-table-skeleton">{rows}</div>;
  }, [columnCount, resolvedSkeletonRows, rest.loadingIcon, shouldShowSkeleton]);

  const handleHeaderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEnterWithoutModifiers(event)) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (shouldSkipEnterAsTabTarget(target)) return;
      event.preventDefault();
      if (!headerRef.current) return;
      focusNextElement(target, headerRef.current);
    },
    []
  );

  const decorateHeaderActions = useCallback(
    (actions: React.ReactNode): React.ReactNode => {
      const decorate = (nodes: React.ReactNode): React.ReactNode =>
        React.Children.map(nodes, (child) => {
          if (!React.isValidElement(child)) return child;
          if (child.type === React.Fragment) {
            return <React.Fragment>{decorate(child.props.children)}</React.Fragment>;
          }
          const label = typeof child.props.label === 'string' ? child.props.label : '';
          const icon = typeof child.props.icon === 'string' ? child.props.icon : '';
          const { isPrint, isRefresh, isExport } = readActionMeta(label, icon);
          const hasKnownAction = isPrint || isRefresh || isExport;
          const actionClass = classNames(
            hasKnownAction && 'app-action-compact',
            isPrint && 'app-action-print',
            isRefresh && 'app-action-refresh',
            isExport && 'app-action-export'
          );
          const childDisplayName =
            typeof child.type === 'function' ? (child.type as { displayName?: string }).displayName : undefined;
          const isButtonLike = child.type === Button || childDisplayName === 'Button';

          if (isExport && isButtonLike) {
            const onClick = child.props.onClick as ((event: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
            const hasOriginalCsvHandler = typeof onClick === 'function';
            const canAutoExport = exportRows.length > 0 && exportColumns.length > 0;
            const isDisabled = Boolean(child.props.disabled) || (!hasOriginalCsvHandler && !canAutoExport);
            const handleCsv = () => {
              if (hasOriginalCsvHandler) {
                onClick?.(createSyntheticMouseEvent());
                return;
              }
              void runAutoExport('csv');
            };
            const exportMenuItems: MenuItem[] = [
              {
                label: 'Export CSV',
                icon: 'pi pi-file',
                disabled: !hasOriginalCsvHandler && !canAutoExport,
                command: () => {
                  handleCsv();
                }
              },
              {
                label: 'Export Excel',
                icon: 'pi pi-file-excel',
                disabled: !canAutoExport,
                command: () => {
                  void runAutoExport('excel');
                }
              },
              {
                label: 'Export PDF',
                icon: 'pi pi-file-pdf',
                disabled: !canAutoExport,
                command: () => {
                  void runAutoExport('pdf');
                }
              }
            ];

            return (
              <SplitButton
                label={label || 'Export'}
                icon={icon || 'pi pi-download'}
                model={exportMenuItems}
                onClick={handleCsv}
                disabled={isDisabled}
                text
                buttonClassName={classNames('p-button-text app-action-compact app-action-export')}
                menuButtonClassName={classNames('p-button-text app-action-compact app-action-export')}
              />
            );
          }

          if (!hasKnownAction) return child;
          const typedChild = child as React.ReactElement<{ className?: string }>;
          return React.cloneElement(typedChild, {
            className: classNames(child.props.className, actionClass)
          });
        });

      return decorate(actions);
    },
    [exportColumns.length, exportRows.length, runAutoExport]
  );

  const clearColumnHeaderFilters = useCallback(() => {
    const currentFilters = rest.filters as DataTableFilterMeta | undefined;
    const onFilter = rest.onFilter as ((event: DataTableFilterEvent) => void) | undefined;
    if (!currentFilters || typeof onFilter !== 'function') return;
    const clearedFilters = clearDataTableFilters(currentFilters);
    onFilter({ filters: clearedFilters } as DataTableFilterEvent);
  }, [rest.filters, rest.onFilter]);
  const resolvedFrozenValue = useMemo(() => {
    if (Array.isArray(topSummaryRows) && topSummaryRows.length > 0) return topSummaryRows;
    return restFrozenValue as unknown;
  }, [restFrozenValue, topSummaryRows]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ReportTableFilterResetDetail>).detail;
      const sourceButton = detail?.sourceButton;
      if (sourceButton instanceof HTMLElement && tableWrapperRef.current instanceof HTMLElement) {
        const sourceScope = sourceButton.closest('.card, .app-gradient-card, .layout-content, body');
        const tableScope = tableWrapperRef.current.closest('.card, .app-gradient-card, .layout-content, body');
        if (sourceScope && tableScope && sourceScope !== tableScope) return;
      }
      clearColumnHeaderFilters();
    };

    window.addEventListener(REPORT_TABLE_CLEAR_FILTERS_EVENT, listener as EventListener);
    return () => {
      window.removeEventListener(REPORT_TABLE_CLEAR_FILTERS_EVENT, listener as EventListener);
    };
  }, [clearColumnHeaderFilters]);

  return (
    <div ref={tableWrapperRef} className="flex flex-column gap-2">
      {(headerLeft || headerRight) && (
        <div
          ref={headerRef}
          className={classNames(
            'flex align-items-start gap-2 app-data-table-header',
            headerLeft ? 'justify-content-between' : 'justify-content-end'
          )}
          onKeyDown={handleHeaderKeyDown}
        >
          {headerLeft && (
            <div className="flex align-items-center gap-2 flex-wrap app-data-table-filters">
              {headerLeft}
            </div>
          )}
          {headerRight && (
            <div className="flex align-items-center gap-2 flex-wrap app-data-table-actions">
              {decorateHeaderActions(headerRight)}
            </div>
          )}
        </div>
      )}
      <DataTable
        {...rest}
        frozenValue={resolvedFrozenValue as any}
        rowsPerPageOptions={resolvedRowsPerPageOptions}
        ref={ref}
        loading={shouldDisplayLoadingOverlay}
        loadingIcon={skeletonLoadingIcon}
        className={classNames('app-data-table', shouldShowSkeleton && 'app-data-table--skeleton', className)}
      >
        {processedChildren}
      </DataTable>
      {recordSummary && (
        <div className="app-data-table-summary text-600 text-sm text-right">{recordSummary}</div>
      )}
    </div>
  );
};

export const AppDataTable = forwardRef(AppDataTableInner) as <T extends AppDataTableRow = AppDataTableRow>(
  props: AppDataTableProps<T> & React.RefAttributes<any>
) => React.ReactElement | null;

export default AppDataTable;
