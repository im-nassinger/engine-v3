import { createElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { closeControl, shownControl, showControl } from '../../../shared/testing/controlLooks.ts';
import { TextDialog } from './TextDialog.tsx';

const REQUEST = {
    title: 'Rename level',
    text: 'The name shows in the browser tab.',
    fieldLabel: 'Level name',
    value: 'Cave',
    confirmLabel: 'Rename',
};

afterEach(() => {
    closeControl();
});

async function showDialog() {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    showControl(createElement(TextDialog, { request: REQUEST, onSubmit, onClose }));
    await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Level name');

    return { onSubmit, onClose };
}

describe('TextDialog', () => {
    test('starts with the value selected, so typing replaces it, and Enter answers', async () => {
        const { onSubmit } = await showDialog();
        const field = shownControl<HTMLInputElement>('.text-dialog');
        expect([field.selectionStart, field.selectionEnd]).toEqual([0, REQUEST.value.length]);

        await userEvent.keyboard('Bridge{Enter}');

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Bridge');
    });

    test('the go-ahead button answers with the text typed', async () => {
        const { onSubmit } = await showDialog();
        await userEvent.keyboard('Bridge');

        await userEvent.click(shownControl('.dialog-box .buttons > :last-child'));

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Bridge');
    });

    test('Esc closes it without an answer', async () => {
        const { onSubmit, onClose } = await showDialog();

        await userEvent.keyboard('Bridge{Escape}');

        expect(onClose).toHaveBeenCalledOnce();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
