import type { LevelData, ReadOutcome } from '../../level-data/index.ts';
import type { PhysicsEngine } from '../../physics/index.ts';

import { CameraSettings } from '../camera/CameraSettings.ts';
import { CameraState } from '../camera/CameraState.ts';
import { startingCameraPosition } from '../camera/startingCameraPosition.ts';
import { PlayInputs } from '../inputs/PlayInputs.ts';
import { CameraPhase } from '../phases/CameraPhase.ts';
import { EndOfTickPhase } from '../phases/EndOfTickPhase.ts';
import { EventPhase } from '../phases/EventPhase.ts';
import { InputPhase } from '../phases/InputPhase.ts';
import { JointPathPhase } from '../phases/JointPathPhase.ts';
import { LevelBoundsPhase } from '../phases/LevelBoundsPhase.ts';
import { PhysicsPhase } from '../phases/PhysicsPhase.ts';
import { TriggerPhase } from '../phases/TriggerPhase.ts';
import { RemovalMarks } from '../removal/RemovalMarks.ts';
import { PlayWarnings } from '../report/PlayWarnings.ts';
import { ReportCollector } from '../report/ReportCollector.ts';
import { PlayTriggers } from '../triggers/PlayTriggers.ts';

import { RunEnding } from '../end/RunEnd.ts';
import type { RunStart } from '../run/RunStart.ts';
import { Simulation } from '../run/Simulation.ts';

import { startPlayCopy } from './startPlayCopy.ts';

// The one way to build a run, used by runHeadless and the game worker alike, so the determinism test
// proves the worker's runs. The engine must be loaded already.
export function startSimulation(levelData: LevelData, engine: PhysicsEngine, start: RunStart): ReadOutcome<Simulation> {
    const started = startPlayCopy(levelData, engine);
    if (!started.ok) return started;

    const playCopy = started.value;
    const removals = new RemovalMarks();
    const cameraSettings = new CameraSettings(playCopy.level, playCopy.caches);
    const cameraStart = startingCameraPosition(cameraSettings, playCopy.level);
    const camera = new CameraState(cameraStart);
    const inputs = new PlayInputs(playCopy.level);
    const triggers = new PlayTriggers(playCopy.level, playCopy.registry);
    const ending = new RunEnding();
    const warnings = new PlayWarnings();
    const report = new ReportCollector();
    const run = { ...playCopy, removals, camera, inputs, triggers, ending, warnings, report };
    const phases = [
        new InputPhase(),
        new PhysicsPhase(),
        new JointPathPhase(),
        new EventPhase(),
        new TriggerPhase(),
        new LevelBoundsPhase(),
        new CameraPhase(),
        new EndOfTickPhase(),
    ];
    const simulation = new Simulation(run, start, phases);

    return { ok: true, value: simulation };
}
