import type { Point } from '../../../../../src/core/geometry/index.ts';

import { glow, gradientPart, part, verticalGradient } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { ellipsePath, smoothClosedPath, turnedEllipsePath } from '../../platformer/art/pathShapes.ts';
import type { OutlinePoint } from '../../platformer/art/pathShapes.ts';

// The Gloom: a big shadow beast that glides after the Blob, facing right, in the same flat, outline-free
// look as the Blob. Drawn round the point on the ground below its middle, y up negative; front parts
// first. A hunched body with a swept-back mane and trailing tendrils, antlers, a long snout whose lower
// jaw swings on a hinge, teeth standing on the jaws' edges, one glowing eye and a long clawed arm. Each
// frame is one step of a loop: the body heaves, the claw reaches, the jaw opens and the tendrils wave.
export const MONSTER_FRAMES = 6;

const BODY_TOP = '#4C3678FF';
const BODY_MIDDLE = '#2C1D4EFF';
const BODY_BOTTOM = '#170E2AFF';
const RIM = '#B4548CFF';
const SHEEN = '#6A51A0FF';
const ARM = '#25183FFF';
const ARM_BACK = '#170F29FF';
const CLAW = '#EFE6DAFF';
const CLAW_SHADE = '#C9BBAEFF';
const HORN = '#8C7BB9FF';
const HORN_SHADE = '#6B5B98FF';
const EYE_TOP = '#FFF0A0FF';
const EYE_BOTTOM = '#FFB23CFF';
const EYE_GLOW = '#FFB347FF';
const PUPIL = '#2A0A14FF';
const MOUTH_EDGE = '#3A0A22FF';
const MOUTH_INSIDE = '#7A1A42FF';
const TONGUE = '#D2557EFF';
const TOOTH = '#F7F1E8FF';
const TOOTH_SHADE = '#D8CCBFFF';
const WISP = '#24163FFF';

type Pose = {
    readonly bob: number;
    // 0 with the claw drawn in, 1 at full reach.
    readonly reach: number;
    // 0 nearly shut, 1 wide open.
    readonly jaw: number;
    readonly wave: number;
};

function poseOf(frame: number): Pose {
    const angle = (frame / MONSTER_FRAMES) * 2 * Math.PI;

    return {
        bob: Math.sin(angle) * 7,
        reach: (1 + Math.sin(angle - 0.6)) / 2,
        jaw: (1 + Math.cos(angle)) / 2,
        wave: angle,
    };
}

function lifted(point: Point, pose: Pose): Point {
    return { x: point.x, y: point.y + pose.bob };
}

// The silhouette, clockwise from the top of the hump: the head pushed forward on a long snout, the
// mouth's upper edge under it, a deep chest, tendrils trailing underneath and a mane swept back.
function bodyOutline(pose: Pose): OutlinePoint[] {
    const sway = (index: number) => Math.sin(pose.wave + index * 1.4) * 12;
    const outline: OutlinePoint[] = [
        { x: -70, y: -462 },
        { x: 30, y: -452 },
        { x: 100, y: -418 },
        { x: 160, y: -400 },
        { x: 214, y: -380 },
        { x: 262, y: -360 },
        { x: 280, y: -336, sharp: true },
        ...UPPER_JAW.slice(1, -1),
        { x: 112, y: -300, sharp: true },
        { x: 118, y: -240 },
        { x: 128, y: -168 },
        { x: 96, y: -108 },
        { x: 36, y: -78 },
        { x: -30 + sway(0), y: -16, sharp: true },
        { x: -70, y: -84 },
        { x: -150 + sway(1), y: -40, sharp: true },
        { x: -156, y: -114 },
        { x: -250 + sway(2), y: -92, sharp: true },
        { x: -200, y: -176 },
        { x: -214, y: -236 },
        { x: -320 + sway(3) * 0.5, y: -272, sharp: true },
        { x: -210, y: -318 },
        { x: -296 + sway(4) * 0.5, y: -390, sharp: true },
        { x: -168, y: -400 },
        { x: -214 + sway(5) * 0.4, y: -478, sharp: true },
        { x: -120, y: -460 },
    ];

    return outline.map((point) => ({ ...point, ...lifted(point, pose) }));
}

// The underside of the snout, nose to hinge: the mouth's upper edge.
const UPPER_JAW: readonly OutlinePoint[] = [
    { x: 280, y: -336 },
    { x: 266, y: -318 },
    { x: 220, y: -312 },
    { x: 170, y: -310 },
    { x: 112, y: -300 },
];
const HINGE: Point = { x: 112, y: -300 };
const JAW_LENGTH = 158;

