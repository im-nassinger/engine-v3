import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// The tick's last phase: adds the bodies that moved to the report. Removing entities comes with step 8.
export class EndOfTickPhase implements TickPhase {
    run(tick: TickContext) {
        const { poses, report } = tick.run;

        for (const id of poses.moved) {
            const pose = poses.poseOf(id);
            if (pose === undefined) continue;

            report.bodyMoved(id, pose);
        }
    }
}
