import type { Point } from '../../../../../src/core/geometry/index.ts';

import { glow, gradientPart, part, verticalGradient } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { ellipsePath, smoothClosedPath } from '../../platformer/art/pathShapes.ts';
import type { OutlinePoint } from '../../platformer/art/pathShapes.ts';

// The Gloom: a huge shadow wolf galloping after the Blob, facing right, in the same flat, outline-free
// look as the Blob. Head low and snarling, hackles up, eyes burning, smoke streaming from its tail and
// paws. Drawn round the point on the ground below its middle, y up negative; front parts first. Each
// frame is one step of a gallop: the legs reach and gather, the body rocks, the jaws snap.
export const MONSTER_FRAMES = 6;

const FUR_TOP = '#3E2C62FF';
const FUR_MIDDLE = '#251840FF';
const FUR_BOTTOM = '#120A21FF';
const FAR_LEG = '#0E0819FF';
const FAR_EAR_COLOUR = '#1C1234FF';
const RIM = '#C2578EFF';
const SNARL = '#0C0716FF';
const EYE_TOP = '#FFF6B0FF';
const EYE_BOTTOM = '#FFB02EFF';
const EYE_GLOW = '#FF7A3AFF';
const PUPIL = '#1A0508FF';
const GUM = '#5A0F2CFF';
const MOUTH = '#8E1C44FF';
const TONGUE = '#D2557EFF';
const TOOTH = '#F7F1E8FF';
const TOOTH_SHADE = '#D5C8BBFF';
const SMOKE = '#1C1033FF';

type Pose = {
    readonly frame: number;
    readonly phase: number;
    // The body rising and falling with the stride, in pixels.
    readonly bob: number;
    // The body's tilt, nose down positive, in radians.
    readonly pitch: number;
    // 0 nearly shut, 1 wide open.
    readonly jaw: number;
};

function poseOf(frame: number): Pose {
    const phase = (frame / MONSTER_FRAMES) * 2 * Math.PI;

    return {
        frame,
        phase,
        // Highest in the stretch, lowest when gathered.
        bob: [-16, -6, 4, 8, 0, -10][frame] ?? 0,
        pitch: [-0.03, 0.03, 0.06, 0.02, -0.04, -0.06][frame] ?? 0,
        jaw: (1 + Math.cos(phase * 2)) / 2,
    };
}

// The body's pose moves every point of the body: tilted round the middle of the back, then lifted.
const BODY_PIVOT: Point = { x: -20, y: -240 };

function posed(point: Point, pose: Pose): Point {
    const x = point.x - BODY_PIVOT.x;
    const y = point.y - BODY_PIVOT.y;
    const cos = Math.cos(pose.pitch);
    const sin = Math.sin(pose.pitch);

    return { x: BODY_PIVOT.x + x * cos - y * sin, y: BODY_PIVOT.y + x * sin + y * cos + pose.bob };
}

function posedOutline(outline: readonly OutlinePoint[], pose: Pose): OutlinePoint[] {
    return outline.map((point) => ({ ...point, ...posed(point, pose) }));
}

// The two edges of a limb along a line of joints, each joint with its own width.
function limbEdges(joints: readonly Point[], widths: readonly number[]) {
    const left: OutlinePoint[] = [];
    const right: OutlinePoint[] = [];
    joints.forEach((point, index) => {
        const before = joints[Math.max(0, index - 1)] ?? point;
        const after = joints[Math.min(joints.length - 1, index + 1)] ?? point;
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        const length = Math.hypot(dx, dy) || 1;
        const half = (widths[index] ?? 10) / 2;
        left.push({ x: point.x - (dy / length) * half, y: point.y + (dx / length) * half });
        right.push({ x: point.x + (dy / length) * half, y: point.y - (dx / length) * half });
    });

    return { left, right };
}

// A limb with a rounded end.
function limbPath(joints: readonly Point[], widths: readonly number[]) {
    const { left, right } = limbEdges(joints, widths);

    return smoothClosedPath([...left, ...right.reverse()]);
}

