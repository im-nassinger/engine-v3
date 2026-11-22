import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// Builds the tick's InputState from the keys held and pressed, for the events the tick lists.
export class InputPhase implements TickPhase {
    run(tick: TickContext) {
        tick.run.inputs.advance(tick.inputs);
    }
}
