// The game works in pixels and degrees, Box2D in metres and radians. Only the Box2D adapter and the
// editor's display convert. Speeds use the same functions: px/s to m/s like a length, degrees/s like an
// angle. The scale is the World's Pixels per metre, given to every length conversion.
const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export class Units {
    static toMetres(pixels: number, pixelsPerMetre: number) {
        return pixels / pixelsPerMetre;
    }

    static toPixels(metres: number, pixelsPerMetre: number) {
        return metres * pixelsPerMetre;
    }

    static toRadians(degrees: number) {
        return degrees * RADIANS_PER_DEGREE;
    }

    static toDegrees(radians: number) {
        return radians * DEGREES_PER_RADIAN;
    }
}
