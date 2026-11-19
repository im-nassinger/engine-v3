import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import '../../theme.css';
import { MinimapMountContext } from '../MinimapMountContext.ts';
import { Minimap } from './Minimap.tsx';

let root: Root | undefined;
let container: HTMLElement | undefined;

afterEach(() => {
    root?.unmount();
    container?.remove();
});

function showMinimap() {
    const mount = vi.fn<(host: HTMLElement) => void>();
    const unmount = vi.fn<() => void>();
    const shownContainer = document.createElement('div');
    shownContainer.style.cssText = 'width: 180px; height: 90px;';
    document.body.append(shownContainer);
    container = shownContainer;

    const shownRoot = createRoot(shownContainer);
    root = shownRoot;
    const minimap = createElement(Minimap);
    shownRoot.render(createElement(MinimapMountContext, { value: { mount, unmount } }, minimap));

    return { mount, unmount, shownRoot, shownContainer };
}

describe('Minimap', () => {
    test('gives the view a picture inside the 3 px edge, with 11 px corners', async () => {
        const { mount } = showMinimap();
        await vi.waitFor(() => expect(mount).toHaveBeenCalledOnce());

        const picture = mount.mock.calls[0]?.[0];
        if (picture === undefined) throw new Error('The minimap mounted nothing.');
        const box = picture.getBoundingClientRect();

        expect([box.width, box.height]).toEqual([174, 84]);
        expect(getComputedStyle(picture).borderTopLeftRadius).toBe('11px');
    });

    test('takes the view back out when it goes', async () => {
        const { mount, unmount, shownRoot } = showMinimap();
        await vi.waitFor(() => expect(mount).toHaveBeenCalledOnce());

        shownRoot.unmount();
        root = undefined;

        expect(unmount).toHaveBeenCalledOnce();
    });
});
