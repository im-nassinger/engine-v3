import type { ReadRefusal } from './ReadOutcome.ts';

// Thrown deep inside the reader and caught by it, so each check can stop the read in one line. It never
// leaves the reader.
export class ReadRefused extends Error {
    readonly refusal: ReadRefusal;

    constructor(refusal: ReadRefusal) {
        super(`Level refused: ${refusal.reason}`);
        this.refusal = refusal;
    }

    static damaged(detail: string) {
        return new ReadRefused({ reason: 'damaged', detail });
    }
}
