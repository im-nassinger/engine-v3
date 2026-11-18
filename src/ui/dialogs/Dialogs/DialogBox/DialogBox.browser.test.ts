import { createElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
    closeControl,
    computedAs,
    shownControl,
    showControl,
    styleOf,
    tokenColour,
} from '../../../shared/testing/controlLooks.ts';
import { DialogBox } from './DialogBox.tsx';

afterEach(() => {
    closeControl();
});

async function showDialog(onConfirm = vi.fn(), onClose = vi.fn()) {
    const props = { title: 'Replace the level?', text: 'Unsaved changes are lost.', confirmLabel: 'Replace' };
    showControl(createElement(DialogBox, { ...props, cancelLabel: 'Cancel', onConfirm, onClose }));
    await expect.poll(() => document.querySelector('.dialog-box .box')).not.toBeNull();

    return { onConfirm, onClose };
}

describe("DialogBox's look", () => {
    test('is a 400 px island centred over the scrim', async () => {
        await showDialog();

        const box = shownControl('.dialog-box > .box');
        const look = styleOf(box);
        expect(styleOf(shownControl('.dialog-box')).backgroundColor).toBe(tokenColour('--scrim'));
        expect(box.getBoundingClientRect().width).toBe(400);
        expect(look.backgroundColor).toBe(tokenColour('--panel'));
        expect(look.borderTopLeftRadius).toBe('14px');
        expect(look.boxShadow).toBe(computedAs('box-shadow', 'var(--shade)'));
        const middle = box.getBoundingClientRect().left + box.getBoundingClientRect().width / 2;
        expect(middle).toBeCloseTo(window.innerWidth / 2, 0);
    });

    test('has a bold title, muted text, and the safe button first and the primary one last', async () => {
        await showDialog();

        const title = styleOf(shownControl('.dialog-box h2'));
        expect(title.fontSize).toBe('14px');
        expect(title.fontWeight).toBe('600');
        expect(styleOf(shownControl('.dialog-box p')).color).toBe(tokenColour('--muted'));
        const buttons = [...document.querySelectorAll('.dialog-box .buttons > .button')];
        expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Replace']);
        expect(buttons[1]?.getAttribute('data-variant')).toBe('primary');
    });

    test('answers Enter with the primary button and Esc by closing', async () => {
        const { onConfirm, onClose } = await showDialog();
        await expect.poll(() => document.activeElement?.textContent).toBe('Replace');

        await userEvent.keyboard('{Enter}');
        expect(onConfirm).toHaveBeenCalledOnce();
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledOnce();
    });
});
