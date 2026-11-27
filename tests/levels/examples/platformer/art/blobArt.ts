import type { Fill } from '../../../../../src/core/fields/index.ts';
import type { PathGeometry, Point } from '../../../../../src/core/geometry/index.ts';

import type { Arms, FrameSpec, Leg } from './blobAnimations.ts';
import { BLOB_HEIGHT } from '../controller/platformerFeel.ts';
import { verticalGradient } from './artEntities.ts';
import { ellipsePath, leafPath, roundOutline, smilePath, smoothClosedPath, turnedEllipsePath } from './pathShapes.ts';

// One frame of the blob, facing right, in the blob's own space: y down, the ground line at the bottom of
// its solid shape. Parts are listed front first, the order the Entities viewer draws them.
export const BLOB_COLOUR = '#5CC8EBFF';
const BLOB_SHADE = '#45B1D6FF';
const FACE_COLOUR = '#2A2238FF';
const CHEEK_COLOUR = '#FF8FB1D0';
const MOUTH_INSIDE = '#E2577AFF';
const BLOB_DEEP = '#3FA6D3FF';
const BELLY_COLOUR = '#B8EEFA90';
const GLOSS_COLOUR = '#FFFFFF8C';
const GLINT_COLOUR = '#FFFFFFFF';
const LEAF_COLOUR = '#8CCB3AFF';
const LEAF_SHADE = '#5FAE2EFF';
// Lit from above: light at the top of the body, deeper at the bottom.
const BODY_FILL = verticalGradient(['#9AE6FAFF', '#5CC8EBFF', '#3B9FD0FF'], [0, 0.5, 1]);

const GROUND_LINE = BLOB_HEIGHT / 2;
const BODY_RADIUS_X = 34;
const BODY_RADIUS_Y = 30;
const BODY_BOTTOM = GROUND_LINE - 9;
const LEG_HALF_WIDTH = 6.5;
const LEG_SPACING = 11;
// The face sits towards the way the blob looks.
const FACE_SHIFT = 7;

export type ArtPart = {
    readonly name: string;
    readonly path: PathGeometry;
    readonly colour: string;
    // A gradient in place of the solid colour.
    readonly fill?: Fill;
};

type Body = {
    readonly centre: Point;
    readonly radiusX: number;
    readonly radiusY: number;
};

function bodyOf(spec: FrameSpec): Body {
    const radiusX = BODY_RADIUS_X * spec.squashX;
    const radiusY = BODY_RADIUS_Y * spec.squashY;
    const centre = { x: 0, y: BODY_BOTTOM - radiusY + spec.bob };

    return { centre, radiusX, radiusY };
}

// A soft, slightly square blob, flatter at the bottom, its top leaning forward.
function bodyPath(body: Body, lean: number) {
    const outline = roundOutline(body.centre, body.radiusX, body.radiusY, 2.4, 14).map((point) => {
        const height = (body.centre.y - point.y) / body.radiusY;
        const leanShift = height > 0 ? lean * height : 0;
        const flatten = height < -0.6 ? 0.96 : 1;
        const y = body.centre.y + (point.y - body.centre.y) * flatten;

        return { x: point.x + leanShift, y };
    });

    return smoothClosedPath(outline);
}

// A stubby leg from inside the body to its foot, slanted by the swing.
function legPath(hipX: number, hipY: number, leg: Leg) {
    const footY = GROUND_LINE - leg.lift;
    const footX = hipX + leg.swing;
    const halfLength = (footY - hipY) / 2;
    const centre = { x: (hipX + footX) / 2, y: (hipY + footY) / 2 };
    const outline = roundOutline({ x: 0, y: 0 }, LEG_HALF_WIDTH, halfLength, 3, 10).map((point) => {
        const along = point.y / halfLength;
        const slant = (leg.swing / 2) * along;

        return { x: centre.x + point.x + slant, y: centre.y + point.y };
    });

    return smoothClosedPath(outline);
}

function armPath(body: Body, arms: Arms, side: 1 | -1, swing: number) {
    const edgeX = side * body.radiusX;

    if (arms === 'out') {
        const centre = { x: edgeX + side * 1 + swing, y: body.centre.y + 6 };

        return ellipsePath(centre, 9, 6);
    }
    if (arms === 'up') {
        const centre = { x: edgeX - side * 2 + swing, y: body.centre.y - body.radiusY * 0.55 };

        return ellipsePath(centre, 6, 10);
    }

    const centre = { x: edgeX - side * 1 + swing, y: body.centre.y + body.radiusY * 0.35 };

    return ellipsePath(centre, 6.5, 9);
}

function eyePath(centre: Point, spec: FrameSpec) {
    if (spec.eyes === 'closed') return smilePath({ x: centre.x, y: centre.y + 1 }, 10, -4);
    if (spec.eyes === 'squint') return ellipsePath(centre, 5, 2.4);

    return ellipsePath(centre, 5, 6.6);
}

// Two white glints on an open eye, up and towards the light.
function eyeGlints(centre: Point, spec: FrameSpec): ArtPart[] {
    if (spec.eyes !== 'open') return [];

    return [
        { name: 'Glint', path: ellipsePath({ x: centre.x + 1.6, y: centre.y - 2.4 }, 1.9, 2.1), colour: GLINT_COLOUR },
        { name: 'Glint', path: ellipsePath({ x: centre.x - 1.6, y: centre.y + 2.4 }, 0.9, 0.9), colour: GLINT_COLOUR },
    ];
}

