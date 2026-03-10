'use client';
import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type LoginResult } from '@/lib/auth/context';
import { resolveTenantHomePath } from '@/lib/auth/defaultRoute';

const Login = () => {
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const navigateAfterLogin = (loginResult: LoginResult) => {
        const from = (location.state as any)?.from as string | undefined;
        if (loginResult.user.role === 'superadmin' && !loginResult.tenantId) {
            navigate('/admin/tenants', { replace: true });
            return;
        }
        const fallbackPath =
            resolveTenantHomePath({
                tenantId: loginResult.tenantId,
                tenantIndustryKey: loginResult.tenantIndustryKey,
                enabledApps: loginResult.enabledApps
            }) ?? '/';
        navigate(from || fallbackPath, { replace: true });
    };

    const handleSubmit = async () => {
        setError(null);
        try {
            const loginResult = await login(email, password);
            navigateAfterLogin(loginResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    const navigateToDashboard = () => {
        navigate('/');
    };

    return (
        <div className="h-screen flex flex-column bg-cover" style={{ backgroundImage: 'url(/layout/images/pages/login-bg.jpg)' }}>
            <div className="shadow-2 bg-indigo-500 z-5 p-3 flex justify-content-between flex-row align-items-center">
                <div className="ml-3 flex" onClick={navigateToDashboard}>
                    <div>
                        <span className="brand-wordmark text-white text-3xl">Vidhione</span>
                    </div>
                </div>
                <div className="mr-3 flex">
                    <Button onClick={navigateToDashboard} text className="p-button-plain text-white">
                        DASHBOARD
                    </Button>
                </div>
            </div>

            <div className="align-self-center mt-auto mb-auto">
                <div className="text-center z-5 flex flex-column border-1 border-round-md surface-border surface-card px-3">
                    <div className="-mt-5 text-white bg-cyan-700 border-round-md mx-auto px-3 py-1 border-1 surface-border">
                        <h2 className="m-0">LOGIN</h2>
                    </div>

                    <h4>Welcome</h4>

                    <div className="text-color-secondary mb-6 px-6">Please use the form to sign-in Vidhione network</div>

                    <div className="w-full flex flex-column gap-3 px-3 pb-6">
                        {!!error && <Message severity="error" text={error} className="w-full" />}
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

                        <span className="p-input-icon-left">
                            <i className="pi pi-key"></i>
                            <InputText
                                type="password"
                                className="w-full"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSubmit();
                                }}
                            />
                        </span>
                        <Button
                            onClick={handleSubmit}
                            className="w-full my-3 px-3"
                            label={loading ? 'LOGGING IN...' : 'LOGIN'}
                            disabled={loading}
                        ></Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
