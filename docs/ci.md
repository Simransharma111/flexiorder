# Continuous Integration

FlexiOrder uses GitHub Actions through `.github/workflows/test.yml`. The
workflow runs for pull requests and pushes to `main`, by manual dispatch, and
on a weekly schedule.

## Quality gates

The pipeline has four jobs:

1. `Lint, Unit Tests & Build` installs the locked dependencies, runs ESLint,
   Vitest, a production build, and a high-severity dependency audit.
2. `E2E Tests` runs the mobile and desktop Chromium projects across two
   Playwright shards. Any failed or flaky test fails its shard.
3. `Burn-In` repeats the E2E suite ten times on pull requests and the weekly
   schedule to expose unstable behavior.
4. `Test Report` merges shard reports and writes a summary to the Actions run.

The jobs use Node from `.nvmrc`, npm's lockfile cache, and a Playwright browser
cache. The workflow has read-only repository permissions.

## Run the same checks locally

Install the exact dependency tree and browser once:

```bash
npm ci
npx playwright install chromium
```

Then run the complete local gate:

```bash
./scripts/ci-local.sh
```

Other useful commands:

```bash
./scripts/burn-in.sh 10
./scripts/test-changed.sh main
```

## Reports and diagnostics

Every E2E shard uploads JUnit XML and a Playwright blob report. Failed tests
also retain traces, screenshots, and videos. The final job publishes a merged
HTML report for 30 days; shard artifacts are retained for 14 days and burn-in
failure artifacts for 30 days.

Download the HTML artifact from the GitHub Actions run and open `index.html`.
For a trace, run `npx playwright show-trace path/to/trace.zip`.

## Repository setup

No Actions secrets are required for the current mocked E2E suite. After the
first green run, protect `main` and require these checks:

- `Lint, Unit Tests & Build`
- `E2E Tests (1/2)`
- `E2E Tests (2/2)`
- `Burn-In (Flaky Detection)` for pull requests

## Troubleshooting

- If dependency installation fails, confirm `package-lock.json` is committed
  and regenerate it only with the Node version in `.nvmrc`.
- If Chromium is missing, run `npx playwright install --with-deps chromium`.
- If a browser test fails only in CI, download its trace and failure media from
  the shard artifact.
- If report merging fails, verify that both `playwright-blob-*` artifacts were
  produced and that all shards use the same Playwright version.
- If the pipeline becomes slow, inspect job timings before changing shard count
  or reducing the merge-blocking test set.

The Capacitor Android build is intentionally separate. It needs a full JDK 21,
Android SDK validation, signing configuration, and real-device testing.
