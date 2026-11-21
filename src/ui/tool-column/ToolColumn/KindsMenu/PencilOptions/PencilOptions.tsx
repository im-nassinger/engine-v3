import type { LucideIcon } from 'lucide-react';
import type { PencilSmoothness, PencilTool } from '../../../../../editor/tools/index.ts';
import { useVersion } from '../../../../hooks/index.ts';
import { KindButton } from '../KindButton/index.ts';
import { SmoothHigh, SmoothLow, SmoothMedium } from './smoothnessIcons.ts';
import './PencilOptions.css';

export type PencilOptionsProps = {
    tool: PencilTool;
};

type SmoothnessChoice = {
    readonly smoothness: PencilSmoothness;
    readonly label: string;
    readonly icon: LucideIcon;
};

const SMOOTHNESS_CHOICES: readonly SmoothnessChoice[] = [
    { smoothness: 'low', label: 'Low', icon: SmoothLow },
    { smoothness: 'medium', label: 'Medium', icon: SmoothMedium },
    { smoothness: 'high', label: 'High', icon: SmoothHigh },
];

// The Pencil's smoothness under its SMOOTHNESS title: Low, Medium and High, the chosen one on.
export function PencilOptions({ tool }: PencilOptionsProps) {
    // The smoothness is read from the same tool object each time it moves, so the React Compiler must not
    // keep an old answer.
    'use no memo';

    useVersion(tool.options);
    const chosen = tool.smoothness;

    return (
        <div className="pencil-options">
            <div className="title">Smoothness</div>
            {SMOOTHNESS_CHOICES.map((choice) => (
                <KindButton
                    key={choice.smoothness}
                    icon={choice.icon}
                    label={choice.label}
                    isOn={choice.smoothness === chosen}
                    onClick={() => tool.chooseSmoothness(choice.smoothness)}
                />
            ))}
        </div>
    );
}
