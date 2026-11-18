import { Cable, CircleDot, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JointType } from '../../../../../core/components/index.ts';
import type { JointTool } from '../../../../../editor/tools/index.ts';
import { useVersion } from '../../../../hooks/index.ts';
import { KindButton } from '../KindButton/index.ts';

export type JointKindsProps = {
    tool: JointTool;
};

type TypeChoice = {
    readonly type: JointType;
    readonly label: string;
    readonly tooltip: string;
    readonly icon: LucideIcon;
};

// The Entities viewer's icons for the same types. Each tooltip adds the physics name, so people can find
// help elsewhere.
const TYPE_CHOICES: readonly TypeChoice[] = [
    { type: 'hinge', label: 'Hinge', tooltip: 'Hinge (revolute joint)', icon: CircleDot },
    { type: 'rope', label: 'Rope', tooltip: 'Rope (distance joint)', icon: Cable },
    { type: 'spring', label: 'Spring', tooltip: 'Spring (distance joint with a spring)', icon: Waves },
];

// Hinge, Rope and Spring, the chosen one on.
export function JointKinds({ tool }: JointKindsProps) {
    // The type is read from the same tool object each time it moves, so the React Compiler must not keep
    // an old answer.
    'use no memo';

    useVersion(tool.options);
    const chosen = tool.type;

    return (
        <>
            {TYPE_CHOICES.map((choice) => (
                <KindButton
                    key={choice.type}
                    icon={choice.icon}
                    label={choice.label}
                    tooltip={choice.tooltip}
                    isOn={choice.type === chosen}
                    onClick={() => tool.chooseType(choice.type)}
                />
            ))}
        </>
    );
}
