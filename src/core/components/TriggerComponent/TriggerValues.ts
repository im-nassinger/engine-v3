import type { Trigger } from '../../fields/index.ts';

export type TriggerValues = {
    triggers: readonly Trigger[];
    // The id the next new trigger gets, so an id is never reused in this component, even after its trigger
    // is deleted: a Change value naming a deleted trigger reads as missing, not as another trigger.
    nextTriggerId: number;
};
