import { createElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { closeControl, shownControl, showControl, styleOf, tokenColour } from '../testing/controlLooks.ts';
import { MenuSearch } from './MenuSearch.tsx';

afterEach(() => {
    closeControl();
});

describe('MenuSearch', () => {
    test('is a pill of the field colour with no edge, ringed in the accent while typed in', async () => {
        const onSearch = vi.fn();
        const props = { label: 'Search components', search: '', onSearch, onEnter: () => undefined };
        showControl(createElement(MenuSearch, { ...props, noneText: undefined }));
        await expect.poll(() => document.querySelector('.menu-search > .search')).not.toBeNull();
        const box = shownControl<HTMLInputElement>('.menu-search > .search');

        expect(styleOf(box).backgroundColor).toBe(tokenColour('--field'));
        expect(styleOf(box).borderTopWidth).toBe('0px');
        expect(styleOf(box).borderTopLeftRadius).toBe(`${box.getBoundingClientRect().height / 2}px`);

        await userEvent.type(box, 'b');

        expect(document.activeElement).toBe(box);
        expect(onSearch).toHaveBeenCalledWith('b');
        expect(styleOf(box).outlineColor).toBe(tokenColour('--accent'));
        expect(styleOf(box).outlineWidth).toBe('1px');
    });

    test('says so in muted text when nothing matches', async () => {
        const props = {
            label: 'Search components',
            search: 'zzz',
            onSearch: () => undefined,
            onEnter: () => undefined,
        };
        showControl(createElement(MenuSearch, { ...props, noneText: 'No component matches' }));
        await expect.poll(() => document.querySelector('.menu-search > .none')).not.toBeNull();

        const none = shownControl('.menu-search > .none');
        expect(none.textContent).toBe('No component matches');
        expect(styleOf(none).color).toBe(tokenColour('--muted'));
    });
});
