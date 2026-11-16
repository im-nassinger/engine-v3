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

// Each block is ten entities: a platform, a stack of four loose crates on it, and a cart, a group
// holding a box (a group inside it) of two crates and one crate of its own.
export const ENTITIES_PER_BLOCK = 10;
const LOOSE_CRATES_PER_BLOCK = 4;
const COLUMNS = 40;
const BLOCK_WIDTH = 400;
const BLOCK_HEIGHT = 300;
const CRATE_SIZE = 40;
const PLATFORM_WIDTH = 240;
const PLATFORM_HEIGHT = 20;
const CRATE_COLOUR = '#a0703c';
const PLATFORM_COLOUR = '#5a6470';

export type TestLevel = {
    readonly level: Level;
    readonly platforms: readonly Entity[];
    // The crates directly inside the World, which a click selects themselves.
    readonly looseCrates: readonly Entity[];
    // The groups directly inside the World.
    readonly carts: readonly Entity[];
};

// A level for the speed tests with entityCount entities besides the World and the camera: a grid of
// blocks, rows of 40, inside a new level's World rectangle up to 10,000 entities. It is built in the
// test rather than read from a file, so it can be rebuilt at any size.
export function buildTestLevel(entityCount: number): TestLevel {
    if (entityCount % ENTITIES_PER_BLOCK !== 0) {
        throw new Error(`A test level holds a multiple of ${ENTITIES_PER_BLOCK} entities, not ${entityCount}.`);
    }

    const level = Level.createNew();
    const built = { level, platforms: [] as Entity[], looseCrates: [] as Entity[], carts: [] as Entity[] };
    const blockCount = entityCount / ENTITIES_PER_BLOCK;
    const rowCount = Math.ceil(blockCount / COLUMNS);

    for (let block = 0; block < blockCount; block += 1) {
        const column = block % COLUMNS;
        const row = Math.floor(block / COLUMNS);
        const corner = {
            x: (column - COLUMNS / 2) * BLOCK_WIDTH,
            y: (row - rowCount / 2) * BLOCK_HEIGHT,
        };
        addBlock(built, block + 1, corner);
    }

    return built;
}

type BuiltLevel = { level: Level; platforms: Entity[]; looseCrates: Entity[]; carts: Entity[] };

function addBlock(built: BuiltLevel, number: number, corner: Point) {
    const { level } = built;
    const floorY = corner.y + BLOCK_HEIGHT - PLATFORM_HEIGHT;

    const platform = addEntity(level, level.world, `Platform ${number}`, {
        x: corner.x + PLATFORM_WIDTH / 2,
        y: floorY,
    });
    addSolidRectangle(platform, PLATFORM_WIDTH, PLATFORM_HEIGHT, 'static', PLATFORM_COLOUR);
    built.platforms.push(platform);

    for (let index = 0; index < LOOSE_CRATES_PER_BLOCK; index += 1) {
        const y = floorY - (index + 1) * CRATE_SIZE;
        const crate = addCrate(level, level.world, `Crate ${number}.${index + 1}`, { x: corner.x + CRATE_SIZE, y });
        built.looseCrates.push(crate);
    }

    const cart = addEntity(level, level.world, `Cart ${number}`, {
        x: corner.x + PLATFORM_WIDTH,
        y: floorY - CRATE_SIZE,
    });
    const box = addEntity(level, cart, 'Box', { x: 0, y: -CRATE_SIZE });
    addCrate(level, box, 'Left crate', { x: -CRATE_SIZE / 2, y: 0 });
    addCrate(level, box, 'Right crate', { x: CRATE_SIZE / 2, y: 0 });
    addCrate(level, cart, 'Base crate', { x: 0, y: 0 });
    built.carts.push(cart);
}

function addEntity(level: Level, parent: Entity, name: string, position: Point) {
    // The first row draws in front, so each new entity goes first, in front of those built before it.
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

function addCrate(level: Level, parent: Entity, name: string, position: Point) {
    const crate = addEntity(level, parent, name, position);
    addSolidRectangle(crate, CRATE_SIZE, CRATE_SIZE, 'dynamic', CRATE_COLOUR);

    return crate;
}

function addSolidRectangle(entity: Entity, width: number, height: number, type: BodyType, colour: string) {
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width, height } }));
    entity.addComponent(new StyleComponent({ ...StyleComponent.schema.defaults(), fill: { kind: 'solid', colour } }));
    entity.addComponent(new BodyComponent({ ...BodyComponent.schema.defaults(), type }));
    entity.addComponent(new SurfaceComponent());
}
