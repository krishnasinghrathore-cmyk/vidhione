import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { MenuModel } from '@/types/layout';

export const useBreadcrumbs = (model: MenuModel[]) => {
    const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
    const location = useLocation();

    useEffect(() => {
        const uniqueBreadcrumbs = new Set();
        const search = (items: MenuModel[], parent: any[]) => {
            for (const item of items) {
                const path = [...parent, item];
                if (item.to === location.pathname) {
                    uniqueBreadcrumbs.add(
                        JSON.stringify({
                            labels: path.map((p) => p.label),
                            to: item.to
                        })
                    );
                    return;
                }
                if (item.items) {
                    search(item.items, path);
                }
            }
        };

        search(model, []);

        setBreadcrumbs(Array.from(uniqueBreadcrumbs).map((item: any) => JSON.parse(item)));
    }, [location.pathname, model]);

    return breadcrumbs;
}; 