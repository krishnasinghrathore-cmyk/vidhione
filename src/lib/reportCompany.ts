import { useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';

export type ReportCompanyInfo = {
    name: string | null;
    address: string | null;
};

const toText = (value?: string | null) => value?.trim() ?? '';

export const useReportCompanyInfo = (): ReportCompanyInfo => {
    const { companyContext } = useAuth();

    return useMemo(() => {
        const name = toText(companyContext?.companyName) || toText(companyContext?.companyAlias) || null;
        const addressParts = [
            toText(companyContext?.addressLine1),
            toText(companyContext?.addressLine2),
            toText(companyContext?.addressLine3),
            toText(companyContext?.postalCode)
        ].filter(Boolean);
        const address = addressParts.length ? addressParts.join(', ') : null;
        return { name, address };
    }, [
        companyContext?.companyName,
        companyContext?.companyAlias,
        companyContext?.addressLine1,
        companyContext?.addressLine2,
        companyContext?.addressLine3,
        companyContext?.postalCode
    ]);
};
