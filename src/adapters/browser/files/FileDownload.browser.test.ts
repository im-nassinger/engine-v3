import { afterEach, describe, expect, test, vi } from 'vitest';

import { FileDownload } from './FileDownload.ts';

type Clicked = {
    readonly href: string;
    readonly download: string;
    readonly inPage: boolean;
};

// Catches the link's click instead of letting the browser download, keeping what the link carried.
function catchClicks() {
    const clicks: Clicked[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicks.push({ href: this.href, download: this.download, inPage: this.isConnected });
    });

    return clicks;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('FileDownload', () => {
    test('the download carries the file under its name', async () => {
        const clicks = catchClicks();
        const bytes = new Uint8Array([80, 75, 3, 4, 1, 2, 3]);

        new FileDownload(window).exportFile({ name: 'castle.editable', bytes, mediaType: 'application/zip' });

        expect(clicks).toHaveLength(1);
        const click = clicks[0];
        expect(click?.download).toBe('castle.editable');
        expect(click?.inPage).toBe(true);
        const response = await fetch(click?.href ?? '');
        const blob = await response.blob();
        expect(blob.type).toBe('application/zip');
        expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    });

    test('leaves no link in the page', () => {
        catchClicks();

        new FileDownload(window).exportFile({
            name: 'a.editable',
            bytes: new Uint8Array(),
            mediaType: 'application/zip',
        });

        expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    });
});
