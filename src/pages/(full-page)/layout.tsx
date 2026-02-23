import AppConfig from '../../layout/AppConfig';
import RouteTitleSync from '../../layout/RouteTitleSync';
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function FullPageLayout() {
    return (
        <React.Fragment>
            <RouteTitleSync />
            <Outlet />
            <AppConfig minimal />
        </React.Fragment>
    );
}
