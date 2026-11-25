import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

import { HighDetailRule } from './HighDetailRule.ts';
import { MissingEntityRule } from './MissingEntityRule.ts';
import { MissingInputsRule } from './MissingInputsRule.ts';
import { MissingPartnerRule } from './MissingPartnerRule.ts';

// Every editor message rule, v1's and the ones later versions added.
export function createV1Rules(): readonly EditorMessageRule[] {
    return [new MissingPartnerRule(), new MissingEntityRule(), new HighDetailRule(), new MissingInputsRule()];
}
