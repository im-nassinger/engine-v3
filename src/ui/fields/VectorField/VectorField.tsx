import type { Axis } from '../../../editor/commands/index.ts';
import type { MixedVector } from '../../../editor/inspector/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { numberInputOf } from '../typing/numberInputOf.ts';
import { VectorAxisBox } from './VectorAxisBox/index.ts';
import './VectorField.css';

const AXES: readonly Axis[] = ['x', 'y'];

// Two boxes side by side, X and Y, each typed like a number. A box commits only its own axis, and an
// axis the selected entities don't share reads Mixed on its own.
export function VectorField({ field, onCommitAxis }: FieldProps) {
    const definition = numberInputOf(field);
    const vector = field.value as MixedVector;

    return (
        <div className="vector-field">
            {AXES.map((axis) => (
                <VectorAxisBox
                    key={axis}
                    axis={axis}
                    definition={definition}
                    value={vector[axis]}
                    isDisabled={!field.isEnabled}
                    onCommit={onCommitAxis}
                />
            ))}
        </div>
    );
}
