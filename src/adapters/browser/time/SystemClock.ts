import type { Clock } from '../../../editor/time/index.ts';

// The computer's clock behind the editor's Clock contract.
export class SystemClock implements Clock {
    nowMs() {
        return Date.now();
    }
}
