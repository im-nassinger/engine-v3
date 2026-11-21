import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import type { EditOutcome, ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { holdersOf } from './componentEdits.ts';
import { setFieldValue } from './setFieldValue.ts';

// Which field a slider drags, on every entity the Entity inspector shows.
export type SlidField = {
    readonly openLevel: OpenLevel;
    readonly entityIds: readonly EntityId[];
    readonly componentType: ComponentTypeName;
    readonly key: string;
};

// How a slide ended: as an edit, or put back by Esc, so the dragged control can show the start again.
export type SlideOutcome = EditOutcome | { readonly kind: 'putBack' };

// A field of the Entity inspector while dragged, a number's slider or a gradient's stop: each move changes the
// level through LiveEdit, with no history, and the release makes one step, "Change Linear damping", as typing
// the value would. Esc during the drag puts the start values back; later moves change nothing and the release
// makes no step. A derived field, or a drag begun while another live edit runs, only changes the level on
// release.
export class FieldSlide {
    private readonly slid: SlidField;
    private targets: readonly ValueTarget[] = [];
    private label = '';
    private isLive = false;

    constructor(slid: SlidField) {
        this.slid = slid;
    }

    slideTo(value: unknown) {
        if (!this.isLive && !this.begin()) return;

        const { liveEdit } = this.slid.openLevel;
        if (!liveEdit.isActive) return;

        for (const target of this.targets) {
            liveEdit.update(target, value);
        }
    }

    release(value: unknown): SlideOutcome {
        const { openLevel, entityIds, componentType, key } = this.slid;
        if (!this.isLive) return setFieldValue(openLevel, entityIds, componentType, key, value);

        this.isLive = false;
        const { liveEdit } = openLevel;
        const wasCancelled = !liveEdit.isActive;
        if (wasCancelled) return { kind: 'putBack' };

        liveEdit.commit(`Change ${this.label}`);

        return { kind: 'done' };
    }

    // The slider went away mid-drag, so no release will come: the start values go back.
    cancel() {
        if (!this.isLive) return;

        this.isLive = false;
        this.slid.openLevel.liveEdit.cancel();
    }

    private begin() {
        const { openLevel, entityIds, componentType, key } = this.slid;
        const { liveEdit, level } = openLevel;
        if (liveEdit.isActive) return false;

        const holders = holdersOf(level, entityIds, componentType);
        const firstHolder = holders[0];
        if (firstHolder === undefined) return false;

        const storedField = firstHolder.component.schema.findField(key);
        if (storedField === undefined) return false;

        this.label = storedField.label;
        this.targets = holders.map((held) => ({ entityId: held.entity.id, schema: held.component.schema, key }));
        if (!liveEdit.begin(this.targets)) return false;
        this.isLive = true;

        return true;
    }
}
