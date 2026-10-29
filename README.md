# MOORKYZ ChatFlow

**Search. Organize. Analyze. Export.**

**Repository slug:** `moorkyz-chatflow` · **Version:** `1.0.0` · **Cost:** 100% free · **Runtime:** Local-first, browser-based.

> This repository starts with a usable local ChatGPT-export explorer. The wider features in [PRODUCT_SPEC](docs/PRODUCT_SPEC.md) remain a roadmap; native ChatGPT mutations and live automation are not implemented.

## Get running

On Windows:

```bat
RUN.cmd
```

The launcher checks the Node.js 24 LTS runtime, files, script syntax and tests, then opens `http://127.0.0.1:18764/`. No `npm install` needed. For Linux/macOS, run `node server.mjs --port=18764` and open that address.

**First time?** Read the [Setup Guide](docs/SETUP.html), then the [Examples](docs/EXAMPLES.html) and [Usage Guide](docs/USAGE.html). The app header has **READ THE DOCS** and the onboarding view includes **First Time? Need help?**.

## What works in 1.0.0

- Official export import (`conversations.json` or supported ZIP).
- Search messages/titles, AND/NOT phrases, role/date/sort filters.
- Choose matching, first/last/random N, invert selection and view active chat branch.
- Single and multiple conversation statistics, with links back to original chats.
- Chat exports to TXT, JSON, CSV, HTML and print-to-PDF; one file per chat/day/month, locally packaged in a ZIP when needed.
- Local sample data and example export fixture.
- Responsive, restrained ChatGPT-compatible UI; shared Moorkyz footer mark/style.

## Not yet implemented

Directly moving chats into ChatGPT projects, editing titles in ChatGPT, deleting/archiving/locking ChatGPT chats, managing live shared links, automatic account synchronization, attachment extraction, browser-extension packaging, and alternative-branch / multimodal content analysis. The current app is a locally running web workspace, **not an installed extension**. These features are documented for later development and will only be integrated using permitted, verified access methods, without bypassing rate limits or protection mechanisms.

## Structure

```text
moorkyz-chatflow/
├── RUN.cmd                        Windows launcher
├── scripts/Start-ChatFlow.ps1      Setup, validation, start
├── server.mjs                     Local-only HTTP server
├── package.json                   Version 1.0.0, scripts
├── src/index.html                 UI shell
├── src/style.css                  UI & Moorkyz footer
├── src/app.js                      Browser controller
├── src/core.js                     Data normalization, search, stats, export
├── public/favicon/               Original Moorkyz-inspired brand favicon assets
├── docs/index.html                Read the docs landing
├── docs/SETUP.md/.html            Installation guide
├── docs/EXAMPLES.md/.html         Example workflows
├── docs/USAGE.md/.html            Use guide
├── docs/TROUBLESHOOTING.md/.html  Troubleshooting
├── docs/PRODUCT_SPEC.md           Full product backlog / specification
├── examples/conversations.sample.json
└── tests/core.test.mjs
```

## Verify

```sh
node --check server.mjs
node --check src/app.js
node --check src/core.js
node --test tests/core.test.mjs
```

This initial release uses zero runtime package dependencies. The source template's opt-in tooling (`moorkyz-template`) remains a separate baseline; additional agent orchestration and maintenance workflows can be adopted incrementally rather than copied indiscriminately.

## Safety

- Bind only to `127.0.0.1`; never expose the web server on the LAN/public internet.
- No programmatic account scraping or use of undocumented private ChatGPT APIs.
- Do not circumvent service limits; prefer official exports and user-initiated workflows.
- Imports are processed in browser memory; refresh or close the tab to clear them.
- Do not commit exported conversation data or secrets.

## Brand and source references

- [moorkyz-site footer component](https://github.com/Moorky/moorkyz-site/blob/master/src/components/site-footer.tsx) and [footer styling](https://github.com/Moorky/moorkyz-site/blob/master/src/app/globals.css).
- [Moorkyz logo source](https://github.com/Moorky/moorkyz-site/blob/master/src/components/logo-mark.tsx).
- [moorkyz-template](https://github.com/Moorky/moorkyz-template), especially the workflow and verification principles in `AGENTS.md`.

License: Apache-2.0. ChatGPT is a trademark of OpenAI; this is an independent project and is not affiliated with OpenAI.