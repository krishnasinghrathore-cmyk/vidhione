import { useLocation, Link } from 'react-router-dom';
import React, { useMemo } from 'react';
import { Button } from 'primereact/button';
import { resolveBreadcrumbFromPath } from './routeTitleResolver';

const AppBreadcrumb = () => {
    const location = useLocation();

    const breadcrumb = useMemo(() => {
        return resolveBreadcrumbFromPath(location.pathname);
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
                    {breadcrumb.labels.length > 0
                        ? breadcrumb.labels.map((label, index) => {
                              return (
                                  <React.Fragment key={index}>
                                      <i className="pi pi-angle-right"></i>
                                      <li>{label}</li>
                                  </React.Fragment>
                              );
                          })
                        : location.pathname + location.search === '/' && (
                              <>
                                  <i className="pi pi-angle-right"></i>
                                  <li>Dashboard</li>
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