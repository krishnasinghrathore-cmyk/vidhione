export const toYmd = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const toYmdOrNull = (date: Date | null) => (date ? toYmd(date) : null);

export const toYmdOrEmpty = (date: Date | null) => (date ? toYmd(date) : '');

export const addDays = (date: Date, days: number) => {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + days);
    return dt;
};

