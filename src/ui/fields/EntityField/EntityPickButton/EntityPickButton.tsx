import { Crosshair } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EntityId } from '../../../../core/level/index.ts';
import type { PickEntity } from '../../../../editor/tools/index.ts';
import { useVersion } from '../../../hooks/index.ts';
import { IconButton } from '../../../shared/index.ts';
import { useEditorTools } from '../../../tools/index.ts';

export type EntityPickButtonProps = {
    isDisabled: boolean;
    onPicked: (entityId: EntityId) => void;
};

type Waiting = {
    readonly pick: PickEntity;
    readonly stop: () => void;
};

const DISABLED_REASON = 'Not while the field is off';

// The target icon at the end of an entity field: the next click in the level view picks the entity
// under the mouse. On while it waits; clicking it again, or Esc, stops waiting.
export function EntityPickButton({ isDisabled, onPicked }: EntityPickButtonProps) {
    // Whether it still waits is read from the same controller object each time it moves, so the React
    // Compiler must not keep an old answer.
    'use no memo';

    const { controller } = useEditorTools();
    useVersion(controller.version);
    const [waiting, setWaiting] = useState<Waiting | undefined>(undefined);

    useEffect(() => {
        return () => waiting?.stop();
    }, [waiting]);

    const isWaiting = waiting !== undefined && controller.isWaitingFor(waiting.pick);

    const toggle = () => {
        if (isWaiting) {
            waiting.stop();
            return;
        }

        const pick: PickEntity = (entityId) => {
            if (entityId === undefined) return;

            onPicked(entityId);
        };
        const stop = controller.waitForPick(pick);
        setWaiting({ pick, stop });
    };

    let disabledReason: string | undefined;
    if (isDisabled) {
        disabledReason = DISABLED_REASON;
    }

    return (
        <IconButton
            icon={Crosshair}
            label="Pick in the level view"
            isOn={isWaiting}
            disabledReason={disabledReason}
            onClick={toggle}
        />
    );
}