// Brows tilted up towards the middle, over each eye.
function browParts(left: Point, right: Point, spec: FrameSpec): ArtPart[] {
    if (spec.brows === 'none') return [];
    const lift = 10;

    return [
        { name: 'Brow', path: turnedEllipsePath({ x: right.x, y: right.y - lift }, 5, 1.6, 0.42), colour: FACE_COLOUR },
        { name: 'Brow', path: turnedEllipsePath({ x: left.x, y: left.y - lift }, 5, 1.6, -0.42), colour: FACE_COLOUR },
    ];
}

function mouthParts(centre: Point, spec: FrameSpec): ArtPart[] {
    if (spec.mouth === 'smile') {
        return [{ name: 'Mouth', path: smilePath(centre, 12, 5), colour: FACE_COLOUR }];
    }
    if (spec.mouth === 'round') {
        return [
            { name: 'Tongue', path: ellipsePath({ x: centre.x, y: centre.y + 4 }, 2.2, 1.4), colour: MOUTH_INSIDE },
            { name: 'Mouth', path: ellipsePath({ x: centre.x, y: centre.y + 2 }, 3.6, 4.4), colour: FACE_COLOUR },
        ];
    }

    const tongueCentre = { x: centre.x, y: centre.y + 4.5 };

    return [
        { name: 'Tongue', path: ellipsePath(tongueCentre, 3.4, 2), colour: MOUTH_INSIDE },
        { name: 'Mouth', path: smilePath(centre, 13, 9), colour: FACE_COLOUR },
    ];
}

// A two-leaf sprout on the head, swaying back as the blob leans forward and fluttering up when it falls.
function sproutParts(body: Body, spec: FrameSpec): ArtPart[] {
    const base = { x: spec.lean * 0.9 - 2, y: body.centre.y - body.radiusY + 3 };
    const sway = -spec.lean * 0.05 + (spec.arms === 'up' ? -0.25 : 0) + (spec.squashY - 1) * 0.8;

    return [
        { name: 'Leaf', path: leafPath({ x: base.x, y: base.y - 9 }, 17, 11, 0.95 + sway), colour: LEAF_COLOUR },
        { name: 'Leaf', path: leafPath({ x: base.x, y: base.y - 9 }, 14, 9, -0.85 + sway), colour: LEAF_SHADE },
        { name: 'Stem', path: turnedEllipsePath({ x: base.x, y: base.y - 4 }, 1.8, 7, sway * 0.6), colour: LEAF_SHADE },
    ];
}

export function blobFrameParts(spec: FrameSpec): ArtPart[] {
    const body = bodyOf(spec);
    const faceX = FACE_SHIFT + spec.lean * 0.6;
    const eyeY = body.centre.y - 4 * spec.squashY;
    const eyeGap = 10 * spec.squashX;
    const frontEye = { x: faceX + eyeGap, y: eyeY };
    const backEye = { x: faceX - eyeGap, y: eyeY };
    const mouthCentre = { x: faceX, y: eyeY + 10 * spec.squashY };
    const hipY = BODY_BOTTOM - 6 + spec.bob;
    const frontArmSwing = spec.armSwing;
    const backArmSwing = -spec.armSwing;
    const bellyCentre = { x: faceX * 0.4, y: body.centre.y + body.radiusY * 0.6 };
    const glossCentre = { x: -body.radiusX * 0.42 + spec.lean * 0.5, y: body.centre.y - body.radiusY * 0.55 };

    return [
        ...eyeGlints(frontEye, spec),
        ...eyeGlints(backEye, spec),
        ...browParts(backEye, frontEye, spec),
        ...mouthParts(mouthCentre, spec),
        { name: 'Eye', path: eyePath(frontEye, spec), colour: FACE_COLOUR },
        { name: 'Eye', path: eyePath(backEye, spec), colour: FACE_COLOUR },
        { name: 'Cheek', path: ellipsePath({ x: faceX + eyeGap + 8, y: eyeY + 9 }, 5.5, 3.2), colour: CHEEK_COLOUR },
        { name: 'Cheek', path: ellipsePath({ x: faceX - eyeGap - 8, y: eyeY + 9 }, 5.5, 3.2), colour: CHEEK_COLOUR },
        { name: 'Gloss', path: turnedEllipsePath(glossCentre, 9, 5, -0.6), colour: GLOSS_COLOUR },
        {
            name: 'Belly',
            path: ellipsePath(bellyCentre, body.radiusX * 0.42, body.radiusY * 0.26),
            colour: BELLY_COLOUR,
        },
        { name: 'Body', path: bodyPath(body, spec.lean), colour: BLOB_COLOUR, fill: BODY_FILL },
        ...sproutParts(body, spec),
        { name: 'Front leg', path: legPath(LEG_SPACING, hipY, spec.frontLeg), colour: BLOB_DEEP },
        { name: 'Front arm', path: armPath(body, spec.arms, 1, frontArmSwing), colour: BLOB_COLOUR },
        { name: 'Back arm', path: armPath(body, spec.arms, -1, backArmSwing), colour: BLOB_SHADE },
        { name: 'Back leg', path: legPath(-LEG_SPACING, hipY, spec.backLeg), colour: BLOB_SHADE },
    ];
}
