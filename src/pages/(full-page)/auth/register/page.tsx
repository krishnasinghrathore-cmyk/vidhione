'use client';
import React from 'react';
import { Button } from 'primereact/button';
import type { Page } from '@/types';
import { useNavigate } from 'react-router-dom';

const InviteOnlyRegister: Page = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen flex w-full surface-ground">
            <div className="flex flex-1 flex-column surface-ground align-items-center justify-content-center">
                <div className="w-11 sm:w-30rem">
                    <div className="flex flex-column">
                        <div style={{ height: '56px', width: '56px' }} className="bg-primary-50 border-circle flex align-items-center justify-content-center">
                            <i className="pi pi-users text-primary text-4xl"></i>
                        </div>
                        <div className="mt-4">
                            <h1 className="m-0 text-primary font-semibold text-4xl">Invite only</h1>
                            <span className="block text-700 mt-2">
                                Registration is currently available by invite. Please contact your administrator.
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-column gap-3 mt-6">
                        <Button
                            type="button"
                            className="w-full text-primary-500"
                            text
                            label="BACK TO LOGIN"
                            onClick={() => navigate('/auth/login')}
                        />
                    </div>
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
    );
};

export default InviteOnlyRegister;
