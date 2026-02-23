import { z } from 'zod';
import type { CompanyProfileCustomPair } from './types';

export const companyProfileFormSchema = z
    .object({
        name: z.string().trim().min(1, 'Company name is required'),
        alias: z.string().trim().min(1, 'Company alias is required'),
        countryId: z.number().nullable().optional(),
        stateId: z.number().nullable().optional(),
        districtId: z.number().nullable().optional(),
        cityId: z.number().nullable().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        addressLine3: z.string().optional()
    })
    .refine(
        (data) =>
            !(
                !data.cityId &&
                ((data.addressLine1 && data.addressLine1.trim()) ||
                    (data.addressLine2 && data.addressLine2.trim()) ||
                    (data.addressLine3 && data.addressLine3.trim()))
            ),
        { message: 'Select a city when address is provided', path: ['cityId'] }
    )
    .refine((data) => !(data.cityId && !data.districtId), {
        message: 'Select a district for the city',
        path: ['districtId']
    })
    .refine((data) => !(data.districtId && !data.stateId), {
        message: 'Select a state for the district',
        path: ['stateId']
    })
    .refine((data) => !(data.stateId && !data.countryId), {
        message: 'Select a country for the state',
        path: ['countryId']
    });

const customPairSchema = z.object({
    id: z.string().min(1),
    key: z.string().trim().min(1, 'Key is required').max(80, 'Key is too long'),
    value: z.string().max(500, 'Value is too long')
});

export const companyProfileCustomPairListSchema = z
    .array(customPairSchema)
    .superRefine((pairs, ctx) => {
        const seen = new Map<string, string>();
        pairs.forEach((pair, index) => {
            const normalized = pair.key.trim().toLowerCase();
            if (!normalized) return;
            const existingId = seen.get(normalized);
            if (existingId && existingId !== pair.id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Duplicate key',
                    path: [index, 'key']
                });
                return;
            }
            seen.set(normalized, pair.id);
        });
    });

export const collectCustomPairErrors = (
    pairs: CompanyProfileCustomPair[],
    reservedKeys: Set<string>
) => {
    const errors: Record<string, string> = {};

    const parsed = companyProfileCustomPairListSchema.safeParse(pairs);
    if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
            const pairIndex = typeof issue.path[0] === 'number' ? Number(issue.path[0]) : -1;
            const fieldName = String(issue.path[1] ?? 'key');
            if (pairIndex < 0) {
                errors.customPairs = issue.message;
                return;
            }
            const pairId = pairs[pairIndex]?.id;
            if (!pairId) {
                errors.customPairs = issue.message;
                return;
            }
            errors[`customPairs.${pairId}.${fieldName}`] = issue.message;
        });
    }

    pairs.forEach((pair) => {
        const key = pair.key.trim();
        if (!key) return;
        const normalized = key.toLowerCase();
        if (!reservedKeys.has(normalized)) return;
        errors[`customPairs.${pair.id}.key`] = 'This key is already used by a dynamic field definition';
    });

    return errors;
};
