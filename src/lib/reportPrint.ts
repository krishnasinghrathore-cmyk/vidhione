import { useCallback, useEffect, useRef, useState } from 'react';

type UseReportPrintOptions<T> = {
    rows: T[];
    getPrintRows?: () => Promise<T[]>;
};

export const formatReportTimestamp = (value: Date | null) => {
    if (!value) return '';
    return value.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const useReportPrint = <T,>({ rows, getPrintRows }: UseReportPrintOptions<T>) => {
    const [isPrinting, setIsPrinting] = useState(false);
    const [printRows, setPrintRows] = useState<T[] | null>(null);
    const printLockRef = useRef(false);

    const triggerPrint = useCallback(async () => {
        if (printLockRef.current) return;
        printLockRef.current = true;
        let nextRows = rows;
        if (getPrintRows) {
            try {
                const fetched = await getPrintRows();
                if (Array.isArray(fetched)) {
                    nextRows = fetched;
                }
            } catch {
                nextRows = rows;
            }
        }
        setPrintRows(nextRows);
        setIsPrinting(true);
    }, [getPrintRows, rows]);

    useEffect(() => {
        if (!isPrinting || typeof window === 'undefined') return;
        const finish = () => {
            setIsPrinting(false);
            setPrintRows(null);
            printLockRef.current = false;
        };
        const handleAfterPrint = () => finish();
        window.addEventListener('afterprint', handleAfterPrint);
        const doPrint = () => window.print();
        if (document.readyState === 'complete') {
            setTimeout(doPrint, 0);
        } else {
            window.onload = doPrint;
        }
        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [isPrinting]);

    return { isPrinting, printRows, triggerPrint };
};
