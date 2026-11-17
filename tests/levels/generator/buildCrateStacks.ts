import {
    BodyComponent,
    NameComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../src/core/components/index.ts';
import type { BodyType } from '../../../src/core/components/index.ts';
import type { Point } from '../../../src/core/geometry/index.ts';
import { Level } from '../../../src/core/level/index.ts';
import type { Entity } from '../../../src/core/level/index.ts';

export const CRATES_PER_STACK = 10;
const CRATE_SIZE = 40;
const STACK_SPACING = 80;
const GROUND_HEIGHT = 40;
// The ground's top, below the camera's middle at the origin, so the stacks in the middle are in view.
const GROUND_TOP = 200;
const CRATE_COLOUR = '#A0703CFF';
const GROUND_COLOUR = '#5A6470FF';

export type CrateStacks = {
    readonly level: Level;
    readonly ground: Entity;
    readonly crates: readonly Entity[];
};

// A level for test play's speed test: stacks of ten Dynamic crates side by side on one Static ground,
// centred on the origin, so the camera sees the middle stacks and the rest are off screen. A count that
// is not whole stacks ends with a shorter one.
export function buildCrateStacks(crateCount: number): CrateStacks {
    if (!Number.isInteger(crateCount) || crateCount < 0) {
        throw new Error(`A level of crate stacks holds a whole number of crates, not ${crateCount}.`);
    }

    const level = Level.createNew();
    const stackCount = Math.ceil(crateCount / CRATES_PER_STACK);
    const width = Math.max(1, stackCount) * STACK_SPACING;
    const ground = addEntity(level, 'Ground', { x: 0, y: GROUND_TOP + GROUND_HEIGHT / 2 });
    addSolidRectangle(ground, { width, height: GROUND_HEIGHT }, 'static', GROUND_COLOUR);

    const crates: Entity[] = [];
    for (let index = 0; index < crateCount; index += 1) {
        const stack = Math.floor(index / CRATES_PER_STACK);
        const height = index % CRATES_PER_STACK;
        const position = {
            x: (stack - (stackCount - 1) / 2) * STACK_SPACING,
            y: GROUND_TOP - (height + 0.5) * CRATE_SIZE,
        };
        const crate = addEntity(level, `Crate ${stack + 1}.${height + 1}`, position);
        addSolidRectangle(crate, { width: CRATE_SIZE, height: CRATE_SIZE }, 'dynamic', CRATE_COLOUR);
        crates.push(crate);
    }

    return { level, ground, crates };
}

function addEntity(level: Level, name: string, position: Point) {
    const entity = level.createEntity(level.world, level.world.children.length);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

type Size = { readonly width: number; readonly height: number };

function addSolidRectangle(entity: Entity, size: Size, type: BodyType, colour: string) {
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', ...size } }));
    entity.addComponent(new StyleComponent({ ...StyleComponent.schema.defaults(), fill: { kind: 'solid', colour } }));
    entity.addComponent(new BodyComponent({ ...BodyComponent.schema.defaults(), type }));
    entity.addComponent(new SurfaceComponent());
}
