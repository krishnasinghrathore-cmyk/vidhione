import { useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutContext } from './context/layoutcontext';
import { resolveRouteTitleFromPath } from './routeTitleResolver';

export default function RouteTitleSync() {
    const { setRouteTitle } = useContext(LayoutContext);
    const location = useLocation();
    const routeTitle = useMemo(() => resolveRouteTitleFromPath(location.pathname), [location.pathname]);

    useEffect(() => {
        setRouteTitle(routeTitle);
    }, [routeTitle, setRouteTitle]);

    return null;
}
