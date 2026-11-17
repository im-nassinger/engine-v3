# Stage 0 in steps: Project setup

## TL;DR

Approved by the owner on 2026-11-14. Each step ends with its checks passing and a commit.

| # | Step | Ends with |
|---|---|---|
| 1 | `package.json`, `.npmrc`, `.node-version`, `.gitignore`, the TypeScript configs, the folders with their `index.ts` | `npm run typecheck` passes |
| 2 | The empty page: `index.html`, `vite.config.ts`, `src/app/main.tsx` | `npm run build` and `npm run dev` work |
| 3 | ESLint and Prettier | `npm run lint` and `npm run format:check` pass |
| 4 | dependency-cruiser | `npm run deps` passes |
| 5 | Vitest in Node, and the guard tests | `npm test` passes, every guard test sees its check refuse |
| 6 | Vitest in three browsers, Playwright with one whole-app test. Downloads Playwright's browsers, and may need the owner's password for WebKit's system packages | `npm run test:browser` and `npm run test:e2e` pass |
| 7 | The CI workflow | Green on x86 and ARM. Needs a push: the [runner](../runner/README.md) pushes after each step (owner, 2026-11-14) |
| 8 | The docs: anything the build showed differs from [tooling.md](../architecture/tooling.md), `progress.md`, and `CLAUDE.md` (no longer "no code yet", and `npm run check` before every commit) | `node tools/check-docs.js` passes |
