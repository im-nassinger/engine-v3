import { describe, expect, test } from 'vitest';

import { entityWithoutSensor, removeSensorSetting } from './removeSensorSetting.ts';

const SOLID = { density: 1, friction: 0.3, restitution: 0, sensor: false };
const SENSOR = { ...SOLID, sensor: true };
const SHAPE = { geometry: { kind: 'rectangle', width: 20, height: 20 } };

function entity(id: number, components: Record<string, unknown>, children: unknown[] = []) {
    return { id, hidden: false, locked: false, components, children };
}

describe('removeSensorSetting', () => {
    test('a Surface with Sensor ticked is removed, and Sensor unticked is dropped, all the way down', () => {
        const coin = entity(3, { ShapeComponent: SHAPE, SurfaceComponent: SENSOR });
        const floor = entity(4, { ShapeComponent: SHAPE, SurfaceComponent: SOLID });
        const group = entity(2, {}, [coin, floor]);
        const level = { formatVersion: 1, world: entity(1, {}, [group]) };

        const upgraded = removeSensorSetting(level);

        const solidWithout = { density: 1, friction: 0.3, restitution: 0 };
        expect(upgraded).toEqual({
            formatVersion: 1,
            world: entity(1, {}, [
                entity(2, {}, [
                    entity(3, { ShapeComponent: SHAPE }),
                    entity(4, { ShapeComponent: SHAPE, SurfaceComponent: solidWithout }),
                ]),
            ]),
        });
        expect(coin.components.SurfaceComponent).toBe(SENSOR);
    });

    test('leaves damaged data as it is, for the reader to refuse', () => {
        expect(removeSensorSetting('level')).toBe('level');
        expect(entityWithoutSensor(7)).toBe(7);
        expect(entityWithoutSensor({ components: 'none', children: 'none' })).toEqual({
            components: 'none',
            children: 'none',
        });
    });

    test('walks a file nested 50,000 deep without running out of stack', () => {
        let nested: unknown = entity(50_000, { SurfaceComponent: SENSOR });
        for (let id = 49_999; id >= 1; id--) {
            nested = entity(id, {}, [nested]);
        }

        expect(() => entityWithoutSensor(nested)).not.toThrow();
    });
});
