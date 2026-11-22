import { describe, expect, test } from 'vitest';

import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';

import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';

import { startSimulation } from './startSimulation.ts';

const START = { clockTimeMs: 0 };

function startNewLevel() {
    const levelData = new LevelWriter().write(Level.createNew());
    const started = startSimulation(levelData, new ScriptedEngine(), START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);

    return started.value;
}

describe("a run's inputs", () => {
    test("InputPhase builds each tick's InputState from the keys held and pressed", () => {
        const simulation = startNewLevel();

        simulation.runTick({ heldKeys: ['KeyD'], pressedKeys: ['KeyD', 'Space'] });
        expect(simulation.inputs.input('right')).toEqual({ pressed: true, released: false, held: true });
        expect(simulation.inputs.input('jump')).toEqual({ pressed: true, released: false, held: true });

        simulation.runTick({ heldKeys: ['KeyD'], pressedKeys: [] });
        expect(simulation.inputs.input('right')).toEqual({ pressed: false, released: false, held: true });
        expect(simulation.inputs.key('Space')).toEqual({ pressed: false, released: true, held: false });

        simulation.destroy();
    });
});
