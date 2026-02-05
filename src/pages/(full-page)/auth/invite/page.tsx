'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import * as authApi from '@/lib/auth/api';
import type { InviteDetails } from '@/lib/auth/api';

type InviteStatus = 'details' | 'verify' | 'done';

const InvitePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = useMemo(() => new URLSearchParams(location.search).get('token')?.trim() || '', [location.search]);

    const [status, setStatus] = useState<InviteStatus>('details');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
    const [maskedPhone, setMaskedPhone] = useState<string | null>(null);

    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');

    const [emailOtp, setEmailOtp] = useState('');
    const [phoneOtp, setPhoneOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invite token is required.');
            return;
        }
        setLoading(true);
        setError(null);
        authApi
            .getInviteDetails(token)
            .then((data) => {
                setInvite(data);
                setPhoneNumber((prev) => (prev ? prev : data.phoneHint || ''));
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Invite not found.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [token]);

    const handleAcceptInvite = async () => {
        if (!invite) return;
        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            const result = await authApi.acceptInvite({
                token,
                fullName: fullName.trim(),
                password,
                phoneNumber: phoneNumber.trim(),
                whatsappNumber: whatsappNumber.trim() || null
            });
            setMaskedEmail(result.email || null);
            setMaskedPhone(result.phoneNumber || null);
            setStatus('verify');
            setNotice(result.message || 'OTP sent. Please verify email and phone.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Invite acceptance failed.';
            setError(message);
            if (message.toLowerCase().includes('already been accepted')) {
                setStatus('verify');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!invite) return;
        setLoading(true);
        setError(null);
        try {
            await authApi.verifyEmailOtp({ email: invite.email, otp: emailOtp.trim() });
            setEmailVerified(true);
            setNotice('Email verified.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Email verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPhone = async () => {
        if (!invite) return;
        setLoading(true);
        setError(null);
        try {
            await authApi.verifyPhoneOtp({ email: invite.email, phoneNumber: phoneNumber.trim(), otp: phoneOtp.trim() });
            setPhoneVerified(true);
            setNotice('Phone verified.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Phone verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            const result = await authApi.inviteResendEmailOtp(token);
            setNotice(result.message || 'Email OTP sent.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resend email OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendPhone = async () => {
        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            const result = await authApi.inviteResendPhoneOtp(token);
            setNotice(result.message || 'Phone OTP sent.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resend phone OTP.');
        } finally {
            setLoading(false);
        }
    };

    const isReadyToVerify = emailVerified && phoneVerified;

    return (
        <div className="h-screen flex flex-column bg-cover" style={{ backgroundImage: "url('/layout/images/pages/login-bg.jpg')" }}>
            <div className="shadow-2 bg-indigo-500 z-5 p-3 flex justify-content-between flex-row align-items-center">
                <div className="ml-3 flex" onClick={() => navigate('/')}>
                    <span className="brand-wordmark text-white text-3xl">Vidhione</span>
                </div>
                <div className="mr-3 flex">
                    <Button onClick={() => navigate('/auth/login')} text className="p-button-plain text-white">
                        LOGIN
                    </Button>
                </div>
            </div>

            <div className="align-self-center mt-auto mb-auto w-full flex justify-content-center">
                <div className="text-center z-5 flex flex-column border-1 border-round-md surface-border surface-card px-3 w-full md:w-30rem">
                    <div className="-mt-5 text-white bg-cyan-700 border-round-md mx-auto px-3 py-1 border-1 surface-border">
                        <h2 className="m-0">INVITE</h2>
                    </div>

                    <h4>{invite ? `Welcome to ${invite.tenantName}` : 'Accept Invite'}</h4>
                    <div className="text-color-secondary mb-6 px-6">Complete your details and verify OTPs to activate your account.</div>

                    {!!error && <Message severity="error" text={error} className="w-full mb-3" />}
                    {!!notice && <Message severity="info" text={notice} className="w-full mb-3" />}

                    {status === 'details' && (
                        <div className="w-full flex flex-column gap-3 px-3 pb-6">
                            <span className="p-float-label">
                                <InputText id="invite-email" value={invite?.email || ''} disabled />
                                <label htmlFor="invite-email">Email</label>
                            </span>
                            <span className="p-float-label">
                                <InputText id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} />
                                <label htmlFor="invite-name">Full Name</label>
                            </span>
                            <span className="p-float-label">
                                <InputText
                                    id="invite-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <label htmlFor="invite-password">Password</label>
                            </span>
                            <span className="p-float-label">
                                <InputText
                                    id="invite-phone"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    disabled={loading}
                                />
                                <label htmlFor="invite-phone">Mobile Number (E.164)</label>
                            </span>
                            <span className="p-float-label">
                                <InputText
                                    id="invite-whatsapp"
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                    disabled={loading}
                                />
                                <label htmlFor="invite-whatsapp">WhatsApp Number (optional)</label>
                            </span>

                            <Button
                                onClick={handleAcceptInvite}
                                className="w-full my-2 px-3"
                                label={loading ? 'SAVING...' : 'CONTINUE'}
                                disabled={loading || !invite || !fullName.trim() || !password || !phoneNumber.trim()}
                            />
                        </div>
                    )}

                    {status === 'verify' && (
                        <div className="w-full flex flex-column gap-3 px-3 pb-6">
                            <div className="text-left text-500">
                                OTP sent to {maskedEmail || invite?.email} and {maskedPhone || phoneNumber || 'your phone'}.
                            </div>
                            <span className="p-float-label">
                                <InputText id="email-otp" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} disabled={loading || emailVerified} />
                                <label htmlFor="email-otp">Email OTP</label>
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    label={emailVerified ? 'Email Verified' : 'Verify Email'}
                                    icon={emailVerified ? 'pi pi-check' : 'pi pi-envelope'}
                                    onClick={handleVerifyEmail}
                                    disabled={loading || emailVerified || !emailOtp.trim()}
                                />
                                <Button label="Resend Email OTP" outlined onClick={handleResendEmail} disabled={loading} />
                            </div>

                            <span className="p-float-label">
                                <InputText id="phone-otp" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} disabled={loading || phoneVerified} />
                                <label htmlFor="phone-otp">Phone OTP</label>
                            </span>
                            <span className="p-float-label">
                                <InputText
                                    id="phone-number-confirm"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    disabled={loading || phoneVerified}
                                />
                                <label htmlFor="phone-number-confirm">Confirm Phone Number</label>
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    label={phoneVerified ? 'Phone Verified' : 'Verify Phone'}
                                    icon={phoneVerified ? 'pi pi-check' : 'pi pi-mobile'}
                                    onClick={handleVerifyPhone}
                                    disabled={loading || phoneVerified || !phoneOtp.trim() || !phoneNumber.trim()}
                                />
                                <Button label="Resend Phone OTP" outlined onClick={handleResendPhone} disabled={loading} />
                            </div>

                            <Button
                                onClick={() => setStatus('done')}
                                className="w-full mt-3"
                                label="Continue to Login"
                                disabled={!isReadyToVerify}
                            />
                        </div>
                    )}

                    {status === 'done' && (
                        <div className="w-full flex flex-column gap-3 px-3 pb-6">
                            <Message severity="success" text="Your account is verified. You can login now." className="w-full" />
                            <Button onClick={() => navigate('/auth/login')} className="w-full my-2 px-3" label="GO TO LOGIN" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvitePage;
