// fdlibm's s_atan (Sun Microsystems, 1993): the argument is moved near 0, 0.5, 1, 1.5 or infinity,
// where the arctangent is known to double precision, and a polynomial adds the rest.

const KNOWN_HIGH = [
    4.63647609000806093515e-1, 7.85398163397448278999e-1, 9.82793723247329054082e-1, 1.570796326794896558,
];
const KNOWN_LOW = [
    2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17,
];

const ODD_TERMS = [
    3.33333333333329318027e-1, 1.42857142725034663711e-1, 9.09088713343650656196e-2, 6.66107313738753120669e-2,
    4.97687799461593236017e-2, 1.62858201153657823623e-2,
];
const EVEN_TERMS = [
    -1.99999999998764832476e-1, -1.1111110405462355788e-1, -7.69187620504482999495e-2, -5.83357013379057348645e-2,
    -3.6531572744216915527e-2,
];

type Reduction = {
    readonly knownIndex: number | undefined;
    readonly reduced: number;
};

function reduce(magnitude: number): Reduction {
    if (magnitude < 0.4375) return { knownIndex: undefined, reduced: magnitude };
    if (magnitude < 0.6875) return { knownIndex: 0, reduced: (2 * magnitude - 1) / (2 + magnitude) };
    if (magnitude < 1.1875) return { knownIndex: 1, reduced: (magnitude - 1) / (magnitude + 1) };
    if (magnitude < 2.4375) return { knownIndex: 2, reduced: (magnitude - 1.5) / (1 + 1.5 * magnitude) };

    return { knownIndex: 3, reduced: -1 / magnitude };
}

function evaluateHorner(coefficients: number[], variable: number) {
    let result = 0;

    for (let i = coefficients.length - 1; i >= 0; i--) {
        result = coefficients[i]! + variable * result;
    }

    return result;
}

function arctangentOfMagnitude(magnitude: number) {
    const { knownIndex, reduced } = reduce(magnitude);

    const square = reduced * reduced;
    const fourthPower = square * square;
    const oddPart = square * evaluateHorner(ODD_TERMS, fourthPower);
    const evenPart = fourthPower * evaluateHorner(EVEN_TERMS, fourthPower);
    const correction = reduced * (oddPart + evenPart);

    if (knownIndex === undefined) return reduced - correction;

    const knownHigh = KNOWN_HIGH[knownIndex]!;
    const knownLow = KNOWN_LOW[knownIndex]!;

    return knownHigh - (correction - knownLow - reduced);
}

export function arctangent(value: number) {
    if (Number.isNaN(value)) return Number.NaN;

    const magnitude = Math.abs(value);
    const result = arctangentOfMagnitude(magnitude);

    if (value < 0) return -result;

    return result;
}
