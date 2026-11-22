import { describe, expect, test } from 'vitest';

import { TriggerComponent } from '../../../core/components/index.ts';
import { TriggerEdits } from '../../entity-inspector/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { buildCommandTestSession, expectRoundTrip } from '../testing/commandTestSession.ts';

import { editTriggers } from './editTriggers.ts';

function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    built.square.addComponent(new TriggerComponent());

    return built;
}

describe('editTriggers', () => {
    test('an edit of the Triggers card is one step with its label, passing the round trip', () => {
        const { session, square } = buildSession();
        const openLevel = session.openLevel;
        const component = square.requireComponent(TriggerComponent);

        const trip = expectRoundTrip(session, () => {
            const edit = TriggerEdits.added(component);
            editTriggers(openLevel, square.id, edit);
        });

        expect(trip.afterUndo).toEqual(trip.before);
        expect(trip.afterRedo).toEqual(trip.after);
        expect(component.get('triggers').map((trigger) => trigger.id)).toEqual([1]);
        expect(component.get('nextTriggerId')).toBe(2);
        expect(openLevel.history.undoCount).toBe(1);
        expect(openLevel.history.undoLabel).toBe('Add trigger');
    });

    test('each later edit is its own step, labelled by what changed', () => {
        const { session, square } = buildSession();
        const openLevel = session.openLevel;
        const component = square.requireComponent(TriggerComponent);
        editTriggers(openLevel, square.id, TriggerEdits.added(component));

        editTriggers(openLevel, square.id, TriggerEdits.switched(component, 0));

        expect(component.get('triggers')[0]?.on).toBe(false);
        expect(openLevel.history.undoCount).toBe(2);
        expect(openLevel.history.undoLabel).toBe('Switch off trigger "New trigger"');
    });

    test('an edit that changes nothing makes no step', () => {
        const { session, square } = buildSession();
        const openLevel = session.openLevel;
        const component = square.requireComponent(TriggerComponent);
        editTriggers(openLevel, square.id, TriggerEdits.added(component));

        const outcome = editTriggers(openLevel, square.id, TriggerEdits.renamed(component, 0, ''));

        expect(outcome).toEqual({ kind: 'done' });
        expect(openLevel.history.undoCount).toBe(1);
    });

    test('a list with two triggers of one id is refused with its reason and no step', () => {
        const { session, square } = buildSession();
        const openLevel = session.openLevel;
        const component = square.requireComponent(TriggerComponent);
        const added = TriggerEdits.added(component);
        const twice = { ...added, triggers: [...added.triggers, ...added.triggers] };

        const outcome = editTriggers(openLevel, square.id, twice);

        expect(outcome.kind).toBe('refused');
        expect(openLevel.history.undoCount).toBe(0);
    });
});
