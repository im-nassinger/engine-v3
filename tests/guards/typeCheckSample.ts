import ts from 'typescript';

const projectRoot = new URL('../../', import.meta.url).pathname;

function readCompilerOptions(configPath: string) {
    const absoluteConfigPath = `${projectRoot}${configPath}`;
    const parsedConfig = ts.getParsedCommandLineOfConfigFile(absoluteConfigPath, undefined, {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
            throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        },
    });
    if (!parsedConfig) throw new Error(`Could not read ${configPath}.`);

    return parsedConfig.options;
}

// Compiles one sample file with the settings of a part's tsconfig and returns the error messages.
export function typeCheckSample(samplePath: string, configPath: string) {
    const options = readCompilerOptions(configPath);
    const absoluteSamplePath = `${projectRoot}${samplePath}`;

    const program = ts.createProgram({ rootNames: [absoluteSamplePath], options });
    const diagnostics = ts.getPreEmitDiagnostics(program);

    return diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}
