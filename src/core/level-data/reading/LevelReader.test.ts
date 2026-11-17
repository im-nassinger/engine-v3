import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    createV1Registry,
    JointComponent,
    NameComponent,
    StyleComponent,
} from '../../components/index.ts';
import type { Level } from '../../level/index.ts';

import { FormatUpgrader } from '../versions/FormatUpgrader.ts';
import type { LevelLimits } from '../LevelLimits.ts';
import { V1_LEVEL_LIMITS } from '../LevelLimits.ts';
import { LevelReader } from './LevelReader.ts';
import { LevelWriter } from '../writing/LevelWriter.ts';
import type { ReadOutcome } from './ReadOutcome.ts';
import everyComponentLevel from './LevelReader.everyComponent.json' with { type: 'json' };
import recordedNewLevel from '../writing/LevelWriter.newLevel.json' with { type: 'json' };

type EditableComponents = Record<string, unknown>;
type EditableEntity = Record<string, unknown> & { components: EditableComponents; children: EditableEntity[] };
type EditableLevel = Record<string, unknown> & {
    editor: Record<string, unknown>;
    world: EditableEntity;
};

const SMALL_LIMITS: LevelLimits = { maxEntities: 4, maxDepth: 2, maxPoints: 4, maxBytes: 1000, maxLevelSize: 200_000 };

const DEFAULT_TRANSFORM = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    skew: 0,
};

function createReader(limits = V1_LEVEL_LIMITS) {
    return new LevelReader(createV1Registry(), limits, FormatUpgrader.createV1());
}

function newLevelData() {
    const text = JSON.stringify(recordedNewLevel);

    return JSON.parse(text) as EditableLevel;
}

// One of the World's children: in a new level, the camera is at 0.
function requireWorldChild(levelData: EditableLevel, index: number) {
    const entity = levelData.world.children[index];
    if (entity === undefined) throw new Error(`The test level's World has no child at ${index}.`);

    return entity;
}

function plainEntity(id: number, components: EditableComponents = {}, children: EditableEntity[] = []): EditableEntity {
    return { id, hidden: false, locked: false, components, children };
}

function shapeEntity(id: number, geometry: Record<string, unknown>) {
    return plainEntity(id, { ShapeComponent: { geometry } });
}

// Entities each inside the one before, ids from firstId on, built without recursion so it can be deep.
function nestedChain(firstId: number, length: number) {
    const top = plainEntity(firstId);
    let innermost = top;
    for (let offset = 1; offset < length; offset += 1) {
        const child = plainEntity(firstId + offset);
        innermost.children.push(child);
        innermost = child;
    }

    return top;
}

function pointsOf(count: number) {
    const points = [];
    for (let index = 0; index < count; index += 1) {
        points.push({ x: index * 10, y: index % 2 });
    }

    return points;
}

function requireLevel(outcome: ReadOutcome<Level>) {
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return outcome.value;
}

function expectDamaged(levelData: unknown) {
    const outcome = createReader().read(levelData);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.refusal.reason).toBe('damaged');
}

function expectOverLimit(levelData: unknown, limit: string, max: number) {
    const outcome = createReader(SMALL_LIMITS).read(levelData);

    expect(outcome).toEqual({ ok: false, refusal: { reason: 'overLimit', limit, max } });
}

function expectRead(levelData: unknown, limits = V1_LEVEL_LIMITS) {
    const outcome = createReader(limits).read(levelData);

    return requireLevel(outcome);
}

