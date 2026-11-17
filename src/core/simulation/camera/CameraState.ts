import type { Point } from '../../geometry/index.ts';

// Where the camera is during a run, in level pixels. CameraPhase is the only code that moves it; the
// camera entity's TransformComponent isn't written during play.
export class CameraState {
    private currentPosition: Point;

    constructor(position: Point) {
        this.currentPosition = position;
    }

    get position() {
        return this.currentPosition;
    }

    moveTo(position: Point) {
        this.currentPosition = position;
    }
}
