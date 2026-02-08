const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

export const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

export const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

export const resolveOptionLabel = (
    value: number | null,
    options: Array<{ value: number; label: string }>,
    fallback: string
) => {
    if (value == null) return 'All';
    const match = options.find((option) => Number(option.value) === Number(value));
    return match?.label ?? `${fallback} ${value}`;
};

const parseDateText = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const toLocalDate = (year: number, month: number, day: number) => {
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
        return new Date(year, month - 1, day);
    };

    if (/^\d{8}$/.test(trimmed)) {
        const year = Number(trimmed.slice(0, 4));
        const month = Number(trimmed.slice(4, 6));
        const day = Number(trimmed.slice(6, 8));
        return toLocalDate(year, month, day);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map(Number);
        return toLocalDate(year, month, day);
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const day = Number(slash[1]);
        const month = Number(slash[2]);
        const year = Number(slash[3]);
        return toLocalDate(year, month, day);
    }
    return null;
};

const parseFiscalYearRange = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const rangeMatch = trimmed.match(/(\d{4})\D+(\d{2,4})/);
    if (!rangeMatch) return null;
    const startYear = Number(rangeMatch[1]);
    const endText = rangeMatch[2];
    const endYear = endText.length === 2 ? Number(`${String(startYear).slice(0, 2)}${endText}`) : Number(endText);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    if (startYear < 1900 || endYear < 1900) return null;
    return { startYear, endYear };
};

const buildDefaultFiscalRange = (baseDate = new Date()) => {
    const startYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
    const start = new Date(startYear, 3, 1);
    const end = new Date(startYear + 1, 2, 31);
    return { start, end };
};

export const resolveFiscalRange = (startText: string | null, endText: string | null) => {
    let start = parseDateText(startText);
    let end = parseDateText(endText);

    if (start || end) {
        if (start && !end) {
            end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
        } else if (!start && end) {
            start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
        }
        return { start: start ?? null, end: end ?? null };
    }

    const range = parseFiscalYearRange(startText ?? endText);
    if (range) {
        return {
            start: new Date(range.startYear, 3, 1),
            end: new Date(range.endYear, 2, 31)
        };
    }

    return buildDefaultFiscalRange();
};

export const monthLabel = (key: string) => {
    const safe = key?.trim();
    if (!safe || safe.length < 7) return key;
    const date = new Date(`${safe}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${date.getFullYear()} - ${month}`;
};

export const monthRangeFromKey = (key: string) => {
    const match = key.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (Number.isNaN(year) || Number.isNaN(month)) return null;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { from: toDateText(start), to: toDateText(end) };
};
