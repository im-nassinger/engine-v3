import type { HeadlessTick } from '../../../src/core/simulation/index.ts';

export type Difference = {
    readonly tick: number;
    // The first body whose numbers differ, or undefined when only the tick, the camera or which bodies are
    // still in the run differ.
    readonly entityId: number | undefined;
};

// The first tick whose state differs between two runs, and the first body in it that differs.
export function firstDifference(run: readonly HeadlessTick[], recorded: readonly HeadlessTick[]) {
    const tickCount = Math.max(run.length, recorded.length);

    for (let index = 0; index < tickCount; index += 1) {
        const ran = run[index];
        const expected = recorded[index];
        if (ran?.hash === expected?.hash) continue;

        return { tick: ran?.tick ?? expected?.tick ?? index + 1, entityId: firstDifferentBody(ran, expected) };
    }

    return undefined;
}

function firstDifferentBody(ran: HeadlessTick | undefined, expected: HeadlessTick | undefined) {
    const ranBodies = ran?.bodies ?? [];
    const expectedBodies = expected?.bodies ?? [];
    const bodyCount = Math.max(ranBodies.length, expectedBodies.length);

    for (let index = 0; index < bodyCount; index += 1) {
        const ranBody = ranBodies[index];
        const expectedBody = expectedBodies[index];
        if (ranBody?.entityId !== expectedBody?.entityId) return expectedBody?.entityId ?? ranBody?.entityId;
        if (ranBody?.hash !== expectedBody?.hash) return ranBody?.entityId;
    }

    return undefined;
}
