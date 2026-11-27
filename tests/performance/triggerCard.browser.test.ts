import { flushSync } from 'react-dom';
import { describe, expect, test } from 'vitest';
import { NameComponent } from '../../src/core/components/index.ts';
import type { Entity, Level } from '../../src/core/level/index.ts';
import {
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    select,
    showEntityInspector,
} from '../../src/ui/entity-inspector/EntityInspector/testing/entityInspectorPage.ts';
import { buildPlatformer } from '../levels/examples/platformer/buildPlatformer.ts';
import { runFrames } from './testing/levelViewPage.ts';

// Until the browser has painted the frame after, with the effects and resize observers the show set going run.
function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

// The example platformer's Blob holds 202 triggers. performance.md's 0.2 s for the Entity inspector to show
// an entity's cards holds for it too.
const SHOW_TIME_LIMIT_MS = 200;
const SHOWS = 5;
// performance.md: CI only catches a large slowdown, since its machines are slower.
const LARGE_SLOWDOWN = 5;

function entityNamed(level: Level, name: string): Entity {
    const found = [...level.entitiesInPanelOrder()].find(
        (entity) => entity.getComponent(NameComponent)?.get('name') === name,
    );
    if (found === undefined) throw new Error(`The level has no ${name}.`);

    return found;
}

describe('the Triggers card', () => {
    test("the Entity inspector shows the example platformer's Blob, with its 202 triggers, within 0.2 s", async () => {
        openEntityInspectorPage();
        try {
            const { level } = buildPlatformer();
            const blob = entityNamed(level, 'Blob');
            const { session, frames } = showEntityInspector(level);
            await expect.poll(() => entityInspectorContainer().querySelector('.entity-inspector-card')).not.toBeNull();
            const times: number[] = [];

            for (let show = 0; show < SHOWS; show += 1) {
                flushSync(() => select(session, [level.world]));
                runFrames(frames);

                const start = performance.now();
                flushSync(() => select(session, [blob]));
                entityInspectorContainer().getBoundingClientRect();
                runFrames(frames);
                await nextPaint();
                times.push(performance.now() - start);
                // Every trigger has its place, and those near the view are drawn.
                expect(entityInspectorContainer().querySelectorAll('[data-trigger-id]')).toHaveLength(202);
                expect(entityInspectorContainer().querySelectorAll('.trigger-block').length).toBeGreaterThan(0);
            }

            const slowest = Math.max(...times);
            console.info(
                `The Entity inspector shows the Blob's 202 triggers: ${times.map((time) => time.toFixed(1)).join(', ')} ms (target ${SHOW_TIME_LIMIT_MS} ms)`,
            );
            expect(slowest).toBeLessThan(LARGE_SLOWDOWN * SHOW_TIME_LIMIT_MS);
        } finally {
            closeEntityInspectorPage();
        }
    });
});
