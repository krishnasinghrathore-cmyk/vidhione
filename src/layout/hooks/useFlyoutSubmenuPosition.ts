import { useEventListener } from 'primereact/hooks';
import { DomHandler } from 'primereact/utils';
import { useCallback, useContext, useEffect } from 'react';
import { MenuContext } from '../context/menucontext';
import type { UseSubmenuOverlayPositionProps } from '@/types';

const FLYOUT_GAP = 0;

export const useFlyoutSubmenuPosition = ({ target, overlay, container, when }: UseSubmenuOverlayPositionProps) => {
    const { activeMenu } = useContext(MenuContext);

    const calculatePosition = useCallback(() => {
        if (!overlay || !target) return;

        const { left, right, top } = target.getBoundingClientRect();
        const { width: viewportWidth, height: viewportHeight } = DomHandler.getViewport();
        const [overlayWidth, overlayHeight] = [overlay.offsetWidth, overlay.offsetHeight];

        let nextLeft = right + FLYOUT_GAP;
        if (nextLeft + overlayWidth > viewportWidth) {
            nextLeft = left - overlayWidth - FLYOUT_GAP;
        }

        let nextTop = top;
        if (nextTop + overlayHeight > viewportHeight) {
            nextTop = Math.max(0, viewportHeight - overlayHeight);
        }

        overlay.style.position = 'fixed';
        overlay.style.left = `${Math.max(0, nextLeft)}px`;
        overlay.style.top = `${Math.max(0, nextTop)}px`;
    }, [overlay, target]);

    const [bindScrollListener, unbindScrollListener] = useEventListener({
        type: 'scroll',
        target: container as React.Ref<HTMLElement>,
        listener: () => {
            if (when) {
                calculatePosition();
            }
        }
    });

    useEffect(() => {
        if (when) {
            bindScrollListener();
            calculatePosition();
        }

        return () => {
            unbindScrollListener();
        };
    }, [when, activeMenu, bindScrollListener, unbindScrollListener, calculatePosition]);

    useEffect(() => {
        if (!when && overlay) {
            overlay.style.left = '';
            overlay.style.top = '';
            overlay.style.position = '';
        }
    }, [when, overlay]);
};
