export type MasterDialogDirection = 'first' | 'previous' | 'next' | 'last';

const toRecord = (row: unknown): Record<string, unknown> | null => {
  if (!row || typeof row !== 'object') return null;
  return row as Record<string, unknown>;
};

const getRowIdentity = (row: unknown): string | null => {
  const record = toRecord(row);
  if (!record) return null;

  // Prefer explicit *Id fields, fallback to first primitive field.
  const idEntry = Object.entries(record).find(
    ([key, value]) => /id$/i.test(key) && (typeof value === 'number' || typeof value === 'string')
  );
  if (idEntry) return String(idEntry[1]);

  const primitiveEntry = Object.entries(record).find(([, value]) =>
    typeof value === 'number' || typeof value === 'string'
  );
  return primitiveEntry ? String(primitiveEntry[1]) : null;
};

export const findMasterRowIndex = <T>(rows: T[], activeRow: T | null | undefined): number => {
  const activeIdentity = getRowIdentity(activeRow);
  if (!activeIdentity) return -1;
  return rows.findIndex((row) => getRowIdentity(row) === activeIdentity);
};

export const getMasterRowByDirection = <T>(
  rows: T[],
  currentIndex: number,
  direction: MasterDialogDirection
): T | null => {
  if (rows.length === 0 || currentIndex < 0) return null;

  let nextIndex = currentIndex;
  if (direction === 'first') nextIndex = 0;
  if (direction === 'previous') nextIndex = currentIndex - 1;
  if (direction === 'next') nextIndex = currentIndex + 1;
  if (direction === 'last') nextIndex = rows.length - 1;

  const nextRow = rows[nextIndex];
  return nextRow ?? null;
};
