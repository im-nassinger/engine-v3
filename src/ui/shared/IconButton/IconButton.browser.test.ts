import { Eye } from 'lucide-react';
import { createElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
    closeControl,
    noBackground,
    shownControl,
    showControl,
    styleOf,
    tokenColour,
} from '../testing/controlLooks.ts';
import { IconButton } from './IconButton.tsx';
import type { IconButtonProps } from './IconButton.tsx';

afterEach(() => {
    closeControl();
});

async function showIconButton(props: Partial<IconButtonProps> = {}) {
    showControl(createElement(IconButton, { icon: Eye, label: 'Hide', onClick: () => undefined, ...props }));
    await expect.poll(() => document.querySelector('.icon-button')).not.toBeNull();

    return shownControl<HTMLButtonElement>('.icon-button');
}

describe('IconButton', () => {
    test('is its icon in the text colour on no background', async () => {
        const button = await showIconButton();
        // The mouse may still be where an earlier test's button was.
        await userEvent.unhover(button);

        expect(styleOf(button).backgroundColor).toBe(noBackground());
        expect(styleOf(button).color).toBe(tokenColour('--text'));
    });

    test('takes the hover colour under the mouse', async () => {
        const button = await showIconButton();

        await userEvent.hover(button);

        await expect.poll(() => styleOf(button).backgroundColor).toBe(tokenColour('--hover'));
    });

    test('when on is the soft accent with its icon in the accent text', async () => {
        const button = await showIconButton({ isOn: true });

        expect(styleOf(button).backgroundColor).toBe(tokenColour('--accent-soft'));
        expect(styleOf(button).color).toBe(tokenColour('--accent-text'));
    });

    test('when disabled is faint, ignores a click, and its tooltip says why', async () => {
        const onClick = vi.fn();
        const button = await showIconButton({ onClick, disabledReason: 'The World can’t be hidden' });

        // Playwright won't click a control marked disabled, so the click is the element's own.
        button.click();
        await userEvent.hover(button);

        expect(styleOf(button).color).toBe(tokenColour('--faint'));
        expect(onClick).not.toHaveBeenCalled();
        await expect
            .poll(() => document.querySelector('[role="tooltip"]')?.textContent)
            .toBe('The World can’t be hidden');
    });
});
