import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import '../../theme.css';

// For the shared controls' look tests: a control shown alone on the page, and the browser's own way of
// writing a token's value, so a computed style can be compared with the token it should use.

let container: HTMLElement | undefined;
let root: Root | undefined;

export function showControl(element: ReactElement) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    root.render(element);

    return container;
}

export function closeControl() {
    root?.unmount();
    container?.remove();
    root = undefined;
    container = undefined;
}

export function shownControl<T extends Element = HTMLElement>(selector: string) {
    const element = document.querySelector<T>(selector);
    if (element === null) throw new Error(`Nothing matches ${selector}.`);

    return element;
}

// The value a property computes to when it is given this value, such as var(--hover) or 'none'.
export function computedAs(property: string, value: string) {
    const probe = document.createElement('div');
    probe.style.setProperty(property, value);
    document.body.append(probe);
    const computed = getComputedStyle(probe).getPropertyValue(property);
    probe.remove();

    return computed;
}

export function tokenColour(token: string) {
    return computedAs('color', `var(${token})`);
}

export function noBackground() {
    return computedAs('background-color', 'transparent');
}

export function styleOf(element: Element) {
    return getComputedStyle(element);
}