// A stroke tapering to a point, for brows and wrinkles.
function taperedStroke(points: readonly Point[], startWidth: number, endWidth: number) {
    const widths = points.map((_, index) => startWidth + ((endWidth - startWidth) * index) / (points.length - 1));
    const { left, right } = limbEdges(points, widths);
    const tip = points.at(-1) ?? { x: 0, y: 0 };

    return smoothClosedPath([...left.slice(0, -1), { ...tip, sharp: true }, ...right.slice(0, -1).reverse()]);
}

// The mouth's upper edge, from the hinge under the eye to the nose.
const HINGE: Point = { x: 214, y: -238 };
const UPPER_JAW: readonly Point[] = [
    { x: 214, y: -238 },
    { x: 260, y: -244 },
    { x: 300, y: -250 },
    { x: 332, y: -258 },
];
const JAW_LENGTH = 118;

// Points along a line with fur tufts sticking out to its left (outwards for a clockwise outline).
function furAlong(from: Point, to: Point, tufts: number, depth: number): OutlinePoint[] {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const out = { x: dy / length, y: -dx / length };
    const points: OutlinePoint[] = [];
    for (let i = 0; i < tufts; i++) {
        const tip = (i + 0.6) / tufts;
        const valley = (i + 1) / tufts;
        const reach = depth * (0.7 + 0.3 * Math.sin(i * 2.1));
        points.push({
            x: from.x + dx * tip + out.x * reach - dx * 0.06,
            y: from.y + dy * tip + out.y * reach,
            sharp: true,
        });
        if (i < tufts - 1) {
            points.push({ x: from.x + dx * valley, y: from.y + dy * valley });
        }
    }

    return points;
}

// The wolf's silhouette, clockwise from the nose: snout, brow, a tall ear, a shaggy ruff down the neck,
// the back, the rump, the tucked belly, a deep shaggy chest, the throat and the underside of the snout.
const BODY: readonly OutlinePoint[] = [
    { x: 340, y: -262, sharp: true },
    { x: 322, y: -276 },
    { x: 282, y: -288 },
    { x: 252, y: -304 },
    { x: 236, y: -320, sharp: true },
    { x: 214, y: -404, sharp: true },
    { x: 192, y: -334 },
    ...furAlong({ x: 186, y: -334 }, { x: 64, y: -350 }, 6, 22),
    { x: 30, y: -338 },
    { x: -60, y: -316 },
    { x: -150, y: -312 },
    { x: -222, y: -300 },
    { x: -262, y: -268 },
    { x: -270, y: -222 },
    { x: -250, y: -186 },
    { x: -170, y: -196 },
    { x: -90, y: -184 },
    { x: -10, y: -168 },
    ...furAlong({ x: 30, y: -160 }, { x: 170, y: -182 }, 5, 26),
    { x: 196, y: -214 },
    ...UPPER_JAW.map((point, index) => ({ ...point, sharp: index === 0 })),
];

// The ear on the far side, darker, behind the head.
const FAR_EAR: readonly OutlinePoint[] = [
    { x: 196, y: -330, sharp: true },
    { x: 186, y: -398, sharp: true },
    { x: 160, y: -336, sharp: true },
];

// The middle joint of two bones from `start` to `end`, bent to the side `bend` picks (1 forwards).
function bentJoint(start: Point, end: Point, first: number, second: number, bend: 1 | -1): Point {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const reach = Math.min(Math.hypot(dx, dy), first + second - 0.5);
    const along = Math.max(-1, Math.min(1, (first * first + reach * reach - second * second) / (2 * first * reach)));
    const base = Math.atan2(dy, dx);
    const angle = base - bend * Math.acos(along);

    return { x: start.x + Math.cos(angle) * first, y: start.y + Math.sin(angle) * first };
}

// Where each paw is in each frame of the gallop: x from the hip, and how high it is lifted.
type Stride = readonly (readonly [number, number])[];

const FRONT_STRIDE: Stride = [
    [150, 60],
    [90, 0],
    [10, 0],
    [-70, 0],
    [-120, 70],
    [40, 90],
];
const HIND_STRIDE: Stride = [
    [-170, 50],
    [-70, 90],
    [50, 50],
    [90, 0],
    [10, 0],
    [-80, 0],
];

