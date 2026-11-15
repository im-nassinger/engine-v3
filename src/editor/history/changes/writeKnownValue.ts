import type { AnyComponent, AnyValueEntry } from '../../../core/components/index.ts';

// A value the component held before is written back through the file format, the one path that parses
// every value type. A refusal means the change was built wrong, so it throws.
export function writeKnownValue(component: AnyComponent, entry: AnyValueEntry, value: unknown) {
    const asInFile = entry.type.serialize(value);
    const written = component.writeValue(entry.key, asInFile);
    if (written.ok) return;

    throw new Error(`${component.schema.typeName}'s ${entry.key} refused a value it held before.`);
}