describe('LevelReader round trips', () => {
    test('reads a new level back exactly as the writer wrote it', () => {
        const level = expectRead(recordedNewLevel);
        const written = new LevelWriter().write(level);

        expect(written).toEqual(recordedNewLevel);
        expect(level.world.id).toBe(1);
        expect(level.camera.id).toBe(2);
        expect(level.name).toBe('Untitled level');
    });

    test('reads every component with values that are not their defaults, and writes them back the same', () => {
        const level = expectRead(everyComponentLevel);
        const written = new LevelWriter().write(level);

        expect(written).toEqual(everyComponentLevel);
    });

    test('keeps the camera in its place among the World children, and the tree as listed', () => {
        const level = expectRead(everyComponentLevel);
        const worldChildren = level.world.children.map((entity) => entity.id);
        const cart = level.requireEntity(3);
        const cartChildren = cart.children.map((entity) => entity.id);

        expect(worldChildren).toEqual([3, 2, 9, 12]);
        expect(cartChildren).toEqual([7]);
        expect(level.camera.id).toBe(2);
    });

    test('keeps a joint end that names an entity not in the file', () => {
        const level = expectRead(everyComponentLevel);
        const joint = level.requireEntity(9).requireComponent(JointComponent);

        expect(joint.get('b')).toBe(99);
    });

    test('hands out new ids above the highest id read', () => {
        const level = expectRead(everyComponentLevel);
        const added = level.createEntity(level.world, 0);

        expect(added.id).toBe(13);
    });

    test('reads the text of level.json, and refuses text that is not JSON', () => {
        const text = JSON.stringify(recordedNewLevel);
        const reader = createReader();
        const outcome = reader.readJson(text);

        expect(outcome.ok).toBe(true);
        expect(reader.readJson('{ not json')).toEqual({ ok: false, refusal: { reason: 'notALevel' } });
    });
});

describe('LevelReader missing values', () => {
    test('reads a missing value as its default', () => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3, { BodyComponent: { type: 'static' } }));

        const level = expectRead(levelData);
        const body = level.requireEntity(3).requireComponent(BodyComponent);

        expect(body.get('type')).toBe('static');
        expect(body.get('gravityScale')).toBe(1);
    });

    test('reads a level saved before Scale outline with the checkbox off', () => {
        const levelData = newLevelData();
        const savedStyle = { outline_colour: '#1F3552FF', outline_width: 4, opacity: 1 };
        levelData.world.children.push(plainEntity(3, { StyleComponent: savedStyle }));

        const level = expectRead(levelData);
        const style = level.requireEntity(3).requireComponent(StyleComponent);

        expect(style.get('outlineWidth')).toBe(4);
        expect(style.get('scaleOutline')).toBe(false);
    });

    test('gives an entity without a TransformComponent or a NameComponent the defaults', () => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3));

        const level = expectRead(levelData);
        const written = new LevelWriter().write(level);
        const writtenEntity = written.world.children.find((entity) => entity.id === 3);

        expect(writtenEntity?.components['TransformComponent']).toEqual(DEFAULT_TRANSFORM);
        expect(level.requireEntity(3).requireComponent(NameComponent).get('name')).toBe('Entity');
    });

    test('drops a folded row whose entity is not in the level, and clamps the grid size', () => {
        const levelData = newLevelData();
        levelData.editor = { gridSize: 5000, foldedRows: [2, 40] };

        const level = expectRead(levelData);

        expect(level.editorData.foldedRows()).toEqual([2]);
        expect(level.editorData.gridSize).toBe(1000);
    });
});

describe('LevelReader refuses what is not a level', () => {
    test.each([
        ['nothing', null],
        ['a list', []],
        ['text', 'level'],
        ['an object without a format', { formatVersion: 1 }],
        ['another format', { ...recordedNewLevel, format: 'other-level' }],
    ])('refuses %s', (_, levelData) => {
        const outcome = createReader().read(levelData);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'notALevel' } });
    });

    test('refuses a format version above the latest as made by a newer version', () => {
        const levelData = { ...recordedNewLevel, formatVersion: 2 };
        const outcome = createReader().read(levelData);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'newerVersion', fileVersion: 2 } });
    });

    test('refuses a physics version above the current one as made by a newer version', () => {
        const levelData = { ...recordedNewLevel, physicsVersion: 2 };
        const outcome = createReader().read(levelData);

        expect(outcome).toEqual({ ok: false, refusal: { reason: 'newerVersion', fileVersion: 1 } });
    });

    test('runs the upgrade steps before checking the level', () => {
        const renameStep = (fileData: unknown) => ({ ...(fileData as object), name: 'Upgraded', formatVersion: 2 });
        const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, new FormatUpgrader([renameStep]));

        const outcome = reader.read(recordedNewLevel);
        const level = requireLevel(outcome);

        expect(level.name).toBe('Upgraded');
    });
});

