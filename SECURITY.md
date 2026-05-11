# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in this template or in a
project derived from it, please report it privately — do not open a public
issue.

> **Replace this section with your team's actual reporting process before
> the repo is published.** Suggested template:
>
> - Email: `security@your-domain.example`
> - GitHub: use [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
>   on this repository.
>
> Include in your report:
> - Steps to reproduce
> - Impact assessment (data exposure, privilege escalation, DoS, etc.)
> - Suggested fix if you have one
>
> We will acknowledge receipt within 2 business days and aim to provide a
> remediation plan within 7 business days.

## Supported versions

This is a template repository. Maintainers patch the `main` branch only.
Forks are responsible for their own security posture once instantiated.

## What this template ships with

This template enables several security controls by default. They are
documented in [`docs/security.md`](docs/security.md). At a glance:

- **Pre-commit hook** (`.husky/pre-commit`) — `secretlint` on staged files;
  blocks direct commits to `main`/`master`.
- **Pre-push hook** (`.husky/pre-push`) — `secretlint` on diff vs upstream;
  `npm audit --audit-level=high`; refuses force-pushes to protected branches.
- **commit-msg hook** (`.husky/commit-msg`) — `commitlint` with a rule that
  rejects credential-shaped strings in commit messages.
- **CI** (`.github/workflows/ci.yml`) — runs `lint`, `type-check`,
  `secretlint`, and `npm audit` on every push and pull request.
- **Dependabot** (`.github/dependabot.yml`) — weekly grouped updates for
  npm and GitHub Actions ecosystems.
- **Branch protection** (`scripts/setup-branch-protection.sh`) — opt-in
  script that applies sensible defaults: required reviews, required status
  checks, no force-pushes, no branch deletion.
- **Auth middleware** (`src/middleware.ts`) — fails closed; every route is
  protected unless explicitly listed as public.

## Disclosure

We follow coordinated disclosure. Please give us a reasonable window to
remediate before any public discussion of the issue. We will credit
researchers who follow this policy unless they prefer to remain anonymous.
