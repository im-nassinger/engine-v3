import { describe, expect, test } from 'vitest';

import {
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
    TriggerComponent,
} from '../../../core/components/index.ts';
import { labelName } from '../../../core/level/index.ts';
import {
    buildDrawingToolTest,
    click,
    drag,
    geometryOf,
    letter,
    made,
    pointer,
    positionOf,
    TENS_SNAPPER,
} from '../shape/testing/shapeToolTest.ts';
import { TriggerTool } from './TriggerTool.ts';

function buildTriggerTest(snapper = TENS_SNAPPER) {
    return buildDrawingToolTest(new TriggerTool(), snapper);
}

describe('the Trigger tool', () => {
    test('choosing it clears the selection', () => {
        const setup = buildTriggerTest();

        expect(setup.controller.active.id).toBe('trigger');
        expect(setup.session.openLevel.selection.ids).toEqual([]);
    });

    test('a drag draws a snapped rectangle, makes the trigger in one step, and returns to Select with it selected', () => {
        const setup = buildTriggerTest();

        drag(setup, { x: 101, y: 99 }, { x: 299, y: 202 });

        const trigger = made(setup);
        expect(labelName(trigger)).toBe('Trigger 1');
        expect(geometryOf(trigger)).toEqual({ kind: 'rectangle', width: 200, height: 100 });
        expect(positionOf(trigger)).toEqual({ x: 200, y: 150 });
        expect(trigger.hasComponent(SurfaceComponent)).toBe(false);
        expect(trigger.requireComponent(TriggerComponent).get('triggers')).toHaveLength(1);
        expect(trigger.hasComponent(StyleComponent)).toBe(false);
        expect(setup.controller.active.id).toBe('select');
        expect(setup.session.openLevel.history.undoCount).toBe(1);
        expect(setup.session.openLevel.history.undoLabel).toBe('Draw Trigger 1');
    });

    test('a click places a 100 x 100 rectangle centred on the mouse', () => {
        const setup = buildTriggerTest();

        click(setup, { x: 30, y: 40 });

        const trigger = made(setup);
        expect(geometryOf(trigger)).toEqual({ kind: 'rectangle', width: 100, height: 100 });
        expect(positionOf(trigger)).toEqual({ x: 30, y: 40 });
    });

    test('shows the preview and the size readout during a drag, like the Shape tool', () => {
        const setup = buildTriggerTest();

        setup.controller.pointerMove(pointer({ x: 70, y: 80 }));
        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 100, height: 100 });

        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 120, y: 60 }));
        expect(setup.tool.readout?.text).toBe('1.2 × 0.6 m');
        expect(setup.tool.drawing?.drawing.geometry).toEqual({ kind: 'rectangle', width: 120, height: 60 });
    });

    test('Esc during a drag makes nothing', () => {
        const setup = buildTriggerTest();

        setup.controller.pointerDown(pointer({ x: 0, y: 0 }));
        setup.controller.pointerMove(pointer({ x: 120, y: 60 }));
        expect(setup.tool.cancel()).toBe(true);
        setup.controller.pointerUp(pointer({ x: 120, y: 60 }));

        expect(setup.session.openLevel.history.undoCount).toBe(0);
        expect(setup.controller.active.id).toBe('trigger');
    });

    test('Z and X turn it as they turn a shape', () => {
        const setup = buildTriggerTest();
        setup.controller.pointerMove(pointer({ x: 30, y: 40 }));

        expect(setup.tool.keyDown(letter('x'))).toBe(true);
        click(setup, { x: 30, y: 40 });

        const rotation = made(setup).requireComponent(TransformComponent).get('rotation');
        expect(rotation).not.toBe(0);
    });
});
