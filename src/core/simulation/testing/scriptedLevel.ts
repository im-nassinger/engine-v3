import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../../components/index.ts';
import type { BodyType } from '../../components/index.ts';
import type { TransformValues } from '../../geometry/index.ts';
import type { Entity, Level } from '../../level/index.ts';

import type { Simulation } from '../run/Simulation.ts';

const NOTHING_HELD = { heldKeys: [], pressedKeys: [] };

export function transform(x: number, y: number, rotation = 0, scaleX = 1): TransformValues {
    return { position: { x, y }, rotation, scale: { x: scaleX, y: 1 }, skew: 0 };
}

export function place(level: Level, parent: Entity, values: TransformValues) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(new TransformComponent(values));

    return entity;
}

// A 20 px square with a body of its own that merges into nothing.
export function placeBody(level: Level, parent: Entity, values: TransformValues, type: BodyType = 'dynamic') {
    const entity = place(level, parent, values);
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 20, height: 20 } }));
    entity.addComponent(new SurfaceComponent());
    const body = new BodyComponent();
    body.set('type', type);
    body.set('merge', false);
    entity.addComponent(body);

    return entity;
}

export function runTicks(simulation: Simulation, count: number) {
    for (let i = 0; i < count; i++) {
        simulation.runTick(NOTHING_HELD);
    }
}
