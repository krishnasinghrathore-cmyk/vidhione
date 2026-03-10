import { gql } from '@apollo/client';

export type WealthInvestorProfile = {
    id: string;
    name: string;
    pan?: string | null;
    relationship?: string | null;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
    notes?: string | null;
    createdAt?: string | null;
};

export type WealthDematAccount = {
    id: string;
    name: string;
    code?: string | null;
    investorProfileId?: string | null;
    investorProfileName?: string | null;
    brokerName?: string | null;
    depository?: string | null;
    dpId?: string | null;
    clientId?: string | null;
    dematNumber?: string | null;
    holderName?: string | null;
    pan?: string | null;
    isPrimary: boolean;
    isActive: boolean;
    openedOn?: string | null;
    notes?: string | null;
    createdAt?: string | null;
};

export const WEALTH_INVESTOR_PROFILES_QUERY = gql`
    query InvestorProfiles {
        investorProfiles {
            id
            name
            pan
            relationship
            email
            phone
            isActive
            notes
            createdAt
        }
    }
`;

export const WEALTH_ACCOUNTS_QUERY = gql`
    query WealthAccounts {
        accounts {
            id
            name
            code
            investorProfileId
            investorProfileName
            brokerName
            depository
            dpId
            clientId
            dematNumber
            holderName
            pan
            isPrimary
            isActive
            openedOn
            notes
            createdAt
        }
    }
`;

export const formatInvestorProfileLabel = (profile: Pick<WealthInvestorProfile, 'name' | 'relationship'>) => {
    const relationship = profile.relationship?.trim();
    return relationship ? `${profile.name} (${relationship})` : profile.name;
};

export const formatAccountLabel = (account: Pick<WealthDematAccount, 'name' | 'code'>) =>
    account.code ? `${account.name} (${account.code})` : account.name;

export const fromYmdOrNull = (value?: string | null) => {
    if (!value) return null;
    const dt = new Date(`${value}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
};