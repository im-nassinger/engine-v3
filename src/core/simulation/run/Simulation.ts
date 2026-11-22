import { VariablesComponent } from '../../components/index.ts';

import { bodyHashes } from '../hash/bodyHashes.ts';
import { stateHash } from '../hash/stateHash.ts';
import type { TickReport } from '../report/TickReport.ts';

import type { PlayRun } from './PlayRun.ts';
import type { RunStart } from './RunStart.ts';
import type { TickInputs } from '../inputs/TickInputs.ts';
import type { TickPhase } from './TickPhase.ts';

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

    // The last tick's keys and inputs, built by InputPhase.
    get inputs() {
        return this.run.inputs.state;
    }

    // The last tick's trigger firings whose actions ran, in the order they ran.
    get firings() {
        return this.run.triggers.fired;
    }

    // How the run ended, by the first Win, Lose or Restart action; null while it goes on.
    get end() {
        return this.run.ending.end;
    }

    // The run's warnings so far, each once.
    get warnings() {
        return this.run.warnings.all;
    }

    // Once the run has ended, its tick finished and no more run.
    runTick(inputs: TickInputs) {
        if (this.end !== null) return;

        this.currentTick += 1;
        const context = { tick: this.currentTick, inputs, run: this.run };

        for (const phase of this.phases) {
            phase.run(context);
        }
    }

    // Everything since the last report, which starts the next one from nothing.
    takeReport(): TickReport {
        const camera = this.run.camera.position;

        const warnings = this.run.warnings.takeNew();

        return this.run.report.take(this.currentTick, camera, this.end, warnings);
    }

    stateHash() {
        const camera = this.run.camera.position;

        const variables = this.run.level.world.getComponent(VariablesComponent)?.get('variables') ?? [];
        const values = variables.map((variable) => variable.value);

        return stateHash(this.currentTick, this.run.scene, this.run.poses, camera, values);
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
}
