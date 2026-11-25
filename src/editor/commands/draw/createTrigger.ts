import { NameComponent, ShapeComponent, TransformComponent, TriggerComponent } from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { addDrawnEntity } from './addDrawnEntity.ts';
import type { DrawnEntityOutcome } from './addDrawnEntity.ts';
import type { ShapeDrawing } from './createShape.ts';

export type CreateTriggerOutcome = DrawnEntityOutcome;

// The trigger the Trigger tool gives: "When other starts touching this", with nothing else set.
const FIRST_TRIGGER: Trigger = {
    id: 1,
    name: null,
    on: true,
    when: { kind: 'touched' },
    checks: [],
    actions: [],
};

// Finishing the Trigger tool's rectangle: a new entity that notices touching, named "Trigger 1" and
// selected, in one step "Draw Trigger 1", in the current group, on top. It has a TransformComponent, the
// rectangle's ShapeComponent and a TriggerComponent holding one touch trigger. No SurfaceComponent, so
// things pass through it and its touch trigger notices them; no StyleComponent, so play never draws it. Refused where createShape is.
export function createTrigger(openLevel: OpenLevel, reader: LevelReader, drawing: ShapeDrawing): CreateTriggerOutcome {
    return addDrawnEntity(openLevel, reader, {
        word: 'Trigger',
        components: (name) => [
            new TransformComponent({
                position: drawing.position,
                rotation: drawing.rotation,
                scale: { x: 1, y: 1 },
                skew: 0,
            }),
            new NameComponent({ name }),
            new ShapeComponent({ geometry: drawing.geometry }),
            new TriggerComponent({ triggers: [FIRST_TRIGGER], nextTriggerId: FIRST_TRIGGER.id + 1 }),
        ],
    });
}
