const FOCUSABLE_SELECTOR =
    'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';

const ENTER_TAB_OPT_OUT_SELECTOR = '[data-enter-tab="false"], [data-enter-submit="true"]';
const ENTER_NAV_AUTO_OPEN_OPT_OUT_ATTR = 'data-enter-open';
const PRIME_OVERLAY_CONTROL_SELECTOR = '.p-dropdown, .p-multiselect, .p-autocomplete';
const PRIME_OVERLAY_TRIGGER_SELECTOR = '.p-dropdown-trigger, .p-multiselect-trigger, .p-autocomplete-dropdown';
const ENTER_NAV_AUTO_OPEN_INTENT_WINDOW_MS = 1200;
let enterNavAutoOpenIntentAt = 0;

const ENTER_TAB_EXCLUDED_CONTAINER_SELECTOR = [
    '.p-dropdown-panel',
    '.p-autocomplete-panel',
    '.p-multiselect-panel',
    '.p-datepicker',
    '.p-overlaypanel',
    '.p-menu',
    '.p-contextmenu',
    '.p-confirm-popup',
    '.p-dialog-mask',
    '.p-hidden-accessible'
].join(', ');
const PRIME_HIDDEN_ACCESSIBLE_SELECTOR = '.p-hidden-accessible';
const PRIME_HIDDEN_PROXY_ROLES = new Set(['combobox', 'listbox']);

const ENTER_TAB_TARGET_EXCLUDED_INPUT_TYPES = new Set([
    'button',
    'submit',
    'reset',
    'image',
    'checkbox',
    'radio',
    'file',
    'hidden'
]);
const ENTER_TAB_FOCUS_EXCLUDED_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image', 'file', 'hidden']);
const CHECKABLE_INPUT_TYPES = new Set(['checkbox', 'radio']);

const isPrimeHiddenInputFocusProxy = (element: HTMLElement) => {
    if (!element.closest(PRIME_HIDDEN_ACCESSIBLE_SELECTOR)) return false;
    if (element.tagName.toLowerCase() !== 'input') return false;

    const input = element as HTMLInputElement;
    const inputType = (input.type || '').toLowerCase();
    if (CHECKABLE_INPUT_TYPES.has(inputType)) return true;

    const role = (input.getAttribute('role') || '').toLowerCase();
    if (PRIME_HIDDEN_PROXY_ROLES.has(role)) return true;
    if ((input.getAttribute('aria-haspopup') || '').toLowerCase() === 'listbox') return true;

    return false;
};

type EnterKeyLikeEvent = {
    key: string;
    code?: string;
    keyCode?: number;
    which?: number;
    defaultPrevented: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    isComposing?: boolean;
};

const hasContains = (scope: ParentNode): scope is ParentNode & { contains: (node: Node | null) => boolean } =>
    typeof (scope as { contains?: unknown }).contains === 'function';

const getTimeNow = () => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
};

export const markEnterNavAutoOpenIntent = () => {
    enterNavAutoOpenIntentAt = getTimeNow();
};

export const consumeEnterNavAutoOpenIntent = () => {
    if (!enterNavAutoOpenIntentAt) return false;
    const elapsed = getTimeNow() - enterNavAutoOpenIntentAt;
    const isRecent = elapsed >= 0 && elapsed <= ENTER_NAV_AUTO_OPEN_INTENT_WINDOW_MS;
    enterNavAutoOpenIntentAt = 0;
    return isRecent;
};

const isElementVisible = (element: HTMLElement) => {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (element.closest('[aria-hidden="true"]')) return false;
    if (element.closest(PRIME_HIDDEN_ACCESSIBLE_SELECTOR)) return isPrimeHiddenInputFocusProxy(element);
    return element.getClientRects().length > 0;
};

const isElementFocusableForEnterNav = (element: HTMLElement) => {
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    if (element.getAttribute('tabindex') === '-1' || element.tabIndex < 0) return false;
    if ((element as { inert?: boolean }).inert) return false;

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input') {
        const inputType = ((element as HTMLInputElement).type || '').toLowerCase();
        if (ENTER_TAB_FOCUS_EXCLUDED_INPUT_TYPES.has(inputType)) return false;
    }
    return isElementVisible(element);
};

export const isEnterWithoutModifiers = (event: EnterKeyLikeEvent) => {
    const key = event.key;
    const code = event.code;
    const keyCode = event.keyCode;
    const which = event.which;
    const isEnterKey =
        key === 'Enter' ||
        key === 'NumpadEnter' ||
        code === 'Enter' ||
        code === 'NumpadEnter' ||
        keyCode === 13 ||
        which === 13;
    if (!isEnterKey) return false;
    if (event.defaultPrevented) return false;
    if (event.isComposing) return false;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
    return true;
};

