import { Tooltip } from 'primereact/tooltip';
import { useContext, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AppMenuitem from './AppMenuitem';
import { LayoutContext } from './context/layoutcontext';
import { MenuProvider } from './context/menucontext';
import type { MenuProps, MenuModel, Breadcrumb, BreadcrumbItem } from '@/types/layout';

const AppSubMenu = (props: MenuProps) => {
    const { layoutState, setLayoutState, setBreadcrumbs } = useContext(LayoutContext);
    const tooltipRef = useRef<Tooltip | null>(null);
    const location = useLocation();

    useEffect(() => {
        if (tooltipRef.current) {
            tooltipRef.current.hide();
            (tooltipRef.current as any).updateTargetEvents();
        }
    }, [layoutState.overlaySubmenuActive]);

    useEffect(() => {
        generateBreadcrumbs(props.model);
    }, []);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            const menuContainer = document.querySelector('.layout-menu-container');
            if (!menuContainer) return;

            if (!menuContainer.contains(event.target as Node)) {
                setLayoutState((prev) => ({
                    ...prev,
                    resetMenu: true,
                    overlaySubmenuActive: false,
                    menuHoverActive: false
                }));
            }
        };

        document.addEventListener('click', onClickOutside);
        return () => document.removeEventListener('click', onClickOutside);
    }, [setLayoutState]);

    useEffect(() => {
        // Close overlay submenu when route changes
        setLayoutState((prev) => ({
            ...prev,
            overlaySubmenuActive: false,
            menuHoverActive: false,
            resetMenu: true
        }));
    }, [location.pathname, location.search, setLayoutState]);

    const generateBreadcrumbs = (model: MenuModel[]) => {
        let breadcrumbs: Breadcrumb[] = [];

        const getBreadcrumb = (item: BreadcrumbItem, labels: string[] = []) => {
            const { label, to, items } = item;

            label && labels.push(label);
            items &&
                items.forEach((_item) => {
                    getBreadcrumb(_item, labels.slice());
                });
            to && breadcrumbs.push({ labels, to });
        };

        model.forEach((item) => {
            getBreadcrumb(item);
        });
        setBreadcrumbs(breadcrumbs);
    };

    return (
        <MenuProvider>
            <ul className="layout-menu">
                {props.model.map((item: MenuModel, i: number) => {
                    return !item.seperator ? <AppMenuitem item={item} root={true} index={i} key={item.label} /> : <li className="menu-separator"></li>;
                })}
            </ul>
            <Tooltip ref={tooltipRef} target="li:not(.active-menuitem)>.tooltip-target" />
        </MenuProvider>
    );
};

export default AppSubMenu;
