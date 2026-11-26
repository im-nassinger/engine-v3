import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { TriggerComponent } from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import {
    addBareEntity,
    cardOf,
    click,
    closeEntityInspectorPage,
    openEntityInspectorPage,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';
import { menuRowNamed, requireBlock, scriptBlocks, word } from './testing/triggerCardPage.ts';

// The script box's scrollbars and fades (design/controls.md, v4 fix 4): thin bars over the blocks that show
// only where the script scrolls, show while the mouse is on it and can be dragged; and a grainy fade on each
// edge hiding blocks, only there.

// "set this Triggers › Timed door › Enabled to false" is wider than the 400 px Entity inspector.
const TIMED_DOOR: Trigger = {
    id: 1,
    name: 'Timed door',
    on: true,
    when: { kind: 'custom', name: 'open' },
    checks: [],
    actions: [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'triggerOn', trigger: 1 },
            op: 'set',
            amount: false,
        },
        { kind: 'wait', seconds: 2 },
        { kind: 'change', target: { kind: 'this' }, value: { kind: 'triggerOn', trigger: 1 }, op: 'set', amount: true },
    ],
};

const SHORT: Trigger = {
    id: 1,
    name: 'Short',
    on: true,
    when: { kind: 'levelStart' },
    checks: [],
    actions: [{ kind: 'wait', seconds: 1 }],
};

beforeEach(async () => {
    openEntityInspectorPage();
    await restMouseOutside();
});

afterEach(() => {
    closeEntityInspectorPage();
});

async function restMouseOutside() {
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
}

async function showTrigger(trigger: Trigger, blockCount: number) {
    const level = Level.createNew();
    const door = addBareEntity(level, 'Door');
    door.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));

    const shown = showEntityInspector(level);
    select(shown.session, [door]);
    await expect.poll(() => cardOf('TriggerComponent')).not.toBeNull();
    await expect.poll(() => scriptBlocks().length).toBe(blockCount);
}

function boxOf() {
    const box = requireBlock().querySelector<HTMLElement>('.trigger-script-box');
    if (box === null) throw new Error('No script box.');
    return box;
}

function scriptOf() {
    const script = boxOf().querySelector<HTMLElement>(':scope > .script');
    if (script === null) throw new Error('No script.');
    return script;
}

function barOf(axis: 'vertical' | 'horizontal') {
    const bar = boxOf().querySelector<HTMLElement>(`:scope > .script-bar.${axis}`);
    if (bar === null) throw new Error(`No ${axis} bar.`);
    return bar;
}

function isShown(bar: HTMLElement) {
    return getComputedStyle(bar).display !== 'none';
}

function opacityOf(bar: HTMLElement) {
    return Number(getComputedStyle(bar).opacity);
}

// The mask's two fades, one per axis: each a linear gradient, the first down the script, the second across.
function fades() {
    const image = scriptOf().style.maskImage;
    if (image === '') return undefined;

    const [vertical = '', horizontal = ''] = image.split(/,\s*(?=linear-gradient|url)/);
    return {
        top: /\) 0px/.test(vertical),
        bottom: vertical.includes('calc(100% -'),
        left: /\) 0px/.test(horizontal),
        right: horizontal.includes('calc(100% -'),
        hasGrain: image.includes('feTurbulence'),
    };
}

function scrollAcrossTo(left: number) {
    scriptOf().scrollLeft = left;
}

