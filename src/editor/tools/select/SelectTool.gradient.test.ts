import { describe, expect, test } from 'vitest';

import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Fill, GradientFill } from '../../../core/fields/index.ts';
import type { Entity, Level } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';

import { buildPointTest } from './testing/pointTest.ts';

const STOPS = [
    { colour: '#FF0000FF', place: 0 },
    { colour: '#00FF00FF', place: 0.5 },
    { colour: '#0000FFFF', place: 1 },
];
// Across the middle of the 100 px square at 100, 500: from 50, 500 to 150, 500 in the level. Its end lies on
// the frame's right handle.
const LINEAR: GradientFill = { kind: 'linear', stops: STOPS, start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
const RADIAL: GradientFill = { kind: 'radial', stops: STOPS, centre: { x: 0.5, y: 0.5 }, radius: 0.5 };
const START = { x: 50, y: 500 };
const END = { x: 150, y: 500 };

function fillOf(entity: Entity) {
    return entity.requireComponent(StyleComponent).get('fill');
}

function setFill(entity: Entity, fill: Fill) {
    entity.requireComponent(StyleComponent).set('fill', fill);
}

function buildGradientTest(fill: Fill = LINEAR) {
    const built = buildPointTest();
    setFill(built.square, fill);
    built.session.openLevel.selection.replace([built.square.id]);

    return built;
}

function addOpenPath(level: Level) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    const sharp = { handleIn: null, handleOut: null, corner: 'sharp' } as const;
    const points = [
        { x: 0, y: 0, ...sharp },
        { x: 100, y: 0, ...sharp },
        { x: 50, y: 80, ...sharp },
    ];
    entity.addComponent(new PathComponent({ path: { closed: false, points } }));
    const style = new StyleComponent();
    style.set('fill', LINEAR);
    entity.addComponent(style);

    return entity;
}

describe('the gradient handles', () => {
    test("a linear gradient's start and end, with the stops between them, in level positions", () => {
        const { tool } = buildGradientTest();
        const handles = tool.gradientHandles;

        expect(handles?.handles.map((handle) => [handle.role, handle.position, handle.colour])).toEqual([
            ['start', START, '#FF0000FF'],
            ['end', END, '#0000FFFF'],
        ]);
        expect(handles?.stopDots).toEqual([{ position: { x: 100, y: 500 }, colour: '#00FF00FF' }]);
    });

    test("a radial gradient's centre and its radius dot along the box's own x", () => {
        const { tool } = buildGradientTest(RADIAL);
        const positions = tool.gradientHandles?.handles.map((handle) => [handle.role, handle.position]);

        expect(positions).toEqual([
            ['centre', { x: 100, y: 500 }],
            ['radius', { x: 150, y: 500 }],
        ]);
    });

    test('show only for one selected, shown, unlocked entity with a gradient and its Style card unfolded', () => {
        const { tool, session, square, polygon } = buildGradientTest();
        const { selection, cardFolds } = session.openLevel;
        expect(tool.gradientHandles).toBeDefined();

        selection.replace([square.id, polygon.id]);
        expect(tool.gradientHandles).toBeUndefined();
        selection.replace([square.id]);

        cardFolds.setFolded(StyleComponent.schema.typeName, true);
        expect(tool.gradientHandles).toBeUndefined();
        cardFolds.setFolded(StyleComponent.schema.typeName, false);

        square.setLocked(true);
        expect(tool.gradientHandles).toBeUndefined();
        square.setLocked(false);

        square.setHidden(true);
        expect(tool.gradientHandles).toBeUndefined();
        square.setHidden(false);

        setFill(square, { kind: 'solid', colour: '#FF0000FF' });
        expect(tool.gradientHandles).toBeUndefined();
    });

    test('none for a line or an open path, whose fill never paints', () => {
        const { tool, session, level, line } = buildGradientTest();
        setFill(line, LINEAR);
        session.openLevel.selection.replace([line.id]);
        expect(tool.gradientHandles).toBeUndefined();

        const path = addOpenPath(level);
        session.openLevel.selection.replace([path.id]);
        expect(tool.gradientHandles).toBeUndefined();
    });

    test('a press takes a handle within 8 screen px of its middle, at any zoom', () => {
        const { tool, session } = buildGradientTest();
        const handles = tool.gradientHandles;

        expect(handles?.handleAt({ x: 157, y: 500 }, 1)).toBe('end');
        expect(handles?.handleAt({ x: 159, y: 500 }, 1)).toBeUndefined();
        expect(handles?.handleAt({ x: 154, y: 500 }, 2)).toBe('end');
        expect(handles?.handleAt({ x: 155, y: 500 }, 2)).toBeUndefined();
        expect(handles?.handleAt({ x: 45, y: 504 }, session.view.zoom)).toBe('start');
    });
});

