import type { CollisionPiece } from './CollisionPiece.ts';
import type { Matrix2D } from '../Matrix2D.ts';
import type { Point } from '../Point.ts';

// Sums kept while adding pieces up: the centre of mass is the mass-weighted sum of centres ÷ the mass.
type Totals = {
    area: number;
    mass: number;
    weightedX: number;
    weightedY: number;
};

// The area, mass and centre of mass of some collision pieces, worked out from the shared geometry so the
// editor's Mass matches play. Area is in px², mass in kg, the centre in the pieces' own space, in px.
// Something with no mass, a line or a density of 0, has no centre of mass. Values: every operation
// returns a new one. Only + − × ÷, so every computer gives the same bits.
export class MassProperties {
    readonly area: number;
    readonly mass: number;
    readonly centreOfMass: Point | undefined;

    // Something with no mass never keeps a centre.
    private constructor(area: number, mass: number, centreOfMass: Point | undefined) {
        this.area = area;
        this.mass = mass;
        this.centreOfMass = mass === 0 ? undefined : centreOfMass;
    }

    // Mass is area in square metres × density, at the World's Pixels per metre: a 100 px square at density 1
    // is 1 m × 1 m = 1 kg at 100 px per metre, and 2 m × 2 m = 4 kg at 50.
    static of(pieces: readonly CollisionPiece[], density: number, pixelsPerMetre: number) {
        const totals: Totals = { area: 0, mass: 0, weightedX: 0, weightedY: 0 };
        const squarePixelsPerSquareMetre = pixelsPerMetre * pixelsPerMetre;

        for (const piece of pieces) {
            const { area, centre } = areaAndCentre(piece);
            const mass = (area / squarePixelsPerSquareMetre) * density;
            addTo(totals, area, mass, centre);
        }

        return MassProperties.fromTotals(totals);
    }

    // Several surfaces of one body added up, each already in the body's space.
    static combine(parts: readonly MassProperties[]) {
        const totals: Totals = { area: 0, mass: 0, weightedX: 0, weightedY: 0 };

        for (const part of parts) {
            addTo(totals, part.area, part.mass, part.centreOfMass);
        }

        return MassProperties.fromTotals(totals);
    }

    private static fromTotals(totals: Totals) {
        if (totals.mass === 0) return new MassProperties(totals.area, 0, undefined);

        const x = totals.weightedX / totals.mass + 0;
        const y = totals.weightedY / totals.mass + 0;

        return new MassProperties(totals.area, totals.mass, { x, y });
    }

    // The same pieces moved by a matrix, such as a shape's into its body's space. A matrix multiplies
    // every area by the size of its determinant, a circle's too, and moves the centre of mass like any
    // point, so the pieces themselves needn't be moved.
    transformedBy(matrix: Matrix2D) {
        const factor = Math.abs(matrix.determinant());
        const centre = this.centreOfMass === undefined ? undefined : matrix.apply(this.centreOfMass);

        return new MassProperties(this.area * factor, this.mass * factor, centre);
    }
}

function areaAndCentre(piece: CollisionPiece) {
    if (piece.kind === 'circle') {
        const area = Math.PI * piece.radius * piece.radius;
        const centre: Point = { x: 0, y: 0 };

        return { area, centre };
    }

    return polygonAreaAndCentre(piece.points);
}

// The shoelace sums, measured from the first point so large positions lose no precision. The pieces
// have a positive area, so no sign needs fixing.
function polygonAreaAndCentre(points: readonly Point[]) {
    const [origin] = points;
    if (origin === undefined) return { area: 0, centre: { x: 0, y: 0 } };

    let doubleArea = 0;
    let sixTimesWeightedX = 0;
    let sixTimesWeightedY = 0;

    for (let i = 1; i + 1 < points.length; i++) {
        const first = points[i];
        const second = points[i + 1];
        if (first === undefined || second === undefined) continue;

        const firstX = first.x - origin.x;
        const firstY = first.y - origin.y;
        const secondX = second.x - origin.x;
        const secondY = second.y - origin.y;
        const cross = firstX * secondY - secondX * firstY;

        doubleArea += cross;
        sixTimesWeightedX += (firstX + secondX) * cross;
        sixTimesWeightedY += (firstY + secondY) * cross;
    }

    if (doubleArea === 0) return { area: 0, centre: origin };

    const x = origin.x + sixTimesWeightedX / (3 * doubleArea);
    const y = origin.y + sixTimesWeightedY / (3 * doubleArea);

    return { area: doubleArea / 2, centre: { x, y } };
}

function addTo(totals: Totals, area: number, mass: number, centre: Point | undefined) {
    totals.area += area;
    if (mass === 0 || centre === undefined) return;

    totals.mass += mass;
    totals.weightedX += centre.x * mass;
    totals.weightedY += centre.y * mass;
}
