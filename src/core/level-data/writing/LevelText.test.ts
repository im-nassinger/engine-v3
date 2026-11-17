import { describe, expect, test } from 'vitest';

import { BodyComponent, NameComponent, TransformComponent } from '../../components/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { LevelText } from './LevelText.ts';
import { LevelWriter } from './LevelWriter.ts';

const writer = new LevelWriter();

function addNamed(level: Level, parent: Entity, name: string) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

// A World holding the camera and two groups, each with two named children.
function buildLevel() {
    const level = Level.createNew();
    const first = addNamed(level, level.world, 'First');
    const second = addNamed(level, level.world, 'Second');
    const children = [addNamed(level, first, 'A'), addNamed(level, first, 'B'), addNamed(level, second, 'C')];

    return { level, first, second, children };
}

function fullWrite(level: Level) {
    return JSON.stringify(writer.write(level));
}

// Each change is made after a first text, so the text after it is put together from kept parts.
function expectSameAfter(change: (built: ReturnType<typeof buildLevel>) => void) {
    const built = buildLevel();
    const text = new LevelText(built.level, writer);
    expect(text.text()).toBe(fullWrite(built.level));

    change(built);

    expect(text.text()).toBe(fullWrite(built.level));
    text.dispose();
}

describe('LevelText', () => {
    test('is the same as a full write of a level', () => {
        const { level } = buildLevel();

        expect(new LevelText(level, writer).text()).toBe(fullWrite(level));
    });

    test('is the same as a full write of a new level', () => {
        const level = Level.createNew();

        expect(new LevelText(level, writer).text()).toBe(fullWrite(level));
    });

    test.each([
        [
            'a value changed deep inside',
            ({ children }) => children[1]?.requireComponent(NameComponent).set('name', 'Z'),
        ],
        ['a component added', ({ children }) => children[0]?.addComponent(new BodyComponent())],
        ['a component removed', ({ first }) => first.removeComponent(NameComponent)],
        ['an entity hidden', ({ children }) => children[2]?.setHidden(true)],
        ['an entity locked', ({ second }) => second.setLocked(true)],
        ['an entity added', ({ level, second }) => addNamed(level, second, 'D')],
        ['an entity removed', ({ level, first }) => level.removeEntity(first)],
        [
            'an entity moved into another group',
            ({ level, children, second }) => level.moveEntity(children[0]!, second, 0),
        ],
        ['an entity moved within its group', ({ level, children, first }) => level.moveEntity(children[1]!, first, 0)],
        ['the level renamed', ({ level }) => level.rename('Renamed')],
        ['the grid size changed', ({ level }) => level.editorData.setGridSize(32)],
        ['a row folded', ({ level, first }) => level.editorData.setFolded(first.id, true)],
    ] satisfies [string, (built: ReturnType<typeof buildLevel>) => unknown][])('is the same after %s', (_, change) => {
        expectSameAfter(change);
    });

    test('is the same after an entity is removed, changed meanwhile and restored', () => {
        expectSameAfter(({ level, first, children }) => {
            const removed = children[0]!;
            const id = removed.id;
            level.removeEntity(removed);
            removed.requireComponent(NameComponent).set('name', 'Changed while out');
            const restored = level.restoreEntity(id, first, 0);
            restored.addComponent(new NameComponent({ name: 'Restored' }));
        });
    });

    test('is the same after many changes, each text taken between them', () => {
        const { level, first, second, children } = buildLevel();
        const text = new LevelText(level, writer);

        for (let round = 0; round < 20; round += 1) {
            const target = children[round % children.length]!;
            target.requireComponent(NameComponent).set('name', `Round ${round}`);
            level.moveEntity(target, round % 2 === 0 ? second : first, 0);
            if (round % 3 === 0) {
                addNamed(level, target, `Inside ${round}`);
            }
            if (round % 5 === 0) {
                target.setHidden(!target.isHidden);
            }

            expect(text.text()).toBe(fullWrite(level));
        }
    });

    test('stops following the level once disposed', () => {
        const { level, first } = buildLevel();
        const text = new LevelText(level, writer);
        const before = text.text();
        text.dispose();

        first.requireComponent(NameComponent).set('name', 'After');

        expect(text.text()).toBe(before);
    });
});