describe('GradientDragState', () => {
    test('dragging the end over the frame handle moves the gradient in one step, which undo puts back', () => {
        const { tool, session, square, drag } = buildGradientTest();
        const geometry = square.requireComponent(ShapeComponent).get('geometry');

        drag(END, { x: 125, y: 525 });

        expect(fillOf(square)).toEqual({ ...LINEAR, end: { x: 0.75, y: 0.75 } });
        expect(square.requireComponent(ShapeComponent).get('geometry')).toEqual(geometry);
        const { history, editor } = session.openLevel;
        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Change the fill of Entity');
        expect(tool.gradientHandles?.handles[1].position).toEqual({ x: 125, y: 525 });

        editor.undo();
        expect(fillOf(square)).toEqual(LINEAR);
    });

    test('a press off the middle keeps its distance, so the handle never jumps', () => {
        const { square, drag } = buildGradientTest();

        drag({ x: 154, y: 503 }, { x: 129, y: 528 });

        expect(fillOf(square)).toEqual({ ...LINEAR, end: { x: 0.75, y: 0.75 } });
    });

    test("the radius dot sets a radial gradient's radius", () => {
        const { square, drag } = buildGradientTest(RADIAL);

        drag({ x: 150, y: 500 }, { x: 100, y: 580 });

        expect(fillOf(square)).toEqual({ ...RADIAL, radius: 0.8 });
    });

    test('Shift keeps the direction to 15° on screen around the start', () => {
        const { square, drag } = buildGradientTest();

        drag(END, { x: 140, y: 520 }, { shift: true });

        const fill = fillOf(square);
        if (fill.kind !== 'linear') throw new Error('The fill is no longer linear.');
        const degrees = (Math.atan2(fill.end.y - fill.start.y, fill.end.x - fill.start.x) * 180) / Math.PI;
        expect(degrees).toBeCloseTo(15, 0);
    });

    test('Esc puts the fill back and makes no step', () => {
        const { tool, session, square, pointerAt } = buildGradientTest();

        tool.pointerDown(pointerAt(END));
        tool.pointerMove(pointerAt({ x: 120, y: 450 }));
        expect(fillOf(square)).not.toEqual(LINEAR);

        expect(tool.cancel()).toBe(true);
        expect(fillOf(square)).toEqual(LINEAR);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(session.openLevel.liveEdit.isActive).toBe(false);
    });

    test('the handles show during their own drag, and the frame hides', () => {
        const { tool, pointerAt } = buildGradientTest();

        tool.pointerDown(pointerAt(END));
        tool.pointerMove(pointerAt({ x: 120, y: 450 }));

        expect(tool.gradientHandles).toBeDefined();
        expect(tool.frame).toBeUndefined();
    });

    test('the handles hide while the entity is moved', () => {
        const { tool, pointerAt } = buildGradientTest();

        tool.pointerDown(pointerAt({ x: 80, y: 530 }));
        tool.pointerMove(pointerAt({ x: 120, y: 560 }));

        expect(tool.gradientHandles).toBeUndefined();
    });

    test('in a read-only level a handle changes nothing, saying why', () => {
        const { session, square, drag } = buildGradientTest();
        session.makeReadOnly();

        drag(END, { x: 120, y: 450 });

        expect(fillOf(square)).toEqual(LINEAR);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(session.status.current).toBe(READ_ONLY_REASON);
    });
});
