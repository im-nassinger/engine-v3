import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { InputComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    buttonNamed,
    cardOf,
    click,
    closeEntityInspectorPage,
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

function inputsOf(level: Level) {
    return level.world.requireComponent(InputComponent).get('inputs');
}

function rows() {
    const card = requireCard('InputComponent');

    return [...card.querySelectorAll<HTMLElement>('.input-row')];
}

function requireRow(index: number) {
    const row = rows()[index];
    if (row === undefined) throw new Error(`No input row ${index}.`);

    return row;
}

function keysBoxOf(index: number) {
    return requireElement<HTMLInputElement>(requireRow(index), 'input.keys-box');
}

function shownRows() {
    return rows().map((row) => {
        const name = requireElement<HTMLInputElement>(row, 'input.name').value;
        const keys = requireElement<HTMLInputElement>(row, 'input.keys-box').value;

        return `${name}: ${keys}`;
    });
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

describe('the Inputs card', () => {
    test("a new level's World shows the five inputs with their keys, then Add input", async () => {
        await showWorld(Level.createNew());

        await expect
            .poll(shownRows)
            .toEqual([
                'left: A, Left arrow',
                'right: D, Right arrow',
                'up: W, Up arrow',
                'down: S, Down arrow',
                'jump: Space',
            ]);
        expect(buttonNamed(requireCard('InputComponent'), 'Add input')).toBeDefined();
        expect(requireElement(requireRow(4), 'button[aria-label="Remove jump"]')).toBeDefined();
    });

    test('pressing keys on a clicked pill makes them the input’s keys, as one step', async () => {
        const level = Level.createNew();
        const session = await showWorld(level);
        await expect.poll(() => rows().length).toBe(5);

        await userEvent.click(keysBoxOf(4));
        await userEvent.keyboard('{Enter}w');
        await expect.poll(() => keysBoxOf(4).value).toBe('Enter, W');
        expect(history(session).undoCount).toBe(0);

        keysBoxOf(4).blur();

        expect(inputsOf(level)[4]).toEqual({ name: 'jump', keys: ['Enter', 'KeyW'] });
        expect(history(session).undoCount).toBe(1);
        expect(history(session).undoLabel).toBe('Change Inputs');
        await expect.poll(() => keysBoxOf(4).value).toBe('Enter, W');
    });

    test('Esc puts the old keys back, and a key a level can not use is not taken', async () => {
        const level = Level.createNew();
        const session = await showWorld(level);
        await expect.poll(() => rows().length).toBe(5);

        await userEvent.click(keysBoxOf(0));
        await userEvent.keyboard('{F2}q{Escape}');

        expect(inputsOf(level)[0]).toEqual({ name: 'left', keys: ['KeyA', 'ArrowLeft'] });
        expect(history(session).undoCount).toBe(0);
        await expect.poll(() => keysBoxOf(0).value).toBe('A, Left arrow');

        await userEvent.click(keysBoxOf(0));
        await userEvent.keyboard('{F2}q');
        keysBoxOf(0).blur();

        expect(inputsOf(level)[0]).toEqual({ name: 'left', keys: ['KeyQ'] });
    });

    test('Add input adds input_1 with no key, and × removes an input, each one step', async () => {
        const level = Level.createNew();
        const session = await showWorld(level);
        await expect.poll(() => rows().length).toBe(5);

        click(buttonNamed(requireCard('InputComponent'), 'Add input'));
        expect(inputsOf(level)[5]).toEqual({ name: 'input_1', keys: [] });
        await expect.poll(() => rows().length).toBe(6);

        click(requireElement(requireRow(0), 'button[aria-label="Remove left"]'));
        expect(inputsOf(level).map((input) => input.name)).toEqual(['right', 'up', 'down', 'jump', 'input_1']);
        expect(history(session).undoCount).toBe(2);
    });

    test('a World without inputs shows the note, whose fix adds the five in one step', async () => {
        const level = Level.createNew();
        level.world.removeComponent(InputComponent);
        const { session, frames } = showEntityInspector(level);
        select(session, [level.world]);
        await expect.poll(() => cardOf('PhysicsWorldComponent')).not.toBeNull();

        const worldCard = () => requireCard('PhysicsWorldComponent');
        await expect
            .poll(() => worldCard().querySelector('.card-note-box')?.textContent)
            .toBe('No inputs. Add the five inputs');

        click(buttonNamed(worldCard(), 'Add the five inputs'));
        frames.runFrame();

        expect(inputsOf(level)).toHaveLength(5);
        expect(history(session).undoCount).toBe(1);
        await expect.poll(() => rows().length).toBe(5);
        await expect.poll(() => worldCard().querySelector('.card-note-box')).toBeNull();
    });
});
