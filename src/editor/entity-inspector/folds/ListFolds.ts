import type { ComponentTypeName } from '../../../core/components/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';

// Which list fields are unfolded, one switch per component type and field key, the same on every entity
// and every level. A list starts folded. Kept in memory only; folding is never an undo step.
export class ListFolds {
    readonly version = new VersionCounter();
    private readonly unfolded = new Set<string>();

    isFolded(typeName: ComponentTypeName, key: string) {
        const foldKey = foldKeyOf(typeName, key);

        return !this.unfolded.has(foldKey);
    }

    setFolded(typeName: ComponentTypeName, key: string, isFolded: boolean) {
        if (this.isFolded(typeName, key) === isFolded) return;

        const foldKey = foldKeyOf(typeName, key);
        if (isFolded) {
            this.unfolded.delete(foldKey);
        } else {
            this.unfolded.add(foldKey);
        }

        this.version.increment();
    }
}

function foldKeyOf(typeName: ComponentTypeName, key: string) {
    return `${typeName}.${key}`;
}
