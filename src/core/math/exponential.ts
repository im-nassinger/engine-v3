// fdlibm's e_exp (Sun Microsystems, 1993): the argument is split into k * ln 2 + r with
// |r| <= 0.5 ln 2, a polynomial gives e^r, and the result is scaled by 2^k.

// Above this e^x overflows, below the other it rounds to 0.
const OVERFLOW_THRESHOLD = 7.09782712893383973096e2;
const UNDERFLOW_THRESHOLD = -7.4513321910194110842e2;

// ln 2 split in two: the high part ends in zero bits, so k * LN2_HIGH is exact for any k used here.
const LN2_HIGH = 6.9314718036912381649e-1;
const LN2_LOW = 1.90821492927058770002e-10;
const ONE_OVER_LN2 = 1.442695040888963387;

const HALF_LN2 = 0.5 * Math.LN2;
// 2^-28: below it e^x is 1 + x to double precision.
const TINY_ARGUMENT = 3.725290298461914e-9;

const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.6533902205465251539e-6;
const P5 = 4.13813679705723846039e-8;

// The smallest power of two the result is first scaled to stay normal before the last step.
const LOWEST_NORMAL_POWER = -1021;
const SUBNORMAL_SHIFT = 1000;
const TWO_TO_MINUS_1000 = 9.3326361850321887899e-302;

// 2^power by squaring. Every step is a power of two in the normal range, so each product is exact.
function powerOfTwo(power: number) {
    let base = power < 0 ? 0.5 : 2;
    let remaining = Math.abs(power);
    let result = 1;

    while (remaining > 0) {
        if (remaining % 2 === 1) {
            result *= base;
        }

        remaining = Math.floor(remaining / 2);

        if (remaining > 0) {
            base *= base;
        }
    }

    return result;
}

function scaleByPowerOfTwo(value: number, power: number) {
    if (power > 1023) {
        const almost = value * powerOfTwo(power - 1);

        return almost * 2;
    }

    if (power >= LOWEST_NORMAL_POWER) return value * powerOfTwo(power);

    const shifted = value * powerOfTwo(power + SUBNORMAL_SHIFT);

    return shifted * TWO_TO_MINUS_1000;
}

function wholeLn2Steps(value: number) {
    const halfStep = value < 0 ? -0.5 : 0.5;
    const steps = ONE_OVER_LN2 * value + halfStep;

    return Math.trunc(steps);
}

export function exponential(value: number) {
    if (Number.isNaN(value)) return Number.NaN;
    if (value > OVERFLOW_THRESHOLD) return Infinity;
    if (value < UNDERFLOW_THRESHOLD) return 0;

    const magnitude = Math.abs(value);
    if (magnitude < TINY_ARGUMENT) return 1 + value;

    let steps = 0;
    let high = value;
    let low = 0;

    if (magnitude > HALF_LN2) {
        steps = wholeLn2Steps(value);
        high = value - steps * LN2_HIGH;
        low = steps * LN2_LOW;
    }

    const remainder = high - low;
    const square = remainder * remainder;
    const series = P1 + square * (P2 + square * (P3 + square * (P4 + square * P5)));
    const correction = remainder - square * series;

    if (steps === 0) {
        const ratio = (remainder * correction) / (correction - 2);

        return 1 - (ratio - remainder);
    }

    const ratio = (remainder * correction) / (2 - correction);
    const exponentOfRemainder = 1 - (low - ratio - high);

    return scaleByPowerOfTwo(exponentOfRemainder, steps);
}