function strideAt(stride: Stride, frame: number) {
    return stride[(frame + MONSTER_FRAMES) % MONSTER_FRAMES] ?? [0, 0];
}

const FRONT_HIP: Point = { x: 120, y: -214 };
const HIND_HIP: Point = { x: -196, y: -230 };

// A front leg: shoulder, elbow bent back, wrist, and the paw reaching forward.
function frontLegParts(pose: Pose, frame: number, colour: string): ArtPart[] {
    const hip = posed(FRONT_HIP, pose);
    const [x, lift] = strideAt(FRONT_STRIDE, frame);
    const paw = { x: FRONT_HIP.x + x, y: -12 - lift };
    const wrist = { x: paw.x - 8, y: paw.y - 18 };
    const elbow = bentJoint(hip, wrist, 100, 102, -1);
    const folded = lift > 0 ? 0.6 : 0;
    const toe = { x: paw.x + 24 - folded * 16, y: paw.y + 6 + folded * 8 };

    return [
        part('Paw', ellipsePath({ x: (paw.x + toe.x) / 2, y: (paw.y + toe.y) / 2 + 2 }, 20, 10), colour),
        part('Leg', limbPath([hip, elbow, wrist, paw], [64, 34, 22, 22]), colour),
    ];
}

// A hind leg: a big thigh, the knee bent forward, the hock bent back, and a long foot.
function hindLegParts(pose: Pose, frame: number, colour: string): ArtPart[] {
    const hip = posed(HIND_HIP, pose);
    const [x, lift] = strideAt(HIND_STRIDE, frame);
    const paw = { x: HIND_HIP.x + x, y: -12 - lift };
    const hock = { x: paw.x - 26, y: paw.y - 58 };
    const knee = bentJoint(hip, hock, 92, 92, 1);
    const toe = { x: paw.x + 24, y: paw.y + 6 };

    return [
        part('Paw', ellipsePath({ x: (paw.x + toe.x) / 2, y: (paw.y + toe.y) / 2 + 2 }, 20, 10), colour),
        part('Leg', limbPath([hip, knee, hock, paw], [96, 40, 22, 22]), colour),
    ];
}

// The tail streams back, bushy and shaggy, rising and falling with the stride, and frays into smoke.
function tailParts(pose: Pose): ArtPart[] {
    const wave = Math.sin(pose.phase) * 16;
    const root = posed({ x: -252, y: -286 }, pose);
    // A plume: it swells from the root, then narrows to a point, with a few tufts towards the tip.
    const at = (along: number, across: number) => ({
        x: root.x - 250 * along,
        y: root.y - 30 * along + wave * along + across,
    });
    const outline: OutlinePoint[] = [
        { ...at(-0.04, -22) },
        at(0.25, -44),
        at(0.5, -46),
        { ...at(0.62, -52), sharp: true },
        at(0.66, -38),
        { ...at(0.8, -40), sharp: true },
        at(0.84, -24),
        { ...at(1, -4), sharp: true },
        at(0.86, 14),
        { ...at(0.82, 32), sharp: true },
        at(0.68, 26),
        { ...at(0.6, 40), sharp: true },
        at(0.48, 30),
        at(0.25, 26),
        at(-0.04, 18),
    ];
    const tip = at(1, -4);
    const smoke = [0, 1, 2].map((index) =>
        part(
            'Smoke',
            ellipsePath({ x: tip.x - 20 - index * 46, y: tip.y + index * 8 }, 30 - index * 7, 18 - index * 4),
            `${SMOKE.slice(0, 7)}${['80', '50', '28'][index]}`,
        ),
    );

    return [
        gradientPart('Tail', smoothClosedPath(outline), FUR_MIDDLE, verticalGradient([FUR_TOP, FUR_BOTTOM])),
        ...smoke,
    ];
}

