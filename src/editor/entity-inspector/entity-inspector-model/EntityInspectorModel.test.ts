import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    createV1Registry,
    JointComponent,
    NameComponent,
    PathComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../core/components/index.ts';
import { DerivedCaches } from '../../../core/derived/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { createV1Rules, EditorMessages } from '../../messages/index.ts';
import { Selection } from '../../selection/index.ts';
import { ManualFrames } from '../../time/testing/index.ts';

import { CardFolds } from '../folds/CardFolds.ts';
import type { CardModel, FieldModel } from '../model/CardModel.ts';
import { MIXED } from '../model/MIXED.ts';

import { EntityInspectorModel } from './EntityInspectorModel.ts';

function addCrate(level: Level, parent: Entity, name: string) {
    const crate = level.createEntity(parent, 0);
    crate.addComponent(new TransformComponent());
    crate.addComponent(new NameComponent({ name }));
    crate.addComponent(new ShapeComponent());
    crate.addComponent(new BodyComponent());
    crate.addComponent(new SurfaceComponent());

    return crate;
}

function buildModel() {
    const level = Level.createNew();
    const crate = addCrate(level, level.world, 'Crate');
    const other = addCrate(level, level.world, 'Other');
    const selection = new Selection(level);
    const caches = new DerivedCaches(level);
    const folds = new CardFolds();
    const frames = new ManualFrames();
    const messages = new EditorMessages(level, createV1Rules(), frames);
    const model = new EntityInspectorModel({ level, selection, caches, registry: createV1Registry(), folds, messages });

    return { level, crate, other, selection, folds, frames, model };
}

function cardTypes(model: EntityInspectorModel) {
    return model.cards.map((card) => card.typeName);
}

function requireCard(model: EntityInspectorModel, typeName: string) {
    const card = model.cards.find((candidate) => candidate.typeName === typeName);
    if (card === undefined) {
        throw new Error(`No ${typeName} card.`);
    }

    return card;
}

function findField(card: CardModel, key: string): FieldModel | undefined {
    return card.fields.find((field) => field.definition.key === key);
}

function requireField(card: CardModel, key: string) {
    const field = findField(card, key);
    if (field === undefined) {
        throw new Error(`No ${key} field.`);
    }

    return field;
}

function fieldKeys(card: CardModel) {
    return card.fields.map((field) => field.definition.key);
}

function addableEntry(model: EntityInspectorModel, typeName: string) {
    return model.addableComponents.find((entry) => entry.typeName === typeName);
}

describe('EntityInspectorModel: what is shown', () => {
    test('nothing selected shows nothing', () => {
        const { model } = buildModel();

        expect(model.shownEntities).toEqual([]);
        expect(model.cards).toEqual([]);
        expect(model.addableComponents).toEqual([]);
    });

    test('the World selected shows its cards, without its TransformComponent', () => {
        const { level, selection, model } = buildModel();

        selection.replace([level.world.id]);

        expect(model.shownEntities).toEqual([level.world]);
        expect(cardTypes(model)).toEqual(['ShapeComponent', 'StyleComponent', 'PhysicsWorldComponent']);
        expect(model.header.title).toBe('World');
        expect(model.header.canRename).toEqual({ enabled: false, reason: "The World can't be renamed" });
    });

    test('one entity shows its cards in the fixed order, with its name', () => {
        const { crate, selection, model } = buildModel();

        selection.replace([crate.id]);

        expect(cardTypes(model)).toEqual(['TransformComponent', 'ShapeComponent', 'BodyComponent', 'SurfaceComponent']);
        expect(model.header.title).toBe('Crate');
        expect(model.header.entity).toBe(crate);
        expect(model.header.canRename).toEqual({ enabled: true });
    });

    test('several show only the components every one has, and Mixed where values differ', () => {
        const { crate, other, selection, model } = buildModel();
        other.removeComponent(SurfaceComponent);
        crate.requireComponent(BodyComponent).set('linearDamping', 2);
        crate.setHidden(true);

        selection.replace([crate.id, other.id]);

        const body = requireCard(model, 'BodyComponent');
        expect(cardTypes(model)).toEqual(['TransformComponent', 'ShapeComponent', 'BodyComponent']);
        expect(requireField(body, 'linearDamping').value).toBe(MIXED);
        expect(requireField(body, 'angularDamping').value).toBe(0);
        expect(model.header.title).toBe('2 entities');
        expect(model.header.isHidden).toBe(MIXED);
        expect(model.header.canRename).toEqual({ enabled: false, reason: 'Select one entity to rename' });
    });

    test('a vector is Mixed per axis: a shared x shows while y reads Mixed', () => {
        const { crate, other, selection, model } = buildModel();
        crate.requireComponent(TransformComponent).set('position', { x: 10, y: 20 });
        other.requireComponent(TransformComponent).set('position', { x: 10, y: 30 });

        selection.replace([crate.id, other.id]);

        const transform = requireCard(model, 'TransformComponent');
        expect(requireField(transform, 'position').value).toEqual({ x: 10, y: MIXED });
        expect(requireField(transform, 'scale').value).toEqual({ x: 1, y: 1 });
    });
});

