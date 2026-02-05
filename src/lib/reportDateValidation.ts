import { z } from 'zod';

export type DateRangeInput = {
    fromDate: Date | null;
    toDate: Date | null;
};

export type DateRangeErrors = Partial<Record<keyof DateRangeInput, string>>;

export type SingleDateInput = {
    date: Date | null;
};

export type SingleDateErrors = Partial<Record<keyof SingleDateInput, string>>;

export type FiscalRange = {
    start?: Date | null;
    end?: Date | null;
};

const toDateOrUndefined = (value: unknown) => (value instanceof Date ? value : undefined);

const formatDateLabel = (value: Date) =>
    value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const buildDateRangeSchema = (range?: FiscalRange | null) => {
    const start = range?.start ?? null;
    const end = range?.end ?? null;

    let schema = z.object({
        fromDate: z.preprocess(
            toDateOrUndefined,
            z.date({ required_error: 'From date is required' })
        ),
        toDate: z.preprocess(
            toDateOrUndefined,
            z.date({ required_error: 'To date is required' })
        )
    });

    schema = schema.refine((data) => data.fromDate <= data.toDate, {
        path: ['toDate'],
        message: 'To date must be on or after From date'
    });

    if (start) {
        const label = formatDateLabel(start);
        schema = schema.refine((data) => data.fromDate >= start, {
            path: ['fromDate'],
            message: `From date must be on or after ${label}`
        });
        schema = schema.refine((data) => data.toDate >= start, {
            path: ['toDate'],
            message: `To date must be on or after ${label}`
        });
    }

    if (end) {
        const label = formatDateLabel(end);
        schema = schema.refine((data) => data.fromDate <= end, {
            path: ['fromDate'],
            message: `From date must be on or before ${label}`
        });
        schema = schema.refine((data) => data.toDate <= end, {
            path: ['toDate'],
            message: `To date must be on or before ${label}`
        });
    }

    return schema;
};

export const buildSingleDateSchema = (range?: FiscalRange | null) => {
    const start = range?.start ?? null;
    const end = range?.end ?? null;

    let schema = z.object({
        date: z.preprocess(
            toDateOrUndefined,
            z.date({ required_error: 'Date is required' })
        )
    });

    if (start) {
        const label = formatDateLabel(start);
        schema = schema.refine((data) => data.date >= start, {
            path: ['date'],
            message: `Date must be on or after ${label}`
        });
    }

    if (end) {
        const label = formatDateLabel(end);
        schema = schema.refine((data) => data.date <= end, {
            path: ['date'],
            message: `Date must be on or before ${label}`
        });
    }

    return schema;
};

export const validateDateRange = (input: DateRangeInput, range?: FiscalRange | null) => {
    const result = buildDateRangeSchema(range).safeParse(input);
    if (result.success) {
        return { ok: true as const, data: result.data, errors: {} as DateRangeErrors };
    }

    const errors: DateRangeErrors = {};
    result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (!key) return;
        if (key === 'fromDate' || key === 'toDate') {
            errors[key] = issue.message;
        }
    });

    return { ok: false as const, errors };
};

export const validateSingleDate = (input: SingleDateInput, range?: FiscalRange | null) => {
    const result = buildSingleDateSchema(range).safeParse(input);
    if (result.success) {
        return { ok: true as const, data: result.data, errors: {} as SingleDateErrors };
    }

    const errors: SingleDateErrors = {};
    result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (!key) return;
        if (key === 'date') {
            errors.date = issue.message;
        }
    });

    return { ok: false as const, errors };
};
