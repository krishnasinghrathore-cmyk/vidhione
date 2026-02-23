import { useEffect, useRef, useState } from 'react';

const nowMs = () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

export const formatReportLoadDuration = (ms: number) => {
    const safe = Math.max(0, ms);
    if (safe < 1000) {
        return `${Math.round(safe)} ms`;
    }
    return `${(safe / 1000).toFixed(2)} s`;
};

type UseReportLoadTimeArgs = {
    loadingState?: boolean;
    enabled?: boolean;
};

type UseReportLoadTimeResult = {
    activeLoadMs: number | null;
    lastLoadMs: number | null;
};

export const useReportLoadTime = ({
    loadingState,
    enabled = true
}: UseReportLoadTimeArgs): UseReportLoadTimeResult => {
    const loadingStartRef = useRef<number | null>(null);
    const [activeLoadMs, setActiveLoadMs] = useState<number | null>(null);
    const [lastLoadMs, setLastLoadMs] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled || loadingState === undefined) {
            loadingStartRef.current = null;
            setActiveLoadMs(null);
            return;
        }

        if (loadingState) {
            if (loadingStartRef.current == null) {
                loadingStartRef.current = nowMs();
            }
            return;
        }

        if (loadingStartRef.current != null) {
            const elapsed = nowMs() - loadingStartRef.current;
            loadingStartRef.current = null;
            setLastLoadMs(elapsed);
        }
        setActiveLoadMs(null);
    }, [enabled, loadingState]);

    useEffect(() => {
        if (!enabled || !loadingState || loadingStartRef.current == null) return;

        const update = () => {
            if (loadingStartRef.current == null) return;
            setActiveLoadMs(nowMs() - loadingStartRef.current);
        };

        update();
        const intervalId = globalThis.setInterval(update, 200);
        return () => {
            globalThis.clearInterval(intervalId);
        };
    }, [enabled, loadingState]);

    return { activeLoadMs, lastLoadMs };
};
