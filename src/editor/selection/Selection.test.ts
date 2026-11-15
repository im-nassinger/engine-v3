import { describe, expect, test } from 'vitest';

import { Level } from '../../core/level/index.ts';

import { Selection } from './Selection.ts';

function buildLevel() {
    const level = Level.createNew();
    const group = level.createEntity(level.world, 0);
    const child = level.createEntity(group, 0);
    const square = level.createEntity(level.world, 0);
    const selection = new Selection(level);

    return { level, group, child, square, selection };
}

describe('Selection', () => {
    test('starts empty', () => {
        const { selection } = buildLevel();

        expect(selection.ids).toEqual([]);
        expect(selection.isEmpty).toBe(true);
    });

    test('keeps the order of selecting and drops repeats', () => {
        const { square, group, selection } = buildLevel();

        selection.replace([square.id, group.id, square.id]);

        expect(selection.ids).toEqual([square.id, group.id]);
        expect(selection.has(group.id)).toBe(true);
    });

    test('replace drops the children of selected parents', () => {
        const { group, child, selection } = buildLevel();

        selection.replace([child.id, group.id]);

        expect(selection.ids).toEqual([group.id]);
    });

    test('adding a parent drops its selected children', () => {
        const { group, child, square, selection } = buildLevel();
        selection.replace([child.id, square.id]);

        selection.add([group.id]);

        expect(selection.ids).toEqual([square.id, group.id]);
    });

    test('adding a child drops its selected parent', () => {
        const { group, child, selection } = buildLevel();
        selection.replace([group.id]);

        selection.add([child.id]);

        expect(selection.ids).toEqual([child.id]);
    });

    test('the World stays alone', () => {
        const { level, square, selection } = buildLevel();

        selection.replace([level.world.id, square.id]);
        expect(selection.ids).toEqual([square.id]);

        selection.add([level.world.id]);
        expect(selection.ids).toEqual([level.world.id]);

        selection.add([square.id]);
        expect(selection.ids).toEqual([square.id]);

        selection.replace([level.world.id]);
        expect(selection.ids).toEqual([level.world.id]);
    });

    test('toggle adds and drops', () => {
        const { square, group, selection } = buildLevel();
        selection.replace([square.id]);

        selection.toggle(group.id);
        expect(selection.ids).toEqual([square.id, group.id]);

        selection.toggle(square.id);
        expect(selection.ids).toEqual([group.id]);
    });

    test('a removed entity leaves the selection, children of a removed group too', () => {
        const { level, group, child, square, selection } = buildLevel();
        selection.replace([child.id, square.id]);

        level.removeEntity(group);

        expect(selection.ids).toEqual([square.id]);
    });

    test('a move that puts a selected entity inside another keeps the parent', () => {
        const { level, group, square, selection } = buildLevel();
        selection.replace([square.id, group.id]);

        level.moveEntity(square, group, 0);

        expect(selection.ids).toEqual([group.id]);
    });

    test('the version moves only when the selection changes', () => {
        const { square, selection } = buildLevel();

        selection.replace([square.id]);
        const versionAfterSelecting = selection.version.version;
        selection.replace([square.id]);
        selection.add([square.id]);

        expect(selection.version.version).toBe(versionAfterSelecting);

        selection.clear();

        expect(selection.version.version).toBe(versionAfterSelecting + 1);
    });

    test('an unknown id is a bug', () => {
        const { selection } = buildLevel();

        expect(() => selection.replace([999])).toThrow('No entity has id 999.');
    });

    test('stops following the level once disposed', () => {
        const { level, square, selection } = buildLevel();
        selection.replace([square.id]);

        selection.dispose();
        level.removeEntity(square);

        expect(selection.ids).toEqual([square.id]);
    });
});
