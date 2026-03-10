const isExactDateMatch = (candidate: Date, year: number, monthIndex: number, day: number) =>
    candidate.getFullYear() === year &&
    candidate.getMonth() === monthIndex &&
    candidate.getDate() === day;

export const parseExtraDateValue = (value: unknown): Date | null => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
        const year = Number(yyyymmdd[1]);
        const monthIndex = Number(yyyymmdd[2]) - 1;
        const day = Number(yyyymmdd[3]);
        const candidate = new Date(year, monthIndex, day);
        return !Number.isNaN(candidate.getTime()) && isExactDateMatch(candidate, year, monthIndex, day)
            ? candidate
            : null;
    }

    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const year = Number(iso[1]);
        const monthIndex = Number(iso[2]) - 1;
        const day = Number(iso[3]);
        const candidate = new Date(year, monthIndex, day);
        return !Number.isNaN(candidate.getTime()) && isExactDateMatch(candidate, year, monthIndex, day)
            ? candidate
            : null;
    }

    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const year = Number(slash[3]);
        const monthIndex = Number(slash[2]) - 1;
        const day = Number(slash[1]);
        const candidate = new Date(year, monthIndex, day);
        return !Number.isNaN(candidate.getTime()) && isExactDateMatch(candidate, year, monthIndex, day)
            ? candidate
            : null;
    }

    return null;
};

export const parseStoredDateValue = (value?: string | null) => {
    const parsed = parseExtraDateValue(value);
    if (!parsed) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

export const formatDateForStorage = (value: Date | null) => {
    if (!value) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
