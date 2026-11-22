import type { Entity } from '../../level/index.ts';

// The entity and everything inside it, parents before their children, top row first.
export function entitiesIn(top: Entity) {
    const found: Entity[] = [];
    const waiting = [top];

    for (let entity = waiting.pop(); entity !== undefined; entity = waiting.pop()) {
        found.push(entity);

        const childrenTopFirst = [...entity.children].reverse();
        waiting.push(...childrenTopFirst);
    }

    return found;
}
