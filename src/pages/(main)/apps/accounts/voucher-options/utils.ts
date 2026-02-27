import type { VoucherTypeFormState } from './types';

export const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export const toDateText = (date: Date | null) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

export const parseDateText = (value: string | null | undefined): Date | null => {
    const raw = value?.trim();
    if (!raw) return null;

    const compact = raw.replace(/\D/g, '');
    if (compact.length === 8) {
        const yyyy = Number(compact.slice(0, 4));
        const mm = Number(compact.slice(4, 6));
        const dd = Number(compact.slice(6, 8));
        if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
        const parsed = new Date(yyyy, mm - 1, dd);
        if (parsed.getFullYear() === yyyy && parsed.getMonth() === mm - 1 && parsed.getDate() === dd) return parsed;
    }

    const direct = new Date(raw);
    return Number.isNaN(direct.getTime()) ? null : direct;
};

export const formatDate = (value: string | null | undefined) => {
    if (!value) return '';
    const parsed = parseDateText(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const resolveFlag = (value: boolean | null | undefined) => Boolean(value);

export const formatVoucherPreview = (
    prefix: string,
    startFrom: number | string | null,
    suffix: string,
    isManual: boolean
) => {
    if (isManual) return 'Manual';
    const numericStart =
        typeof startFrom === 'string' ? Number(startFrom.trim()) : startFrom;
    const start =
        numericStart == null || !Number.isFinite(numericStart) ? 0 : Math.max(0, Math.trunc(numericStart));
    const padded = String(start).padStart(4, '0');
    return `${prefix ?? ''}${padded}${suffix ?? ''}`;
};

const toDateTime = (value: Date | null) => (value ? value.getTime() : null);

export const areVoucherTypeFormsEqual = (left: VoucherTypeFormState, right: VoucherTypeFormState) =>
    left.voucherTypeName === right.voucherTypeName &&
    left.displayName === right.displayName &&
    left.prefix === right.prefix &&
    left.suffix === right.suffix &&
    left.voucherStartNumber === right.voucherStartNumber &&
    left.defaultReportLookbackDays === right.defaultReportLookbackDays &&
    left.isManualVoucherNo === right.isManualVoucherNo &&
    left.isLocked === right.isLocked &&
    toDateTime(left.lockFromDate) === toDateTime(right.lockFromDate) &&
    toDateTime(left.lockToDate) === toDateTime(right.lockToDate) &&
    left.disclaimer1 === right.disclaimer1 &&
    left.disclaimer2 === right.disclaimer2 &&
    left.disclaimer3 === right.disclaimer3 &&
    left.disclaimer4 === right.disclaimer4 &&
    left.disclaimer5 === right.disclaimer5 &&
    left.editPassword === right.editPassword;
