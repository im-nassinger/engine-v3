import { bodyHashes } from '../hash/bodyHashes.ts';
import { stateHash } from '../hash/stateHash.ts';
import type { TickReport } from '../report/TickReport.ts';

import type { PlayRun } from './PlayRun.ts';
import type { RunStart } from './RunStart.ts';
import type { TickInputs } from './TickInputs.ts';
import type { TickPhase } from './TickPhase.ts';

const LEVEL_ORIGIN = { x: 0, y: 0 };

// One run: the play copy, its physics and the tick phases, run in order every tick. startSimulation
// builds it.
export class Simulation {
    readonly start: RunStart;
    private readonly run: PlayRun;
    private readonly phases: readonly TickPhase[];
    private currentTick = 0;

    constructor(run: PlayRun, start: RunStart, phases: readonly TickPhase[]) {
        this.run = run;
        this.start = start;
        this.phases = phases;
    }

    // The last tick run, 0 before the first.
    get tick() {
        return this.currentTick;
    }

    // The play copy, for reading only: the tick phases are the only code that changes it.
    get level() {
        return this.run.level;
    }

    get caches() {
        return this.run.caches;
    }

    runTick(inputs: TickInputs) {
        this.currentTick += 1;
        const context = { tick: this.currentTick, inputs, run: this.run };

        for (const phase of this.phases) {
            phase.run(context);
        }
    }

    // Everything since the last report, which starts the next one from nothing.
    takeReport(): TickReport {
        const camera = this.cameraPosition();

        return this.run.report.take(this.currentTick, camera);
    }

    stateHash() {
        const camera = this.cameraPosition();

        return stateHash(this.currentTick, this.run.scene, this.run.poses, camera);
    }

    // One hash per body still in the run, in Entities panel order, to name the first body that differs.
    bodyHashes() {
        return bodyHashes(this.run.scene, this.run.poses);
    }

    // Ends the run: the physics world is freed and the caches stop following the play copy.
    destroy() {
        this.run.scene.world.destroy();
        this.run.caches.dispose();
    }

    // The camera entity's level position. The CameraPhase, with following, comes with stage 15.
    private cameraPosition() {
        const matrix = this.run.caches.worldMatrices.matrixOf(this.run.level.camera);

        return matrix.apply(LEVEL_ORIGIN);
    }
}
