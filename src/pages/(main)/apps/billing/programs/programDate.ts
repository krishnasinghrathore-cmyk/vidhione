import { formatVoucherDate } from '../helpers';

export const parseProgramDate = (value: string | null): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const toProgramDateValue = (value: Date | null): string | null => {
    if (!value || Number.isNaN(value.getTime())) return null;
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const formatProgramDate = (value: string | null): string => formatVoucherDate(value);
