import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    CameraComponent,
    NameComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { ManualFrames } from '../../time/testing/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';
import { createV1Rules } from '../rules/v1Rules.ts';

import { EditorMessages } from './EditorMessages.ts';

function addCrate(level: Level, name = 'Crate') {
    const crate = level.createEntity(level.world, 0);
    crate.addComponent(new TransformComponent());
    crate.addComponent(new NameComponent({ name }));
    crate.addComponent(new ShapeComponent());
    crate.addComponent(new StyleComponent());
    crate.addComponent(new BodyComponent());
    crate.addComponent(new SurfaceComponent());

    return crate;
}

function cameraOf(level: Level) {
    return level.camera.requireComponent(CameraComponent);
}

function texts(messages: readonly EditorMessage[]) {
    return messages.map((message) => `${message.componentType ?? ''}: ${message.text}`);
}

// Counts the entities checked, around the v1 rules.
class CountingRule implements EditorMessageRule {
    checked: Entity[] = [];

    check(entity: Entity) {
        this.checked.push(entity);

        return [];
    }
}

function build(rules: readonly EditorMessageRule[] = createV1Rules()) {
    const level = Level.createNew();
    const crate = addCrate(level);
    const frames = new ManualFrames();
    const messages = new EditorMessages(level, rules, frames);

    return { level, crate, frames, messages };
}

describe('EditorMessages', () => {
    test('a whole crate and a new level have no messages', () => {
        const { messages } = build();

        expect(messages.all()).toEqual([]);
    });

    test('a level is checked when it opens, before any frame', () => {
        const level = Level.createNew();
        const crate = addCrate(level);
        crate.removeComponent(ShapeComponent);

        const messages = new EditorMessages(level, createV1Rules(), new ManualFrames());

        expect(texts(messages.forEntity(crate.id))).toEqual([
            'StyleComponent: Needs a ShapeComponent to draw anything.',
            'SurfaceComponent: Needs a ShapeComponent to collide.',
        ]);
    });

    test("removing a crate's ShapeComponent gives its SurfaceComponent's note on the next frame", () => {
        const { crate, frames, messages } = build();
        crate.removeComponent(StyleComponent);
        crate.removeComponent(ShapeComponent);

        expect(messages.all()).toEqual([]);

        frames.runFrame();

        expect(messages.forEntity(crate.id)).toEqual([
            {
                kind: 'warning',
                entityId: crate.id,
                componentType: 'SurfaceComponent',
                fieldKey: undefined,
                text: 'Needs a ShapeComponent to collide.',
                fix: { kind: 'addComponent', label: 'Add ShapeComponent', componentType: 'ShapeComponent' },
            },
        ]);
        expect(messages.all()).toHaveLength(1);
    });

    test('adding the partner back clears the note', () => {
        const { crate, frames, messages } = build();
        crate.removeComponent(ShapeComponent);
        frames.runFrame();

        crate.addComponent(new ShapeComponent());
        frames.runFrame();

        expect(messages.forEntity(crate.id)).toEqual([]);
    });

    test('a body without a shape, such as a group, needs no SurfaceComponent', () => {
        const level = Level.createNew();
        const group = level.createEntity(level.world, 0);
        group.addComponent(new TransformComponent());
        group.addComponent(new NameComponent({ name: 'Group' }));
        group.addComponent(new BodyComponent());

        const messages = new EditorMessages(level, createV1Rules(), new ManualFrames());

        expect(messages.forEntity(group.id)).toEqual([]);
    });

    test("a body with a shape and no SurfaceComponent gets the BodyComponent's note", () => {
        const { crate, frames, messages } = build();
        crate.removeComponent(SurfaceComponent);
        frames.runFrame();

        expect(texts(messages.forEntity(crate.id))).toEqual(['BodyComponent: Needs a SurfaceComponent to collide.']);
    });

    test("deleting the camera's Follow target gives `missing entity` on Follow, and undoing it clears it", () => {
        const { level, crate, frames, messages } = build();
        cameraOf(level).set('follow', crate.id);
        frames.runFrame();
        expect(messages.forEntity(level.camera.id)).toEqual([]);

        const id = crate.id;
        level.removeEntity(crate);
        frames.runFrame();

        expect(messages.forEntity(level.camera.id)).toEqual([
            {
                kind: 'warning',
                entityId: level.camera.id,
                componentType: 'CameraComponent',
                fieldKey: 'follow',
                text: 'missing entity',
                fix: undefined,
            },
        ]);

        level.restoreEntity(id, level.world, 0);
        frames.runFrame();

        expect(messages.forEntity(level.camera.id)).toEqual([]);
    });

    test('emptying the field clears `missing entity`', () => {
        const { level, crate, frames, messages } = build();
        cameraOf(level).set('follow', crate.id);
        level.removeEntity(crate);
        frames.runFrame();

        cameraOf(level).set('follow', null);
        frames.runFrame();

        expect(messages.all()).toEqual([]);
    });

    test("a removed entity's own messages go with it", () => {
        const { level, crate, frames, messages } = build();
        crate.removeComponent(ShapeComponent);
        frames.runFrame();

        level.removeEntity(crate);
        frames.runFrame();

        expect(messages.all()).toEqual([]);
    });

    test('one edit at 10,000 entities checks one entity, once per frame', () => {
        const counter = new CountingRule();
        const level = Level.createNew();
        const crates = Array.from({ length: 10_000 }, () => addCrate(level));
        const frames = new ManualFrames();
        new EditorMessages(level, [...createV1Rules(), counter], frames);
        counter.checked = [];

        const crate = crates[5_000] as Entity;
        crate.removeComponent(StyleComponent);
        crate.removeComponent(ShapeComponent);
        frames.runFrame();

        expect(counter.checked).toEqual([crate]);
    });

    test('the version and the changed signal move only when messages change', () => {
        const { crate, frames, messages } = build();
        const changed: number[][] = [];
        messages.changed.subscribe((ids) => changed.push([...ids]));
        const before = messages.version.version;

        crate.removeComponent(StyleComponent);
        frames.runFrame();
        expect(messages.version.version).toBe(before);

        crate.removeComponent(ShapeComponent);
        frames.runFrame();
        expect(messages.version.version).toBe(before + 1);
        expect(changed).toEqual([[crate.id]]);
    });

    test('a level-wide message comes first and goes when its source sets none', () => {
        const { crate, frames, messages } = build();
        crate.removeComponent(ShapeComponent);
        frames.runFrame();
        const failedSave: EditorMessage = {
            kind: 'warning',
            entityId: undefined,
            componentType: undefined,
            fieldKey: undefined,
            text: 'Saving in the browser failed.',
            fix: undefined,
        };

        messages.setLevelWide('saving', [failedSave]);
        expect(messages.all()[0]).toBe(failedSave);
        expect(messages.all()).toHaveLength(3);

        messages.setLevelWide('saving', []);
        expect(messages.all()).toHaveLength(2);
    });

    test('after dispose nothing is checked', () => {
        const { crate, frames, messages } = build();
        messages.dispose();

        crate.removeComponent(ShapeComponent);
        frames.runFrame();

        expect(frames.pendingCount).toBe(0);
        expect(messages.all()).toEqual([]);
    });
});
