# Security Baseline

Default-on security controls and the principles behind them. This template
ships with husky hooks, secretlint, npm audit, CI gates, Dependabot, and a
branch-protection script — but the rules below apply regardless of tooling
and should be re-read whenever you fork this template for a new project.

> **TL;DR (memorize this list)**
>
> 1. **Secrets never live in code.** Use env vars locally and platform secret
>    stores in production.
> 2. **Git history is forever.** Deleting a committed secret does not remove
>    it. Rotate the secret in its source system.
> 3. **Fix, then rotate.** When a scanner finds something, fix the code first,
>    then invalidate the credential in the source system.
> 4. **Repos are private by default.** If a repo was ever public — even for
>    seconds — assume bots scraped the full history.
> 5. **Least privilege on every key.** Read-only when read-only will do.
>    Separate keys per env and per service.
> 6. **Public-by-accident routes are compromised.** Assume any unauthenticated
>    route exposing data has been hit.
> 7. **Platform accounts are crown jewels.** 2FA + SSO on GitHub and your
>    hosting/database/auth providers. Scope tokens, set expirations.
> 8. **Secrets don't go in chat tools.** Not Slack, not your issue tracker,
>    not LLM prompts, not screenshots.
> 9. **Defense in depth.** Dependabot, pre-commit hooks, branch protection,
>    code review, audit logs — no single control is sufficient.

---

## 1. Secrets and Passwords

Secrets, API keys, connection strings, signing keys, OAuth client secrets,
and passwords never belong in source code.

- **Local:** use a `.env` (or `.env.local`) file that is gitignored from day
  one. Never commit it. This template ships with `.env*` ignored already.
- **Production:** use the platform's secret manager (Railway Variables,
  Vercel Environment Variables, AWS Secrets Manager, etc.).
- Reference secrets via `process.env.X` and never log their values.
- Share secrets through a password manager (1Password, Bitwarden) — not chat,
  not email, not a shared doc.

Once a secret is committed to git, it exists forever in history. Deleting
the line and pushing a "fix" does not remove it. The only remediation is
rotation.

## 2. Scanning and Audits

This template runs **secretlint** at three layers:

- **Pre-commit** (husky) — staged files via `lint-staged`
- **Pre-push** (husky) — diff vs upstream
- **CI** (`.github/workflows/ci.yml`) — full tree on every PR

If a scanner flags a secret, do this in order:

1. **Fix the code.** Remove the secret and move it to an env var.
2. **Rotate the secret** in its source system (issue a new credential,
   invalidate the old one).
3. **Update env vars** everywhere the old secret was used.
4. **Verify** the new secret works in all environments before closing.
5. **Document** the incident, even if caught before going public.

Order matters: rotating without fixing the code means the new secret gets
committed too. Fixing without rotating means the old secret is still valid
in git history.

## 3. Repository Visibility

Set every new repo to **private** at creation. Verify the visibility
setting (GitHub defaults shift; org policies vary).

If a repo was ever public, even briefly:

- Assume a bot scraped it within minutes.
- Rotate every secret that ever appeared in that history.
- Review the commit history for any other sensitive info (internal URLs,
  customer IDs, infrastructure details).
- Notify whoever owns incident response for the project.

## 4. Principle of Least Privilege

Every API key, token, and database role should have the minimum scope
required for its job. Scope determines blast radius when a credential leaks.

- Separate keys per environment (dev, staging, prod). Never reuse.
- Separate keys per service. Sharing one key across apps makes rotation
  impossible without coordinated downtime.
- GitHub PATs should be **fine-grained** (not classic), scoped to specific
  repos and permissions, with an expiration date.
- Database users for app runtime should not have SUPERUSER, DDL rights, or
  access to other schemas.
- Document what each key is for. "Unknown key, scared to rotate" is a real
  failure mode.

## 5. Public Routes and Authentication

Auth middleware should **fail closed** (deny by default, allow only
explicitly listed routes). This template's `src/middleware.ts` does this:
every route is protected unless it matches the `isPublicRoute` matcher.

If a route that should require authentication is accidentally exposed:

- Audit logs for that route back to the deployment date.
- Assume any data the route exposed has been read.
- Assume any action the route allowed may have been triggered.
- Fix the auth gap, deploy, then notify whoever needs to know.

