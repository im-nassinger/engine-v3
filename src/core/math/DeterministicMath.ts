import { arctangent } from './arctangent.ts';
import { exponential } from './exponential.ts';
import { cosineOfSmallAngle, sineOfSmallAngle } from './sineCosineKernels.ts';

// pi/2 split in two: the high part has 33 bits, so quarterTurns * HIGH is exact for up to 2^20
// quarter turns, and the low part keeps the reduction accurate (fdlibm's pio2_1 and pio2_1t).
const HALF_PI_HIGH = 1.57079632673412561417;
const HALF_PI_LOW = 6.0771005065061922493e-11;
const TWO_OVER_PI = 6.36619772367581382433e-1;

// pi split in two, so pi - x loses nothing to rounding (fdlibm's pi and pi_lo).
const PI_HIGH = Math.PI;
const PI_LOW = 1.2246467991473532e-16;

const RADIANS_PER_DEGREE = Math.PI / 180;

type SineAndCosine = {
    readonly sin: number;
    readonly cos: number;
};

function quadrantOf(quarterTurns: number) {
    const remainder = quarterTurns % 4;

    return (remainder + 4) % 4;
}

// Turns the sine and cosine of a small angle into those of the angle plus whole quarter turns.
function rotateByQuadrant(smallSin: number, smallCos: number, quadrant: number): SineAndCosine {
    if (quadrant === 0) return { sin: smallSin, cos: smallCos };
    if (quadrant === 1) return { sin: smallCos, cos: -smallSin };
    if (quadrant === 2) return { sin: -smallSin, cos: -smallCos };

    return { sin: -smallCos, cos: smallSin };
}

function sineAndCosineOfRadians(radians: number) {
    const quarterTurns = Math.round(radians * TWO_OVER_PI);
    const highRemainder = radians - quarterTurns * HALF_PI_HIGH;
    const remainder = highRemainder - quarterTurns * HALF_PI_LOW;

    const smallSin = sineOfSmallAngle(remainder);
    const smallCos = cosineOfSmallAngle(remainder);
    const quadrant = quadrantOf(quarterTurns);

    return rotateByQuadrant(smallSin, smallCos, quadrant);
}

function arctangentOfQuotient(y: number, x: number) {
    const magnitude = Math.abs(y / x);
    const angle = arctangent(magnitude);
    const isUpperHalf = y > 0;

    if (x > 0) {
        if (isUpperHalf) return angle;

        return -angle;
    }

    const fromNegativeX = PI_HIGH - (angle - PI_LOW);
    if (isUpperHalf) return fromNegativeX;

    return -fromNegativeX;
}

function angleWithInfinity(y: number, x: number) {
    const isXInfinite = !Number.isFinite(x);
    const isYInfinite = !Number.isFinite(y);

    if (isXInfinite && isYInfinite && x > 0) return Math.PI / 4;
    if (isXInfinite && isYInfinite) return (3 * Math.PI) / 4;
    if (x === Infinity) return 0;
    if (x === -Infinity) return Math.PI;

    return Math.PI / 2;
}

function arctangentWithInfinity(y: number, x: number) {
    const angle = angleWithInfinity(y, x);
    const isUpperHalf = y > 0;

    if (isUpperHalf) return angle;

    return -angle;
}

function arctangentOnAnAxis(y: number, x: number) {
    if (x === 0 && y !== 0) {
        const quarterTurn = Math.PI / 2;

        return y > 0 ? quarterTurn : -quarterTurn;
    }

    const isFromPositiveX = x > 0 || Object.is(x, 0);
    if (isFromPositiveX) return y;

    const isLowerZero = Object.is(y, -0);

    return isLowerZero ? -Math.PI : Math.PI;
}

// The game's own sine, cosine, arctangent and exponent, built from + - * / and Math.sqrt only, so every
// computer gives the same bits. Math.sin and the others may differ between browsers.
export class DeterministicMath {
    static sin(radians: number) {
        if (!Number.isFinite(radians)) return Number.NaN;

        // Returned as is, so -0 keeps its sign like Math.sin(-0). The reduction would lose it.
        if (radians === 0) return radians;

        return sineAndCosineOfRadians(radians).sin;
    }

    static cos(radians: number) {
        if (!Number.isFinite(radians)) return Number.NaN;

        return sineAndCosineOfRadians(radians).cos;
    }

    // Same answers as Math.atan2, signed zeros and infinities included.
    static atan2(y: number, x: number) {
        const hasNaN = Number.isNaN(y) || Number.isNaN(x);
        if (hasNaN) return Number.NaN;

        const isOnAnAxis = x === 0 || y === 0;
        if (isOnAnAxis) return arctangentOnAnAxis(y, x);

        const hasInfinity = !Number.isFinite(x) || !Number.isFinite(y);
        if (hasInfinity) return arctangentWithInfinity(y, x);

        return arctangentOfQuotient(y, x);
    }

    // Same answers as Math.exp at the edges: Infinity above about 709.78, 0 below about -745.1.
    static exp(value: number) {
        return exponential(value);
    }

    // Exact at every whole multiple of 90 degrees, so a quarter turn never leaves a tiny slant.
    static sinCos(degrees: number): SineAndCosine {
        if (!Number.isFinite(degrees)) return { sin: Number.NaN, cos: Number.NaN };

        const quarterTurns = Math.round(degrees / 90);
        const remainderDegrees = degrees - quarterTurns * 90;
        const remainder = remainderDegrees * RADIANS_PER_DEGREE;

        const smallSin = sineOfSmallAngle(remainder);
        const smallCos = cosineOfSmallAngle(remainder);
        const quadrant = quadrantOf(quarterTurns);
        const rotated = rotateByQuadrant(smallSin, smallCos, quadrant);

        // Adding 0 turns -0 into 0, so 180 degrees gives a sine of 0, not -0.
        return { sin: rotated.sin + 0, cos: rotated.cos + 0 };
    }
}
