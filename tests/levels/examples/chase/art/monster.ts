import type { Point } from '../../../../../src/core/geometry/index.ts';

import { glow, gradientPart, part, verticalGradient } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { ellipsePath, sharpPath, smoothClosedPath } from '../../platformer/art/pathShapes.ts';
import type { OutlinePoint } from '../../platformer/art/pathShapes.ts';

// The Gloom: a shaggy shadow beast that glides after the Blob, facing right. Drawn round the point on the
// ground below its middle, y up negative; front parts first. Each frame is one step of a loop: the body
// heaves, the claw reaches, the jaw snaps and the smoke trails wave.
export const MONSTER_FRAMES = 6;

const BODY_TOP = '#46316FFF';
const BODY_MIDDLE = '#2A1C4AFF';
const BODY_BOTTOM = '#140C26FF';
const RIM = '#9A4F8AFF';
const LIMB = '#22163CFF';
const LIMB_BACK = '#140C24FF';
const CLAW = '#E9E1F2FF';
const HORN = '#7D6FA6FF';
const EYE = '#FFD54AFF';
const EYE_GLOW = '#FFB347FF';
const PUPIL = '#3A0E10FF';
const MOUTH = '#5E1033FF';
const TONGUE = '#B23A5EFF';
const TOOTH = '#F4EEE6FF';
const SMOKE = '#1E1236FF';

type Pose = {
    readonly bob: number;
    // 0 with the claw drawn in, 1 at full reach.
    readonly reach: number;
    // 0 shut, 1 wide open.
    readonly jaw: number;
    readonly wave: number;
};

function poseOf(frame: number): Pose {
    const angle = (frame / MONSTER_FRAMES) * 2 * Math.PI;

    return {
        bob: Math.sin(angle) * 8,
        reach: (1 + Math.sin(angle - 0.6)) / 2,
        jaw: 0.35 + 0.65 * ((1 + Math.cos(angle)) / 2),
        wave: angle,
    };
}

// The body: round in front, spiky along its back and frayed into wisps underneath.
function bodyOutline(pose: Pose): OutlinePoint[] {
    const centre = { x: -10, y: -250 + pose.bob };
    const count = 44;
    const outline: OutlinePoint[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI;
        const onBack = angle > Math.PI * 0.95 && angle < Math.PI * 1.7;
        const below = angle > Math.PI * 0.2 && angle < Math.PI * 0.85;
        const tip = i % 2 === 0;
        let reach = 1;
        let sway = 0;
        if (onBack && tip) {
            reach = 1.2;
        }
        if (below && tip) {
            reach = 1.28;
            sway = Math.sin(pose.wave + i) * 14 - 10;
        }
        // A hunched brow over the face.
        if (angle > Math.PI * 1.7 && angle < Math.PI * 1.9) {
            reach = 1.06;
        }
        outline.push({
            x: centre.x + Math.cos(angle) * 165 * reach + sway,
            y: centre.y + Math.sin(angle) * 215 * reach,
            sharp: (onBack || below) && tip,
        });
    }

    return outline;
}

function eyeParts(centre: Point, innerOnLeft: boolean): ArtPart[] {
    const innerDrop = 11;
    const leftTop = centre.y - 12 + (innerOnLeft ? innerDrop : 0);
    const rightTop = centre.y - 12 + (innerOnLeft ? 0 : innerDrop);
    const eye = smoothClosedPath([
        { x: centre.x - 19, y: leftTop, sharp: true },
        { x: centre.x + 19, y: rightTop, sharp: true },
        { x: centre.x + 17, y: centre.y + 3 },
        { x: centre.x, y: centre.y + 13 },
        { x: centre.x - 17, y: centre.y + 3 },
    ]);
    const glowPath = ellipsePath(centre, 58, 46);

    return [
        part('Pupil', ellipsePath({ x: centre.x + 4, y: centre.y + 2 }, 3.2, 8.5), PUPIL),
        part('Eye', eye, EYE),
        gradientPart('Eye glow', glowPath, EYE_GLOW, glow(EYE_GLOW, '80')),
    ];
}

// A row of triangular teeth along the edge of the mouth, pointing in.
function teeth(centre: Point, radiusX: number, radiusY: number, upper: boolean): ArtPart[] {
    const parts: ArtPart[] = [];
    const count = upper ? 6 : 5;
    for (let i = 0; i < count; i++) {
        const share = (i + 0.5) / count;
        const x = centre.x - radiusX * 0.8 + share * radiusX * 1.6;
        const edge = radiusY * Math.sqrt(Math.max(0, 1 - ((x - centre.x) / radiusX) ** 2));
        const y = upper ? centre.y - edge : centre.y + edge;
        const length = Math.min(edge * 0.9, upper ? 20 : 15);
        const tipY = upper ? y + length : y - length;
        const halfWidth = 7;
        parts.push(
            part(
                'Tooth',
                sharpPath([
                    { x: x - halfWidth, y: y + (upper ? -4 : 4) },
                    { x: x + halfWidth, y: y + (upper ? -4 : 4) },
                    { x, y: tipY },
                ]),
                TOOTH,
            ),
        );
    }

    return parts;
}

