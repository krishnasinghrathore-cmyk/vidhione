import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';

const FALLBACK_TENANT_ID = 'default';

const readRowsFromStorage = <TRow,>(storageKey: string): TRow[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as TRow[]) : [];
    } catch {
        return [];
    }
};

const writeRowsToStorage = <TRow,>(storageKey: string, rows: TRow[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(rows));
};

const computeNextNumericId = <TRow extends Record<string, unknown>>(
    rows: TRow[],
    idField: keyof TRow
) => {
    let maxId = 0;
    rows.forEach((row) => {
        const value = row[idField];
        if (typeof value === 'number' && Number.isFinite(value) && value > maxId) {
            maxId = value;
        }
    });
    return maxId + 1;
};

type UseProgramLocalRowsOptions<TRow extends Record<string, unknown>> = {
    scope: string;
    idField: keyof TRow;
};

export const useProgramLocalRows = <TRow extends Record<string, unknown>>({
    scope,
    idField
}: UseProgramLocalRowsOptions<TRow>) => {
    const { tenantId } = useAuth();
    const [rows, setRows] = useState<TRow[]>([]);
    const [hydrated, setHydrated] = useState(false);

    const storageKey = useMemo(
        () => `vidhione.billing.programs.${scope}.${tenantId || FALLBACK_TENANT_ID}`,
        [scope, tenantId]
    );

    useEffect(() => {
        setHydrated(false);
        const nextRows = readRowsFromStorage<TRow>(storageKey);
        setRows(nextRows);
        setHydrated(true);
    }, [storageKey]);

    useEffect(() => {
        if (!hydrated) return;
        writeRowsToStorage(storageKey, rows);
    }, [hydrated, rows, storageKey]);

    const reloadRows = useCallback(() => {
        const nextRows = readRowsFromStorage<TRow>(storageKey);
        setRows(nextRows);
    }, [storageKey]);

    const nextId = useMemo(() => computeNextNumericId(rows, idField), [idField, rows]);

    return {
        rows,
        setRows,
        reloadRows,
        nextId,
        storageKey
    };
};
