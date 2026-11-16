import { afterEach, describe, expect, test, vi } from 'vitest';

import { BrowserFilePicker } from './BrowserFilePicker.ts';

// Stops the input's click from opening the browser's dialog, keeping the input it was called on.
function catchClicks() {
    const clicked: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
        clicked.push(this);
    });

    return clicked;
}

function requireInput(clicked: readonly HTMLInputElement[]) {
    const input = clicked[0];
    if (input === undefined) throw new Error('No file input was clicked.');

    return input;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('BrowserFilePicker', () => {
    test('opens a file input for project files and gives the chosen file', async () => {
        const clicked = catchClicks();
        const picking = new BrowserFilePicker(window).pickFile();
        const input = requireInput(clicked);
        expect(input.type).toBe('file');
        expect(input.accept).toBe('.editable');

        const transfer = new DataTransfer();
        transfer.items.add(new File([new Uint8Array([80, 75, 3, 4])], 'castle.editable'));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change'));
        const picked = await picking;

        expect(picked?.name).toBe('castle.editable');
        const bytes = await picked?.read();
        expect([...new Uint8Array(bytes ?? new ArrayBuffer(0))]).toEqual([80, 75, 3, 4]);
        expect(input.isConnected).toBe(false);
    });

    test('gives nothing when the dialog is cancelled', async () => {
        const clicked = catchClicks();
        const picking = new BrowserFilePicker(window).pickFile();
        const input = requireInput(clicked);

        input.dispatchEvent(new Event('cancel'));

        expect(await picking).toBeUndefined();
        expect(input.isConnected).toBe(false);
    });
});
