import type { DerivedCaches } from '../../derived/index.ts';
import type { Level } from '../../level/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

import type { BodyMatrices } from '../bodies/BodyMatrices.ts';
import type { ReportCollector } from '../report/ReportCollector.ts';

// Everything one run's tick phases share: the play copy, its caches, the physics built from it, the
// bodies' poses and the report being gathered.
export type PlayRun = {
    readonly level: Level;
    readonly caches: DerivedCaches;
    readonly scene: PhysicsScene;
    readonly poses: BodyPoses;
    readonly bodyMatrices: BodyMatrices;
    readonly report: ReportCollector;
};
