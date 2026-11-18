import { createElement } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { closeControl, computedAs, shownControl, showControl, styleOf, tokenColour } from '../testing/controlLooks.ts';
import { Tooltip } from './Tooltip.tsx';

afterEach(() => {
    closeControl();
});

describe('Tooltip', () => {
    test('shows the name and then its key in muted text, dark with rounded corners and the shade', async () => {
        const owner = createElement('button', { type: 'button', className: 'owner' }, 'Shape');
        showControl(createElement(Tooltip, { label: 'Shape', shortcut: '4', children: owner }));
        await expect.poll(() => document.querySelector('.owner')).not.toBeNull();

        await userEvent.hover(shownControl('.owner'));

        await expect.poll(() => document.querySelector('[role="tooltip"]')).not.toBeNull();
        const bubble = shownControl('[role="tooltip"]');
        expect(bubble.textContent).toBe('Shape4');
        expect(styleOf(bubble).backgroundColor).toBe(tokenColour('--tooltip'));
        expect(styleOf(bubble).borderTopLeftRadius).toBe('8px');
        expect(styleOf(bubble).boxShadow).toBe(computedAs('box-shadow', 'var(--shade)'));
        expect(styleOf(shownControl('[role="tooltip"] > .shortcut')).color).toBe(tokenColour('--muted'));
    });
});
