import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const reactCompiler = reactCompilerPreset();

export default defineConfig({
    plugins: [react(), babel({ presets: [reactCompiler] })],
});
