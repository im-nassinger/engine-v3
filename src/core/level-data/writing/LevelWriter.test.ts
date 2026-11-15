import { describe, expect, test } from 'vitest';

import { BodyComponent, NameComponent, ShapeComponent, TransformComponent } from '../../components/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { LevelWriter } from './LevelWriter.ts';
import recordedNewLevel from './LevelWriter.newLevel.json' with { type: 'json' };

function addNamedEntity(level: Level, parent: Entity, name: string, index: number) {
    const entity = level.createEntity(parent, index);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

describe('LevelWriter', () => {
    test('writes a new level exactly as the recorded level.json', () => {
        const level = Level.createNew();

        const written = new LevelWriter().write(level);

        expect(written).toEqual(recordedNewLevel);
    });

    test('lists entities parents first, in Entities panel order', () => {
        const level = Level.createNew();
        const box = addNamedEntity(level, level.world, 'Box', 0);
        addNamedEntity(level, box, 'Lid', 0);
        addNamedEntity(level, level.world, 'Floor', 2);

        const written = new LevelWriter().write(level);
        const order = written.entities.map((entity) => [entity.id, entity.parent]);

        expect(order).toEqual([
            [1, null],
            [3, 1],
            [4, 3],
            [2, 1],
            [5, 1],
        ]);
    });

    test('writes the switches, the name and the editor data', () => {
        const level = Level.createNew();
        const box = addNamedEntity(level, level.world, 'Box', 0);
        box.setHidden(true);
        box.setLocked(true);
        level.rename('Castle');
        level.editorData.setGridSize(32);
        level.editorData.setFolded(box.id, true);

        const written = new LevelWriter().write(level);
        const writtenBox = written.entities.find((entity) => entity.id === box.id);

        expect(written.name).toBe('Castle');
        expect(written.editor).toEqual({ gridSize: 32, foldedRows: [box.id] });
        expect(writtenBox?.hidden).toBe(true);
        expect(writtenBox?.locked).toBe(true);
    });

    test('keys components by type name in card order and values by file key', () => {
        const level = Level.createNew();
        const crate = addNamedEntity(level, level.world, 'Crate', 0);
        crate.addComponent(new BodyComponent(BodyComponent.schema.defaults()));
        crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 30 } }));

        const written = new LevelWriter().write(level);
        const writtenCrate = written.entities.find((entity) => entity.id === crate.id);
        const componentNames = Object.keys(writtenCrate?.components ?? {});
        const cardOrder = crate.components.map((component) => component.schema.typeName);

        expect(componentNames).toEqual(cardOrder);
        expect(writtenCrate?.components['ShapeComponent']).toEqual({
            geometry: { kind: 'rectangle', width: 40, height: 30 },
        });
        expect(writtenCrate?.components['BodyComponent']).toHaveProperty('gravity_scale', 1);
    });

    test('writes a subtree with its roots keeping their own parent', () => {
        const level = Level.createNew();
        const box = addNamedEntity(level, level.world, 'Box', 0);
        const lid = addNamedEntity(level, box, 'Lid', 0);
        const floor = addNamedEntity(level, level.world, 'Floor', 1);

        const written = new LevelWriter().writeSubtree([floor, box]);
        const order = written.map((entity) => [entity.id, entity.parent]);

        expect(order).toEqual([
            [floor.id, 1],
            [box.id, 1],
            [lid.id, box.id],
        ]);
    });

    test('writes a new entity in card order, shown and unlocked, under the given parent', () => {
        const components = [new TransformComponent(), new NameComponent({ name: 'Group 1' })];

        const written = new LevelWriter().writeNewEntity(9, 1, components);

        expect(written).toEqual({
            id: 9,
            parent: 1,
            hidden: false,
            locked: false,
            components: {
                TransformComponent: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 },
                NameComponent: { name: 'Group 1' },
            },
        });
        expect(Object.keys(written.components)).toEqual(['NameComponent', 'TransformComponent']);
    });

    test('writes plain data that survives JSON unchanged', () => {
        const level = Level.createNew();

        const written = new LevelWriter().write(level);
        const text = JSON.stringify(written);
        const parsedBack: unknown = JSON.parse(text);

        expect(parsedBack).toEqual(written);
    });
});
