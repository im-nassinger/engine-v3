import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

const projectRoot = new URL('../../', import.meta.url).pathname;

// The sample never exists on disk, so the type-aware project service can't find it.
// These guards test import and call rules, which need no types.
const eslint = new ESLint({
    cwd: projectRoot,
    overrideConfig: [tseslint.configs.disableTypeChecked],
});

export async function lintSample(code: string, filePath: string) {
    const results = await eslint.lintText(code, { filePath });
    const messages = results.flatMap((result) => result.messages);

    return messages.map((message) => message.ruleId ?? message.message);
}
