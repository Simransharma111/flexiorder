# CI Secrets Checklist

The current GitHub Actions test pipeline requires no repository secrets. Tests
mock API and Socket.IO traffic and do not connect to production services.

Before adding a deployment or live-environment test job:

- store tokens and credentials in GitHub Actions secrets, never in source files
- use a least-privilege service account for the target environment
- pass secret values through `env` and quote shell variables
- do not interpolate pull-request titles, branch names, comments, or workflow
  inputs directly into shell commands
- keep production customer and restaurant data out of test artifacts
- document each secret's owner, purpose, scope, and rotation date
- rotate or revoke every secret when a maintainer loses access

Do not reuse the Android release keystore password as a CI service credential,
and never commit the keystore itself.
