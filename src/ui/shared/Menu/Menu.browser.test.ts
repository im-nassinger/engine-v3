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
});
