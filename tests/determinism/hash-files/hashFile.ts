import type { HeadlessTick } from '../../../src/core/simulation/index.ts';

// A recorded run as text, one line per tick: its number, its stateHash, then each body as id:hash, such as
// "12 0a1b2c3d 3:4e5f6a7b 4:8c9d0e1f". Lines starting with # are notes.
export function writeHashFile(levelName: string, ticks: readonly HeadlessTick[]) {
    const note = `# ${levelName}: ${ticks.length} ticks, written by npm run determinism:record. Never edit by hand.`;
    const lines = ticks.map((tick) => {
        const bodies = tick.bodies.map((body) => `${body.entityId}:${body.hash}`);

        return [tick.tick, tick.hash, ...bodies].join(' ');
    });

    return [note, ...lines, ''].join('\n');
}

export function readHashFile(text: string): HeadlessTick[] {
    const lines = text.split('\n').filter((textLine) => textLine !== '' && !textLine.startsWith('#'));

    return lines.map((textLine) => {
        const [tick = '', hash = '', ...bodies] = textLine.split(' ');

        return { tick: Number(tick), hash, bodies: bodies.map(readBodyHash) };
    });
}

function readBodyHash(text: string) {
    const [entityId = '', hash = ''] = text.split(':');

    return { entityId: Number(entityId), hash };
}
