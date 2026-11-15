import { JointComponent, NameComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';

// A World with a group holding a skewed child, a square beside it, and a rope joining the two.
export function buildChangesTestLevel() {
    const level = Level.createNew();

    const group = level.createEntity(level.world, 0);
    group.addComponent(
        new TransformComponent({ position: { x: 100, y: 50 }, rotation: 30, scale: { x: 2, y: 1 }, skew: 10 }),
    );
    group.addComponent(new NameComponent({ name: 'Group 1' }));

    const child = level.createEntity(group, 0);
    child.addComponent(
        new TransformComponent({ position: { x: 5, y: 6 }, rotation: 0, scale: { x: 1, y: 1 }, skew: -20 }),
    );
    child.addComponent(new NameComponent({ name: 'Child' }));

    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));

    const rope = level.createEntity(level.world, 0);
    rope.addComponent(new TransformComponent());
    rope.addComponent(new JointComponent());
    rope.addComponent(new PathComponent());

    return { level, group, child, square, rope };
}

export function snapshotOf(level: Level) {
    const data = new LevelWriter().write(level);
    const flags = [...level.entitiesInPanelOrder()].map((entity) => ({
        id: entity.id,
        hidden: entity.isHidden,
        locked: entity.isLocked,
    }));

    return { data, flags };
}
