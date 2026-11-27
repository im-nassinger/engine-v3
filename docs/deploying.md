# Deploying

## TL;DR

The editor is published on Netlify at https://ecs-engine-2.netlify.app (project `ecs-engine-2`, on the owner's third Netlify account, team slug `nassingero`, linked in `.netlify/state.json`), since 2026-11-27. The two older accounts ran out of deploy credits and their sites stay at the last version they got: https://engine-v3.netlify.app (first account) and https://ecs-engine.netlify.app (second account, 2026-11-23 to 2026-11-27, last at commit `c2f2a2e`). The CLI is logged in to the third account only. Never ask the owner to log in: check with `npx -y netlify-cli status` first.

## How to deploy

1. `npm run check`, so nothing broken goes out.
2. `npm run build`, which writes `dist/`.
3. `npx -y netlify-cli deploy --prod --dir=dist --no-build`.

The Netlify CLI isn't installed globally, so it always runs through `npx -y netlify-cli`. Deploy only when the owner asks: it publishes.

## The trigger card mockup

`docs/design/mockups/triggers.html` is published on its own site, https://engine-v3-triggers.netlify.app (project `engine-v3-triggers`, same account), since 2026-11-24, so it never replaces the editor on `ecs-engine` (owner). It is one self-contained page: copy it as `index.html` into an empty folder outside the project, then run `npx -y netlify-cli deploy --prod --dir=. --no-build --site engine-v3-triggers` from there.
