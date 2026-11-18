import { createElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PanelPlace } from './PanelPlace.tsx';

function ThrowingPanel(): never {
    throw new Error('The panel broke');
}

function CountingPanel() {
    const [count, setCount] = useState(0);
    const countUp = () => setCount(count + 1);

    return createElement('button', { type: 'button', onClick: countUp }, `Clicked ${count}`);
}

let container: HTMLElement;
let root: Root;

beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
});

afterEach(() => {
    root.unmount();
    container.remove();
    vi.restoreAllMocks();
});

test('a panel that throws shows its notice, and the panel beside it still works', () => {
    // React reports the caught error on the console; the test expects it.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const brokenPanel = createElement(
        PanelPlace,
        { area: 'entity-inspector', label: 'Entity inspector' },
        createElement(ThrowingPanel),
    );
    const workingPanel = createElement(
        PanelPlace,
        { area: 'entities-viewer', label: 'Entities viewer' },
        createElement(CountingPanel),
    );
    const page = createElement('div', null, brokenPanel, workingPanel);

    flushSync(() => root.render(page));

    const entityInspector = container.querySelector('[aria-label="Entity inspector"]');
    const entities = container.querySelector('[aria-label="Entities viewer"]');
    expect(entityInspector?.textContent).toContain('This panel hit a problem. Your level is safe.');
    expect(entityInspector?.querySelector('button')?.textContent).toBe('Reload');

    const countButton = entities?.querySelector('button');
    flushSync(() => countButton?.click());

    expect(countButton?.textContent).toBe('Clicked 1');
});
