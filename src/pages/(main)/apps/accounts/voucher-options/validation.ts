import { z } from 'zod';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from './types';

export const voucherTypeFormSchema = z
    .object({
        voucherTypeName: z.string().trim().min(1, 'Internal Name is required'),
        displayName: z.string().trim().min(1, 'Voucher Title is required'),
        prefix: z.string(),
        suffix: z.string(),
        voucherStartNumber: z.number().int().nullable(),
        defaultReportLookbackDays: z.number().int().min(1, 'Default report days must be at least 1').max(3650, 'Default report days must be 3650 or less').nullable(),
        isManualVoucherNo: z.boolean(),
        isLocked: z.boolean(),
        lockFromDate: z.date().nullable(),
        lockToDate: z.date().nullable(),
        disclaimer1: z.string(),
        disclaimer2: z.string(),
        disclaimer3: z.string(),
        disclaimer4: z.string(),
        disclaimer5: z.string(),
        editPassword: z.string().max(50, 'Approval password must be at most 50 characters')
    })
    .superRefine((value, context) => {
        if (!value.isManualVoucherNo) {
            if (value.voucherStartNumber == null) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Start From is required when manual numbering is disabled',
                    path: ['voucherStartNumber']
                });
            } else if (!Number.isFinite(value.voucherStartNumber) || value.voucherStartNumber < 1) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Start From must be at least 1',
                    path: ['voucherStartNumber']
                });
            }
        }

        if (!value.isLocked) return;

        if (!value.lockFromDate) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'From date is required when lock is enabled',
                path: ['lockFromDate']
            });
        }

        if (!value.lockToDate) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'To date is required when lock is enabled',
                path: ['lockToDate']
            });
        }

        if (value.lockFromDate && value.lockToDate && value.lockFromDate.getTime() > value.lockToDate.getTime()) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'To date should be on or after From date',
                path: ['lockToDate']
            });
        }
    });

export const getVoucherTypeFormErrors = (state: VoucherTypeFormState): VoucherTypeFormErrors => {
    const parsed = voucherTypeFormSchema.safeParse(state);
    if (parsed.success) return {};
    const nextErrors: VoucherTypeFormErrors = {};
    parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (!key) return;
        const field = String(key) as keyof VoucherTypeFormState;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
    });
    return nextErrors;
};
