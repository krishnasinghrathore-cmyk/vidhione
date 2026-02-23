const REFERENCE_ERROR_PATTERNS = [
    /foreign key/i,
    /violates.*constraint/i,
    /already in use/i,
    /\bin use\b/i,
    /cannot delete/i,
    /still referenced/i,
    /dependent/i
];

const extractErrorMessage = (error: unknown): string | null => {
    if (typeof error === 'string') return error;
    if (error instanceof Error && error.message) return error.message;

    if (!error || typeof error !== 'object') return null;
    const value = error as {
        message?: string;
        graphQLErrors?: Array<{ message?: string }>;
        networkError?: { result?: { errors?: Array<{ message?: string }> } };
    };

    const gqlMessage = value.graphQLErrors?.[0]?.message;
    if (gqlMessage) return gqlMessage;

    const networkMessage = value.networkError?.result?.errors?.[0]?.message;
    if (networkMessage) return networkMessage;

    if (value.message) return value.message;
    return null;
};

export const getDeleteConfirmMessage = (entityLabel: string) =>
    `Delete this ${entityLabel}? If it is referenced in masters or transactions, deletion will be blocked.`;

export const getDeleteFailureMessage = (error: unknown, entityLabel: string) => {
    const message = extractErrorMessage(error);
    if (!message) return 'Delete failed.';

    if (REFERENCE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
        return `Cannot delete ${entityLabel} because it is referenced by other records.`;
    }

    return message;
};