Defense in depth:

- Route-level checks even on internal endpoints
- Rate limiting on auth endpoints (and everything else)
- Restrictive CORS (no wildcards in production)
- Security headers: HSTS, CSP, X-Content-Type-Options, X-Frame-Options

## 6. Platform Credentials

Platform credentials are the highest-value targets. A leaked app API key is
bad; a leaked GitHub org admin is a breach.

**GitHub**
- 2FA mandatory. Hardware key or authenticator app, not SMS.
- SSO if available.
- Fine-grained PATs only, scoped + expiring.
- SSH keys for git, not passwords.
- Branch protection on main: required reviews, no force-pushes, status
  checks required. Run `npm run setup:protect` to apply this template's
  defaults.

**Hosting / Database / Auth providers**
- Use role-based access where supported.
- Don't share login credentials between humans.
- Service tokens for CI/CD scoped per project, rotated periodically.
- Treat database connection strings like root passwords. Use separate roles
  for app runtime, migrations, and admin work.
- If your DB supports IP allowlisting and your deployment model allows it,
  enable it.
- Verify backups are enabled and test the restore process at least once.

## 7. Dependency and Supply Chain Security

A vulnerable dependency is a vector regardless of how clean your code is.

- **Dependabot** is enabled in this template (`.github/dependabot.yml`).
  Weekly grouped updates per ecosystem.
- **`npm audit --audit-level=high`** runs pre-push and in CI.
- Lockfiles (`package-lock.json`) committed. Never delete them "to fix" a
  dependency issue.
- Use `npm ci`, not `npm install`, in CI/CD.
- Review what you install. A typo can pull a malicious package. Check
  download counts, maintainer reputation, last-publish date.

## 8. Local Development Hygiene

Your laptop is part of the attack surface.

- `.gitignore` covers `.env*`, `*.pem`, `*.key`, `*.p12`.
- Husky pre-commit hook runs secretlint on staged files.
- Full-disk encryption enabled on every dev machine.
- Screen lock on idle. Strong device password.
- Don't paste secrets into chat tools, ticket systems, or LLM prompts.
- Keep your OS and Node version updated.

## 9. Logging, Monitoring, and Incident Response

- Log authentication events: logins, failed logins, token issuances, role
  changes.
- Never log secrets, full tokens, passwords, or full credit card numbers.
  Mask or hash.
- Centralized log aggregation so logs survive a compromised host.
- Alerts on suspicious patterns: failed-login spikes, access from new
  geographies, mass data exports, 5xx spikes after a deploy.
- Document the incident response process: who gets paged, who has rotation
  authority, who notifies customers.
- Post-incident reviews are blameless and written down.

## 10. Data Handling and PII

If your app stores user data, treat it accordingly:

- Minimize what you collect. If you don't need it, don't store it.
- PII never goes in logs, error reports, or analytics events without
  explicit review.
- Encrypt sensitive data at rest where supported.
- TLS everywhere. No HTTP endpoints in production.
- Dev and staging should not contain real production PII. Use synthetic or
  anonymized data.
- Know which compliance regimes apply to your work (PCI, HIPAA, GDPR,
  state-level rules) and ask before assuming.

## 11. Quick Checklist for a New Project

Run through this on day one of any project forked from this template.

- [ ] Repo set to private. Visibility verified.
- [ ] `.gitignore` includes `.env*`, `*.pem`, `*.key`, `.DS_Store` (already
      present in this template).
- [ ] `README.md` documents required env vars (names only, no values).
- [ ] `.env.example` updated with placeholder values.
- [ ] Branch protection applied: `npm run setup:protect`.
- [ ] Dependabot enabled (already configured).
- [ ] CI runs on PRs (already configured).
- [ ] Secrets stored in your platform's secret manager, not in code.
- [ ] Database role for the app is least-privilege (no SUPERUSER, no DDL
      in prod).
- [ ] API keys for third-party services scoped read-only when possible,
      scoped to this project only.
- [ ] 2FA confirmed on every developer's GitHub and hosting accounts.
- [ ] Production deploys gated through PR merges, not direct branch
      deploys.

---

## When something goes wrong

Pause everything and follow the **Fix → Rotate → Update → Verify →
Document** order from Section 2. The instinct to "just rotate quickly" is
the most common cause of repeat exposure.
