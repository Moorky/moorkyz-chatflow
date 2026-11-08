# Contributing

Thank you for your interest in MOORKYZ ChatFlow. Read the [README](README.md),
the [testing guide](docs/TESTING.md), [AGENTS.md](AGENTS.md) and the
[task scheduler](AGENT_SCHEDULER.md) before changing code.

## Ground rules

- ChatFlow is local-first. Do not add network or host permissions, content
  scripts, analytics, remote code, account access or live-account actions.
- Use only synthetic data in tests, issues, screenshots and pull requests. Never
  share real exports, conversation text, credentials or device paths.
- Work on scoped requests only. The V5 backlog in the README is informational.
- ChatFlow is licensed under the [Apache License 2.0](LICENSE). Unless you state
  otherwise, contributions you submit are licensed under the same terms
  (Apache-2.0, section 5).

## Development

```powershell
npm ci
npx playwright install chromium
npm run test:all
```

`npm run test:all` runs typecheck, lint, format check, unit/integration tests
with coverage gates, the production build and package check, and the browser
suite. Keep it green, add behavior-based tests for every change, and describe
the commands you ran and their results in your pull request.

Dependencies are pinned. Change them only when required, keep
`package-lock.json` consistent with the registry, and never bypass npm
integrity verification.

## Security issues

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
