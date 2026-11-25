import { useState } from 'react';
import type { ReactNode } from 'react';
import type {
    ScriptBlock as ScriptBlockModel,
    TriggerScript,
} from '../../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../../editor/session/index.ts';
import type { CommitTriggerEdit } from '../../CommitTriggerEdit.ts';
import { ScriptBlock } from './ScriptBlock/index.ts';
import { ScriptSlot } from './ScriptSlot/index.ts';
import './TriggerScriptBox.css';

export type TriggerScriptBoxProps = {
    openLevel: OpenLevel;
    script: TriggerScript;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// Each block draws above everything after it, so its tooth covers the top of the one under it (the mockup's
// scratch()): z-index counts down in reading order. An If's top and bottom bars draw above the blocks it holds.
const TOP_Z = 990;
const INSIDE_IF_Z = 900;
const IF_BAR_Z = 1000;

// A trigger's script: the event block, then the actions, inside the If's C when it has checks. An "add a
// block" slot opens at a gap when the mouse is on the top or bottom third of a block next to it, and stays
// open while its menu is. The timing, the motion and the scroll that keeps the hovered block still are task
// 24's (docs/versions/v4/tasks.md); here a slot opens and closes at once.
export function TriggerScriptBox({ openLevel, script, triggerIndex, commit }: TriggerScriptBoxProps) {
    const [hoveredGap, setHoveredGap] = useState<number | undefined>(undefined);
    const [menuGap, setMenuGap] = useState<number | undefined>(undefined);

    const [eventBlock] = script.blocks;
    const ifTop = script.blocks.find((block) => block.shape === 'ifTop');
    const ifBottom = script.blocks.find((block) => block.shape === 'ifBottom');
    const actions = script.blocks.filter((block) => block.shape === 'action');
    if (eventBlock === undefined) return null;

    const isGapOpen = (gap: number) => gap === hoveredGap || gap === menuGap;
    const blockProps = { openLevel, triggerIndex, commit, onHoverGap: setHoveredGap };
    const stepsProps = {
        ...blockProps,
        actions,
        gapCount: script.gaps.length,
        isGapOpen,
        isInsideIf: ifTop !== undefined,
        firstZ: ifTop === undefined ? TOP_Z - 1 : INSIDE_IF_Z,
        stepOf: (gap: number) => ({
            gap: script.gaps[gap],
            isMenuOpen: menuGap === gap,
            onMenuOpen: (isOpen: boolean) => setMenuGap(isOpen ? gap : undefined),
        }),
    };
    const eventIsEnd = ifTop === undefined && actions.length === 0 && !isGapOpen(0);

    return (
        <div className="trigger-script-box">
            <div className="script" onPointerLeave={() => setHoveredGap(undefined)}>
                <div className="stack">
                    <ScriptBlock block={eventBlock} zIndex={TOP_Z} isEnd={eventIsEnd} isLast={false} {...blockProps} />
                    {ifTop === undefined && <ScriptSteps {...stepsProps} />}
                    {ifTop !== undefined && ifBottom !== undefined && (
                        <ScriptIf ifTop={ifTop} ifBottom={ifBottom} {...blockProps}>
                            <ScriptSteps {...stepsProps} />
                        </ScriptIf>
                    )}
                </div>
            </div>
        </div>
    );
}

type BlockProps = {
    openLevel: OpenLevel;
    triggerIndex: number;
    commit: CommitTriggerEdit;
    onHoverGap: (gap: number | undefined) => void;
};

type ScriptIfProps = BlockProps & {
    ifTop: ScriptBlockModel;
    ifBottom: ScriptBlockModel;
    children: ReactNode;
};

// The If's C: its top bar with the checks, its arm beside the blocks it holds, its bottom bar. The arm opens
// no slot.
function ScriptIf({ ifTop, ifBottom, children, ...blockProps }: ScriptIfProps) {
    return (
        <div className="script-if" style={{ zIndex: TOP_Z - 1 }}>
            <ScriptBlock block={ifTop} zIndex={IF_BAR_Z} isEnd={false} isLast={false} {...blockProps} />
            <div className="middle">
                <div className="arm" onPointerMove={() => blockProps.onHoverGap(undefined)} />
                <div className="inner">{children}</div>
            </div>
            <ScriptBlock block={ifBottom} zIndex={IF_BAR_Z} isEnd={true} isLast={false} {...blockProps} />
        </div>
    );
}

type StepOf = (gap: number) => {
    gap: TriggerScript['gaps'][number] | undefined;
    isMenuOpen: boolean;
    onMenuOpen: (isOpen: boolean) => void;
};

type ScriptStepsProps = BlockProps & {
    actions: readonly ScriptBlockModel[];
    gapCount: number;
    isGapOpen: (gap: number) => boolean;
    isInsideIf: boolean;
    firstZ: number;
    stepOf: StepOf;
};

// The actions top to bottom, each after the slot of the gap above it, then the last gap's slot.
function ScriptSteps({ actions, gapCount, isGapOpen, isInsideIf, firstZ, stepOf, ...blockProps }: ScriptStepsProps) {
    const gaps = Array.from({ length: gapCount }, (_unused, gap) => gap);
    const lastGap = gapCount - 1;

    return gaps.map((gap) => {
        const action = actions[gap];
        const slotZ = firstZ - 2 * gap;
        const isLastAction = gap === lastGap - 1;
        const step = stepOf(gap);
        const isSlotShown = isGapOpen(gap) && step.gap !== undefined;
        const slotIsLast = gap === lastGap;

        return (
            <ScriptStep
                key={gap}
                action={action}
                slot={isSlotShown ? step.gap : undefined}
                slotIsLast={slotIsLast}
                slotZ={slotZ}
                isMenuOpen={step.isMenuOpen}
                onMenuOpen={step.onMenuOpen}
                actionIsEnd={isLastAction && !isGapOpen(lastGap)}
                actionIsLast={isLastAction && isInsideIf && !isGapOpen(lastGap)}
                slotPadsIf={slotIsLast && isInsideIf}
                isInsideIf={isInsideIf}
                {...blockProps}
            />
        );
    });
}

type ScriptStepProps = BlockProps & {
    action: ScriptBlockModel | undefined;
    slot: TriggerScript['gaps'][number] | undefined;
    slotIsLast: boolean;
    slotZ: number;
    isMenuOpen: boolean;
    onMenuOpen: (isOpen: boolean) => void;
    actionIsEnd: boolean;
    actionIsLast: boolean;
    slotPadsIf: boolean;
    isInsideIf: boolean;
};

function ScriptStep(props: ScriptStepProps) {
    const { action, slot, slotIsLast, slotZ, isMenuOpen, onMenuOpen, ...rest } = props;
    const { actionIsEnd, actionIsLast, slotPadsIf, isInsideIf, ...blockProps } = rest;
    const { triggerIndex, commit } = blockProps;

    return (
        <>
            {slot !== undefined && (
                <ScriptSlot
                    gap={slot}
                    zIndex={slotZ}
                    isEnd={slotIsLast}
                    isLast={slotPadsIf}
                    isInsideIf={isInsideIf}
                    isMenuOpen={isMenuOpen}
                    onMenuOpen={onMenuOpen}
                    triggerIndex={triggerIndex}
                    commit={commit}
                />
            )}
            {action !== undefined && (
                <ScriptBlock
                    block={action}
                    zIndex={slotZ - 1}
                    isEnd={actionIsEnd}
                    isLast={actionIsLast}
                    {...blockProps}
                />
            )}
        </>
    );
}
