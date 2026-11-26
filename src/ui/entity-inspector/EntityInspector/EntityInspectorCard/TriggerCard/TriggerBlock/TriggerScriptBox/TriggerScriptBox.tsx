import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type {
    ScriptBlock as ScriptBlockModel,
    TriggerScript,
} from '../../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../../editor/session/index.ts';
import type { CommitTriggerEdit } from '../../CommitTriggerEdit.ts';
import { ScriptBlock } from './ScriptBlock/index.ts';
import { ScriptSlot } from './ScriptSlot/index.ts';
import { SlotMotion } from './slot-motion/SlotMotion.ts';
import { ScriptView } from './script-view/ScriptView.ts';
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

// The boxes a value box opens float over the card but sit inside the script (ScriptBlock).
const FLOATING_BOXES = '.menu, .entity-picker, .trigger-word-field';

// A trigger's script: the event block, then the actions, inside the If's C when it has checks. Every gap has
// an "add a block" slot, hidden until the mouse asks for it from the top or bottom third of a block next to
// it; SlotMotion opens and closes it, and keeps the hovered block still. A slot stays open while its menu is.
export function TriggerScriptBox({ openLevel, script, triggerIndex, commit }: TriggerScriptBoxProps) {
    const [menuGap, setMenuGap] = useState<number | undefined>(undefined);
    const [motion] = useState(() => new SlotMotion());
    const [view] = useState(() => new ScriptView());
    const scriptRef = useRef<HTMLDivElement>(null);
    const verticalBarRef = useRef<HTMLDivElement>(null);
    const horizontalBarRef = useRef<HTMLDivElement>(null);

    // Attached as the blocks are put on screen, before the browser can send them a pointer move: a move that
    // came first would start a frame with no script, and the slot would not open until the next move.
    useLayoutEffect(() => {
        motion.attach(scriptRef.current);
        return () => motion.dispose();
    }, [motion]);

    useEffect(() => {
        view.attach(scriptRef.current, verticalBarRef.current, horizontalBarRef.current);
        return () => view.dispose();
    }, [view]);

    const [eventBlock] = script.blocks;
    const ifTop = script.blocks.find((block) => block.shape === 'ifTop');
    const ifBottom = script.blocks.find((block) => block.shape === 'ifBottom');
    const actions = script.blocks.filter((block) => block.shape === 'action');
    if (eventBlock === undefined) return null;

    const onHover = (gap: number | undefined, hovered: Element) => motion.hover(gap, hovered);
    const blockProps = { openLevel, triggerIndex, commit, onHover };
    const stepsProps = {
        ...blockProps,
        actions,
        gapCount: script.gaps.length,
        isInsideIf: ifTop !== undefined,
        firstZ: ifTop === undefined ? TOP_Z - 1 : INSIDE_IF_Z,
        onAdd: () => motion.added(),
        stepOf: (gap: number) => ({
            gap: script.gaps[gap],
            isMenuOpen: menuGap === gap,
            onMenuOpen: (isOpen: boolean) => {
                const heldGap = isOpen ? gap : undefined;
                setMenuGap(heldGap);
                motion.holdOpen(heldGap);
            },
        }),
    };
    const eventIsEnd = ifTop === undefined && actions.length === 0;

    // Below the last block, the last gap's slot is asked for (owner, 2026-11-26), with nothing kept still, so
    // the slot opens under the blocks. Over the rest of the script's empty space or the If's arm, no slot is
    // asked for; the arm is kept still.
    const lastGap = script.gaps.at(-1)?.index;
    const hoverScript = (event: PointerEvent<HTMLDivElement>) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest(`.script-block, .script-slot, .script-bar, ${FLOATING_BOXES}`) !== null) return;

        const arm = target.closest('.arm');
        if (arm === null && isBelowBlocks(scriptRef.current, event.clientY)) {
            motion.hover(lastGap, null);
            return;
        }

        motion.hover(undefined, arm);
    };

    return (
        <div className="trigger-script-box" onPointerMove={hoverScript} onPointerLeave={() => motion.leave()}>
            <div className="script" ref={scriptRef}>
                <div className="room" />
                <div className="stack">
                    <ScriptBlock block={eventBlock} zIndex={TOP_Z} isEnd={eventIsEnd} isLast={false} {...blockProps} />
                    {ifTop === undefined && <ScriptSteps {...stepsProps} />}
                    {ifTop !== undefined && ifBottom !== undefined && (
                        <ScriptIf ifTop={ifTop} ifBottom={ifBottom} {...blockProps}>
                            <ScriptSteps {...stepsProps} />
                        </ScriptIf>
                    )}
                </div>
                <div className="room" />
            </div>
            <div className="script-bar vertical" ref={verticalBarRef} />
            <div className="script-bar horizontal" ref={horizontalBarRef} />
        </div>
    );
}

// Whether a mouse at `clientY` is under the script's last block (or its open last slot): below the stack,
// which ends with them, less its 2 px of padding.
const STACK_PADDING_PX = 2;

function isBelowBlocks(script: HTMLElement | null, clientY: number) {
    const stack = script?.querySelector('.stack');
    if (stack === null || stack === undefined) return false;

    return clientY > stack.getBoundingClientRect().bottom - STACK_PADDING_PX;
}

type BlockProps = {
    openLevel: OpenLevel;
    triggerIndex: number;
    commit: CommitTriggerEdit;
    onHover: (gap: number | undefined, hovered: Element) => void;
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
                <div className="arm" />
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
    isInsideIf: boolean;
    firstZ: number;
    onAdd: () => void;
    stepOf: StepOf;
};

// The actions top to bottom, each after the slot of the gap above it, then the last gap's slot.
function ScriptSteps({ actions, gapCount, isInsideIf, firstZ, stepOf, onAdd, ...blockProps }: ScriptStepsProps) {
    const gaps = Array.from({ length: gapCount }, (_unused, gap) => gap);
    const lastGap = gapCount - 1;

    return gaps.map((gap) => {
        const action = actions[gap];
        const slotZ = firstZ - 2 * gap;
        const isLastAction = gap === lastGap - 1;
        const step = stepOf(gap);
        const slotIsLast = gap === lastGap;

        return (
            <ScriptStep
                key={gap}
                action={action}
                slot={step.gap}
                slotIsLast={slotIsLast}
                slotZ={slotZ}
                isMenuOpen={step.isMenuOpen}
                onMenuOpen={step.onMenuOpen}
                onAdd={onAdd}
                actionIsEnd={isLastAction}
                actionIsLast={isLastAction && isInsideIf}
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
    onAdd: () => void;
    actionIsEnd: boolean;
    actionIsLast: boolean;
    slotPadsIf: boolean;
    isInsideIf: boolean;
};

function ScriptStep(props: ScriptStepProps) {
    const { action, slot, slotIsLast, slotZ, isMenuOpen, onMenuOpen, onAdd, ...rest } = props;
    const { actionIsEnd, actionIsLast, slotPadsIf, isInsideIf, ...blockProps } = rest;
    const { triggerIndex, commit, onHover } = blockProps;

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
                    onHover={onHover}
                    onAdd={onAdd}
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
