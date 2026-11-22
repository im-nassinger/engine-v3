import type { ComponentRegistry } from '../../components/index.ts';
import type { DerivedCaches } from '../../derived/index.ts';
import type { Level } from '../../level/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

import type { BodyMatrices } from '../bodies/BodyMatrices.ts';
import type { CameraState } from '../camera/CameraState.ts';
import type { PlayInputs } from '../inputs/PlayInputs.ts';
import type { PlayJoints } from '../joints/PlayJoints.ts';
import type { RemovalMarks } from '../removal/RemovalMarks.ts';
import type { PlayWarnings } from '../report/PlayWarnings.ts';
import type { ReportCollector } from '../report/ReportCollector.ts';
import type { PlayTriggers } from '../triggers/PlayTriggers.ts';

import type { RunEnding } from '../end/RunEnd.ts';

// Everything one run's tick phases share: the play copy, the components it was read with, its caches, the
// physics built from it, the bodies' poses, the joints still in the run, the entities marked for removal,
// the camera, the keys and inputs, the triggers, how the run ended, its warnings, and the report being
// gathered.
export type PlayRun = {
    readonly level: Level;
    readonly registry: ComponentRegistry;
    readonly caches: DerivedCaches;
    readonly scene: PhysicsScene;
    readonly poses: BodyPoses;
    readonly bodyMatrices: BodyMatrices;
    readonly joints: PlayJoints;
    readonly removals: RemovalMarks;
    readonly camera: CameraState;
    readonly inputs: PlayInputs;
    readonly triggers: PlayTriggers;
    readonly ending: RunEnding;
    readonly warnings: PlayWarnings;
    readonly report: ReportCollector;
};
