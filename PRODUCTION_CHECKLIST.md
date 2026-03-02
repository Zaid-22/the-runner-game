# Production Readiness Checklist

This project is `READY` for production only when every required item below is complete.

## Gate 1: Automated CI (Required)

CI workflow: `.github/workflows/production-gate.yml`

- [ ] `npm ci` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `node ./scripts/release-sanity.mjs` succeeds.
- [ ] `node ./scripts/gameplay-flow-sanity.mjs` succeeds.
- [ ] `node ./scripts/smoke-preview.mjs` succeeds.

If any item fails, release status is `NOT READY`.

## Gate 2: Manual Gameplay QA (Required)

- [ ] Play 15+ minutes on `easy`, no soft-locks, no broken UI states.
- [ ] Play 20+ minutes on `medium`, no unavoidable death loops.
- [ ] Play 20+ minutes on `hard`, challenge is high but fair.
- [ ] Verify all wave bosses feel distinct (attack pacing and pattern).
- [ ] Verify pause/resume, restart, game-over, and victory flows.
- [ ] Verify power-up spawn cadence feels stable and intentional.

If any item fails, release status is `NOT READY`.

## Gate 3: Performance QA (Required)

- [ ] Desktop Chrome maintains smooth frame pacing through wave spikes.
- [ ] Firefox/Safari run without visual or input regressions.
- [ ] No major memory growth during a 20-minute session.

If any item fails, release status is `NOT READY`.

## Gate 4: Release Hygiene (Required)

- [ ] Version/changelog updated for this release.
- [ ] Rollback plan is documented.
- [ ] Final build artifact verified from current commit.

If any item fails, release status is `NOT READY`.

## Release Decision Record

- Status: `READY` or `NOT READY`
- Date:
- Commit SHA:
- CI run URL:
- QA owner:
- Notes/blockers:
