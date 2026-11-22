import { StyleComponent } from '../../../src/core/components/index.ts';
import { Level } from '../../../src/core/level/index.ts';
import type { Entity } from '../../../src/core/level/index.ts';
import {
    addBody,
    addEntity,
    addSurface,
    at,
    circle,
    rectangle,
    setBounds,
    setGravity,
} from '../determinism/build/levelParts.ts';
import { changeVariable, giveTags, giveTriggers, giveVariables } from '../determinism/build/triggerParts.ts';

const SENSOR_COLUMNS = 40;
const SENSOR_SIZE = 30;
const SENSOR_SPACING = 50;
const BALLS_PER_ROW = 4;
const BALL_RADIUS = 8;
const BALL_COLOUR = '#D9A04AFF';
// The level bounds, with Walls on, a margin around the sensors' grid so the balls turn back off the walls.
const MARGIN = 100;
// The speed the level start trigger gives every ball, in px/s, slanted so the balls cross rows as well as columns.
const BALL_VELOCITY = { x: 300, y: 70 };
export const BALL_TAG = 'ball';
export const TOUCHES_VARIABLE = 'touches';

export type TouchTriggers = {
    readonly level: Level;
    readonly sensors: readonly Entity[];
    readonly balls: readonly Entity[];
};

// A level for v3's trigger speed test: a grid of Static sensor squares, each with a touch trigger that counts
// a ball touching it on the World's `touches`, and Dynamic balls with no gravity that a level start trigger
// sets going, drawn with a fill (the sensors have no style, so play draws only the balls), bouncing off the walls with Restitution 1 and no friction, so they sweep through the sensors
// for the whole run and never rest. The balls start on the sensors' rows, BALLS_PER_ROW to a row.
export function buildTouchTriggers(sensorCount: number, ballCount: number): TouchTriggers {
    for (const count of [sensorCount, ballCount]) {
        if (!Number.isInteger(count) || count < 0) {
            throw new Error(`A level of touch triggers holds whole numbers of sensors and balls, not ${count}.`);
        }
    }

    const level = Level.createNew();
    const columns = Math.min(SENSOR_COLUMNS, Math.max(1, sensorCount));
    const rows = Math.max(1, Math.ceil(sensorCount / columns), Math.ceil(ballCount / BALLS_PER_ROW));
    const width = columns * SENSOR_SPACING;
    const height = rows * SENSOR_SPACING;
    setBounds(level, width + 2 * MARGIN, height + 2 * MARGIN, true);
    setGravity(level, { x: 0, y: 0 });
    giveVariables(level, [TOUCHES_VARIABLE]);

    const cellX = (column: number) => (column + 0.5) * SENSOR_SPACING - width / 2;
    const cellY = (row: number) => (row + 0.5) * SENSOR_SPACING - height / 2;

    const sensors: Entity[] = [];
    for (let index = 0; index < sensorCount; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const sensor = addEntity(level, level.world, `Sensor ${index + 1}`, at(cellX(column), cellY(row)));
        addSurface(sensor, rectangle(SENSOR_SIZE, SENSOR_SIZE), { sensor: true });
        giveTriggers(sensor, [
            {
                when: { kind: 'touched' },
                checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: BALL_TAG }],
                actions: [changeVariable(level, TOUCHES_VARIABLE, 'add', 1)],
            },
        ]);
        sensors.push(sensor);
    }

    const balls: Entity[] = [];
    const ballSpacing = width / BALLS_PER_ROW;
    for (let index = 0; index < ballCount; index += 1) {
        const x = ((index % BALLS_PER_ROW) + 0.5) * ballSpacing - width / 2;
        const ball = addEntity(
            level,
            level.world,
            `Ball ${index + 1}`,
            at(x, cellY(Math.floor(index / BALLS_PER_ROW))),
        );
        addBody(addSurface(ball, circle(BALL_RADIUS), { restitution: 1, friction: 0 }));
        ball.addComponent(
            new StyleComponent({ ...StyleComponent.schema.defaults(), fill: { kind: 'solid', colour: BALL_COLOUR } }),
        );
        giveTags(ball, [BALL_TAG]);
        balls.push(ball);
    }

    giveTriggers(level.world, [
        {
            when: { kind: 'levelStart' },
            actions: [
                { kind: 'push', target: { kind: 'tagged', tag: BALL_TAG }, push: { kind: 'by', ...BALL_VELOCITY } },
            ],
        },
    ]);

    return { level, sensors, balls };
}
