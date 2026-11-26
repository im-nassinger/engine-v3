import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { TagsComponent, TriggerComponent, VariablesComponent } from '../../../core/components/index.ts';
import type { Action, Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import {
    addBareEntity,
    cardOf,
    click,
    closeEntityInspectorPage,
    openEntityInspectorPage,
    requireElement,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';
import {
    blockBeside,
    bandPoint,
    menuRowNamed,
    menuRows,
    openContextMenu,
    parts,
    scriptBlocks,
    sentences,
    shownSlots,
    slotAt,
    slotButton,
    word,
    TYPED_INPUT,
} from './testing/triggerCardPage.ts';

beforeEach(async () => {
    openEntityInspectorPage();
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

async function hoverBand(block: HTMLElement, band: 'top' | 'middle' | 'bottom') {
    await userEvent.hover(block, bandPoint(block, band));
}

const POSITION = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;

// The mockup's two triggers: Coin pickup, with an If, and Timed door, which rests by switching itself off.
const COIN_PICKUP: Trigger = {
    id: 1,
    name: 'Coin pickup',
    on: true,
    when: { kind: 'touched' },
    checks: [{ kind: 'value', target: { kind: 'other' }, value: { kind: 'tag' }, compare: 'is', amount: 'player' }],
    actions: [
        { kind: 'change', target: { kind: 'this' }, value: { kind: 'variable', name: 'coins' }, op: 'add', amount: 1 },
        { kind: 'destroy', target: { kind: 'this' } },
    ],
};

const TIMED_DOOR_ACTIONS: Action[] = [
    { kind: 'change', target: { kind: 'this' }, value: { kind: 'triggerOn', trigger: 2 }, op: 'set', amount: false },
    { kind: 'change', target: { kind: 'this' }, value: POSITION, op: 'set', amount: { x: 0, y: -200 } },
    { kind: 'wait', seconds: 2 },
];

const TIMED_DOOR: Trigger = {
    id: 2,
    name: 'Timed door',
    on: true,
    when: { kind: 'custom', name: 'open' },
    checks: [],
    actions: TIMED_DOOR_ACTIONS,
};

async function showDoor() {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));
    const player = addBareEntity(level, 'Player');
    player.addComponent(new TagsComponent({ tags: ['player'] }));
    const door = addBareEntity(level, 'Door');
    door.addComponent(new TriggerComponent({ triggers: [COIN_PICKUP, TIMED_DOOR], nextTriggerId: 3 }));

    const shown = showEntityInspector(level);
    select(shown.session, [door]);
    await expect.poll(() => cardOf('TriggerComponent')).not.toBeNull();

    return { ...shown, door };
}

function triggersOf(entity: Entity) {
    return entity.requireComponent(TriggerComponent).get('triggers');
}

function shapesOf(blockIndex: number) {
    return scriptBlocks(blockIndex).map((block) => `${block.dataset['shape']} ${block.dataset['colour']}`);
}

// A block's colour is its body's, drawn by ::before.
function bodyOf(block: HTMLElement) {
    return getComputedStyle(block, '::before');
}

// A colour as 0 to 255 per channel, whether the browser writes it rgb() or color(srgb).
function rgbOf(colour: string) {
    const numbers = colour.match(/[\d.]+/g)?.map(Number) ?? [];
    const channels = numbers.slice(0, 3);
    if (colour.startsWith('color(')) return channels.map((channel) => Math.round(channel * 255));

    return channels;
}

function toothOf(block: HTMLElement) {
    return getComputedStyle(block, '::after');
}

describe('the trigger card as Scratch blocks', () => {
    test("draws each trigger as the mockup's blocks: a colour per kind, an icon first, teeth and the ring", async () => {
        await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        expect(shapesOf(0)).toEqual(['event event', 'ifTop if', 'action add', 'action destroy', 'ifBottom if']);
        expect(shapesOf(1)).toEqual(['event event', 'action set', 'action set', 'action wait']);
        expect(sentences('When', 1)).toEqual(['when this gets the custom event open']);
        expect(sentences('Do', 1)).toEqual([
            'set this Triggers › Timed door › Enabled to off',
            'set this Transform › Position to 0, -2',
            'wait 2 seconds',
        ]);

        const [event, ifTop, add, destroy, ifBottom] = scriptBlocks(0);
        const colours = [event, ifTop, add, destroy].map((block) => bodyOf(block as HTMLElement).backgroundColor);
        expect(colours).toEqual(['rgb(184, 129, 51)', 'rgb(47, 137, 126)', 'rgb(125, 88, 184)', 'rgb(181, 71, 61)']);
        const [, enabled, , wait] = scriptBlocks(1);
        expect(bodyOf(enabled as HTMLElement).backgroundColor).toBe('rgb(61, 102, 195)');
        expect(bodyOf(wait as HTMLElement).backgroundColor).toBe('rgb(173, 74, 124)');

        // One icon first on every block but the If's bottom bar, in the block's white.
        for (const block of [event, ifTop, add, destroy] as HTMLElement[]) {
            expect(block.querySelector(':scope > .tooltip > .icon-button > svg.icon')).not.toBeNull();
        }
        expect(ifBottom?.querySelector('svg.icon')).toBeNull();
        expect(getComputedStyle(requireElement(event as HTMLElement, 'svg.icon')).color).toBe('rgb(255, 255, 255)');

        // A tooth under each block with one below it; the last block in a column has none.
        expect(toothOf(event as HTMLElement).display).toBe('block');
        expect(toothOf(add as HTMLElement).width).toBe('20px');
        expect(toothOf(destroy as HTMLElement).display).toBe('none');
        expect(toothOf(ifBottom as HTMLElement).display).toBe('none');
        expect(toothOf(wait as HTMLElement).display).toBe('none');
        expect(toothOf(ifTop as HTMLElement).left).toBe('30px');

        // The 2 px ring of the trigger's background cuts each block from the next.
        expect(bodyOf(add as HTMLElement).boxShadow).toMatch(/0px 0px 0px 2px$/);
        expect(bodyOf(add as HTMLElement).borderRadius).toBe('0px 4px 4px 0px');
        expect(bodyOf(event as HTMLElement).borderRadius).toBe('4px');
    });

    test('menus are pills of the block darkened by a fifth, numbers white ovals, a path dim, a time has a unit menu', async () => {
        await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        const tag = word('If', 'player');
        expect(tag.dataset['look']).toBe('menu');
        expect(getComputedStyle(tag, '::after').content).toBe('"▾"');
        expect(rgbOf(getComputedStyle(tag).backgroundColor)).toEqual([38, 110, 101]);
        expect(getComputedStyle(tag).borderRadius).toBe('999px');

        const amount = word('Do', '1');
        expect(amount.dataset['look']).toBe('number');
        expect(getComputedStyle(amount).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(amount).color).toBe('rgb(87, 94, 117)');

        const position = word('Do', 'Transform › Position', 1);
        const steps = [...position.querySelectorAll<HTMLElement>('.path')].map((step) => step.textContent);
        expect(steps).toEqual(['Transform › ']);
        expect(getComputedStyle(requireElement(position, '.path')).opacity).toBe('0.7');

        const unit = word('Do', 'seconds', 1);
        expect(unit.dataset['look']).toBe('menu');
        click(unit);
        await expect.poll(() => menuRows().map((row) => row.textContent)).toEqual(['seconds']);
    });

    test("a number oval opens fix 2's box, and typing a time is one step", async () => {
        const { session, door } = await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        click(word('Do', '2', 1));
        await expect.poll(() => document.querySelector(TYPED_INPUT)).not.toBeNull();
        const input = requireElement<HTMLInputElement>(document, TYPED_INPUT);
        await userEvent.clear(input);
        await userEvent.type(input, '5{Enter}');

        await expect.poll(() => sentences('Do', 1).at(-1)).toBe('wait 5 seconds');
        expect(triggersOf(door)[1]?.actions[2]).toEqual({ kind: 'wait', seconds: 5 });
        expect(session.openLevel.history.undoCount).toBe(1);
    });

    test('a target box opens the entity picker, and a menu box its menu', async () => {
        const { door } = await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        click(word('Do', 'this'));
        await expect.poll(() => document.querySelector('.entity-picker')).not.toBeNull();
        menuRowNamed('other')?.click();
        await expect.poll(() => sentences('Do')).toEqual(['add 1 to coins', 'destroy other']);

        click(word('Do', 'off', 1));
        await expect.poll(() => menuRowNamed('on')).toBeDefined();
        menuRowNamed('on')?.click();
        await expect.poll(() => sentences('Do', 1)[0]).toBe('set this Triggers › Timed door › Enabled to on');
        expect(triggersOf(door)[1]?.actions[0]).toMatchObject({ amount: true });
    });

    test("a block's top third opens the slot above it, its bottom third the one below, its middle none", async () => {
        await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);
        const position = blockBeside(2, 'above', 1);

        await hoverBand(position, 'bottom');
        await expect.poll(() => slotAt(2, 1)).not.toBeNull();
        expect(getComputedStyle(position).cursor).toBe('s-resize');
        expect(shownSlots(1)).toHaveLength(1);

        await hoverBand(position, 'middle');
        await expect.poll(() => slotAt(2, 1)).toBeNull();
        expect(getComputedStyle(position).cursor).toBe('auto');

        await hoverBand(position, 'top');
        await expect.poll(() => slotAt(1, 1)).not.toBeNull();
        expect(getComputedStyle(position).cursor).toBe('n-resize');
        await expect.poll(() => slotAt(2, 1)).toBeNull();
    });

    test("the mouse on a value box's menu opens no slot under it", async () => {
        await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        click(word('Do', 'off', 1));
        await expect.poll(() => menuRowNamed('on')).toBeDefined();
        await userEvent.hover(menuRowNamed('on') as HTMLElement);
        await new Promise(requestAnimationFrame);

        expect(shownSlots(1)).toHaveLength(0);
        expect(menuRowNamed('on')?.isConnected).toBe(true);
    });

    test('a slot adds the picked block at its gap as one step', async () => {
        const { session, door } = await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        await hoverBand(blockBeside(1, 'above', 1), 'bottom');
        await expect.poll(() => slotAt(1, 1)).not.toBeNull();
        expect(slotAt(1, 1)?.textContent).toBe('add a block');
        click(slotButton(1, 1));
        await expect.poll(() => menuRowNamed('win')).toBeDefined();
        menuRowNamed('win')?.click();

        await expect
            .poll(() => triggersOf(door)[1]?.actions.map((action) => action.kind))
            .toEqual(['change', 'win', 'change', 'wait']);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(parts('Do', 1)).toHaveLength(4);
    });

    test('the slot an added block took stays closed, so the new block keeps its place', async () => {
        await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        await hoverBand(blockBeside(1, 'above', 1), 'bottom');
        await expect.poll(() => slotAt(1, 1)).not.toBeNull();
        click(slotButton(1, 1));
        await expect.poll(() => menuRowNamed('win')).toBeDefined();
        menuRowNamed('win')?.click();

        await expect.poll(() => scriptBlocks(1).length).toBe(5);
        expect(shownSlots(1)).toHaveLength(0);
    });

    test("a block's context menu deletes its part as one step; the event block can't be deleted", async () => {
        const { session, door } = await showDoor();
        await expect.poll(() => scriptBlocks(0).length).toBe(5);

        const event = openContextMenu(scriptBlocks(0)[0] as HTMLElement);
        expect(event.defaultPrevented).toBe(true);
        await expect.poll(() => menuRowNamed('Delete')).toBeDefined();
        expect(menuRowNamed('Delete')?.getAttribute('aria-disabled')).toBe('true');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => menuRows()).toHaveLength(0);

        const destroy = scriptBlocks(0)[3] as HTMLElement;
        openContextMenu(destroy);
        await expect.poll(() => menuRowNamed('Delete')).toBeDefined();
        menuRowNamed('Delete')?.click();

        await expect.poll(() => triggersOf(door)[0]?.actions.map((action) => action.kind)).toEqual(['change']);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(menuRows()).toHaveLength(0);
    });

    test("Replace opens the block's own menu beside it: an action becomes another, an event another event", async () => {
        const { door } = await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        openContextMenu(scriptBlocks(1)[3] as HTMLElement);
        await expect.poll(() => menuRowNamed('Replace')).toBeDefined();
        click(menuRowNamed('Replace') as HTMLElement);
        await expect.poll(() => menuRowNamed('win')).toBeDefined();
        menuRowNamed('win')?.click();
        await expect
            .poll(() => triggersOf(door)[1]?.actions.map((action) => action.kind))
            .toEqual(['change', 'change', 'win']);

        openContextMenu(scriptBlocks(1)[0] as HTMLElement);
        await expect.poll(() => menuRowNamed('Replace')).toBeDefined();
        click(menuRowNamed('Replace') as HTMLElement);
        await expect.poll(() => menuRowNamed('the level starts')).toBeDefined();
        menuRowNamed('the level starts')?.click();
        await expect.poll(() => triggersOf(door)[1]?.when).toEqual({ kind: 'levelStart' });
    });

    test("a click on a block's icon opens what Replace opens, with no Delete", async () => {
        const { door } = await showDoor();
        await expect.poll(() => scriptBlocks(1).length).toBe(4);

        click(requireElement(scriptBlocks(1)[3] as HTMLElement, 'button.icon-button'));
        await expect.poll(() => menuRowNamed('win')).toBeDefined();
        expect(menuRowNamed('Delete')).toBeUndefined();
        menuRowNamed('win')?.click();
        await expect
            .poll(() => triggersOf(door)[1]?.actions.map((action) => action.kind))
            .toEqual(['change', 'change', 'win']);
    });

    test("the event's own box only switches between its kinds: starts or stops touching", async () => {
        await showDoor();
        await expect.poll(() => scriptBlocks(0).length).toBe(5);

        click(word('When', 'starts'));
        await expect
            .poll(() => menuRows().map((row) => row.textContent))
            .toEqual(['starts touching', 'stops touching']);
    });

    test('the script is at least 4 blocks tall and at most 10, scrolling past them', async () => {
        const level = Level.createNew();
        const door = addBareEntity(level, 'Door');
        const waits: Action[] = Array.from({ length: 14 }, () => ({ kind: 'wait', seconds: 1 }));
        const short: Trigger = { ...TIMED_DOOR, id: 1, actions: [{ kind: 'win' }] };
        const long: Trigger = { ...TIMED_DOOR, id: 2, actions: waits };
        door.addComponent(new TriggerComponent({ triggers: [short, long], nextTriggerId: 3 }));
        const shown = showEntityInspector(level);
        select(shown.session, [door]);
        await expect.poll(() => scriptBlocks(1).length).toBe(15);

        const scripts = [...document.querySelectorAll<HTMLElement>('.trigger-script-box > .script')];
        const [shortScript, longScript] = scripts.map((script) => script.getBoundingClientRect().height);
        expect(shortScript).toBe(4 * 34 + 12);
        expect(longScript).toBe(10 * 34 + 12);
        expect((scripts[1] as HTMLElement).scrollHeight).toBeGreaterThan(10 * 34 + 12);
    });
});