describe('the script box', () => {
    test('a script that fits has no bars and no fade', async () => {
        await showTrigger(SHORT, 2);

        expect(isShown(barOf('horizontal'))).toBe(false);
        expect(isShown(barOf('vertical'))).toBe(false);
        expect(scriptOf().style.maskImage).toBe('');
    });

    test('a line wider than the card scrolls sideways under a thin bar that takes no room', async () => {
        await showTrigger(TIMED_DOOR, 4);
        const script = scriptOf();
        expect(script.scrollWidth).toBeGreaterThan(script.clientWidth);
        expect(getComputedStyle(script).scrollbarWidth).toBe('none');

        const bar = barOf('horizontal');
        await expect.poll(() => isShown(bar)).toBe(true);
        expect(isShown(barOf('vertical'))).toBe(false);
        expect(getComputedStyle(bar).position).toBe('absolute');
        expect(bar.getBoundingClientRect().height).toBe(8);
        const scriptBottom = script.getBoundingClientRect().bottom;
        expect(bar.getBoundingClientRect().bottom).toBeCloseTo(scriptBottom, 0);

        const thumbShare = bar.getBoundingClientRect().width / script.clientWidth;
        const viewShare = script.clientWidth / script.scrollWidth;
        expect(thumbShare).toBeCloseTo(viewShare, 2);
    });

    test('the bars show while the mouse is on the script, and widen under it', async () => {
        await showTrigger(TIMED_DOOR, 4);
        const bar = barOf('horizontal');
        await expect.poll(() => isShown(bar)).toBe(true);
        await expect.poll(() => opacityOf(bar)).toBe(0);

        await userEvent.hover(scriptBlocks()[0] as HTMLElement);
        await expect.poll(() => opacityOf(bar)).toBe(1);

        await userEvent.hover(bar);
        await expect.poll(() => bar.getBoundingClientRect().height).toBe(11);

        await restMouseOutside();
        await expect.poll(() => opacityOf(bar)).toBe(0);
    });

    test('dragging the thumb scrolls the script and moves the thumb with it', async () => {
        await showTrigger(TIMED_DOOR, 4);
        const script = scriptOf();
        const bar = barOf('horizontal');
        await expect.poll(() => isShown(bar)).toBe(true);
        const maxScroll = script.scrollWidth - script.clientWidth;
        const thumbRoom = script.clientWidth - bar.getBoundingClientRect().width;
        const barLeft = bar.getBoundingClientRect().left;

        const grabAt = { x: 4, y: 4 };
        const box = boxOf();
        const boxRect = box.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        const dropAt = { x: barRect.left - boxRect.left + 4 + thumbRoom / 2, y: barRect.top - boxRect.top + 4 };
        await userEvent.dragAndDrop(bar, box, { sourcePosition: grabAt, targetPosition: dropAt });

        await expect.poll(() => script.scrollLeft).toBeGreaterThan(maxScroll / 2 - 2);
        expect(script.scrollLeft).toBeLessThan(maxScroll / 2 + 2);
        const thumbMoved = () => bar.getBoundingClientRect().left - barLeft;
        await expect.poll(thumbMoved).toBeGreaterThan(thumbRoom / 2 - 1);
        expect(thumbMoved()).toBeLessThan(thumbRoom / 2 + 1);
    });

    test('the vertical bar shows when the script is shorter than its blocks, short of the corner', async () => {
        await showTrigger(TIMED_DOOR, 4);
        const script = scriptOf();
        script.style.height = '60px';

        const vertical = barOf('vertical');
        await expect.poll(() => isShown(vertical)).toBe(true);
        const horizontal = barOf('horizontal');
        const verticalBottom = vertical.getBoundingClientRect().bottom;
        expect(verticalBottom).toBeLessThanOrEqual(script.getBoundingClientRect().bottom - 8 + 0.5);
        const horizontalRight = horizontal.getBoundingClientRect().right;
        expect(horizontalRight).toBeLessThanOrEqual(script.getBoundingClientRect().right - 8 + 0.5);
        await expect.poll(() => fades()?.bottom).toBe(true);
        expect(fades()?.top).toBe(false);
    });

    test('fades with the grain only the edges hiding blocks', async () => {
        await showTrigger(TIMED_DOOR, 4);
        await expect.poll(() => fades()?.right).toBe(true);
        expect(fades()).toEqual({ top: false, bottom: false, left: false, right: true, hasGrain: true });
        expect(scriptOf().style.maskComposite).toBe('intersect, intersect, add, intersect, add');

        const maxScroll = scriptOf().scrollWidth - scriptOf().clientWidth;
        scrollAcrossTo(maxScroll / 2);
        await expect.poll(() => fades()?.left).toBe(true);
        expect(fades()).toEqual({ top: false, bottom: false, left: true, right: true, hasGrain: true });

        scrollAcrossTo(maxScroll);
        await expect.poll(() => fades()?.right).toBe(false);
        expect(fades()).toEqual({ top: false, bottom: false, left: true, right: false, hasGrain: true });
    });

    test('the fade is 24 px, shorter while less than that is hidden', async () => {
        await showTrigger(TIMED_DOOR, 4);
        scrollAcrossTo(10);
        await expect.poll(() => scriptOf().style.maskImage).toContain('rgb(0, 0, 0) 10px');

        scrollAcrossTo(60);
        await expect.poll(() => scriptOf().style.maskImage).toContain('rgb(0, 0, 0) 24px');
    });

    test('a menu opened from a value box floats past the script uncut, with no fade or bar over it', async () => {
        await showTrigger(TIMED_DOOR, 4);
        await expect.poll(() => fades()?.right).toBe(true);

        click(word('Do', 'off'));
        await expect.poll(() => menuRowNamed('on')).toBeDefined();
        expect(getComputedStyle(scriptOf()).maskImage).toBe('none');
        expect(getComputedStyle(barOf('horizontal')).visibility).toBe('hidden');
        await userEvent.hover(menuRowNamed('on') as HTMLElement);
    });
});
