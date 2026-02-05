const ACCESS_TOKEN_KEY = 'vidhione.accessToken';
const ADMIN_TOKEN_KEY = 'vidhione.adminToken';
const SESSION_FISCAL_YEAR_KEY = 'vidhione.sessionFiscalYear';

const hasWindow = () => typeof window !== 'undefined';

export const getAccessToken = () => {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string | null) => {
    if (!hasWindow()) return;
    if (!token) window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    else window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getAdminToken = () => {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminToken = (token: string | null) => {
    if (!hasWindow()) return;
    if (!token) window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    else window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export type SessionFiscalYear = {
    companyFiscalYearId: number;
    fiscalYearStart: string | null;
    fiscalYearEnd: string | null;
};

export const getSessionFiscalYear = (): SessionFiscalYear | null => {
    if (!hasWindow()) return null;
    const raw = window.localStorage.getItem(SESSION_FISCAL_YEAR_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<SessionFiscalYear>;
        const id = Number(parsed?.companyFiscalYearId ?? 0);
        if (!Number.isFinite(id) || id <= 0) return null;
        return {
            companyFiscalYearId: id,
            fiscalYearStart: parsed?.fiscalYearStart ?? null,
            fiscalYearEnd: parsed?.fiscalYearEnd ?? null
        };
    } catch {
        return null;
    }
};

export const setSessionFiscalYear = (value: SessionFiscalYear | null) => {
    if (!hasWindow()) return;
    if (!value) {
        window.localStorage.removeItem(SESSION_FISCAL_YEAR_KEY);
        return;
    }
    window.localStorage.setItem(SESSION_FISCAL_YEAR_KEY, JSON.stringify(value));
};

export const clearAuthStorage = () => {
    setAccessToken(null);
    setAdminToken(null);
    setSessionFiscalYear(null);
};