describe('EntityInspectorModel: fields', () => {
    test('greys a field that does not apply and keeps its value', () => {
        const { crate, selection, model } = buildModel();
        const body = crate.requireComponent(BodyComponent);
        body.set('linearDamping', 4);
        body.set('type', 'static');

        selection.replace([crate.id]);
        const damping = requireField(requireCard(model, 'BodyComponent'), 'linearDamping');

        expect(damping.isEnabled).toBe(false);
        expect(damping.value).toBe(4);
    });

    test('hides a derived field that does not apply to every shown entity', () => {
        const { crate, other, selection, model } = buildModel();
        other.requireComponent(ShapeComponent).set('geometry', { kind: 'circle', radius: 50 });

        selection.replace([crate.id]);
        expect(fieldKeys(requireCard(model, 'ShapeComponent'))).toEqual(['kind', 'width', 'height']);

        selection.replace([crate.id, other.id]);
        expect(fieldKeys(requireCard(model, 'ShapeComponent'))).toEqual(['kind']);
        expect(requireField(requireCard(model, 'ShapeComponent'), 'kind').value).toBe(MIXED);
    });

    test("the World's Kind and a Rope's Points are read-only, and a drawn path's Points are writable", () => {
        const { level, crate, selection, model } = buildModel();
        const rope = level.createEntity(level.world, 0);
        rope.addComponent(new TransformComponent());
        rope.addComponent(new NameComponent({ name: 'Rope' }));
        rope.addComponent(new PathComponent());
        rope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: crate.id }));
        const drawn = level.createEntity(level.world, 0);
        drawn.addComponent(new TransformComponent());
        drawn.addComponent(new NameComponent({ name: 'Path 1' }));
        drawn.addComponent(new PathComponent());

        selection.replace([level.world.id]);
        expect(requireField(requireCard(model, 'ShapeComponent'), 'kind').isReadOnly).toBe(true);
        expect(requireField(requireCard(model, 'ShapeComponent'), 'width').isReadOnly).toBe(false);

        selection.replace([rope.id]);
        expect(requireField(requireCard(model, 'PathComponent'), 'points').isReadOnly).toBe(true);

        selection.replace([drawn.id]);
        expect(requireField(requireCard(model, 'PathComponent'), 'points').isReadOnly).toBe(false);

        selection.replace([rope.id, drawn.id]);
        expect(requireField(requireCard(model, 'PathComponent'), 'points').isReadOnly).toBe(true);
    });

    test('shows Mass on a Dynamic body, read from its shapes', () => {
        const { crate, selection, model } = buildModel();

        selection.replace([crate.id]);
        const mass = requireField(requireCard(model, 'BodyComponent'), 'mass');

        expect(mass.kind).toBe('mass');
        expect(mass.isReadOnly).toBe(false);
        expect(mass.value).toBeCloseTo(4);
    });

    test('shows one Mass and a Mixed Density for bodies of different sizes set to the same mass', () => {
        const { crate, other, selection, model } = buildModel();
        other.requireComponent(TransformComponent).set('scale', { x: 3, y: 3 });
        crate.requireComponent(SurfaceComponent).set('density', 2.5);
        other.requireComponent(SurfaceComponent).set('density', 10 / 36);

        selection.replace([crate.id, other.id]);

        expect(requireField(requireCard(model, 'BodyComponent'), 'mass').value).toBeCloseTo(10);
        expect(requireField(requireCard(model, 'SurfaceComponent'), 'density').value).toBe(MIXED);
    });

    test('makes Mass read-only on a body with no area, since no density gives it a mass', () => {
        const { crate, selection, model } = buildModel();
        crate.removeComponent(SurfaceComponent);

        selection.replace([crate.id]);

        expect(requireField(requireCard(model, 'BodyComponent'), 'mass').isReadOnly).toBe(true);
    });

    test('hides Mass on a body that is not Dynamic', () => {
        const { crate, selection, model } = buildModel();
        crate.requireComponent(BodyComponent).set('type', 'static');

        selection.replace([crate.id]);

        expect(findField(requireCard(model, 'BodyComponent'), 'mass')).toBeUndefined();
    });

    test("greys a merged body's fields but Merge, and shows no Mass of its own", () => {
        const { level, crate, selection, model } = buildModel();
        const handle = addCrate(level, crate, 'Handle');

        selection.replace([handle.id]);
        const body = requireCard(model, 'BodyComponent');

        expect(requireField(body, 'type').isEnabled).toBe(false);
        expect(requireField(body, 'merge').isEnabled).toBe(true);
        expect(findField(body, 'mass')).toBeUndefined();

        handle.requireComponent(BodyComponent).set('merge', false);
        const ownBody = requireCard(model, 'BodyComponent');
        expect(requireField(ownBody, 'type').isEnabled).toBe(true);
        expect(findField(ownBody, 'mass')).toBeDefined();
    });
});

