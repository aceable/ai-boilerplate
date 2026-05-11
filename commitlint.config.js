/**
 * Commitlint configuration — conventional commits + secret-shape guard.
 *
 * Conventional Commits: https://www.conventionalcommits.org/
 *   type(scope): subject
 *   types: feat, fix, chore, docs, refactor, perf, test, build, ci, revert, style
 *
 * Secret-shape rule: rejects commit subjects/bodies that pattern-match common
 * credential prefixes. Stops accidental "fix: rotated key to sk-proj-abc..." style
 * commits at the message layer (the file content itself is caught by secretlint).
 */

const SECRET_PATTERNS = [
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,                    // Anthropic API key
  /\bsk-(?:proj-|live-|test-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}\b/, // OpenAI / Stripe sk_
  /\b(?:sk|rk|pk)_live_[A-Za-z0-9]{20,}\b/,           // Stripe live keys
  /\bghp_[A-Za-z0-9]{20,}\b/,                         // GitHub PAT classic
  /\bgho_[A-Za-z0-9]{20,}\b/,                         // GitHub OAuth
  /\bghs_[A-Za-z0-9]{20,}\b/,                         // GitHub App server
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,                 // GitHub fine-grained PAT
  /\bxox[bpars]-[A-Za-z0-9-]{10,}\b/,                 // Slack tokens
  /\bAKIA[0-9A-Z]{16}\b/,                             // AWS access key id
  /\bAIza[0-9A-Za-z_-]{35}\b/,                        // Google API key
  /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/i, // Private key headers
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT
];

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [1, 'always', 100],
    'no-secrets-in-message': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'no-secrets-in-message': ({ raw }) => {
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(raw)) {
              return [
                false,
                `Commit message appears to contain a credential (matched ${pattern}). ` +
                  'Rotate the secret in its source system before continuing.',
              ];
            }
          }
          return [true];
        },
      },
    },
  ],
};
