/**
 * Dependency audit gate shared by CI and .husky/pre-push: fails on any high or critical
 * advisory from `npm audit` unless its GHSA id is in ALLOWLIST.
 *
 * Usage: npm run audit:check (from the repository root)
 */
import { spawnSync } from 'child_process';

// Each entry is one advisory with its reason and a re-check date. Every fork inherits this list,
// so add a single GHSA id, never a package name, severity, or dev-only blanket.
const ALLOWLIST: Record<string, string> = {
  // braces <=3.0.3: no patched release exists. Dev-only path: eslint-config-next ->
  // @next/eslint-plugin-next (pins fast-glob 3.3.1) -> micromatch 4.0.8 -> braces. Re-check 2026-11-13.
  'GHSA-vfj7-8cjw-p6xm': 'braces, dev-only lint path, no patched release',
};

const BLOCKING = new Set(['high', 'critical']);

interface Advisory {
  severity: string;
  url: string;
  title?: string;
  name?: string;
}

interface AuditReport {
  vulnerabilities?: Record<string, { via: (string | Advisory)[] }>;
  error?: unknown;
}

const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let report: AuditReport;
try {
  report = JSON.parse(result.stdout) as AuditReport;
} catch {
  console.error('npm audit did not return JSON:\n' + (result.stderr || result.stdout));
  process.exit(1);
}
if (!report.vulnerabilities) {
  console.error('npm audit failed:\n' + JSON.stringify(report.error ?? report, null, 2));
  process.exit(1);
}

// Advisory objects carry the real severity; string entries in `via` only point at the next package down the chain
const blocking = new Map<string, Advisory>();
const allowed = new Set<string>();
for (const vuln of Object.values(report.vulnerabilities)) {
  for (const via of vuln.via) {
    if (typeof via === 'string' || !BLOCKING.has(via.severity)) continue;
    const id = via.url.split('/').pop() ?? via.url;
    if (id in ALLOWLIST) allowed.add(id);
    else blocking.set(id, via);
  }
}

for (const id of allowed) console.log(`allowlisted: ${id} (${ALLOWLIST[id]})`);
for (const id of Object.keys(ALLOWLIST)) {
  if (!allowed.has(id)) console.log(`allowlist entry ${id} no longer matches any advisory; remove it`);
}

if (blocking.size > 0) {
  console.error(`\n${blocking.size} high/critical advisor${blocking.size === 1 ? 'y' : 'ies'} not on the allowlist:`);
  for (const [id, a] of blocking) console.error(`  ${a.severity}  ${id}  ${a.name ?? ''}  ${a.title ?? ''}`);
  process.exit(1);
}
console.log('npm audit: no high/critical advisories outside the allowlist');
