import React from 'react';
import RouteTitleSync from '../../layout/RouteTitleSync';
import { Outlet } from 'react-router-dom';

export default function LandingLayout() {
    return (
        <React.Fragment>
            <RouteTitleSync />
            <Outlet />
        </React.Fragment>
    );
}
