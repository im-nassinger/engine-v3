import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { BodyComponent, TriggerComponent, VariablesComponent } from '../../../core/components/index.ts';
import type { Action, Check, Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import {
    addBareEntity,
    buttonNamed,
    cardOf,
    click,
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    requireElement,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';
import {
    bandPoint,
    blockBeside,
    blocks,
    lastGap,
    slotAt,
    menuRowNamed,
    menuRows,
    parts,
    sentences,
    word,
} from './testing/triggerCardPage.ts';

beforeEach(async () => {
    openEntityInspectorPage();
    // Browser test files share one page; a mouse resting over a field would show its tooltip.
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

async function hoverBand(block: HTMLElement, band: 'top' | 'middle' | 'bottom') {
    await userEvent.hover(block, bandPoint(block, band));
}

// Opens a gap's slot from the block above it, and picks an item of its add menu.
async function addBlock(label: string, gap = lastGap()) {
    await hoverBand(blockBeside(gap, 'above'), 'bottom');
    await expect.poll(() => slotAt(gap)).not.toBeNull();
    click(slotAt(gap) as HTMLElement);
    await expect.poll(() => menuRowNamed(label)).toBeDefined();
    menuRowNamed(label)?.click();
    await expect.poll(() => menuRows().length).toBe(0);
}

// The World's `score` and `player_name`, and a Door with its own boolean `door_open` and a body.
function buildLevel() {
    const level = Level.createNew();
    level.world.addComponent(
        new VariablesComponent({
            variables: [
                { name: 'score', value: 0 },
                { name: 'player_name', value: 'Ada' },
            ],
        }),
    );
    const door = addBareEntity(level, 'Door');
    door.addComponent(new VariablesComponent({ variables: [{ name: 'door_open', value: false }] }));
    door.addComponent(new BodyComponent());

    return { level, door };
}

function withTrigger(entity: Entity, parts: Partial<Trigger>) {
    const trigger: Trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'custom', name: 'open' },
        checks: [],
        actions: [],
        ...parts,
    };
    entity.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));
}

function triggersOf(entity: Entity) {
    return entity.requireComponent(TriggerComponent).get('triggers');
}

async function showEntity(level: Level, entity: Entity) {
    const shown = showEntityInspector(level);
    select(shown.session, [entity]);
    await expect.poll(() => cardOf('TransformComponent')).not.toBeNull();

    return shown;
}

async function openMenu(opener: HTMLElement, label: string) {
    click(opener);
    await expect.poll(() => menuRowNamed(label)).toBeDefined();
}

async function pickFromMenu(opener: HTMLElement, label: string) {
    await openMenu(opener, label);
    menuRowNamed(label)?.click();
    await expect.poll(() => menuRows().length).toBe(0);
}

// The menu's text, one line per heading or row: a row's label, then its faint word after a |.
function menuLines() {
    const lines = document.querySelectorAll<HTMLElement>('.menu .menu-panel > .heading, .menu [role="menuitem"]');

    return [...lines].map((line) => {
        if (line.classList.contains('heading')) return `# ${line.textContent}`;

        const label = requireElement(line, '.label').textContent;
        const note = line.querySelector('.note')?.textContent;
        return note === undefined ? label : `${label} | ${note}`;
    });
}

function wordField() {
    return requireElement<HTMLElement>(document, '.trigger-word-field');
}

function wordFieldInput() {
    return requireElement<HTMLInputElement>(wordField(), 'input');
}

async function typeIntoWord(opener: HTMLElement, text: string) {
    click(opener);
    await expect.poll(() => document.querySelector('.trigger-word-field input')).not.toBeNull();
    await userEvent.clear(wordFieldInput());
    await userEvent.type(wordFieldInput(), `${text}{Enter}`);
    await expect.poll(() => document.querySelector('.trigger-word-field')).toBeNull();
}

