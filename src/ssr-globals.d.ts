import type { NormalizedCacheObject } from '@apollo/client';
import type { AuthState } from './lib/auth/context';

declare global {
    interface Window {
        __APOLLO_STATE__?: NormalizedCacheObject;
        __AUTH_STATE__?: Partial<AuthState> | null;
    }
}

export {};