function mouthParts(pose: Pose): ArtPart[] {
    const centre = { x: 92, y: -206 + pose.bob };
    const radiusX = 64;
    const radiusY = 10 + 30 * pose.jaw;

    return [
        ...teeth(centre, radiusX, radiusY, true),
        ...teeth(centre, radiusX, radiusY, false),
        part('Tongue', ellipsePath({ x: centre.x - 8, y: centre.y + radiusY * 0.55 }, 30, radiusY * 0.35), TONGUE),
        part('Mouth', ellipsePath(centre, radiusX, radiusY), MOUTH),
    ];
}

// A tapering limb from the shoulder to the hand, bent up at the elbow.
function limbPath(shoulder: Point, hand: Point, thickness: number) {
    const dx = hand.x - shoulder.x;
    const dy = hand.y - shoulder.y;
    const length = Math.hypot(dx, dy);
    const along = { x: dx / length, y: dy / length };
    const across = { x: -along.y, y: along.x };
    const elbow = { x: shoulder.x + dx * 0.5 - across.x * 18, y: shoulder.y + dy * 0.5 - across.y * 18 };
    const at = (point: Point, side: number, width: number) => ({
        x: point.x + across.x * side * width,
        y: point.y + across.y * side * width,
    });

    return smoothClosedPath([
        at(shoulder, 1, thickness),
        at(elbow, 1, thickness * 0.7),
        at(hand, 1, thickness * 0.5),
        { x: hand.x + along.x * thickness * 0.6, y: hand.y + along.y * thickness * 0.6 },
        at(hand, -1, thickness * 0.5),
        at(elbow, -1, thickness * 0.7),
        at(shoulder, -1, thickness),
    ]);
}

// Three hooked claws from the hand, curling down.
function clawParts(hand: Point, colour: string): ArtPart[] {
    return [-1, 0, 1].map((spread) => {
        const base = { x: hand.x + 6, y: hand.y + spread * 11 };
        const tip = { x: base.x + 40 - Math.abs(spread) * 8, y: base.y + 16 + spread * 6 };

        return part(
            'Claw',
            smoothClosedPath([
                { x: base.x, y: base.y - 6, sharp: true },
                { x: (base.x + tip.x) / 2 + 2, y: base.y - 6 },
                { x: tip.x, y: tip.y, sharp: true },
                { x: (base.x + tip.x) / 2 - 4, y: base.y + 5 },
                { x: base.x, y: base.y + 6, sharp: true },
            ]),
            colour,
        );
    });
}

function hornPath(base: Point, lean: number) {
    return smoothClosedPath([
        { x: base.x - 16, y: base.y, sharp: true },
        { x: base.x - 10 + lean * 0.4, y: base.y - 40 },
        { x: base.x + lean, y: base.y - 78, sharp: true },
        { x: base.x + 8 + lean * 0.5, y: base.y - 36 },
        { x: base.x + 16, y: base.y, sharp: true },
    ]);
}

function smokeParts(pose: Pose): ArtPart[] {
    const opacities = ['B0', '88', '60', '40', '24'];

    return opacities.map((opacity, index) => {
        const centre = {
            x: -170 - index * 58,
            y: -90 - index * 26 + Math.sin(pose.wave + index * 1.3) * 16,
        };
        const radius = 64 - index * 9;

        return part('Smoke', ellipsePath(centre, radius, radius * 0.8), `${SMOKE.slice(0, 7)}${opacity}`);
    });
}

export function monsterFrameParts(frame: number): ArtPart[] {
    const pose = poseOf(frame);
    const shoulder = { x: 96, y: -150 + pose.bob };
    const hand = { x: 205 + 80 * pose.reach, y: -150 - 34 * pose.reach + pose.bob };
    const backShoulder = { x: -20, y: -170 + pose.bob };
    const backHand = { x: 150 - 50 * pose.reach, y: -90 + 20 * pose.reach + pose.bob };
    const body = bodyOutline(pose);
    const rim = body.map((point) => ({ ...point, x: point.x - 7, y: point.y - 6 }));

    return [
        ...clawParts(hand, CLAW),
        part('Arm', limbPath(shoulder, hand, 30), LIMB),
        ...eyeParts({ x: 125, y: -318 + pose.bob }, true),
        ...eyeParts({ x: 52, y: -326 + pose.bob }, false),
        ...mouthParts(pose),
        gradientPart(
            'Body',
            smoothClosedPath(body),
            BODY_MIDDLE,
            verticalGradient([BODY_TOP, BODY_MIDDLE, BODY_BOTTOM], [0, 0.5, 1]),
        ),
        part('Rim light', smoothClosedPath(rim), RIM),
        part('Horn', hornPath({ x: 20, y: -440 + pose.bob }, 34), HORN),
        part('Horn', hornPath({ x: -70, y: -425 + pose.bob }, -20), HORN),
        ...clawParts(backHand, HORN),
        part('Back arm', limbPath(backShoulder, backHand, 26), LIMB_BACK),
        ...smokeParts(pose),
    ];
}