describe('EntityInspectorModel: Add Component, Remove and Reset', () => {
    test("lists what the entity lacks, with the Joint tool's reason, and never the path or the camera", () => {
        const { crate, selection, model } = buildModel();

        selection.replace([crate.id]);
        const typeNames = model.addableComponents.map((entry) => entry.typeName);

        expect(typeNames).toEqual(['StyleComponent', 'JointComponent']);
        expect(addableEntry(model, 'StyleComponent')?.availability).toEqual({ enabled: true });
        expect(addableEntry(model, 'StyleComponent')?.section).toBe('Drawing');
        expect(addableEntry(model, 'JointComponent')?.availability).toEqual({
            enabled: false,
            reason: 'Use the Joint tool to place a joint.',
        });
    });

    test("greys the BodyComponent and the SurfaceComponent on the World, with Walls' hint", () => {
        const { level, selection, model } = buildModel();
        selection.replace([level.world.id]);
        const reason =
            "The World can't collide. To block the edges of the level, turn on Walls on the PhysicsWorldComponent.";

        expect(addableEntry(model, 'BodyComponent')?.availability).toEqual({ enabled: false, reason });
        expect(addableEntry(model, 'SurfaceComponent')?.availability).toEqual({ enabled: false, reason });
    });

    test('with several, lists a component one of them lacks', () => {
        const { crate, other, selection, model } = buildModel();
        other.removeComponent(BodyComponent);

        selection.replace([crate.id, other.id]);

        expect(addableEntry(model, 'BodyComponent')?.availability).toEqual({ enabled: true });
    });

    test('Remove gives its reason on the TransformComponent, a joint, the camera and the World', () => {
        const { level, crate, selection, model } = buildModel();
        const rope = level.createEntity(level.world, 0);
        rope.addComponent(new TransformComponent());
        rope.addComponent(new NameComponent({ name: 'Rope' }));
        rope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: crate.id }));

        selection.replace([level.world.id]);
        expect(requireCard(model, 'StyleComponent').canRemove).toEqual({
            enabled: false,
            reason: 'The World needs it',
        });

        selection.replace([level.camera.id]);
        expect(requireCard(model, 'CameraComponent').canRemove).toEqual({
            enabled: false,
            reason: 'The camera needs it',
        });

        selection.replace([rope.id]);
        expect(requireCard(model, 'JointComponent').canRemove).toEqual({
            enabled: false,
            reason: 'Delete the joint to remove it',
        });

        selection.replace([crate.id]);
        expect(requireCard(model, 'TransformComponent').canRemove).toEqual({
            enabled: false,
            reason: 'Every entity has a TransformComponent',
        });
        expect(requireCard(model, 'BodyComponent').canRemove).toEqual({ enabled: true });
    });

    test('Reset is disabled on a card with no field of its own', () => {
        const { crate, selection, model } = buildModel();

        selection.replace([crate.id]);

        expect(requireCard(model, 'ShapeComponent').canReset).toEqual({ enabled: false, reason: 'Nothing to reset' });
        expect(requireCard(model, 'BodyComponent').canReset).toEqual({ enabled: true });
    });
});

