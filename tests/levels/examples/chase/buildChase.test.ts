import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../../../src/adapters/box2d/index.ts';
import { createV1Registry, TriggerComponent } from '../../../../src/core/components/index.ts';
import { triggerProblems } from '../../../../src/core/triggers/index.ts';

import { buildChase } from './buildChase.ts';
import { HOME } from './course/layout.ts';
import { runChase, TAKE_OFFS } from './play/runChase.ts';

const engine = new Box2dPhysicsEngine();
const TICKS = 1500;
// A whole run of the level takes a few seconds.
const LONG = 60_000;

beforeAll(async () => {
    await engine.load();
});

describe('the chase example level', () => {
    test('every trigger has no problems', () => {
        const { level } = buildChase();
        const registry = createV1Registry();
        for (const owner of level.entitiesInPanelOrder()) {
            for (const trigger of owner.getComponent(TriggerComponent)?.get('triggers') ?? []) {
                expect(triggerProblems(trigger, { owner, level, registry })).toEqual([]);
            }
        }
    });

    test('a Blob that stays put is caught within three seconds', () => {
        const run = runChase(engine, 240, []);

        expect(run.end).toBe('lost');
        expect(run.endTick).toBeLessThan(180);
    });

    test(
        'a clean run reaches home first, with the monster close but never on the Blob',
        () => {
            const run = runChase(engine, TICKS);

            expect(run.end).toBe('won');
            expect(Math.abs(run.blob.x - HOME.x)).toBeLessThan(120);
            expect(run.closest).toBeGreaterThan(600);
            expect(run.closest).toBeLessThan(900);
            expect(run.warnings).toBe(0);
            // It glided through the hollow tree and down to the hollow.
            expect(run.monster.x).toBeGreaterThan(3000);
        },
        LONG,
    );

    test(
        'a clean run started half a second late still wins, by less',
        () => {
            const run = runChase(engine, TICKS, TAKE_OFFS, 30);

            expect(run.end).toBe('won');
            expect(run.closest).toBeLessThan(650);
        },
        LONG,
    );

    test(
        'falling in the stream loses',
        () => {
            const run = runChase(engine, TICKS, TAKE_OFFS.slice(0, 1));

            expect(run.end).toBe('lost');
            expect(run.blob.x).toBeGreaterThan(-5500);
            expect(run.blob.x).toBeLessThan(-5300);
        },
        LONG,
    );
});
