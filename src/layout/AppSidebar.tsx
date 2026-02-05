import { Link } from 'react-router-dom';
import React, { useContext } from 'react';
import AppMenu from './AppMenu';
import { LayoutContext } from './context/layoutcontext';
import { MenuProvider } from './context/menucontext';
import AppMenuProfile from './AppMenuProfile';

const AppSidebar = () => {
    const { layoutConfig, setLayoutState } = useContext(LayoutContext);

    const anchor = () => {
        setLayoutState((prevLayoutState: any) => ({
            ...prevLayoutState,
            anchored: !prevLayoutState.anchored
        }));
    };

    return (
        <React.Fragment>
            <div className="layout-sidebar-top">
                <Link to="/" className="layout-sidebar-logo-link">
                    <span className="layout-sidebar-logo">
                        <img
                            src="/layout/images/logo/vidhione-mark.svg"
                            alt="Vidhione"
                            className="layout-sidebar-logo-mark"
                        />
                        <span className="brand-wordmark text-xl">Vidhione</span>
                    </span>
                    <span className="layout-sidebar-logo-slim">
                        <img
                            src="/layout/images/logo/vidhione-mark.svg"
                            alt="Vidhione"
                            className="layout-sidebar-logo-mark"
                        />
                    </span>
                </Link>
                <button className="layout-sidebar-anchor p-link" type="button" onClick={anchor}></button>
            </div>

            {layoutConfig.menuProfilePosition === 'start' && <AppMenuProfile />}
            <div className="layout-menu-container">
                <MenuProvider>
                    <AppMenu />
                </MenuProvider>
            </div>
            {layoutConfig.menuProfilePosition === 'end' && <AppMenuProfile />}
        </React.Fragment>
    );
};

AppSidebar.displayName = 'AppSidebar';

export default AppSidebar;
