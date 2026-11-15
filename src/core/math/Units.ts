// The game works in pixels and degrees, Box2D in metres and radians. Only the Box2D adapter
// converts. Speeds use the same functions: px/s to m/s like a length, degrees/s like an angle.
const PIXELS_PER_METRE = 50;
const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export class Units {
    static readonly PIXELS_PER_METRE = PIXELS_PER_METRE;

    static toMetres(pixels: number) {
        return pixels / PIXELS_PER_METRE;
    }

    static toPixels(metres: number) {
        return metres * PIXELS_PER_METRE;
    }

    static toRadians(degrees: number) {
        return degrees * RADIANS_PER_DEGREE;
    }

    static toDegrees(radians: number) {
        return radians * DEGREES_PER_RADIAN;
    }
}
