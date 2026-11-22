import { describe, expect, test } from 'vitest';

import {
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
    TriggerComponent,
} from '../../../core/components/index.ts';
import { labelName } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';
import type { ShapeDrawing } from './createShape.ts';
import { createTrigger } from './createTrigger.ts';

const RECTANGLE: ShapeDrawing = {
    geometry: { kind: 'rectangle', width: 200, height: 160 },
    position: { x: 800, y: 410 },
    rotation: 15,
};

function buildSession() {
    const timer = new ManualTimer();

    return buildCommandTestSession(timer.clock, timer, new ManualFrames());
}

function requireCreated(outcome: ReturnType<typeof createTrigger>) {
    if (outcome.kind !== 'created') throw new Error(`Refused: ${outcome.reason}`);

    return outcome.id;
}

describe('createTrigger', () => {
    test('makes a sensor rectangle with one touch trigger and no style, on top, selected, as one step', () => {
        const { session, level } = buildSession();

        const id = requireCreated(createTrigger(session.openLevel, session.reader, RECTANGLE));

        const trigger = level.requireEntity(id);
        expect(level.world.children[0]).toBe(trigger);
        expect(labelName(trigger)).toBe('Trigger 1');
        const transform = trigger.requireComponent(TransformComponent);
        expect(transform.get('position')).toEqual({ x: 800, y: 410 });
        expect(transform.get('rotation')).toBe(15);
        expect(trigger.requireComponent(ShapeComponent).get('geometry')).toEqual(RECTANGLE.geometry);
        const surface = trigger.requireComponent(SurfaceComponent);
        expect(surface.get('sensor')).toBe(true);
        expect(surface.get('density')).toBe(new SurfaceComponent().get('density'));
        expect(trigger.hasComponent(StyleComponent)).toBe(false);
        const triggers = trigger.requireComponent(TriggerComponent);
        expect(triggers.get('triggers')).toEqual([
            {
                id: 1,
                name: null,
                on: true,
                when: { kind: 'touched' },
                checks: [],
                actions: [],
                repeat: { kind: 'everyTime' },
            },
        ]);
        expect(triggers.get('nextTriggerId')).toBe(2);
        expect(session.openLevel.selection.ids).toEqual([id]);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Draw Trigger 1');
    });

    test('names each one more than the highest number used', () => {
        const { session, level } = buildSession();

        const first = requireCreated(createTrigger(session.openLevel, session.reader, RECTANGLE));
        const second = requireCreated(createTrigger(session.openLevel, session.reader, RECTANGLE));

        expect(labelName(level.requireEntity(first))).toBe('Trigger 1');
        expect(labelName(level.requireEntity(second))).toBe('Trigger 2');
    });

    test('undo removes it and redo brings it back', () => {
        const { session, level } = buildSession();
        let id: ReturnType<typeof requireCreated> | undefined;

        const trip = expectRoundTrip(session, () => {
            id = requireCreated(createTrigger(session.openLevel, session.reader, RECTANGLE));
        });

        if (id === undefined) throw new Error('No trigger.');
        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        session.openLevel.editor.undo();
        expect(level.findEntity(id)).toBeUndefined();
    });

    test('is refused inside a locked group and makes no step', () => {
        const { session, group } = buildSession();
        group.setLocked(true);
        session.openLevel.currentGroup.enter(group);

        const outcome = createTrigger(session.openLevel, session.reader, RECTANGLE);

        expect(outcome).toEqual({ kind: 'refused', reason: 'This group is locked' });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});
