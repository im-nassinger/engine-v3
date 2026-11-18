import { Circle, Pentagon, Square } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ShapeTool, ShapeToolKind } from '../../../../../editor/tools/index.ts';
import { useVersion } from '../../../../hooks/index.ts';
import { KindButton } from '../KindButton/index.ts';

export type ShapeKindsProps = {
    tool: ShapeTool;
};

type KindChoice = {
    readonly kind: ShapeToolKind;
    readonly label: string;
    readonly icon: LucideIcon;
};

// The Entities viewer's icons for the same kinds. A line is a polygon finished open, so it has no choice.
const KIND_CHOICES: readonly KindChoice[] = [
    { kind: 'rectangle', label: 'Rectangle', icon: Square },
    { kind: 'circle', label: 'Circle', icon: Circle },
    { kind: 'polygon', label: 'Polygon', icon: Pentagon },
];

// Rectangle, Circle and Polygon, the chosen one on.
export function ShapeKinds({ tool }: ShapeKindsProps) {
    // The kind is read from the same tool object each time it moves, so the React Compiler must not
    // keep an old answer.
    'use no memo';

    useVersion(tool.options);
    const chosen = tool.kind;

    return (
        <>
            {KIND_CHOICES.map((choice) => (
                <KindButton
                    key={choice.kind}
                    icon={choice.icon}
                    label={choice.label}
                    isOn={choice.kind === chosen}
                    onClick={() => tool.chooseKind(choice.kind)}
                />
            ))}
        </>
    );
}
