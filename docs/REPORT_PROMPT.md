New report task: build /apps/accounts/<report-name> using the latest report components and patterns.

Use:
- ReportDataTable for the grid.
- reportSkeleton helpers (skeletonCell, buildSkeletonRows, isSkeletonRow) for loading.
- AppReportActions for common buttons (Refresh/Print/Export).
- AppDateInput + AppAutoComplete for filters.
- Keep layout consistent with Ledger Statement and Month-wise Summary.

Requirements:
1) Filters layout: [From Date] [To Date] on one line, then main filters on next line(s). Add a "Today" toggle only when explicitly requested; if included, default it to off.
2) Report actions aligned on right above the table, like Ledger Summary.
3) When loading: show skeleton rows/footers; keep headers visible; no spinner overlay. Skeleton should appear only when the table is empty.
4) When no data: show headers + footer and "No results found".
5) Numeric columns right-aligned (use summary-number class).
6) Use compact sizes (small inputs, compact button spacing).
7) Use summary-table class on the ReportDataTable for consistent header styling.
8) Keep loading/empty messaging in the table: emptyMessage '' while loading, then the proper empty text.
9) Data fetching: use apply/skip pattern, `notifyOnNetworkStatusChange: true`, and prefer `fetchPolicy: 'cache-and-network'` with `nextFetchPolicy: 'cache-first'` so refresh keeps existing rows visible.
10) Keyboard flow: Enter behaves like Tab inside report header filters; last filter should focus Refresh.
11) Column filters and sorting standard: use Day Book style Excel-like menu filters (`filterDisplay='menu'`) with `Any` multi-select filter controls (`FilterMatchMode.IN`, show `Clear/Apply`), and keep sortable headers enabled on all report columns where sorting is meaningful.

Please check legacy form <legacy-form-name> for fields/behavior and confirm GraphQL mapping to stored procedure (report list, totals, opening balance).
