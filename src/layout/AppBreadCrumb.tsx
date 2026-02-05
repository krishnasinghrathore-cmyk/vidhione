import { useLocation, Link } from 'react-router-dom';
import { ObjectUtils } from 'primereact/utils';
import React, { useMemo } from 'react';
import type { Breadcrumb } from '@/types/layout';
import { Button } from 'primereact/button';
import { model } from './AppMenu'; // Assuming AppMenu is in the same directory

const AppBreadcrumb = () => {
    const location = useLocation();

    const breadcrumb = useMemo(() => {
        let activeBreadcrumb: Breadcrumb | null = null;
        const search = (items: any[], parent: any[]) => {
            for (const item of items) {
                const path = [...parent, item];
                if (item.to === location.pathname) {
                    activeBreadcrumb = {
                        labels: path.map((p) => p.label),
                        to: item.to
                    };
                    return;
                }
                if (item.items) {
                    search(item.items, path);
                }
            }
        };

        search(model, []);
        return activeBreadcrumb;
    }, [location.pathname]);

    return (
        <div className="layout-breadcrumb-container">
            <nav className="layout-breadcrumb">
                <ol>
                    <li>
                        <Link to={'/'} style={{ color: 'inherit' }}>
                            <i className="pi pi-home"></i>
                        </Link>
                    </li>
                    {ObjectUtils.isNotEmpty(breadcrumb?.labels)
                        ? breadcrumb?.labels?.map((label, index) => {
                            return (
                                <React.Fragment key={index}>
                                    <i className="pi pi-angle-right"></i>
                                    <li key={index}>{label}</li>
                                </React.Fragment>
                            );
                        })
                        : location.pathname + location.search === '/' && (
                            <>
                                <i className="pi pi-angle-right"></i>
                                <li key={'home'}>Dashboard</li>
                            </>
                        )}
                </ol>
            </nav>
            <div className="layout-breadcrumb-buttons">
                <Button icon="pi pi-cloud-upload" rounded text className="p-button-plain"></Button>
                <Button icon="pi pi-bookmark" rounded text className="p-button-plain"></Button>
                <Button icon="pi pi-power-off" rounded text className="p-button-plain"></Button>
            </div>
        </div>
    );
};

export default AppBreadcrumb;
