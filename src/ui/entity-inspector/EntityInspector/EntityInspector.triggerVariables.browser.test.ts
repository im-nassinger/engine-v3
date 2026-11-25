import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { TriggerComponent, VariablesComponent } from '../../../core/components/index.ts';
import type { Action, Check, Trigger } from '../../../core/fields/index.ts';
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
import { blocks, menuRowNamed, menuRows, parts, sentences, TYPED_INPUT, word } from './testing/triggerCardPage.ts';

beforeEach(async () => {
    openEntityInspectorPage();
    // Browser test files share one page; a mouse resting over a field would show its tooltip.
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

const THIS = { kind: 'this' } as const;
const SCORE = { kind: 'variable', name: 'score' } as const;
const POSITION = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;

// The World's numbers `score` and `bonus`, its string `player_name`, and a Door with its own number `delay`
// and boolean `door_open`.
function buildLevel(trigger: Partial<Trigger>) {
    const level = Level.createNew();
    level.world.addComponent(
        new VariablesComponent({
            variables: [
                { name: 'score', value: 0 },
                { name: 'bonus', value: 2 },
                { name: 'player_name', value: 'Ada' },
            ],
        }),
    );
    const door = addBareEntity(level, 'Door');
    door.addComponent(
        new VariablesComponent({
            variables: [
                { name: 'delay', value: 1 },
                { name: 'door_open', value: false },
            ],
        }),
    );
    const made: Trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'custom', name: 'open' },
        checks: [],
        actions: [],
        ...trigger,
    };
    door.addComponent(new TriggerComponent({ triggers: [made], nextTriggerId: 2 }));

    return { level, door };
}

async function showDoor(trigger: Partial<Trigger>) {
    const { level, door } = buildLevel(trigger);
    const shown = showEntityInspector(level);
    select(shown.session, [door]);
    await expect.poll(() => cardOf('TransformComponent')).not.toBeNull();
    await expect.poll(() => blocks().length).toBe(1);

    return door;
}

function firstTrigger(door: Entity) {
    return door.requireComponent(TriggerComponent).get('triggers')[0] as Trigger;
}

// The open menu's headings and rows, a heading as "# title".
function menuLines() {
    const lines = document.querySelectorAll<HTMLElement>('.menu .menu-panel > .heading, .menu [role="menuitem"]');

    return [...lines].map((line) => {
        if (line.classList.contains('heading')) return `# ${line.textContent}`;

        return requireElement(line, '.label').textContent;
    });
}

async function pickVariable(opener: HTMLElement, name: string) {
    click(opener);
    await expect.poll(() => menuRowNamed(name)).toBeDefined();
    menuRowNamed(name)?.click();
    await expect.poll(() => menuRows().length).toBe(0);
}

async function typeInto(opener: HTMLElement, text: string) {
    click(opener);
    await expect.poll(() => document.querySelector(TYPED_INPUT)).not.toBeNull();
    const input = requireElement<HTMLInputElement>(document, TYPED_INPUT);
    await userEvent.clear(input);
    await userEvent.type(input, `${text}{Enter}`);
    await expect.poll(() => document.querySelector(TYPED_INPUT)).toBeNull();
}

