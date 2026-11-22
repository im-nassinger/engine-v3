import type { TriggerComponent } from '../../../../../core/components/index.ts';
import type { TriggerEdit } from '../../../../../editor/entity-inspector/index.ts';

// How every part of the trigger card changes it: it builds its edit from the component as it is now, and
// the card commits it as one step. undefined makes no step, such as a number typed into no word.
export type CommitTriggerEdit = (makeEdit: (component: TriggerComponent) => TriggerEdit | undefined) => void;
