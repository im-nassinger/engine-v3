import { describe, expect, test } from 'vitest';

import { StyleComponent } from '../core/components/index.ts';
import type { GradientFill } from '../core/fields/index.ts';
import { addSquare, buildJointTest } from '../editor/tools/joint/testing/jointToolTest.ts';

import { EditorGradientSource } from './EditorGradientSource.ts';

const STOPS = [
    { colour: '#FF0000FF', place: 0 },
    { colour: '#0000FFFF', place: 1 },
];
const RADIAL: GradientFill = { kind: 'radial', stops: STOPS, centre: { x: 0.5, y: 0.5 }, radius: 0.25 };

// A 100 px square at 0, 0 with a radial gradient, selected, and the Select tool picked.
function buildSource() {
    const setup = buildJointTest();
    const square = addSquare(setup, { name: 'Crate', at: { x: 0, y: 0 }, size: 100, physics: 'none' });
    square.requireComponent(StyleComponent).set('fill', RADIAL);
    setup.controller.pick('select');
    setup.session.openLevel.selection.replace([square.id]);
    const source = new EditorGradientSource(setup.session, setup.controller);
    let changes = 0;
    source.subscribe(() => {
        changes += 1;
    });

    return { ...setup, square, source, changes: () => changes };
}

describe('EditorGradientSource', () => {
    test("shows the Select tool's handles, with a radial gradient's edge in the entity's own space", () => {
        const { source } = buildSource();
        const gradient = source.gradient;

        expect(gradient?.from).toEqual({ role: 'centre', position: { x: 0, y: 0 }, colour: '#FF0000FF' });
        expect(gradient?.to.position).toEqual({ x: 25, y: 0 });
        expect(gradient?.edge?.centre).toEqual({ x: 0, y: 0 });
        expect(gradient?.edge?.radiusX).toBe(25);
        expect(gradient?.edge?.radiusY).toBe(25);
    });

    test('changes when the card folds, and shows nothing while the Style card is folded', () => {
        const { session, source, changes } = buildSource();

        session.cardFolds.setFolded(StyleComponent.schema.typeName, true);

        expect(changes()).toBe(1);
        expect(source.gradient).toBeUndefined();
    });

    test('changes with the selection, and shows nothing with another tool', () => {
        const { session, controller, source, changes } = buildSource();

        session.openLevel.selection.replace([]);
        expect(changes()).toBeGreaterThan(0);
        expect(source.gradient).toBeUndefined();

        session.openLevel.selection.replace([session.openLevel.level.world.id]);
        controller.pick('joint');
        expect(source.gradient).toBeUndefined();
    });
});
