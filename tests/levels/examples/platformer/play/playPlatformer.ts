import type { PhysicsEngine } from '../../../../../src/core/physics/index.ts';
import { NameComponent, VariablesComponent } from '../../../../../src/core/components/index.ts';
import type { VariableValue } from '../../../../../src/core/fields/index.ts';
import { LevelWriter } from '../../../../../src/core/level-data/index.ts';
import type { LevelData } from '../../../../../src/core/level-data/index.ts';
import { runHeadless } from '../../../../../src/core/simulation/index.ts';
import type { Simulation } from '../../../../../src/core/simulation/index.ts';
import { recordedInputs } from './recordedKeys.ts';
import type { KeyHold } from './recordedKeys.ts';

import { buildPlatformer } from '../buildPlatformer.ts';

// What one tick of the example platformer left: where the blob is, its own variables, and how the run
// ended. The blob's pose comes from the tick report, since only physics knows where a body is.
export type BlobTick = {
    readonly tick: number;
    readonly x: number;
    readonly y: number;
    readonly variables: Readonly<Record<string, VariableValue>>;
    readonly end: string | null;
    readonly warnings: number;
};

const POSE_STRIDE = 5;

type BuiltPlatformer = ReturnType<typeof buildPlatformer>;

// The level as the editor would save it, after an optional change such as a different start.
export function platformerLevelData(change?: (built: BuiltPlatformer) => void): LevelData {
    const built = buildPlatformer();
    if (change !== undefined) {
        change(built);
    }

    return new LevelWriter().write(built.level);
}

function blobOf(simulation: Simulation) {
    for (const entity of simulation.level.entitiesInPanelOrder()) {
        const name = entity.getComponent(NameComponent)?.get('name');
        if (name === 'Blob') return entity;
    }
    throw new Error('The level has no Blob.');
}

export function playPlatformer(
    engine: PhysicsEngine,
    ticks: number,
    holds: readonly KeyHold[],
    levelData: LevelData = platformerLevelData(),
) {
    const recorded: BlobTick[] = [];
    let x = Number.NaN;
    let y = Number.NaN;

    const afterTick = (simulation: Simulation) => {
        const blob = blobOf(simulation);
        const report = simulation.takeReport();
        for (let i = 0; i < report.poses.length; i += POSE_STRIDE) {
            if (report.poses[i] !== blob.id) continue;
            x = report.poses[i + 1] ?? x;
            y = report.poses[i + 2] ?? y;
        }

        const variables: Record<string, VariableValue> = {};
        for (const variable of blob.getComponent(VariablesComponent)?.get('variables') ?? []) {
            variables[variable.name] = variable.value;
        }

        recorded.push({
            tick: simulation.tick,
            x,
            y,
            variables,
            end: simulation.end?.kind ?? null,
            warnings: simulation.warnings.length,
        });
    };

    const outcome = runHeadless(levelData, engine, {
        ticks,
        start: { clockTimeMs: 0 },
        inputsAt: recordedInputs(holds),
        afterTick,
    });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return recorded;
}
