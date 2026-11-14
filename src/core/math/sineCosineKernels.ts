// The polynomials of fdlibm's __kernel_sin and __kernel_cos (Sun Microsystems, 1993), which are
// accurate to under 1 ulp for an angle between -pi/4 and pi/4.

const SIN_1 = -1.66666666666666324348e-1;
const SIN_2 = 8.33333333332248946124e-3;
const SIN_3 = -1.98412698298579493134e-4;
const SIN_4 = 2.75573137070700676789e-6;
const SIN_5 = -2.50507602534068634195e-8;
const SIN_6 = 1.58969099521155010221e-10;

const COS_1 = 4.16666666666666019037e-2;
const COS_2 = -1.38888888888741095749e-3;
const COS_3 = 2.48015872894767294178e-5;
const COS_4 = -2.75573143513906633035e-7;
const COS_5 = 2.0875723212981748279e-9;
const COS_6 = -1.13596475577881948265e-11;

export function sineOfSmallAngle(radians: number) {
    const square = radians * radians;
    const cube = square * radians;
    const tail = SIN_2 + square * (SIN_3 + square * (SIN_4 + square * (SIN_5 + square * SIN_6)));
    const series = SIN_1 + square * tail;

    return radians + cube * series;
}

export function cosineOfSmallAngle(radians: number) {
    const square = radians * radians;
    const fourthPower = square * square;
    const tail = COS_2 + square * (COS_3 + square * (COS_4 + square * (COS_5 + square * COS_6)));
    const series = COS_1 + square * tail;

    return 1 - 0.5 * square + fourthPower * series;
}
