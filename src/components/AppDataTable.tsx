import React, { forwardRef, useCallback, useMemo, useRef } from 'react';
import { DataTable, type DataTableProps } from 'primereact/datatable';
import { classNames } from 'primereact/utils';
import { Skeleton } from 'primereact/skeleton';
import { focusNextElement, isEnterWithoutModifiers, shouldSkipEnterAsTabTarget } from '@/lib/enterNavigation';

interface AppDataTableProps<T> extends DataTableProps<T[]> {
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  recordSummary?: string;
  skeletonRows?: number;
  showSkeleton?: boolean;
}

/**
 * Shared table wrapper to keep header/actions/summary consistent across screens.
 * - headerLeft: filters/search (left-aligned).
 * - headerRight: actions/summary (right-aligned).
 * - recordSummary: small text under the header on the right.
 * - children: Column definitions.
 * Styling stays token-based (Prime/Vidhione variables) for theme compatibility.
 */
export const AppDataTable = forwardRef(function AppDataTable<T>(
  {
    headerLeft,
    headerRight,
    recordSummary,
    className,
    children,
    skeletonRows,
    showSkeleton = true,
    ...rest
  }: AppDataTableProps<T>,
  ref: React.ForwardedRef<any>
) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const loading = Boolean(rest.loading);
  const valueLength = Array.isArray(rest.value) ? rest.value.length : 0;
  const hasCustomLoadingIcon = rest.loadingIcon != null;
  const shouldShowSkeleton = showSkeleton && loading && !hasCustomLoadingIcon && valueLength === 0;

  const columnCount = useMemo(() => {
    const items = React.Children.toArray(children);
    const count = items.filter((child) => React.isValidElement(child)).length;
    return Math.max(count, 1);
  }, [children]);

  const resolvedSkeletonRows = useMemo(() => {
    if (typeof skeletonRows === 'number' && skeletonRows > 0) return skeletonRows;
    if (typeof rest.rows === 'number' && rest.rows > 0) return Math.min(rest.rows, 8);
    return 6;
  }, [rest.rows, skeletonRows]);

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

  const decorateHeaderActions = (actions: React.ReactNode): React.ReactNode =>
    React.Children.map(actions, (child) => {
      if (!React.isValidElement(child)) return child;
      if (child.type === React.Fragment) {
        return (
          <React.Fragment>
            {decorateHeaderActions(child.props.children)}
          </React.Fragment>
        );
      }
      const label = typeof child.props.label === 'string' ? child.props.label.toLowerCase() : '';
      const icon = typeof child.props.icon === 'string' ? child.props.icon : '';
      let actionClass = '';
      if (label === 'print' || icon.includes('pi-print')) actionClass = 'app-action-print';
      if (label === 'refresh' || icon.includes('pi-refresh')) actionClass = 'app-action-refresh';
      if (!actionClass) return child;
      return React.cloneElement(child, {
        className: classNames(child.props.className, actionClass)
      });
    });

  return (
    <div className="flex flex-column gap-2">
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
        ref={ref}
        loadingIcon={skeletonLoadingIcon}
        className={classNames('app-data-table', shouldShowSkeleton && 'app-data-table--skeleton', className)}
      >
        {children}
      </DataTable>
      {recordSummary && (
        <div className="app-data-table-summary text-600 text-sm text-right">{recordSummary}</div>
      )}
    </div>
  );
});

export default AppDataTable;