describe("the blocks' value boxes take variables (fix 10)", () => {
    test("Change value's op menu offers Multiply and Divide, and multiply reads by", async () => {
        const add: Action = { kind: 'change', target: THIS, value: SCORE, op: 'add', amount: 1 };
        const door = await showDoor({ actions: [add] });
        await expect.poll(() => sentences('Do')).toEqual(['add 1 to score']);

        click(word('Do', 'add'));
        await expect.poll(() => menuLines()).toEqual(['set', 'add', 'subtract', 'multiply', 'divide']);
        menuRowNamed('multiply')?.click();

        await expect.poll(() => sentences('Do')).toEqual(['multiply score by 1']);
        expect(firstTrigger(door).actions[0]).toEqual({ ...add, op: 'multiply' });
    });

    test("Change value's amount: a typed box above the number variables; a pick shows its name, typing switches back", async () => {
        const add: Action = { kind: 'change', target: THIS, value: SCORE, op: 'add', amount: 1 };
        const door = await showDoor({ actions: [add] });

        click(word('Do', '1'));
        await expect.poll(() => document.querySelector(TYPED_INPUT)).not.toBeNull();
        expect(menuLines()).toEqual(['# Level variables', 'score', 'bonus', '# this', 'delay']);
        menuRowNamed('bonus')?.click();

        await expect.poll(() => sentences('Do')).toEqual(['add bonus to score']);
        expect(firstTrigger(door).actions[0]).toEqual({ ...add, amount: { kind: 'variable', name: 'bonus' } });

        await typeInto(word('Do', 'bonus'), '5');
        await expect.poll(() => sentences('Do')).toEqual(['add 5 to score']);
        expect(firstTrigger(door).actions[0]).toEqual({ ...add, amount: 5 });
    });

    test('a boolean box offers true and false, then the boolean variables', async () => {
        const doorOpen = { kind: 'variable', name: 'door_open', own: true } as const;
        const set: Action = { kind: 'change', target: THIS, value: doorOpen, op: 'set', amount: true };
        const door = await showDoor({ actions: [set] });
        await expect.poll(() => sentences('Do')).toEqual(['set this door_open to true']);

        click(word('Do', 'true'));
        await expect
            .poll(() => menuLines())
            .toEqual(['true', 'false', '# Level variables', 'no boolean variables', '# this', 'door_open']);
        menuRowNamed('door_open')?.click();
        await expect.poll(() => sentences('Do')).toEqual(['set this door_open to door_open']);
        expect(firstTrigger(door).actions[0]).toEqual({ ...set, amount: { ...doorOpen } });

        const amountWord = [...(parts('Do')[0]?.querySelectorAll<HTMLElement>('.trigger-slot-word') ?? [])].at(-1);
        await pickVariable(amountWord as HTMLElement, 'false');
        expect(firstTrigger(door).actions[0]).toEqual({ ...set, amount: false });
    });

    test("the If's amount takes a variable of the checked value's type and goes back to a typed one", async () => {
        const check: Check = { kind: 'value', target: THIS, value: SCORE, compare: 'atLeast', amount: 3 };
        const door = await showDoor({ checks: [check], actions: [{ kind: 'win' }] });
        await expect.poll(() => sentences('If')).toEqual(['score is at least 3']);

        click(word('If', '3'));
        await expect.poll(() => menuLines()).toEqual(['# Level variables', 'score', 'bonus']);
        menuRowNamed('bonus')?.click();
        await expect.poll(() => sentences('If')).toEqual(['score is at least bonus']);
        expect(firstTrigger(door).checks[0]).toEqual({ ...check, amount: { kind: 'variable', name: 'bonus' } });

        await typeInto(word('If', 'bonus'), '4');
        await expect.poll(() => sentences('If')).toEqual(['score is at least 4']);
        expect(firstTrigger(door).checks[0]).toEqual({ ...check, amount: 4 });
    });

    test("Wait's seconds take this's own number variable, and a typed time again", async () => {
        const door = await showDoor({ actions: [{ kind: 'wait', seconds: 2 }] });

        await pickVariable(word('Do', '2'), 'delay');
        await expect.poll(() => sentences('Do')).toEqual(['wait delay seconds']);
        expect(firstTrigger(door).actions[0]).toEqual({
            kind: 'wait',
            seconds: { kind: 'variable', name: 'delay', own: true },
        });

        await typeInto(word('Do', 'delay'), '3');
        await expect.poll(() => sentences('Do')).toEqual(['wait 3 seconds']);
        expect(firstTrigger(door).actions[0]).toEqual({ kind: 'wait', seconds: 3 });
    });

    test("Fire custom event's number takes a number variable, and a typed number again", async () => {
        const fire: Action = { kind: 'fire', target: THIS, name: 'open', amount: null };
        const door = await showDoor({ actions: [fire] });

        await pickVariable(word('Do', 'with a number (for scripts)'), 'score');
        await expect.poll(() => sentences('Do')).toEqual(['fire open on this with the number score']);
        expect(firstTrigger(door).actions[0]).toEqual({ ...fire, amount: { kind: 'variable', name: 'score' } });

        await typeInto(word('Do', 'with the number score'), '7');
        await expect.poll(() => sentences('Do')).toEqual(['fire open on this with the number 7']);
        expect(firstTrigger(door).actions[0]).toEqual({ ...fire, amount: 7 });
    });

    test('a vector box offers no variable: it opens its X and Y boxes alone', async () => {
        const set: Action = { kind: 'change', target: THIS, value: POSITION, op: 'set', amount: { x: 0, y: 0 } };
        await showDoor({ actions: [set] });

        click(word('Do', '0, 0'));
        await expect.poll(() => document.querySelector('.trigger-word-field input[aria-label="Y"]')).not.toBeNull();
        expect(document.querySelector('.menu')).toBeNull();
    });
});
