import type { SkippedEntity } from '../history/index.ts';

// What outcomeText needs of a command's outcome. A shape, so editor/status never imports editor/commands.
export type ReportedOutcome =
    | { readonly kind: 'done'; readonly text?: string; readonly skipped?: readonly SkippedEntity[] }
    | { readonly kind: 'refused'; readonly reason: string };

// The status bar's sentence for a command's outcome, or undefined when there is nothing to say.
export function outcomeText(outcome: ReportedOutcome) {
    if (outcome.kind === 'refused') return outcome.reason;

    const skippedText = keptText(outcome.skipped ?? []);
    const sentences: string[] = [];

    if (outcome.text !== undefined) {
        sentences.push(outcome.text);
    }
    if (skippedText !== undefined) {
        sentences.push(skippedText);
    }

    if (sentences.length === 0) return undefined;

    return sentences.join('. ');
}

function keptText(skipped: readonly SkippedEntity[]) {
    const keptWorld = skipped.some((entity) => entity.kind === 'world');
    const keptCamera = skipped.some((entity) => entity.kind === 'camera');

    if (keptWorld && keptCamera) return 'World and camera kept';
    if (keptWorld) return 'World kept';
    if (keptCamera) return 'Camera kept';

    return undefined;
}
