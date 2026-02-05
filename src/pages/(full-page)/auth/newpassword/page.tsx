'use client';
import { Button } from 'primereact/button';
import React, { useEffect, useState } from 'react';
import type { Page } from '@/types';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '@/lib/auth/api';

const NewPassword: Page = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const nextToken = new URLSearchParams(location.search).get('token');
        setToken(nextToken?.trim() || '');
    }, [location.search]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        if (!token.trim()) {
            setError('Reset token is required.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await authApi.resetPassword({ token: token.trim(), password });
            setNotice('Password updated. You can now sign in.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Reset failed.');
        } finally {
            setLoading(false);
        }
    };

    const navigateToLogin = () => {
        navigate('/auth/login');
    };

    return (
        <>
            <div className="h-screen flex w-full surface-ground">
                <div className="flex flex-1 flex-column surface-ground align-items-center justify-content-center">
                    <div className="w-11 sm:w-30rem">
                        <div className="flex flex-column">
                            <div style={{ height: '56px', width: '56px' }} className="bg-primary-50 border-circle flex align-items-center justify-content-center">
                                <i className="pi pi-key text-primary text-4xl"></i>
                            </div>
                            <div className="mt-4">
                                <h1 className="m-0 text-primary font-semibold text-4xl">Choose your new password!</h1>
                                <span className="block text-700 mt-2">Enter your new password</span>
                            </div>
                        </div>
                        <form className="flex flex-column gap-3 mt-6" onSubmit={handleSubmit}>
                            {!!error && <Message severity="error" text={error} className="w-full" />}
                            {!!notice && <small className="text-500">{notice}</small>}
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon">
                                    <i className="pi pi-link"></i>
                                </span>
                                <InputText
                                    placeholder="Reset Token"
                                    className="w-full"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon">
                                    <i className="pi pi-key"></i>
                                </span>
                                <Password
                                    id="password"
                                    placeholder="Password"
                                    className="w-full"
                                    toggleMask
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon">
                                    <i className="pi pi-key z-2"></i>
                                </span>
                                <Password
                                    id="password-repeat"
                                    placeholder="Repeat Password"
                                    className="w-full"
                                    toggleMask
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="p-inputgroup">
                                <Button type="submit" className="w-full" label={loading ? 'SAVING...' : 'SAVE NEW PASSWORD'} disabled={loading}></Button>
                            </div>
                            <div className="p-inputgroup">
                                <Button
                                    type="button"
                                    className="w-full text-primary-500"
                                    text
                                    label="BACK TO LOGIN"
                                    onClick={navigateToLogin}
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

export default NewPassword;
