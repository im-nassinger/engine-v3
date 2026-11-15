import { ShapeComponent, StyleComponent, TransformComponent } from '../core/components/index.ts';
import { Level } from '../core/entities/index.ts';
import type { Entity } from '../core/entities/index.ts';
import type { ShapeGeometry } from '../core/geometry/index.ts';

// Stage 4's page draws this level until stage 5 brings the editor and its own new level. It sits
// within 300 px of the origin, so it shows at 100% in any window. The Playwright test reads the
// colour in the middle of the first square, so that square has a colour nothing else uses.
export const TEST_SQUARE_POSITION = { x: -200, y: 0 };
export const TEST_SQUARE_SIZE = 160;
export const TEST_SQUARE_COLOUR = '#E0533DFF';

function addShape(level: Level, parent: Entity, geometry: ShapeGeometry, position: { x: number; y: number }) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);
    entity.addComponent(new ShapeComponent({ geometry }));

    return entity;
}

function addStyledShape(level: Level, parent: Entity, geometry: ShapeGeometry, position: { x: number; y: number }) {
    const entity = addShape(level, parent, geometry, position);
    entity.addComponent(new StyleComponent());

    return entity;
}

export function buildTestLevel() {
    const level = Level.createNew();

    const square = addStyledShape(
        level,
        level.world,
        { kind: 'rectangle', width: TEST_SQUARE_SIZE, height: TEST_SQUARE_SIZE },
        TEST_SQUARE_POSITION,
    );
    const squareStyle = square.requireComponent(StyleComponent);
    squareStyle.set('fill', { kind: 'solid', colour: TEST_SQUARE_COLOUR });
    squareStyle.set('outlineWidth', 0);

    addStyledShape(level, level.world, { kind: 'ellipse', width: 140, height: 90 }, { x: 0, y: -120 });

    // A one-stroke star, which the polygon pipeline fills the way physics sees it.
    const star = addStyledShape(
        level,
        level.world,
        {
            kind: 'polygon',
            points: [
                { x: 0, y: -60 },
                { x: 35, y: 50 },
                { x: -57, y: -18 },
                { x: 57, y: -18 },
                { x: -35, y: 50 },
            ],
        },
        { x: 200, y: 0 },
    );
    star.requireComponent(StyleComponent).set('opacity', 0.6);

    // A turned group, so its child is drawn through the nested matrices.
    const group = level.createEntity(level.world, 0);
    const groupTransform = new TransformComponent();
    groupTransform.set('position', { x: 0, y: 140 });
    groupTransform.set('rotation', 15);
    group.addComponent(groupTransform);
    addStyledShape(level, group, { kind: 'rectangle', width: 220, height: 30 }, { x: 0, y: 0 });

    // No StyleComponent: the editor draws it as a thin line.
    addShape(level, level.world, { kind: 'rectangle', width: 80, height: 80 }, { x: 0, y: 20 });

    return level;
}
