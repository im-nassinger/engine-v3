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
import {
    changeVariable,
    giveTags,
    giveTriggers,
    giveVariables,
    otherHasTag,
} from '../determinism/build/triggerParts.ts';

const POST_COLUMNS = 40;
const POST_SIZE = 20;
const POST_SPACING = 50;
const BALL_COLUMNS = 4;
const BALL_RADIUS = 8;
const BALL_COLOUR = '#D9A04AFF';
// The level bounds, with Walls on, a margin around the posts' grid so the balls turn back off the walls.
const MARGIN = 100;
// The speed the level start trigger gives every ball, in px/s, slanted so the balls cross rows as well as columns.
const BALL_VELOCITY = { x: 300, y: 70 };
export const BALL_TAG = 'ball';
export const HITS_VARIABLE = 'hits';

export type CollisionTriggers = {
    readonly level: Level;
    readonly posts: readonly Entity[];
    readonly balls: readonly Entity[];
};

// A level for v4's trigger speed test, the solid twin of buildTouchTriggers: a grid of solid squares on
// the ground (posts), each with a touch trigger that counts a ball touching it on the World's `hits`, and
// Dynamic balls with no gravity, Restitution 1 and no friction, which a level start trigger sets going, so
// they bounce between the posts and off the walls for the whole run and never rest. The balls start where
// four posts' corners meet, clear of every post, BALL_COLUMNS to a row; the posts have no style, so play
// draws only the balls.
export function buildCollisionTriggers(postCount: number, ballCount: number): CollisionTriggers {
    for (const count of [postCount, ballCount]) {
        if (!Number.isInteger(count) || count < 0) {
            throw new Error(`A level of collision triggers holds whole numbers of posts and balls, not ${count}.`);
        }
    }

    const level = Level.createNew();
    const columns = Math.min(POST_COLUMNS, Math.max(1, postCount));
    const rows = Math.max(1, Math.ceil(postCount / columns), Math.ceil(ballCount / BALL_COLUMNS));
    const width = columns * POST_SPACING;
    const height = rows * POST_SPACING;
    setBounds(level, width + 2 * MARGIN, height + 2 * MARGIN, true);
    setGravity(level, { x: 0, y: 0 });
    giveVariables(level, [HITS_VARIABLE]);

    const posts: Entity[] = [];
    for (let index = 0; index < postCount; index += 1) {
        const x = ((index % columns) + 0.5) * POST_SPACING - width / 2;
        const y = (Math.floor(index / columns) + 0.5) * POST_SPACING - height / 2;
        const post = addEntity(level, level.world, `Post ${index + 1}`, at(x, y));
        addSurface(post, rectangle(POST_SIZE, POST_SIZE));
        giveTriggers(post, [
            {
                when: { kind: 'touched' },
                checks: [otherHasTag(BALL_TAG)],
                actions: [changeVariable(level, HITS_VARIABLE, 'add', 1)],
            },
        ]);
        posts.push(post);
    }

    const balls: Entity[] = [];
    for (let index = 0; index < ballCount; index += 1) {
        // A grid line between two columns of posts, and one between two rows.
        const line = Math.round((((index % BALL_COLUMNS) + 0.5) * columns) / BALL_COLUMNS);
        const x = line * POST_SPACING - width / 2;
        const y = Math.floor(index / BALL_COLUMNS) * POST_SPACING - height / 2;
        const ball = addEntity(level, level.world, `Ball ${index + 1}`, at(x, y));
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
                {
                    kind: 'change',
                    target: { kind: 'tagged', tag: BALL_TAG },
                    value: { kind: 'velocity' },
                    op: 'add',
                    amount: BALL_VELOCITY,
                },
            ],
        },
    ]);

    return { level, posts, balls };
}