describe("the trigger card's v4 parts", () => {
    test('makes "When this gets open: wait 2 s, flip door_open" from nothing', async () => {
        const { level, door } = buildLevel();
        const { session } = await showEntity(level, door);

        await pickFromMenu(buttonNamed(entityInspectorContainer(), 'Add Component'), 'TriggerComponent');
        await expect.poll(() => cardOf('TriggerComponent')).not.toBeNull();
        click(buttonNamed(requireElement(document, '.trigger-card'), 'Add trigger'));
        await expect.poll(() => blocks().length).toBe(1);

        await pickFromMenu(word('When', 'pick an event'), 'this gets a custom event');
        await expect.poll(() => sentences('When')).toEqual(['when this gets the custom event pick a name']);

        const stepsBeforeName = session.openLevel.history.undoCount;
        await openMenu(word('When', 'pick a name'), 'New name…');
        menuRowNamed('New name…')?.click();
        await expect.poll(() => document.querySelector('.trigger-word-field')).not.toBeNull();
        expect(requireElement(wordField(), '.hint').textContent).toBe('One word, such as open');
        expect(wordFieldInput().placeholder).toBe('Type a name');
        await userEvent.type(wordFieldInput(), 'open{Enter}');
        await expect.poll(() => sentences('When')).toEqual(['when this gets the custom event open']);
        expect(session.openLevel.history.undoCount).toBe(stepsBeforeName + 1);

        await addBlock('wait');
        await expect.poll(() => sentences('Do')).toEqual(['wait how long seconds']);
        await typeIntoWord(word('Do', 'how long'), '2');
        await expect.poll(() => sentences('Do')).toEqual(['wait 2 seconds']);

        await addBlock('change a value');
        await expect.poll(() => parts('Do').length).toBe(2);
        await expect.poll(() => sentences('Do')).toEqual(['wait 2 seconds', 'add a value to this pick a value']);
        await openMenu(word('Do', 'pick a value'), 'Variables');
        expect(menuLines().slice(0, 4)).toEqual([
            '# Level variables',
            'score | number',
            'player_name | string',
            '# Values of this',
        ]);
        click(menuRowNamed('Variables') as HTMLElement);
        await expect.poll(() => menuRowNamed('door_open')).toBeDefined();
        menuRowNamed('door_open')?.click();
        await expect.poll(() => sentences('Do')).toEqual(['wait 2 seconds', 'flip this door_open']);

        expect(triggersOf(door)).toEqual([
            {
                id: 1,
                name: null,
                on: true,
                when: { kind: 'custom', name: 'open' },
                checks: [],
                actions: [
                    { kind: 'wait', seconds: 2 },
                    {
                        kind: 'change',
                        target: { kind: 'this' },
                        value: { kind: 'variable', name: 'door_open', own: true },
                        op: 'flip',
                        amount: null,
                    },
                ],
            },
        ]);
    });

    test("Fire's number is optional: grey until set, and No number clears it", async () => {
        const { level, door } = buildLevel();
        const fire: Action = { kind: 'fire', name: 'open', target: { kind: 'this' }, amount: 2 };
        withTrigger(door, { actions: [fire] });
        await showEntity(level, door);
        await expect.poll(() => sentences('Do')).toEqual(['fire open on this with the number 2']);

        click(word('Do', 'with the number 2'));
        await expect.poll(() => document.querySelector('.trigger-word-field .clear')).not.toBeNull();
        click(buttonNamed(wordField(), 'No number'));

        const unsetNumber = 'with a number (for scripts)';
        await expect.poll(() => sentences('Do')).toEqual([`fire open on this ${unsetNumber}`]);
        expect(word('Do', unsetNumber).dataset['state']).toBe('optional');
        expect(getComputedStyle(word('Do', unsetNumber)).fontStyle).toBe('normal');
        expect(triggersOf(door)[0]?.actions[0]).toEqual({ ...fire, amount: null });
    });

    test("a string's value is a text field in quotes, and a boolean's is true or false", async () => {
        const { level, door } = buildLevel();
        const compare: Check = { kind: 'value', target: { kind: 'this' }, value: null, compare: 'is', amount: null };
        withTrigger(door, { checks: [compare], actions: [{ kind: 'win' }] });
        await showEntity(level, door);
        await expect.poll(() => blocks().length).toBe(1);

        await pickFromMenu(word('If', 'pick a value'), 'player_name');
        await expect.poll(() => sentences('If')[0]).toMatch(/^player_name is /);
        await openMenu(word('If', 'is'), 'is not');
        expect(menuLines()).toEqual(['is', 'is not']);
        click(word('If', 'is'));
        await expect.poll(() => menuRows().length).toBe(0);

        const checkWords = parts('If')[0]?.querySelectorAll<HTMLElement>('.trigger-slot-word');
        const valueWord = checkWords?.[2] as HTMLElement;
        click(valueWord);
        await expect.poll(() => document.querySelector('.trigger-word-field input')).not.toBeNull();
        expect(wordFieldInput().placeholder).toBe('Type a text');
        await userEvent.type(wordFieldInput(), 'Bo{Enter}');
        await expect.poll(() => sentences('If')).toEqual(['player_name is "Bo"']);

        await openMenu(word('If', 'player_name'), 'Variables');
        click(menuRowNamed('Variables') as HTMLElement);
        await expect.poll(() => menuRowNamed('door_open')).toBeDefined();
        menuRowNamed('door_open')?.click();
        await expect.poll(() => sentences('If')).toEqual(['this door_open is true or false']);
        await openMenu(word('If', 'true or false'), 'true');
        expect(menuLines()).toEqual(['true', 'false']);
        menuRowNamed('true')?.click();
        await expect.poll(() => sentences('If')).toEqual(['this door_open is true']);
    });

    test("the value check's menu opens a component's values, a body's live ones last", async () => {
        const { level, door } = buildLevel();
        withTrigger(door, { when: { kind: 'levelStart' }, actions: [{ kind: 'win' }] });
        await showEntity(level, door);
        await expect.poll(() => blocks().length).toBe(1);

        await addBlock('if … (a value)');
        const valueWord = requireElement<HTMLElement>(parts('If')[0] as HTMLElement, '[data-state="unset"]');
        await openMenu(valueWord, 'Body');
        expect(menuLines().slice(-4)).toEqual(['Transform', 'Body', 'Variables', 'Tags']);
        click(menuRowNamed('Body') as HTMLElement);
        await expect.poll(() => menuRowNamed('Speed')).toBeDefined();

        expect(menuLines().slice(-2)).toEqual(['Speed | live', 'Velocity | live']);
        menuRowNamed('Speed')?.click();
        await expect.poll(() => sentences('If')[0]).toMatch(/^this Body › Speed is more than/);
    });
});
