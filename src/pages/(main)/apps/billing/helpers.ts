export const makeKey = () => Math.random().toString(36).slice(2);

export const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export const formatVoucherDate = (value: string | null) => {
    if (!value) return '-';
    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) return `${trimmed.slice(6, 8)}/${trimmed.slice(4, 6)}/${trimmed.slice(0, 4)}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('-');
        return `${dd}/${mm}/${yyyy}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    return trimmed;
};

export const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};
