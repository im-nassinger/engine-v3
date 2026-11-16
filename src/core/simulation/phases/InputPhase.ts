import type { TickContext, TickPhase } from '../run/TickPhase.ts';
import type { TickInputs } from '../run/TickInputs.ts';

const NOTHING_HELD: TickInputs = { heldKeys: [] };

// Records the tick's inputs. Nothing reads them in v1; v2's EventPhase turns them into key events.
export class InputPhase implements TickPhase {
    private latest = NOTHING_HELD;

    get latestInputs() {
        return this.latest;
    }

    run(tick: TickContext) {
        this.latest = tick.inputs;
    }
}
