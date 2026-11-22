import { afterEach, describe, expect, test } from 'vitest';

import {
    PathComponent,
    ShapeComponent,
    StyleComponent,
    TransformComponent,
} from '../../../../core/components/index.ts';
import { WorldMatrixCache } from '../../../../core/derived/index.ts';
import type { ShapeGeometry } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { ViewState } from '../../../../editor/view/index.ts';
import { BOLT_SHARE_OF_INRADIUS, planUnstyledShapes } from './planUnstyledShapes.ts';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

function buildScene() {
    const level = Level.createNew();
    const worldMatrices = new WorldMatrixCache(level);
    cleanups.push(() => worldMatrices.dispose());
    const view = new ViewState();
    view.setSize(800, 600);

    return { level, view, worldMatrices };
}

function addShape(level: Level, geometry: ShapeGeometry, position = { x: 0, y: 0 }, styled = false): Entity {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent({ position, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }));
    entity.addComponent(new ShapeComponent({ geometry }));
    if (styled) {
        entity.addComponent(new StyleComponent());
    }

    return entity;
}

const RECTANGLE: ShapeGeometry = { kind: 'rectangle', width: 200, height: 100 };

describe('planUnstyledShapes', () => {
    test('plans a shape with no StyleComponent, its edge on screen and the bolt in its middle', () => {
        const scene = buildScene();
        const trigger = addShape(scene.level, RECTANGLE);
        const corner = scene.view.levelToScreen({ x: -100, y: -50 });

        const plans = planUnstyledShapes(scene);

        expect(plans).toHaveLength(1);
        const [plan] = plans;
        expect(plan?.entity).toBe(trigger);
        expect(plan?.isClosed).toBe(true);
        expect(plan?.points).toHaveLength(4);
        expect(plan?.points).toContainEqual(corner);
        const middle = scene.view.levelToScreen({ x: 0, y: 0 });
        expect(plan?.bolt?.centre.x).toBeCloseTo(middle.x);
        expect(plan?.bolt?.centre.y).toBeCloseTo(middle.y);
        // A 200 by 100 rectangle's inradius, twice its area over its perimeter, is 200 / 3.
        expect(plan?.bolt?.heightPx).toBeCloseTo((200 / 3) * BOLT_SHARE_OF_INRADIUS);
    });

    test('the bolt grows with the zoom and is left out when the shape is small on screen or a line', () => {
        const scene = buildScene();
        addShape(scene.level, RECTANGLE);
        const heightAt = (zoom: number) => {
            scene.view.zoomAboutMiddle(zoom);
            return planUnstyledShapes(scene)[0]?.bolt?.heightPx;
        };

        const atOne = heightAt(1) ?? 0;
        expect(heightAt(2)).toBeCloseTo(atOne * 2);
        expect(heightAt(0.1)).toBeUndefined();
    });

    test('leaves out styled shapes, paths, and shapes hidden by their eye or a parent’s', () => {
        const scene = buildScene();
        const { level } = scene;
        addShape(level, RECTANGLE, { x: 0, y: 0 }, true);
        const path = level.createEntity(level.world, 0);
        path.addComponent(new TransformComponent());
        path.addComponent(
            new PathComponent({
                path: {
                    closed: false,
                    points: [
                        { x: 0, y: 0, corner: 'sharp', handleIn: null, handleOut: null },
                        { x: 10, y: 0, corner: 'sharp', handleIn: null, handleOut: null },
                    ],
                },
            }),
        );
        addShape(level, RECTANGLE).setHidden(true);
        const group = level.createEntity(level.world, 0);
        group.addComponent(new TransformComponent());
        addShape(level, RECTANGLE);
        const inGroup = level.createEntity(group, 0);
        inGroup.addComponent(new TransformComponent());
        inGroup.addComponent(new ShapeComponent({ geometry: RECTANGLE }));
        group.setHidden(true);

        const plans = planUnstyledShapes(scene);

        expect(plans).toHaveLength(1);
    });

    test('a line is open, and a shape off screen is left out', () => {
        const scene = buildScene();
        const points = [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
        ];
        addShape(scene.level, { kind: 'line', points });
        addShape(scene.level, RECTANGLE, { x: 100_000, y: 0 });

        const plans = planUnstyledShapes(scene);

        expect(plans.map((plan) => plan.isClosed)).toEqual([false]);
        expect(plans[0]?.bolt).toBeUndefined();
    });
});
