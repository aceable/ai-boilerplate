import { describe, it, expect } from 'vitest';
import config from '../../commitlint.config.js';

// Pure-unit test for the commit-msg secret-shape rule defined in
// commitlint.config.js. Belongs at the bottom of the pyramid:
// zero dependencies, fast, and the regression risk if it breaks is
// high (a quiet regex typo would silently allow credentials in
// commit messages).
//
// Fixtures are assembled at runtime (concat from parts) so secretlint
// — running on this very file at commit time — doesn't flag the test
// fixtures themselves as real credentials.

type SecretRule = (input: { raw: string }) => [boolean] | [boolean, string];

const plugin = (config as unknown as { plugins: Array<{ rules: Record<string, SecretRule> }> }).plugins[0];
if (!plugin) {
  throw new Error('commitlint.config.js must define at least one plugin');
}
const rule = plugin.rules['no-secrets-in-message'];
if (!rule) {
  throw new Error('commitlint plugin must define no-secrets-in-message');
}

const expectBlocked = (raw: string): void => {
  const [pass, reason] = rule({ raw });
  expect(pass, `expected blocked: ${raw}`).toBe(false);
  expect(reason).toMatch(/credential/i);
};

const expectAllowed = (raw: string): void => {
  const [pass] = rule({ raw });
  expect(pass, `expected allowed: ${raw}`).toBe(true);
};

// Fixture parts — split so secretlint's static-string scanner does
// not flag this file. The commitlint rule sees the concatenated
// string at runtime, which is what we want to test.
const PAT_BODY = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
const SK_BODY = 'aBcDeFgHiJkLmNoPqRsTu';
const SLACK_BODY = '1234567890123-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx';

describe('commitlint no-secrets-in-message rule', () => {
  describe('blocks credential-shaped subjects', () => {
    it('blocks OpenAI-style sk-proj keys', () => {
      expectBlocked(`fix: rotated sk-proj-${SK_BODY} in env`);
    });

    it('blocks GitHub PAT classic prefix', () => {
      expectBlocked(`fix: rotated ghp_${PAT_BODY} in repo`);
    });

    it('blocks GitHub OAuth tokens', () => {
      expectBlocked(`chore: cleanup gho_${PAT_BODY}`);
    });

    it('blocks Slack bot tokens', () => {
      expectBlocked(`feat: integrate xoxb-${SLACK_BODY}`);
    });

    it('blocks AWS access keys', () => {
      expectBlocked('chore: rotate AK' + 'IAIOSFODNN7EXAMPLE');
    });

    it('blocks Google API keys', () => {
      expectBlocked('feat: add AI' + 'zaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI maps');
    });

    it('blocks Anthropic API keys', () => {
      expectBlocked(`fix: rotated sk-ant-${PAT_BODY} in env`);
    });

    it('blocks Stripe live keys', () => {
      expectBlocked(`chore: revoked sk_live_${PAT_BODY}`);
    });

    it('blocks GitHub fine-grained PATs', () => {
      expectBlocked(`fix: rotated github_pat_${PAT_BODY}`);
    });

    it('blocks RSA private key headers', () => {
      expectBlocked('fix: removed -----BEGIN RSA PRIVATE KEY----- block from config');
    });

    it('blocks JWT-shaped strings', () => {
      expectBlocked('chore: invalidated session token eyJabc.eyJdef.signature_xyz');
    });
  });

  describe('allows non-credential subjects', () => {
    it('allows a plain conventional commit', () => {
      expectAllowed('feat: add user profile page');
    });

    it('allows the word "key" without a credential shape', () => {
      expectAllowed('refactor: rename apiKey to authToken in handler');
    });

    it('allows technical identifiers that resemble but do not match', () => {
      expectAllowed('chore: bump sk to 2 (not sk- prefix)');
    });

    it('allows credential-prefix strings shorter than the floor', () => {
      expectAllowed('fix: prefix below 20 chars is allowed');
    });
  });
});