export const shouldSkipEnterAsTabTarget = (target: HTMLElement) => {
    const tagName = target.tagName.toLowerCase();
    const inputType = tagName === 'input' ? ((target as HTMLInputElement).type || '').toLowerCase() : '';
    const isCheckableInput = tagName === 'input' && CHECKABLE_INPUT_TYPES.has(inputType);

    if (target.closest(ENTER_TAB_OPT_OUT_SELECTOR)) return true;
    if (target.closest(ENTER_TAB_EXCLUDED_CONTAINER_SELECTOR)) {
        const insidePrimeHiddenInput = Boolean(target.closest(PRIME_HIDDEN_ACCESSIBLE_SELECTOR));
        if (!(isCheckableInput && insidePrimeHiddenInput)) return true;
    }

    if (tagName === 'textarea' || tagName === 'button' || tagName === 'a' || tagName === 'select') return true;
    if (target.getAttribute('role') === 'button') return true;
    if (target.isContentEditable) return true;

    if (tagName === 'input') {
        if (ENTER_TAB_TARGET_EXCLUDED_INPUT_TYPES.has(inputType) && !CHECKABLE_INPUT_TYPES.has(inputType)) return true;
    }

    return false;
};

export const resolveEnterScope = (target: HTMLElement): ParentNode => {
    const scoped = target.closest('[data-enter-scope]');
    if (scoped) return scoped;
    return (
        target.closest('form') ??
        target.closest('.p-dialog, .p-overlaypanel, .p-sidebar, .app-data-table-header, .layout-content') ??
        document.body
    );
};

const resolveFocusAnchor = (target: HTMLElement, scope: ParentNode) => {
    if (isElementFocusableForEnterNav(target)) return target;
    const nearestFocusable = target.closest<HTMLElement>(FOCUSABLE_SELECTOR);
    if (!nearestFocusable) return null;
    if (hasContains(scope) && !scope.contains(nearestFocusable)) return null;
    return isElementFocusableForEnterNav(nearestFocusable) ? nearestFocusable : null;
};

export const getFocusableElements = (scope: ParentNode) =>
    Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isElementFocusableForEnterNav);

const resolvePrimeOverlayControlRoot = (element: HTMLElement): HTMLElement | null => {
    if (element.matches(PRIME_OVERLAY_CONTROL_SELECTOR)) return element;
    return element.closest<HTMLElement>(PRIME_OVERLAY_CONTROL_SELECTOR);
};

const isPrimeOverlayControlExpanded = (root: HTMLElement) => {
    if (root.getAttribute('aria-expanded') === 'true') return true;
    if (root.querySelector('[aria-expanded="true"]')) return true;
    return false;
};

const shouldAutoOpenPrimeOverlayControl = (root: HTMLElement) => {
    if (root.getAttribute(ENTER_NAV_AUTO_OPEN_OPT_OUT_ATTR) === 'false') return false;
    if (root.hasAttribute('disabled')) return false;
    if (root.getAttribute('aria-disabled') === 'true') return false;
    if (root.classList.contains('p-disabled')) return false;
    if (isPrimeOverlayControlExpanded(root)) return false;
    return true;
};

export const queueAutoOpenFocusedOverlayControl = (focusedElement: HTMLElement | null | undefined) => {
    if (typeof window === 'undefined') return;
    if (!focusedElement) return;
    const root = resolvePrimeOverlayControlRoot(focusedElement);
    if (!root || !shouldAutoOpenPrimeOverlayControl(root)) return;

    window.requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return;
        if (!(active === root || root.contains(active))) return;
        if (!shouldAutoOpenPrimeOverlayControl(root)) return;

        const trigger = root.querySelector<HTMLElement>(PRIME_OVERLAY_TRIGGER_SELECTOR);
        if (trigger && !trigger.hasAttribute('disabled')) {
            trigger.click();
            return;
        }

        root.click();
    });
};

export const focusNextElement = (target: HTMLElement, scope: ParentNode): boolean => {
    const focusables = getFocusableElements(scope);
    if (!focusables.length) return false;

    const anchor = resolveFocusAnchor(target, scope);
    if (!anchor) return false;

    const index = focusables.indexOf(anchor);
    if (index < 0) return false;

    for (let i = index + 1; i < focusables.length; i += 1) {
        const candidate = focusables[i];
        candidate.focus();
        if (document.activeElement === candidate) {
            queueAutoOpenFocusedOverlayControl(candidate);
            return true;
        }
    }

    return false;
};
