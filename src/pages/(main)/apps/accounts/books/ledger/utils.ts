const amountFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

export const formatAmount = (value: number) => amountFormatter.format(value);

export const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

export const formatDate = (value: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return dateFormatter.format(parsed);
    return trimmed;
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return formatDate(toDateText(value));
};

export const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

export const formatBalance = (signed: number) => {
    const side = signed >= 0 ? 'Dr' : 'Cr';
    return `${formatAmount(Math.abs(signed))} ${side}`;
};

export const parseDateParam = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return new Date(Number(yyyymmdd[1]), Number(yyyymmdd[2]) - 1, Number(yyyymmdd[3]));
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return null;
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

export const buildDefaultFiscalRange = (baseDate = new Date()) => {
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