describe('LevelReader refuses a damaged level', () => {
    test.each([
        ['a format version of 0', { formatVersion: 0 }],
        ['a format version that is not whole', { formatVersion: 1.5 }],
        ['a format version as text', { formatVersion: '1' }],
        ['a physics version of 0', { physicsVersion: 0 }],
        ['an unknown value at the top', { author: 'someone' }],
        ['an empty level name', { name: '   ' }],
        ['a level name past 60 characters', { name: 'x'.repeat(61) }],
        ['a level name that is not text', { name: 12 }],
        ['a grid size that is not a number', { editor: { gridSize: '50', foldedRows: [] } }],
        ['a folded row that is not an id', { editor: { gridSize: 50, foldedRows: [0] } }],
        ['editor data without folded rows', { editor: { gridSize: 50 } }],
        ['a world that is not an object', { world: 'World' }],
        ['no world', { world: null }],
        ['two Worlds at the top', { world: [recordedNewLevel.world, recordedNewLevel.world] }],
    ])('refuses %s', (_, changes) => {
        const levelData = { ...newLevelData(), ...changes };

        expectDamaged(levelData);
    });

    test('refuses a level without a name', () => {
        const levelData: Record<string, unknown> = newLevelData();
        delete levelData['name'];

        expectDamaged(levelData);
    });

    test.each([
        ['an id of 0', 0],
        ['an id that is not whole', 2.5],
        ['an id as text', '3'],
        ['an id used twice', 2],
    ])('refuses %s', (_, id) => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3));
        requireWorldChild(levelData, 1).id = id;

        expectDamaged(levelData);
    });

    test('refuses a second World inside the World', () => {
        const levelData = newLevelData();
        levelData.world.children.push({ ...levelData.world, id: 3, children: [] });

        expectDamaged(levelData);
    });

    test('refuses an entity without its children, or children that are not a list', () => {
        const withoutChildren = newLevelData();
        const camera: Record<string, unknown> = requireWorldChild(withoutChildren, 0);
        delete camera['children'];
        const withBadChildren = newLevelData();
        requireWorldChild(withBadChildren, 0).children = 'none' as unknown as EditableEntity[];

        expectDamaged(withoutChildren);
        expectDamaged(withBadChildren);
    });

    test('refuses an entity with a parent key, which the nested file never writes', () => {
        const levelData = newLevelData();
        levelData.world.children.push({ ...plainEntity(3), parent: 1 });

        expectDamaged(levelData);
    });

    test('refuses an entity with an unknown value, or a switch that is not true or false', () => {
        const withUnknown = newLevelData();
        withUnknown.world.children.push({ ...plainEntity(3), colour: 'red' });
        const withBadSwitch = newLevelData();
        withBadSwitch.world.children.push({ ...plainEntity(3), hidden: 'yes' });

        expectDamaged(withUnknown);
        expectDamaged(withBadSwitch);
    });

    test('refuses a level without a camera', () => {
        const levelData = newLevelData();
        levelData.world.children.pop();

        expectDamaged(levelData);
    });

    test('refuses a second camera', () => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3, { CameraComponent: {} }));

        expectDamaged(levelData);
    });

    test('refuses a camera that is not directly inside the World', () => {
        const levelData = newLevelData();
        const camera = requireWorldChild(levelData, 0);
        levelData.world.children = [plainEntity(3, {}, [camera])];

        expectDamaged(levelData);
    });

    test('refuses a PhysicsWorldComponent anywhere but the World', () => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3, { PhysicsWorldComponent: {} }));

        expectDamaged(levelData);
    });

    test.each(['ShapeComponent', 'StyleComponent', 'PhysicsWorldComponent'])(
        'refuses a World without its %s',
        (typeName) => {
            const levelData = newLevelData();
            delete levelData.world.components[typeName];

            expectDamaged(levelData);
        },
    );

    test('refuses a World shape that is not a rectangle', () => {
        const levelData = newLevelData();
        levelData.world.components['ShapeComponent'] = {
            geometry: { kind: 'circle', radius: 50 },
        };

        expectDamaged(levelData);
    });

    test.each(['BodyComponent', 'SurfaceComponent'])('refuses a World with a %s', (typeName) => {
        const levelData = newLevelData();
        levelData.world.components[typeName] = {};

        expectDamaged(levelData);
    });

    test('refuses an unknown component', () => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3, { WingsComponent: {} }));

        expectDamaged(levelData);
    });

    test('refuses an unknown value inside a component', () => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3, { BodyComponent: { wings: true } }));

        expectDamaged(levelData);
    });

    test.each([
        ['an empty name', { NameComponent: { name: '' } }],
        ['a scale of 0', { TransformComponent: { ...DEFAULT_TRANSFORM, scale: { x: 0, y: 1 } } }],
        ['a body type it does not know', { BodyComponent: { type: 'floating' } }],
        ['a polygon with two points', { ShapeComponent: { geometry: { kind: 'polygon', points: pointsOf(2) } } }],
        ['a component that is not an object', { BodyComponent: 'dynamic' }],
    ])('refuses a value its type refuses: %s', (_, components) => {
        const levelData = newLevelData();
        levelData.world.children.push(plainEntity(3, components));

        expectDamaged(levelData);
    });
});

