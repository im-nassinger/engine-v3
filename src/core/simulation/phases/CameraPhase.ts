import { CameraSettings } from '../camera/CameraSettings.ts';
import { keepInSafetyMargin } from '../camera/keepInSafetyMargin.ts';
import { limitToLevel } from '../camera/limitToLevel.ts';
import { smoothTowards } from '../camera/smoothTowards.ts';
import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// Moves the camera after the bodies moved and before removals at the end of the tick. The goal is the
// target's origin limited to the bounds, so the camera slows into an edge; then it is smoothed, kept in
// the safety margin and limited again, so the bounds win over the margin. With no target, or a target gone
// from the run, the camera holds where it is.
export class CameraPhase implements TickPhase {
    run(tick: TickContext) {
        const { run } = tick;
        const settings = new CameraSettings(run.level, run.caches);
        const target = settings.targetOrigin();
        if (target === undefined) return;

        const box = settings.box;
        const goal = limitToLevel(target, box, run.level);
        const smoothed = smoothTowards(run.camera.position, goal, settings.smoothingSeconds);
        const inMargin = keepInSafetyMargin(smoothed, box, target);
        const limited = limitToLevel(inMargin, box, run.level);

        run.camera.moveTo(limited);
    }
}
