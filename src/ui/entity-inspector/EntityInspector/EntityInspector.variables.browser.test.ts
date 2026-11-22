import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { VariablesComponent } from '../../../core/components/index.ts';
import type { Variable } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addBareEntity,
    buttonNamed,
    cardOf,
    click,
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    requireCard,
    requireElement,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';

beforeEach(async () => {
    openEntityInspectorPage();
    // Browser test files share one page; a mouse resting over a field would show its tooltip.
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

function levelWithVariables(variables: Variable[]) {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables }));

    return level;
}

function variablesOf(level: Level) {
    return level.world.requireComponent(VariablesComponent).get('variables');
}

function variablesCard() {
    return requireCard('VariablesComponent');
}

function rows() {
    return [...variablesCard().querySelectorAll<HTMLElement>('.variable-row')];
}

function requireRow(index: number) {
    const row = rows()[index];
    if (row === undefined) throw new Error(`No variable row ${index}.`);

    return row;
}

function shownRows() {
    return rows().map((row) => {
        const name = requireElement<HTMLInputElement>(row, 'input.name').value;
        const value = requireElement<HTMLInputElement>(row, '.number-box input').value;

        return `${name} ${value}`;
    });
}

function menuRows() {
    return [...entityInspectorContainer().querySelectorAll<HTMLElement>('[role="menuitem"]')];
}

function menuRowNamed(label: string) {
    return menuRows().find((candidate) => candidate.textContent.trim() === label);
}

function history(session: EditorSession) {
    return session.openLevel.history;
}

async function showWorld(level: Level) {
    const { session } = showEntityInspector(level);
    select(session, [level.world]);
    await expect.poll(() => cardOf('PhysicsWorldComponent')).not.toBeNull();

    return session;
}

async function typeInto(input: HTMLInputElement, text: string) {
    await userEvent.tripleClick(input);
    await userEvent.keyboard(`${text}{Enter}`);
}

describe('the Variables card', () => {
    test('shows one row per variable, its name as the label, its number and its ×, then Add variable', async () => {
        const level = levelWithVariables([
            { name: 'coins', value: 0 },
            { name: 'lives', value: 3 },
        ]);
        await showWorld(level);

        await expect.poll(shownRows).toEqual(['coins 0', 'lives 3']);
        expect(variablesCard().querySelector('.card-field .label')).toBeNull();
        expect(requireElement(requireRow(0), 'button[aria-label="Remove coins"]')).toBeDefined();
        expect(buttonNamed(variablesCard(), 'Add variable')).toBeDefined();
    });

    test('Add Component adds it to the World, and Add variable adds variable_1 as one step', async () => {
        const level = Level.createNew();
        const session = await showWorld(level);

        click(buttonNamed(entityInspectorContainer(), 'Add Component'));
        await expect.poll(() => menuRowNamed('VariablesComponent')).toBeDefined();
        menuRowNamed('VariablesComponent')?.click();
        await expect.poll(() => cardOf('VariablesComponent')).not.toBeNull();
        expect(history(session).undoLabel).toBe('Add VariablesComponent');

        click(buttonNamed(variablesCard(), 'Add variable'));

        expect(variablesOf(level)).toEqual([{ name: 'variable_1', value: 0 }]);
        expect(history(session).undoLabel).toBe('Change Variables');
        await expect.poll(shownRows).toEqual(['variable_1 0']);
    });

    test('a typed name and a typed number are each one step, the name made a word', async () => {
        const level = levelWithVariables([{ name: 'variable_1', value: 0 }]);
        const session = await showWorld(level);
        await expect.poll(() => rows().length).toBe(1);

        await typeInto(requireElement<HTMLInputElement>(requireRow(0), 'input.name'), 'Extra Lives');
        expect(variablesOf(level)).toEqual([{ name: 'extra_lives', value: 0 }]);
        expect(history(session).undoCount).toBe(1);

        await typeInto(requireElement<HTMLInputElement>(requireRow(0), '.number-box input'), '3');
        expect(variablesOf(level)).toEqual([{ name: 'extra_lives', value: 3 }]);
        expect(history(session).undoCount).toBe(2);
        await expect.poll(shownRows).toEqual(['extra_lives 3']);
    });

    test('a name already taken is refused with its reason as status text, and no step', async () => {
        const level = levelWithVariables([
            { name: 'coins', value: 0 },
            { name: 'lives', value: 3 },
        ]);
        const session = await showWorld(level);
        await expect.poll(() => rows().length).toBe(2);

        await typeInto(requireElement<HTMLInputElement>(requireRow(1), 'input.name'), 'Coins');

        expect(session.status.current).toBe('Variables already has coins');
        expect(history(session).undoCount).toBe(0);
        await expect.poll(shownRows).toEqual(['coins 0', 'lives 3']);
    });

    test('× removes its variable as one step', async () => {
        const level = levelWithVariables([
            { name: 'coins', value: 0 },
            { name: 'lives', value: 3 },
        ]);
        const session = await showWorld(level);
        await expect.poll(() => rows().length).toBe(2);

        click(requireElement(requireRow(0), 'button[aria-label="Remove coins"]'));

        expect(variablesOf(level)).toEqual([{ name: 'lives', value: 3 }]);
        expect(history(session).undoCount).toBe(1);
        await expect.poll(shownRows).toEqual(['lives 3']);
    });

    test("is greyed in another entity's Add Component menu", async () => {
        const level = Level.createNew();
        const crate = addBareEntity(level, 'Crate');
        const { session } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => entityInspectorContainer().querySelector('.add-component')).not.toBeNull();

        click(buttonNamed(entityInspectorContainer(), 'Add Component'));
        await expect.poll(() => menuRowNamed('VariablesComponent')).toBeDefined();

        expect(menuRowNamed('VariablesComponent')?.getAttribute('aria-disabled')).toBe('true');
    });
});
