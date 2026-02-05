'use client';
import React, { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import type { Page } from '@/types';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useLocation } from 'react-router-dom';
import * as authApi from '@/lib/auth/api';

const Verification: Page = () => {
    const location = useLocation();
    const [token, setToken] = useState<string>('');
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const nextToken = new URLSearchParams(location.search).get('token');
        if (nextToken && nextToken.trim()) {
            setToken(nextToken.trim());
            void verifyToken(nextToken.trim());
        }
    }, [location.search]);

    const verifyToken = async (value: string) => {
        setError(null);
        setNotice(null);
        if (!value.trim()) {
            setError('Verification token is required.');
            return;
        }
        setLoading(true);
        try {
            await authApi.verifyEmail(value.trim());
            setNotice('Email verified. You can now sign in.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await verifyToken(token);
    };

    return (
        <>
            <div className="h-screen flex w-full surface-ground">
                <div className="flex flex-1 flex-column surface-ground align-items-center justify-content-center">
                    <div className="w-11 sm:w-30rem">
                        <div className="flex flex-column">
                            <div style={{ height: '56px', width: '56px' }} className="bg-primary-50 border-circle flex align-items-center justify-content-center">
                                <i className="pi pi-check-circle text-primary text-4xl"></i>
                            </div>
                            <div className="mt-4">
                                <h1 className="m-0 text-primary font-semibold text-4xl">Authentication?</h1>
                                <span className="block text-700 mt-2">Verify your code</span>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {!!error && <Message severity="error" text={error} className="w-full" />}
                            {!!notice && <small className="text-500">{notice}</small>}
                            <div className="mt-6 p-fluid">
                                <span className="p-input-icon-left w-full">
                                    <i className="pi pi-ticket"></i>
                                    <InputText
                                        className="w-full"
                                        placeholder="Verification Token"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        disabled={loading}
                                    />
                                </span>
                            </div>
                            <div className="mt-3">
                                <Button type="submit" className="w-full" label={loading ? 'VERIFYING...' : 'VERIFY NOW'} disabled={loading}></Button>
                            </div>
                            <div className="mt-3">
                                <Button
                                    type="button"
                                    className="w-full text-primary-500"
                                    text
                                    label="SEND AGAIN"
                                    onClick={() => setNotice('Please request a new verification link if needed.')}
                                    disabled={loading}
                                ></Button>
                            </div>
                        </form>
                    </div>
                </div>
                <div
                    style={{
                        backgroundImage: 'url(/layout/images/pages/accessDenied-bg.jpg)'
                    }}
                    className="hidden lg:flex flex-1 align-items-center justify-content-center bg-cover"
                >
                    <span className="brand-wordmark text-white text-4xl">Vidhione</span>
                </div>
            </div>
        </>
    );
};

export default Verification;
