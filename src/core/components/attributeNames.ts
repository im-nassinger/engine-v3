function labelWords(label: string) {
    const lowercaseLabel = label.toLowerCase();

    return lowercaseLabel.split(' ');
}

// "Linear damping" is linearDamping: the key of the field in code.
export function camelCaseOfLabel(label: string) {
    const [firstWord = '', ...laterWords] = labelWords(label);
    const capitalizedLaterWords = laterWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    return firstWord + capitalizedLaterWords.join('');
}

// "Linear damping" is linear_damping: the attribute Lua uses and the key in level.json.
export function snakeCaseOfLabel(label: string) {
    const words = labelWords(label);

    return words.join('_');
}