function eyeParts(centre: Point): ArtPart[] {
    const size = 23;
    const eye = smoothClosedPath([
        { x: centre.x - size, y: centre.y - size * 0.05, sharp: true },
        { x: centre.x + size * 0.9, y: centre.y - size * 0.55, sharp: true },
        { x: centre.x + size * 0.6, y: centre.y + size * 0.2 },
        { x: centre.x - size * 0.2, y: centre.y + size * 0.45 },
    ]);

    return [
        part('Glint', ellipsePath({ x: centre.x + 7, y: centre.y - 6 }, 2.6, 2.6), '#FFFFFFE6'),
        part('Pupil', ellipsePath({ x: centre.x + 3, y: centre.y - 2 }, 3.4, 8), PUPIL),
        gradientPart('Eye', eye, EYE_BOTTOM, verticalGradient([EYE_TOP, EYE_BOTTOM])),
        gradientPart('Eye glow', ellipsePath(centre, 70, 52), EYE_GLOW, glow(EYE_GLOW, '88')),
    ];
}

function turned(point: Point, angle: number): Point {
    const x = point.x - HINGE.x;
    const y = point.y - HINGE.y;

    return {
        x: HINGE.x + x * Math.cos(angle) - y * Math.sin(angle),
        y: HINGE.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
}

function upperEdge(share: number): Point {
    const x = HINGE.x + (UPPER_JAW.at(-1)!.x - HINGE.x) * share;
    for (let i = 1; i < UPPER_JAW.length; i++) {
        const from = UPPER_JAW[i - 1]!;
        const to = UPPER_JAW[i]!;
        if (x > to.x) continue;

        return { x, y: from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x) };
    }

    return UPPER_JAW.at(-1)!;
}

// The lower jaw's top edge, hinge to chin, swung open by the angle.
function lowerEdge(share: number, angle: number): Point {
    return turned({ x: HINGE.x + JAW_LENGTH * share, y: HINGE.y + 2 }, angle);
}

// A tooth standing on an edge: its base follows the edge, its sides curve in to a point.
function tooth(
    edge: (share: number) => Point,
    share: number,
    halfWidth: number,
    length: number,
    way: 1 | -1,
): ArtPart[] {
    const left = edge(share - halfWidth);
    const middle = edge(share);
    const right = edge(share + halfWidth);
    const tip = { x: middle.x - way * 2, y: middle.y + way * length };
    const bulge = (right.x - left.x) * 0.16;
    const side = (from: Point, outwards: number) => ({
        x: (from.x + tip.x) / 2 + outwards * bulge,
        y: (from.y + tip.y) / 2,
    });
    const shape = smoothClosedPath([
        { ...left, sharp: true },
        middle,
        { ...right, sharp: true },
        side(right, 1),
        { ...tip, sharp: true },
        side(left, -1),
    ]);
    const shade = smoothClosedPath([
        { ...middle, sharp: true },
        { ...right, sharp: true },
        side(right, 1),
        { ...tip, sharp: true },
    ]);

    return [part('Tooth shade', shade, TOOTH_SHADE), part('Tooth', shape, TOOTH)];
}

// The snarl: the jaws, the teeth (long fangs at the front), the tongue, and the mouth behind them.
function mouthParts(pose: Pose): { readonly front: ArtPart[]; readonly behind: ArtPart[] } {
    const angle = 0.16 + 0.34 * pose.jaw;
    const up = (share: number) => posed(upperEdge(share), pose);
    const down = (share: number) => posed(lowerEdge(share, angle), pose);
    const gap = (share: number) => Math.hypot(down(share).x - up(share).x, down(share).y - up(share).y);

    const teeth: ArtPart[] = [];
    for (const share of [0.3, 0.42, 0.54, 0.66]) {
        teeth.push(...tooth(up, share, 0.045, Math.min(14, gap(share) * 0.45), 1));
    }
    teeth.push(...tooth(up, 0.84, 0.065, Math.max(26, Math.min(40, gap(0.84) * 0.9)), 1));
    for (const share of [0.36, 0.5, 0.64]) {
        teeth.push(...tooth(down, share, 0.05, Math.min(12, gap(share) * 0.35), -1));
    }
    teeth.push(...tooth(down, 0.86, 0.07, Math.max(20, Math.min(30, gap(0.86) * 0.7)), -1));

    const chin = posed(turned({ x: HINGE.x + JAW_LENGTH + 2, y: HINGE.y + 16 }, angle), pose);
    const underJaw = posed(turned({ x: HINGE.x + JAW_LENGTH * 0.5, y: HINGE.y + 30 }, angle), pose);
    const throat = posed({ x: HINGE.x - 30, y: HINGE.y + 40 }, pose);
    const edge: OutlinePoint[] = [];
    for (let i = 0; i <= 6; i++) {
        edge.push(down(i / 6));
    }
    const jaw = smoothClosedPath([
        { ...edge[0]!, sharp: true },
        ...edge.slice(1),
        { ...chin, sharp: true },
        underJaw,
        throat,
    ]);

    const inside: OutlinePoint[] = [];
    for (let i = 0; i <= 6; i++) {
        inside.push({ ...up(i / 6), sharp: i === 0 || i === 6 });
    }
    for (let i = 6; i >= 0; i--) {
        inside.push(down(i / 6));
    }
    const tongueBase = down(0.45);

    return {
        front: teeth,
        behind: [
            gradientPart('Jaw', jaw, FUR_MIDDLE, verticalGradient([FUR_MIDDLE, FUR_BOTTOM])),
            part('Tongue', ellipsePath({ x: tongueBase.x, y: tongueBase.y - 5 }, 40, 9), TONGUE),
            gradientPart('Mouth', smoothClosedPath(inside), MOUTH, verticalGradient([GUM, MOUTH])),
        ],
    };
}

