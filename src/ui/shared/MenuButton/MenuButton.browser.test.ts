import { createElement } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { closeControl, shownControl, showControl, styleOf, tokenColour } from '../testing/controlLooks.ts';
import { MenuButton } from './MenuButton.tsx';
import type { MenuButtonProps } from './MenuButton.tsx';

afterEach(() => {
    closeControl();
});

async function showMenuButton(props: Partial<MenuButtonProps> = {}) {
    const menu = createElement('div', { className: 'shown-menu' });
    showControl(createElement(MenuButton, { label: 'Kind', menu, children: 'Box', ...props }));
    await expect.poll(() => document.querySelector('.menu-button .toggle')).not.toBeNull();

    return shownControl<HTMLButtonElement>('.menu-button .toggle');
}

describe('MenuButton', () => {
    test('takes the hover colour under the mouse', async () => {
        const toggle = await showMenuButton();

        await userEvent.hover(toggle);

        await expect.poll(() => styleOf(toggle).backgroundColor).toBe(tokenColour('--hover'));
    });

    test('while its menu is open is the soft accent, and a second press closes it', async () => {
        const toggle = await showMenuButton();

        await userEvent.click(toggle);

        await expect.poll(() => document.querySelector('.shown-menu')).not.toBeNull();
        expect(styleOf(toggle).backgroundColor).toBe(tokenColour('--accent-soft'));
        await userEvent.click(toggle);
        await expect.poll(() => document.querySelector('.shown-menu')).toBeNull();
    });

    test("as a field's value is a pill of the field colour", async () => {
        const toggle = await showMenuButton({ look: 'field', hasArrow: true });

        expect(styleOf(toggle).backgroundColor).toBe(tokenColour('--field'));
        expect(styleOf(toggle).borderTopLeftRadius).toBe(`${toggle.getBoundingClientRect().height / 2}px`);
    });
});
