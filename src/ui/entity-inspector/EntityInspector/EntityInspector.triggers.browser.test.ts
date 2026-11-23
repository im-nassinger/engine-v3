import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { SurfaceComponent, TagsComponent, TriggerComponent } from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
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
    addRow,
    blockName,
    blocks,
    menuRowNamed,
    menuRows,
    notesOf,
    requireBlock,
    section,
    sentences,
    triggersCard,
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

// A Player tagged `player`, and a bare Button for the triggers.
function buildLevel() {
    const level = Level.createNew();
    const player = addBareEntity(level, 'Player');
    player.addComponent(new TagsComponent({ tags: ['player'] }));
    const button = addBareEntity(level, 'Button');

    return { level, player, button };
}

function withTriggers(entity: Entity, triggers: readonly Partial<Trigger>[]) {
    const made = triggers.map((parts, index) => {
        const trigger: Trigger = {
            id: index + 1,
            name: null,
            on: true,
            when: { kind: 'touched' },
            checks: [],
            actions: [],
            repeat: { kind: 'everyTime' },
            ...parts,
        };

        return trigger;
    });
    entity.addComponent(new TriggerComponent({ triggers: made, nextTriggerId: made.length + 1 }));
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

async function pickFromMenu(opener: HTMLElement, label: string) {
    click(opener);
    await expect.poll(() => menuRowNamed(label)).toBeDefined();
    menuRowNamed(label)?.click();
    await expect.poll(() => menuRows().length).toBe(0);
}

function history(session: EditorSession) {
    return session.openLevel.history;
}

const CANT_RUN = "Doesn't run until every yellow part is set.";
const NEEDS_SURFACE = 'Needs a Surface to notice touching. Add Surface as sensor';

describe('the trigger card', () => {
    test('makes a trigger from nothing: Add trigger, the When, a check, an action, then the Surface', async () => {
        const { level, button } = buildLevel();
        const { session, frames } = await showEntity(level, button);

        await pickFromMenu(buttonNamed(entityInspectorContainer(), 'Add Component'), 'TriggerComponent');
        await expect.poll(() => cardOf('TriggerComponent')).not.toBeNull();
        expect(blocks()).toHaveLength(0);

        click(buttonNamed(triggersCard(), 'Add trigger'));
        await expect.poll(() => blocks().length).toBe(1);
        expect(history(session).undoLabel).toBe('Add trigger');
        expect(word('When', 'pick an event').dataset['state']).toBe('unset');
        expect(addRow('Add action').dataset['needed']).toBe('true');

        await pickFromMenu(word('When', 'pick an event'), 'something starts touching this');
        await expect.poll(() => sentences('When')).toEqual(['something starts touching this']);
        expect(blockName()).toBe('Touched');

        await pickFromMenu(addRow('Add check'), 'who is tagged…');
        await expect.poll(() => sentences('If')).toEqual(['other is tagged pick a tag']);
        expect(history(session).undoLabel).toBe('Add check to trigger "Touched"');
        expect(section('If').querySelector('.hint')?.textContent).toBe('all must be true');
        await pickFromMenu(word('If', 'pick a tag'), 'player');
        await expect.poll(() => sentences('If')).toEqual(['other is tagged player']);

        await pickFromMenu(addRow('Add action'), 'win');
        await expect.poll(() => sentences('Do')).toEqual(['win']);
        expect(addRow('Add action').dataset['needed']).toBe('false');
        expect(sentences('Repeat')).toEqual(['every time']);

        frames.runFrame();
        await expect.poll(() => notesOf()).toEqual([NEEDS_SURFACE]);
        click(buttonNamed(requireBlock(), 'Add Surface as sensor'));
        expect(button.requireComponent(SurfaceComponent).get('sensor')).toBe(true);
        frames.runFrame();
        await expect.poll(() => notesOf()).toEqual([]);

        expect(triggersOf(button)).toEqual([
            {
                id: 1,
                name: null,
                on: true,
                when: { kind: 'touched' },
                checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: 'player' }],
                actions: [{ kind: 'win' }],
                repeat: { kind: 'everyTime' },
            },
        ]);
    });

    test('says a trigger with unset words does not run, and draws them yellow', async () => {
        const { level, button } = buildLevel();
        button.addComponent(new SurfaceComponent({ ...SurfaceComponent.schema.defaults(), sensor: true }));
        withTriggers(button, [{ checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: null }] }]);
        const { frames } = await showEntity(level, button);
        frames.runFrame();

        await expect.poll(() => notesOf()).toEqual([CANT_RUN]);
        expect(word('If', 'pick a tag').dataset['state']).toBe('unset');
        expect(getComputedStyle(word('If', 'pick a tag')).fontStyle).toBe('italic');
        expect(word('If', 'other').dataset['state']).toBe('set');
    });

    test('a key event strikes `other` through, and it can no longer be picked', async () => {
        const { level, button } = buildLevel();
        withTriggers(button, [{ checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: 'player' }] }]);
        await showEntity(level, button);
        await expect.poll(() => blocks().length).toBe(1);

        await pickFromMenu(word('When', 'something starts touching this'), 'a key is pressed, released or held');

        await expect.poll(() => word('If', 'other').dataset['state']).toBe('greyed');
        expect(getComputedStyle(word('If', 'other')).textDecorationLine).toBe('line-through');
        click(word('If', 'other'));
        await expect.poll(() => menuRowNamed('other')).toBeDefined();
        expect(menuRowNamed('other')?.getAttribute('aria-disabled')).toBe('true');
    });

    test('a number word opens a small field, and Enter types it in as one step', async () => {
        const { level, button } = buildLevel();
        withTriggers(button, [{ when: { kind: 'after', seconds: null }, actions: [{ kind: 'win' }] }]);
        const { session } = await showEntity(level, button);
        await expect.poll(() => blocks().length).toBe(1);

        click(word('When', 'how many seconds'));
        await expect.poll(() => document.querySelector('.trigger-word-field input')).not.toBeNull();
        const input = requireElement<HTMLInputElement>(document, '.trigger-word-field input');
        await userEvent.type(input, 'soon{Enter}');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(history(session).undoCount).toBe(0);

        await userEvent.clear(input);
        await userEvent.type(input, '2.5{Enter}');

        await expect.poll(() => sentences('When')).toEqual(['after 2.5 seconds']);
        expect(triggersOf(button)[0]?.when).toEqual({ kind: 'after', seconds: 2.5 });
        expect(history(session).undoCount).toBe(1);
        expect(document.querySelector('.trigger-word-field')).toBeNull();
    });

    test('× on a check or an action removes it as one step', async () => {
        const { level, button } = buildLevel();
        withTriggers(button, [{ actions: [{ kind: 'win' }, { kind: 'lose' }] }]);
        const { session } = await showEntity(level, button);
        await expect.poll(() => sentences('Do')).toEqual(['win', 'lose']);
        expect(section('Do').querySelector('.hint')?.textContent).toBe('top to bottom');
        expect(section('When').querySelector('.remove')).toBeNull();

        const removeWin = requireElement<HTMLElement>(section('Do'), 'button[aria-label="Remove win"]');
        expect(getComputedStyle(removeWin).visibility).toBe('hidden');
        click(removeWin);

        await expect.poll(() => sentences('Do')).toEqual(['lose']);
        expect(history(session).undoLabel).toBe('Remove action from trigger "Touched"');
    });

    test('the switch turns a trigger off and fades its sections', async () => {
        const { level, button } = buildLevel();
        withTriggers(button, [{ actions: [{ kind: 'win' }] }]);
        const { session } = await showEntity(level, button);
        await expect.poll(() => blocks().length).toBe(1);

        click(requireElement(requireBlock(), 'button[role="switch"]'));

        await expect.poll(() => requireBlock().dataset['on']).toBe('false');
        expect(triggersOf(button)[0]?.on).toBe(false);
        expect(history(session).undoLabel).toBe('Switch off trigger "Touched"');
        expect(getComputedStyle(section('When')).opacity).toBe('0.45');
    });

    test('the … menu renames, duplicates and deletes, each one step', async () => {
        const { level, button } = buildLevel();
        withTriggers(button, [{ actions: [{ kind: 'win' }] }]);
        const { session } = await showEntity(level, button);
        await expect.poll(() => blocks().length).toBe(1);
        const menuButton = () => requireElement<HTMLElement>(requireBlock(), 'button[aria-label="Touched menu"]');

        await pickFromMenu(menuButton(), 'Duplicate');
        await expect.poll(() => blocks().length).toBe(2);
        expect(triggersOf(button).map((trigger) => trigger.id)).toEqual([1, 2]);

        await pickFromMenu(menuButton(), 'Rename');
        const nameBox = requireElement<HTMLInputElement>(requireBlock(), 'input[aria-label="Trigger name"]');
        await userEvent.clear(nameBox);
        await userEvent.type(nameBox, 'Goal{Enter}');
        await expect.poll(() => blockName()).toBe('Goal');
        expect(history(session).undoLabel).toBe('Rename trigger "Touched"');

        await pickFromMenu(requireElement(requireBlock(), 'button[aria-label="Goal menu"]'), 'Delete');
        await expect.poll(() => blocks().length).toBe(1);
        expect(blockName()).toBe('Touched');
        expect(triggersOf(button).map((trigger) => trigger.id)).toEqual([2]);
        expect(history(session).undoLabel).toBe('Delete trigger "Goal"');
    });
});