describe('LevelReader limits', () => {
    test('reads the most entities allowed, and refuses one more', () => {
        const atLimit = newLevelData();
        atLimit.world.children.push(plainEntity(3), plainEntity(4));
        const overLimit = newLevelData();
        overLimit.world.children.push(plainEntity(3), plainEntity(4), plainEntity(5));

        expectRead(atLimit, SMALL_LIMITS);
        expectOverLimit(overLimit, 'entities', SMALL_LIMITS.maxEntities);
    });

    test('reads the deepest entity allowed, and refuses one deeper', () => {
        const atLimit = newLevelData();
        atLimit.world.children.push(nestedChain(3, 2));
        const overLimit = newLevelData();
        requireWorldChild(overLimit, 0).children.push(nestedChain(3, 2));

        expectRead(atLimit, SMALL_LIMITS);
        expectOverLimit(overLimit, 'depth', SMALL_LIMITS.maxDepth);
    });

    test('refuses an entity 257 deep with the v1 limits, and reads one 256 deep', () => {
        const atLimit = newLevelData();
        atLimit.world.children.push(nestedChain(3, 256));
        const overLimit = newLevelData();
        overLimit.world.children.push(nestedChain(3, 257));

        expectRead(atLimit);
        expect(createReader().read(overLimit)).toEqual({
            ok: false,
            refusal: { reason: 'overLimit', limit: 'depth', max: 256 },
        });
    });

    test('stops at the depth limit in a file nested 50,000 deep, without running out of stack', () => {
        const levelData = newLevelData();
        levelData.world.children.push(nestedChain(3, 50_000));

        expect(createReader().read(levelData)).toEqual({
            ok: false,
            refusal: { reason: 'overLimit', limit: 'depth', max: 256 },
        });
    });

    test.each(['polygon', 'line'])('reads a %s with the most points allowed, and refuses one more', (kind) => {
        const atLimit = newLevelData();
        atLimit.world.children.push(shapeEntity(3, { kind, points: pointsOf(4) }));
        const overLimit = newLevelData();
        overLimit.world.children.push(shapeEntity(3, { kind, points: pointsOf(5) }));

        expectRead(atLimit, SMALL_LIMITS);
        expectOverLimit(overLimit, 'points', SMALL_LIMITS.maxPoints);
    });

    test('reads a path with the most points allowed, and refuses one more', () => {
        const pathPoint = { x: 0, y: 0, handle_in: null, handle_out: null, corner: 'sharp' };
        const atLimit = newLevelData();
        atLimit.world.children.push(
            plainEntity(3, { PathComponent: { path: { closed: false, points: Array(4).fill(pathPoint) } } }),
        );
        const overLimit = newLevelData();
        overLimit.world.children.push(
            plainEntity(3, { PathComponent: { path: { closed: false, points: Array(5).fill(pathPoint) } } }),
        );

        expectRead(atLimit, SMALL_LIMITS);
        expectOverLimit(overLimit, 'points', SMALL_LIMITS.maxPoints);
    });
});
