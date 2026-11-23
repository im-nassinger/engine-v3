# Deploying

## TL;DR

The editor is published on Netlify at https://ecs-engine.netlify.app (project `ecs-engine`, on the owner's second Netlify account, linked in `.netlify/state.json`), since 2026-11-23. The first account's https://engine-v3.netlify.app stays at the last version it got: that account ran out of deploy credits. The CLI holds both accounts; `npx -y netlify-cli switch` picks the active one, and the second account's token is in the CLI config file. Never ask the owner to log in: check with `npx -y netlify-cli status` first.

## How to deploy

1. `npm run check`, so nothing broken goes out.
2. `npm run build`, which writes `dist/`.
3. `npx -y netlify-cli deploy --prod --dir=dist --no-build`.

The Netlify CLI isn't installed globally, so it always runs through `npx -y netlify-cli`. Deploy only when the owner asks: it publishes.