describe('EntityInspectorModel: version', () => {
    test('moves when a shown entity changes, not when another does', () => {
        const { crate, other, selection, model } = buildModel();
        selection.replace([crate.id]);
        const before = model.version.version;

        other.requireComponent(BodyComponent).set('linearDamping', 3);
        expect(model.version.version).toBe(before);

        crate.requireComponent(BodyComponent).set('linearDamping', 3);
        expect(model.version.version).toBe(before + 1);
        expect(requireField(requireCard(model, 'BodyComponent'), 'linearDamping').value).toBe(3);
    });

    test('moves with the selection and the folds, which the cards show', () => {
        const { crate, selection, folds, model } = buildModel();
        const before = model.version.version;

        selection.replace([crate.id]);
        folds.setFolded('BodyComponent', true);

        expect(model.version.version).toBe(before + 2);
        expect(requireCard(model, 'BodyComponent').isFolded).toBe(true);
        expect(requireCard(model, 'SurfaceComponent').isFolded).toBe(false);
    });

    test("moves when a shape under a shown body changes, since the body's Mass does", () => {
        const { level, crate, selection, model } = buildModel();
        const handle = addCrate(level, crate, 'Handle');
        selection.replace([crate.id]);
        const massBefore = requireField(requireCard(model, 'BodyComponent'), 'mass').value;
        expect(massBefore).toBeCloseTo(8);
        const before = model.version.version;

        handle.requireComponent(SurfaceComponent).set('density', 2);

        expect(model.version.version).toBe(before + 1);
        expect(requireField(requireCard(model, 'BodyComponent'), 'mass').value).toBeCloseTo(12);
    });

    test('moves when a body is added above a shown entity, which then merges', () => {
        const { level, selection, model } = buildModel();
        const group = level.createEntity(level.world, 0);
        group.addComponent(new TransformComponent());
        group.addComponent(new NameComponent({ name: 'Group' }));
        const handle = addCrate(level, group, 'Handle');
        selection.replace([handle.id]);
        const before = model.version.version;

        group.addComponent(new BodyComponent());

        expect(model.version.version).toBeGreaterThan(before);
        expect(requireField(requireCard(model, 'BodyComponent'), 'type').isEnabled).toBe(false);
    });

    test('stops following after dispose', () => {
        const { crate, selection, model } = buildModel();
        model.dispose();
        const before = model.version.version;

        selection.replace([crate.id]);

        expect(model.version.version).toBe(before);
    });
});

describe('EntityInspectorModel: notes', () => {
    test("removing a crate's ShapeComponent puts its note on the SurfaceComponent card, with its fix", () => {
        const { crate, selection, frames, model } = buildModel();
        selection.replace([crate.id]);
        crate.removeComponent(ShapeComponent);
        const before = model.version.version;

        frames.runFrame();

        expect(model.version.version).toBeGreaterThan(before);
        expect(requireCard(model, 'SurfaceComponent').notes).toEqual([
            {
                kind: 'warning',
                text: 'Needs a Shape to collide.',
                fieldKey: undefined,
                fix: { kind: 'addComponent', label: 'Add Shape', componentType: 'ShapeComponent' },
                entityIds: [crate.id],
            },
        ]);
        expect(requireCard(model, 'BodyComponent').notes).toEqual([]);
    });

    test('the same note on several selected entities is one note for all of them', () => {
        const { crate, other, selection, frames, model } = buildModel();
        crate.removeComponent(ShapeComponent);
        other.removeComponent(ShapeComponent);
        frames.runFrame();

        selection.replace([crate.id, other.id]);

        const notes = requireCard(model, 'SurfaceComponent').notes;
        expect(notes).toHaveLength(1);
        expect(notes[0]?.entityIds).toEqual([crate.id, other.id]);
    });

    test("another entity's messages leave the version alone", () => {
        const { crate, other, selection, frames, model } = buildModel();
        selection.replace([crate.id]);
        const before = model.version.version;

        other.removeComponent(ShapeComponent);
        const afterEdit = model.version.version;
        frames.runFrame();

        expect(afterEdit).toBe(before);
        expect(model.version.version).toBe(before);
    });
});
