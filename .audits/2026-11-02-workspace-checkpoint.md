# Preserve pending version and repository documentation

- Date: 2026-11-02.
- Baseline: `f43142b`.
- Authority: owner explicitly requested committing all remaining unstaged work.
- Reviewer: Copilot SDK in VS Code; scoped self-review.
- Outcome: verified local checkpoint, not a store release.

Preserved the existing version 1.0.0 changes in package/lock/extension manifests,
checkout instructions and the owner-modified historical audit. No dependency
versions or extension behavior were added by this checkpoint.

## Verification

`npm run verify` with cached Node.js 24.22.2 passed typecheck, lint, formatting,
191 tests in 11 files, build and package verification.

The current unsigned artifact has 11 files, 32,690 bytes and SHA-256
`ae50f6bf4d61160b7886a812021365dd114f218abd6246de15a63ddd20319cda`.
This is the actual current build result; the historical audit's older size/hash
is retained as supplied and is not recertified as the current artifact.

Bounded credential-signature and whitespace checks passed. Original bytes and
index are preserved in the external verified checkpoint snapshot. No real chat
exports or generated packages are staged. Existing branch divergence remains;
no merge, push, live-account test or store publication was performed.
