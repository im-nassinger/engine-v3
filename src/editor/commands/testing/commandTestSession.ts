import { JointComponent, NameComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { EditorSession } from '../../session/index.ts';
import type { Clock, FrameScheduler, Timer } from '../../time/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';
import type { EditorCommand } from '../EditorCommand.ts';

// A group holding a skewed child, a square, and a rope from the child to the square, top row first:
// rope, square, group. The test passes in editor/time's fakes, which only tests may import.
export function buildCommandTestSession(clock: Clock, timer: Timer, frames: FrameScheduler) {
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
    rope.addComponent(new NameComponent({ name: 'Rope' }));
    rope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: child.id, b: square.id }));
    rope.addComponent(new PathComponent());

    const session = new EditorSession({ level, clock, timer, frames });
    const registry = createCommandRegistry(session);

    function requireCommand(id: string): EditorCommand {
        const command = registry.find(id);
        if (command === undefined) throw new Error(`No command ${id}.`);

        return command;
    }

    return { session, registry, requireCommand, level, group, child, square, rope };
}

// Everything a step can change: the file's data, each entity's switches and the level's name.
export function levelSnapshot(level: Level) {
    const data = new LevelWriter().write(level);
    const flags = [...level.entitiesInPanelOrder()].map((entity) => ({
        id: entity.id,
        hidden: entity.isHidden,
        locked: entity.isLocked,
    }));

    return { name: level.name, data, flags };
}

// Runs the command, then checks that undo gives back the level from before and redo the one from after.
export function expectRoundTrip(session: EditorSession, run: () => void) {
    const level = session.openLevel.level;
    const before = levelSnapshot(level);

    run();
    const after = levelSnapshot(level);

    session.openLevel.editor.undo();
    const afterUndo = levelSnapshot(level);

    session.openLevel.editor.redo();
    const afterRedo = levelSnapshot(level);

    return { before, after, afterUndo, afterRedo };
}