// A stroke along a line of points, `startWidth` thick at the first and `endWidth` at the last, rounded
// at the root and pointed at the tip.
function taperedStroke(points: readonly Point[], startWidth: number, endWidth: number) {
    const left: OutlinePoint[] = [];
    const right: OutlinePoint[] = [];
    points.forEach((point, index) => {
        const before = points[Math.max(0, index - 1)] ?? point;
        const after = points[Math.min(points.length - 1, index + 1)] ?? point;
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        const length = Math.hypot(dx, dy) || 1;
        const share = index / (points.length - 1);
        const half = (startWidth + (endWidth - startWidth) * share) / 2;
        left.push({ x: point.x - (dy / length) * half, y: point.y + (dx / length) * half });
        right.push({ x: point.x + (dy / length) * half, y: point.y - (dx / length) * half });
    });
    const tip = points.at(-1) ?? { x: 0, y: 0 };

    return smoothClosedPath([...left.slice(0, -1), { ...tip, sharp: true }, ...right.slice(0, -1).reverse()]);
}

// An antler: a beam curving up and back, with two tines rising from it.
function antlerParts(base: Point, size: number, colour: string, pose: Pose): ArtPart[] {
    const at = (x: number, y: number) => lifted({ x: base.x + x * size, y: base.y + y * size }, pose);
    const beam = [at(0, 0), at(-14, -50), at(-46, -96), at(-96, -122), at(-150, -128)];
    const firstTine = [at(-16, -56), at(4, -100), at(2, -146)];
    const secondTine = [at(-60, -104), at(-60, -150), at(-80, -188)];

    return [
        part('Antler', taperedStroke(firstTine, 15 * size, 3), colour),
        part('Antler', taperedStroke(secondTine, 14 * size, 3), colour),
        part('Antler', taperedStroke(beam, 24 * size, 4), colour),
    ];
}
// An almond eye with a flat, slanted lid: angry. The inner corner, towards the other eye, sits lower.
function eyeParts(centre: Point, innerOnLeft: boolean, size: number): ArtPart[] {
    const drop = size * 0.55;
    const leftLid = centre.y - size * 0.62 + (innerOnLeft ? drop : 0);
    const rightLid = centre.y - size * 0.62 + (innerOnLeft ? 0 : drop);
    const eye = smoothClosedPath([
        { x: centre.x - size, y: leftLid + size * 0.2, sharp: true },
        { x: centre.x + size, y: rightLid + size * 0.2, sharp: true },
        { x: centre.x + size * 0.8, y: centre.y + size * 0.35 },
        { x: centre.x, y: centre.y + size * 0.66 },
        { x: centre.x - size * 0.8, y: centre.y + size * 0.35 },
    ]);
    const pupilCentre = { x: centre.x + size * 0.22, y: centre.y + size * 0.12 };

    return [
        part(
            'Glint',
            ellipsePath({ x: pupilCentre.x + size * 0.28, y: pupilCentre.y - size * 0.1 }, 3, 3),
            '#FFFFFFE6',
        ),
        part('Pupil', ellipsePath(pupilCentre, size * 0.15, size * 0.42), PUPIL),
        gradientPart('Eye', eye, EYE_BOTTOM, verticalGradient([EYE_TOP, EYE_BOTTOM])),
        gradientPart('Eye glow', ellipsePath(centre, size * 3, size * 2.4), EYE_GLOW, glow(EYE_GLOW, '70')),
    ];
}

// The lower jaw hangs from the hinge and swings open by `jaw`.
function jawAngle(pose: Pose) {
    return 0.1 + 0.34 * pose.jaw;
}

