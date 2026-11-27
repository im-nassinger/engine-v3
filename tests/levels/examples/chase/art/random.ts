// A small seeded random for placing scenery, so the level is built the same every time.
export class SeededRandom {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    // A number from 0 up to 1.
    next() {
        this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;

        return this.state / 4294967296;
    }

    between(low: number, high: number) {
        return low + (high - low) * this.next();
    }

    pick<T>(items: readonly T[]): T {
        const item = items[Math.floor(this.next() * items.length)];
        if (item === undefined) throw new Error('Nothing to pick from.');

        return item;
    }
}
