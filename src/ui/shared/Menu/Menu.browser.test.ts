import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, test } from 'vitest';
import { OpenWindowCount } from '../../../editor/tools/index.ts';
import { OpenWindowsContext } from '../../open-windows/index.ts';
import { Menu } from './Menu.tsx';

describe('Menu', () => {
    test("counts as an open window while shown, so the editor's Esc leaves it to the menu", async () => {
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);
        const openWindows = new OpenWindowCount();
        const entries = [{ kind: 'action' as const, id: 'one', label: 'One', onChoose: () => undefined }];
        const menu = createElement(Menu, { entries, onClose: () => undefined, anchor: { current: null } });

        root.render(createElement(OpenWindowsContext, { value: openWindows }, menu));
        await expect.poll(() => openWindows.isOpen()).toBe(true);

        root.unmount();
        expect(openWindows.isOpen()).toBe(false);
        container.remove();
    });

    test('a menu longer than the window keeps where it was scrolled to', async () => {
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);
        const anchor = document.createElement('button');
        anchor.style.cssText = 'position: fixed; left: 10px; top: 10px; width: 40px; height: 20px;';
        document.body.append(anchor);
        const entries = Array.from({ length: 200 }, (_, index) => ({
            kind: 'action' as const,
            id: String(index),
            label: `Row ${index}`,
            onChoose: () => undefined,
        }));

        root.render(createElement(Menu, { entries, onClose: () => undefined, anchor: { current: anchor } }));
        await expect.poll(() => document.querySelector('.menu .menu-panel')).not.toBeNull();
        const scroller = document.querySelector<HTMLElement>('.menu .menu-panel');
        if (scroller === null) throw new Error('No menu panel.');
        expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);

        scroller.scrollTop = 300;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        expect(scroller.scrollTop).toBe(300);

        root.unmount();
        anchor.remove();
        container.remove();
    });
});
