# Deploying

## TL;DR

The editor is published on Netlify at https://engine-v3.netlify.app (project `engine-v3`, linked in `.netlify/state.json`). The owner is logged in to Netlify; the token is in the system keychain, so the CLI config file shows none. Never ask the owner to log in: check with `npx -y netlify-cli status` first.

## How to deploy

1. `npm run check`, so nothing broken goes out.
2. `npm run build`, which writes `dist/`.
3. `npx -y netlify-cli deploy --prod --dir=dist --no-build`.

The Netlify CLI isn't installed globally, so it always runs through `npx -y netlify-cli`. Deploy only when the owner asks: it publishes.
