const getDefaultGraphqlUrl = () => {
    if (import.meta.env.VITE_GRAPHQL_URL) return import.meta.env.VITE_GRAPHQL_URL;
    if (typeof window !== 'undefined') return `${window.location.origin}/graphql`;
    return 'http://127.0.0.1:4000/graphql';
};

export const getApiBaseUrl = () => {
    const base = getDefaultGraphqlUrl();
    if (/\/graphql\/?$/.test(base)) return base.replace(/\/graphql\/?$/, '');
    return base.replace(/\/$/, '');
};

export const apiUrl = (path: string) => {
    const base = getApiBaseUrl();
    if (!path) return base;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};
