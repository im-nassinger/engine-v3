import { createElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { closeControl, shownControl, showControl, styleOf, tokenColour } from '../testing/controlLooks.ts';
import { Button } from './Button.tsx';

afterEach(() => {
    closeControl();
});

function button() {
    return shownControl<HTMLButtonElement>('.button');
}

describe('Button', () => {
    test('is raised text with rounded corners and no edge', async () => {
        showControl(createElement(Button, { label: 'Cancel', onClick: () => undefined }));
        await expect.poll(() => document.querySelector('.button')).not.toBeNull();
        // The mouse may still be where an earlier test's button was.
        await userEvent.unhover(button());

        const look = styleOf(button());
        expect(look.backgroundColor).toBe(tokenColour('--raised'));
        expect(look.color).toBe(tokenColour('--text'));
        expect(look.borderTopLeftRadius).toBe('8px');
        expect(look.borderTopWidth).toBe('0px');
    });

    test('takes the hover colour under the mouse', async () => {
        showControl(createElement(Button, { label: 'Cancel', onClick: () => undefined }));
        await expect.poll(() => document.querySelector('.button')).not.toBeNull();

        await userEvent.hover(button());

        await expect.poll(() => styleOf(button()).backgroundColor).toBe(tokenColour('--hover'));
    });

    test('as the primary button is the accent with bold white text', async () => {
        showControl(createElement(Button, { label: 'Replace', variant: 'primary', onClick: () => undefined }));
        await expect.poll(() => document.querySelector('.button')).not.toBeNull();

        const look = styleOf(button());
        expect(look.backgroundColor).toBe(tokenColour('--accent'));
        expect(look.color).toBe(tokenColour('--on-accent'));
        expect(look.fontWeight).toBe('600');
    });

    test('when disabled is faint and a click does nothing', async () => {
        const onClick = vi.fn();
        showControl(createElement(Button, { label: 'Cancel', onClick, isDisabled: true }));
        await expect.poll(() => document.querySelector('.button')).not.toBeNull();

        // Playwright won't click a control marked disabled, so the click is the element's own.
        button().click();

        expect(styleOf(button()).color).toBe(tokenColour('--faint'));
        expect(onClick).not.toHaveBeenCalled();
    });
});
