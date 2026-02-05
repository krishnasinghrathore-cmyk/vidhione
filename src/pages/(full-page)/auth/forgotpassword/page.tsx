'use client';
import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { useNavigate } from 'react-router-dom';
import { Message } from 'primereact/message';
import * as authApi from '@/lib/auth/api';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState<string>('');
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigateToLogin = () => {
        navigate('/auth/login');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        setLoading(true);
        try {
            const result = await authApi.forgotPassword(email);
            setNotice(result.message || 'If that account exists, a reset link has been sent.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-column bg-cover" style={{ backgroundImage: "url('/layout/images/pages/forgot-password-bg.jpg')" }}>
            <div className="shadow-2 bg-indigo-500 z-5 p-3 flex justify-content-between flex-row align-items-center">
                <div className="ml-3 flex" onClick={navigateToLogin}>
                    <div>
                        <span className="brand-wordmark text-white text-3xl">Vidhione</span>
                    </div>
                </div>
                <div className="mr-3 flex">
                    <Button onClick={navigateToLogin} text className="p-button-plain text-white">
                        LOGIN
                    </Button>
                </div>
            </div>

            <div className="align-self-center mt-auto mb-auto">
                <div className="text-center z-5 flex flex-column border-1 border-round-md surface-border surface-card px-3">
                    <div className="-mt-5 text-white bg-yellow-600 border-round-md mx-auto px-3 py-1 border-1 surface-border">
                        <h2 className="m-0">PASSWORD</h2>
                    </div>

                    <h4>Forgot Password</h4>

                    <div className="text-color-secondary mb-6 px-6">Enter your e-mail to receive a reset link</div>

                    <form className="w-full flex flex-column gap-3 px-3 pb-6" onSubmit={handleSubmit}>
                        {!!error && <Message severity="error" text={error} className="w-full" />}
                        {!!notice && <small className="text-500">{notice}</small>}
                        <span className="p-input-icon-left">
                            <i className="pi pi-envelope"></i>
                            <InputText
                                className="w-full"
                                placeholder="E-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </span>
                        <Button type="submit" className="w-full my-3 px-3" label={loading ? 'SENDING...' : 'SUBMIT'} disabled={loading}></Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
