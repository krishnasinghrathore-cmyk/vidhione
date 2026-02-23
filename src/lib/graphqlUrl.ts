const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:4000/graphql';
const DEFAULT_SSR_API_ORIGIN = 'http://127.0.0.1:4000';

const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const resolveSsrApiOrigin = () => {
    if (typeof process === 'undefined') return DEFAULT_SSR_API_ORIGIN;
    const configuredOrigin = process.env.SSR_API_ORIGIN?.trim();
    if (!configuredOrigin) return DEFAULT_SSR_API_ORIGIN;
    if (!isAbsoluteHttpUrl(configuredOrigin)) return DEFAULT_SSR_API_ORIGIN;
    return configuredOrigin.replace(/\/+$/, '');
};

const toAbsoluteServerUrl = (pathOrUrl: string) => {
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${resolveSsrApiOrigin()}${normalizedPath}`;
};

export const resolveGraphqlUrl = (override?: string | null) => {
    const candidate =
        (override && override.trim().length > 0 ? override.trim() : null) ||
        (import.meta.env.VITE_GRAPHQL_URL && import.meta.env.VITE_GRAPHQL_URL.trim().length > 0
            ? import.meta.env.VITE_GRAPHQL_URL.trim()
            : null) ||
        DEFAULT_GRAPHQL_URL;

    if (isAbsoluteHttpUrl(candidate)) return candidate;

    if (typeof window !== 'undefined') {
        return candidate;
    }

    return toAbsoluteServerUrl(candidate);
};

