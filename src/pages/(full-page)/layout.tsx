import AppConfig from '../../layout/AppConfig';
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function FullPageLayout() {
    return (
        <React.Fragment>
            <Outlet />
            <AppConfig minimal />
        </React.Fragment>
    );
}