// Wrinkles along the snout and a heavy brow: the snarl.
function snarlParts(pose: Pose): ArtPart[] {
    const line = (points: Point[], width: number) =>
        taperedStroke(
            points.map((point) => posed(point, pose)),
            width,
            2,
        );

    return [
        part(
            'Brow',
            line(
                [
                    { x: 206, y: -318 },
                    { x: 236, y: -312 },
                    { x: 262, y: -296 },
                ],
                15,
            ),
            SNARL,
        ),
        part(
            'Wrinkle',
            line(
                [
                    { x: 272, y: -286 },
                    { x: 284, y: -278 },
                    { x: 290, y: -266 },
                ],
                6,
            ),
            SNARL,
        ),
        part(
            'Wrinkle',
            line(
                [
                    { x: 290, y: -288 },
                    { x: 302, y: -280 },
                    { x: 306, y: -268 },
                ],
                5,
            ),
            SNARL,
        ),
        part('Nose', ellipsePath(posed({ x: 334, y: -266 }, pose), 12, 9), SNARL),
    ];
}

// Smoke kicked up where the paws strike.
function pawSmoke(pose: Pose): ArtPart[] {
    return [0, 1].map((index) => {
        const x = -170 - index * 130 - Math.sin(pose.phase + index) * 24;
        const opacity = index === 0 ? '60' : '38';

        return part(
            'Smoke',
            ellipsePath({ x, y: -16 - index * 6 }, 52 - index * 12, 18 - index * 3),
            `${SMOKE.slice(0, 7)}${opacity}`,
        );
    });
}

export function monsterFrameParts(frame: number): ArtPart[] {
    const pose = poseOf(frame);
    const mouth = mouthParts(pose);
    const body = posedOutline(BODY, pose);
    const rim = body.map((point) => ({ ...point, x: point.x - 7, y: point.y - 7 }));
    // The legs on the far side are a frame behind.
    const far = frame - 1;

    return [
        ...mouth.front,
        ...snarlParts(pose),
        ...eyeParts(posed({ x: 248, y: -298 }, pose)),
        ...frontLegParts(pose, frame, FUR_MIDDLE),
        ...hindLegParts(pose, frame, FUR_MIDDLE),
        gradientPart(
            'Body',
            smoothClosedPath(body),
            FUR_MIDDLE,
            verticalGradient([FUR_TOP, FUR_MIDDLE, FUR_BOTTOM], [0, 0.5, 1]),
        ),
        ...mouth.behind,
        part('Rim light', smoothClosedPath(rim), RIM),
        part('Far ear', smoothClosedPath(posedOutline(FAR_EAR, pose)), FAR_EAR_COLOUR),
        ...tailParts(pose),
        ...frontLegParts(pose, far, FAR_LEG),
        ...hindLegParts(pose, far, FAR_LEG),
        ...pawSmoke(pose),
    ];
}
