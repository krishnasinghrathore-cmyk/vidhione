import type { LedgerGroupOption } from '@/lib/accounts/ledgerGroups';

export type LedgerGroupFilter = {
    filterIds: number[];
    fetchGroupId: number | null;
};

const normalizeLedgerGroupLabel = (value?: string | null) =>
    (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

export const isBankAccountsLabel = (value?: string | null) => {
    const key = normalizeLedgerGroupLabel(value);
    return (
        key === 'bankaccount' ||
        key === 'bankaccounts' ||
        key.startsWith('bankac') ||
        key.includes('bankaccount')
    );
};

export const isBankGroupLabel = (value?: string | null) => {
    const key = normalizeLedgerGroupLabel(value);
    return isBankAccountsLabel(value) || key.startsWith('bankoc') || key.startsWith('bankod');
};

export const resolveLedgerGroupFilter = (
    ledgerGroupId: number | null | undefined,
    options: LedgerGroupOption[]
): LedgerGroupFilter => {
    if (ledgerGroupId == null || ledgerGroupId <= 0 || options.length === 0) {
        return { filterIds: [], fetchGroupId: ledgerGroupId ?? null };
    }

    const selected = options.find((option) => Number(option.value) === Number(ledgerGroupId));
    if (!selected) {
        return { filterIds: [ledgerGroupId], fetchGroupId: ledgerGroupId };
    }

    const selectedLabel = (selected.label ?? selected.name ?? '').trim();
    if (isBankAccountsLabel(selectedLabel)) {
        const bankGroupIds = options
            .filter((option) => {
                const label = (option.label ?? option.name ?? '').trim();
                return isBankGroupLabel(label);
            })
            .map((option) => Number(option.value))
            .filter((value) => Number.isFinite(value) && value > 0);
        const uniqueIds = Array.from(new Set(bankGroupIds));
        if (uniqueIds.length > 0) {
            return {
                filterIds: uniqueIds,
                fetchGroupId: uniqueIds.length > 1 ? null : uniqueIds[0]
            };
        }
    }

    const selectedGroupType = selected.groupTypeCode != null ? Number(selected.groupTypeCode) : null;
    const selectedId = Number(selected.value);
    const isBaseGroup =
        Number.isFinite(selectedGroupType) &&
        Number(selectedGroupType) > 0 &&
        Number.isFinite(selectedId) &&
        selectedGroupType === selectedId;
    if (isBaseGroup) {
        const relatedGroupIds = options
            .filter((option) => Number(option.groupTypeCode) === selectedGroupType)
            .map((option) => Number(option.value))
            .filter((value) => Number.isFinite(value) && value > 0);
        const uniqueIds = Array.from(new Set(relatedGroupIds));
        if (uniqueIds.length > 0) {
            return {
                filterIds: uniqueIds,
                fetchGroupId: uniqueIds.length > 1 ? null : uniqueIds[0]
            };
        }
    }

    return { filterIds: [ledgerGroupId], fetchGroupId: ledgerGroupId };
};
