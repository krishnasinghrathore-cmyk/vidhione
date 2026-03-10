const isExactDateMatch = (candidate: Date, year: number, monthIndex: number, day: number) =>
    candidate.getFullYear() === year &&
    candidate.getMonth() === monthIndex &&
    candidate.getDate() === day;

export const isValidDateText = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
        const year = Number(yyyymmdd[1]);
        const monthIndex = Number(yyyymmdd[2]) - 1;
        const day = Number(yyyymmdd[3]);
        const candidate = new Date(year, monthIndex, day);
        return !Number.isNaN(candidate.getTime()) && isExactDateMatch(candidate, year, monthIndex, day);
    }
    const iso = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (iso) {
        const year = Number(iso[1]);
        const monthIndex = Number(iso[2]) - 1;
        const day = Number(iso[3]);
        const candidate = new Date(year, monthIndex, day);
        return !Number.isNaN(candidate.getTime()) && isExactDateMatch(candidate, year, monthIndex, day);
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const year = Number(slash[3]);
        const monthIndex = Number(slash[2]) - 1;
        const day = Number(slash[1]);
        const candidate = new Date(year, monthIndex, day);
        return !Number.isNaN(candidate.getTime()) && isExactDateMatch(candidate, year, monthIndex, day);
    }
    return false;
};

export const parseDateTextValue = (value: string | null | undefined) => {
    const trimmed = value?.trim() ?? '';
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

    const iso = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
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

export const formatDateTextValue = (value: Date | null) => {
    if (!value) return '';
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