function turned(point: Point, angle: number): Point {
    const x = point.x - HINGE.x;
    const y = point.y - HINGE.y;

    return {
        x: HINGE.x + x * Math.cos(angle) - y * Math.sin(angle),
        y: HINGE.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
}

// The lower jaw's top edge, hinge to tip, closed: a line along the upper jaw's, swung open by the angle.
function lowerEdge(share: number, angle: number): Point {
    return turned({ x: HINGE.x + JAW_LENGTH * share, y: HINGE.y - 6 * Math.sin(Math.PI * share) }, angle);
}

function upperEdge(share: number): Point {
    const x = HINGE.x + JAW_LENGTH * share;
    // Follow the drawn edge between its points.
    for (let i = UPPER_JAW.length - 1; i > 0; i--) {
        const from = UPPER_JAW[i];
        const to = UPPER_JAW[i - 1];
        if (from === undefined || to === undefined || x > to.x) continue;
        const along = (x - from.x) / (to.x - from.x);

        return { x, y: from.y + (to.y - from.y) * along };
    }

    return { x, y: UPPER_JAW[0]?.y ?? 0 };
}

// A tooth standing on a jaw's edge, its base following the edge, its sides curving in to a point.
function tooth(
    edge: (share: number) => Point,
    share: number,
    halfWidth: number,
    length: number,
    way: 1 | -1,
    lean: number,
): ArtPart[] {
    const left = edge(share - halfWidth);
    const middle = edge(share);
    const right = edge(share + halfWidth);
    const tip = { x: middle.x + lean, y: middle.y + way * length };
    const bulge = (right.x - left.x) * 0.14;
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

// The teeth go in front of the body; the jaw, tongue and the inside of the mouth go behind it, so the
// jaw meets the throat with no seam.
function mouthParts(pose: Pose): { readonly teeth: ArtPart[]; readonly behind: ArtPart[] } {
    const angle = jawAngle(pose);
    const up = (share: number) => lifted(upperEdge(share), pose);
    const down = (share: number) => lifted(lowerEdge(share, angle), pose);
    // The room between the jaws, so the teeth of the two never cross.
    const gap = (share: number) => Math.hypot(down(share).x - up(share).x, down(share).y - up(share).y);
    const upperTeeth: ArtPart[] = [];
    // Shares along the jaw, hinge to nose; the fang is the second from the front.
    const upperShares = [0.36, 0.48, 0.6, 0.72, 0.84, 0.94];
    upperShares.forEach((share, index) => {
        const fang = index === upperShares.length - 2;
        const room = gap(share);
        const length = fang ? Math.max(Math.min(30, room * 0.95), 18) : Math.min(15 + share * 4, room * 0.55);
        upperTeeth.push(...tooth(up, share, fang ? 0.05 : 0.04, length, 1, fang ? -3 : -1));
    });
    const lowerTeeth: ArtPart[] = [];
    for (const share of [0.42, 0.54, 0.66, 0.78, 0.9]) {
        lowerTeeth.push(...tooth(down, share, 0.038, Math.min(13, gap(share) * 0.38), -1, 1));
    }

    const lowerJaw: OutlinePoint[] = [];
    for (let i = 0; i <= 8; i++) {
        lowerJaw.push(down(i / 8));
    }
    const tip = lifted(turned({ x: HINGE.x + JAW_LENGTH + 6, y: HINGE.y + 10 }, angle), pose);
    const chin = lifted(turned({ x: HINGE.x + JAW_LENGTH * 0.55, y: HINGE.y + 34 }, angle), pose);
    const throat = lifted(turned({ x: HINGE.x - 30, y: HINGE.y + 50 }, angle), pose);
    const jaw = smoothClosedPath([
        { ...lowerJaw[0]!, sharp: true },
        ...lowerJaw.slice(1),
        { ...tip, sharp: true },
        chin,
        throat,
    ]);

    const inside: OutlinePoint[] = [];
    for (let i = 0; i <= 8; i++) {
        inside.push(up(i / 8));
    }
    for (let i = 8; i >= 0; i--) {
        inside.push(down(i / 8));
    }

    return {
        teeth: [...upperTeeth, ...lowerTeeth],
        behind: [
            gradientPart('Jaw', jaw, BODY_MIDDLE, verticalGradient([BODY_MIDDLE, BODY_BOTTOM])),
            part('Tongue', turnedEllipsePath(lifted(lowerEdge(0.42, angle), pose), 46, 9, angle), TONGUE),
            gradientPart(
                'Mouth',
                smoothClosedPath(inside.map((point, index) => ({ ...point, sharp: index === 0 || index === 8 }))),
                MOUTH_INSIDE,
                verticalGradient([MOUTH_EDGE, MOUTH_INSIDE]),
            ),
        ],
    };
}

// A long arm from the shoulder to the hand, thinning to the wrist, with a soft bend at the elbow.
function armPath(shoulder: Point, hand: Point, thickness: number) {
    const dx = hand.x - shoulder.x;
    const dy = hand.y - shoulder.y;
    const length = Math.hypot(dx, dy);
    const along = { x: dx / length, y: dy / length };
    const across = { x: -along.y, y: along.x };
    const elbow = { x: shoulder.x + dx * 0.5 - across.x * 16, y: shoulder.y + dy * 0.5 - across.y * 16 };
    const at = (point: Point, side: number, width: number) => ({
        x: point.x + across.x * side * width,
        y: point.y + across.y * side * width,
    });

    return smoothClosedPath([
        at(shoulder, 1, thickness),
        at(elbow, 1, thickness * 0.62),
        at(hand, 1, thickness * 0.55),
        { x: hand.x + along.x * thickness * 0.7, y: hand.y + along.y * thickness * 0.7 },
        at(hand, -1, thickness * 0.55),
        at(elbow, -1, thickness * 0.62),
        at(shoulder, -1, thickness),
    ]);
}

// Three hooked claws from the hand, fanned and curling down, each with a shaded underside.
function clawParts(hand: Point, reach: number, colour: string, shade: string): ArtPart[] {
    const parts: ArtPart[] = [];
    for (const spread of [-1, 0, 1]) {
        const base = { x: hand.x + 8, y: hand.y + spread * 10 };
        const length = 38 - Math.abs(spread) * 7 + reach * 4;
        const tip = { x: base.x + length, y: base.y + 14 + spread * 9 };
        const top = { x: base.x + length * 0.55, y: base.y - 7 + spread * 3 };
        const under = { x: base.x + length * 0.5, y: base.y + 4 + spread * 4 };
        const claw = smoothClosedPath([
            { x: base.x, y: base.y - 6, sharp: true },
            top,
            { ...tip, sharp: true },
            under,
            { x: base.x, y: base.y + 6, sharp: true },
        ]);
        const underside = smoothClosedPath([
            { x: base.x, y: base.y + 1, sharp: true },
            { x: under.x + 2, y: under.y - 3 },
            { ...tip, sharp: true },
            under,
            { x: base.x, y: base.y + 6, sharp: true },
        ]);
        parts.push(part('Claw shade', underside, shade), part('Claw', claw, colour));
    }

    return parts;
}

// Soft smoke left behind as it glides, fading away.
function wispParts(pose: Pose): ArtPart[] {
    const opacities = ['70', '48', '28'];

    return opacities.map((opacity, index) => {
        const centre = {
            x: -230 - index * 70,
            y: -120 - index * 34 + Math.sin(pose.wave + index * 1.2) * 14 + pose.bob,
        };
        const radius = 46 - index * 10;

        return part('Wisp', ellipsePath(centre, radius, radius * 0.72), `${WISP.slice(0, 7)}${opacity}`);
    });
}

export function monsterFrameParts(frame: number): ArtPart[] {
    const pose = poseOf(frame);
    const shoulder = lifted({ x: 70, y: -190 }, pose);
    const hand = lifted({ x: 232 + 64 * pose.reach, y: -150 - 22 * pose.reach }, pose);
    const backShoulder = lifted({ x: -20, y: -200 }, pose);
    const backHand = lifted({ x: 150 - 40 * pose.reach, y: -96 + 12 * pose.reach }, pose);
    const body = bodyOutline(pose);
    const rim = body.map((point) => ({ ...point, x: point.x - 8, y: point.y - 7 }));
    const sheen = turnedEllipsePath(lifted({ x: -70, y: -400 }, pose), 110, 36, -0.12);
    const nostril = turnedEllipsePath(lifted({ x: 262, y: -346 }, pose), 6, 3.5, 0.4);

    const brow = taperedStroke(
        [lifted({ x: 136, y: -396 }, pose), lifted({ x: 176, y: -390 }, pose), lifted({ x: 204, y: -374 }, pose)],
        16,
        4,
    );

    const mouth = mouthParts(pose);

    return [
        ...mouth.teeth,
        part('Nostril', nostril, MOUTH_EDGE),
        part('Brow', brow, BODY_BOTTOM),
        ...eyeParts(lifted({ x: 172, y: -366 }, pose), true, 24),
        gradientPart('Sheen', sheen, SHEEN, glow(SHEEN, 'B0')),
        gradientPart(
            'Body',
            smoothClosedPath(body),
            BODY_MIDDLE,
            verticalGradient([BODY_TOP, BODY_MIDDLE, BODY_BOTTOM], [0, 0.55, 1]),
        ),
        ...mouth.behind,
        // The arm comes out from behind the chest.
        ...clawParts(hand, pose.reach, CLAW, CLAW_SHADE),
        part('Arm', armPath(shoulder, hand, 34), ARM),
        part('Rim light', smoothClosedPath(rim), RIM),
        ...antlerParts({ x: 120, y: -404 }, 1, HORN, pose),
        ...antlerParts({ x: 60, y: -420 }, 0.85, HORN_SHADE, pose),
        ...clawParts(backHand, pose.reach, HORN, HORN_SHADE),
        part('Back arm', armPath(backShoulder, backHand, 26), ARM_BACK),
        ...wispParts(pose),
    ];
}
