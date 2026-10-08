/**
 * Writes LICENSES.md: every package in package-lock.json with its declared license,
 * split into production and development, with non-permissive licenses listed first.
 * A license missing from both the lockfile and the manifest, or declared as SEE LICENSE IN <file>,
 * is read from the package's license file.
 *
 * Usage: npm run licenses (from the repository root)
 */
import fs from 'fs';
import path from 'path';

interface LockPackage {
  version?: string;
  license?: string;
  dev?: boolean;
  link?: boolean;
}

interface LockFile {
  packages: Record<string, LockPackage>;
}

interface PackageManifest {
  license?: string | { type?: string };
  licenses?: { type?: string }[];
}

interface PackageRow {
  name: string;
  version: string;
  license: string;
  isDev: boolean;
}

// npm runs scripts from the package root; cwd works under CommonJS and ESM, where __dirname does not exist
const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'LICENSES.md');
// First-party scope listed separately; this template ships none, child repos with @aceable/* packages get the section filled
const INTERNAL_SCOPE = '@aceable/';

// Licenses that permit commercial use and closed-source distribution without copyleft obligations
const PERMISSIVE_LICENSE_SET = new Set(['0BSD', 'Apache-2.0', 'BlueOak-1.0.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC-BY-4.0', 'CC0-1.0', 'ISC', 'MIT', 'MIT-0', 'Python-2.0', 'Unlicense', 'Zlib']);

// Manifests that misstate their own license; each entry names what the package's LICENSE file grants
const LICENSE_OVERRIDE_BY_KEY: Record<string, string> = {
  // the manifest folds its MIT option into the LGPL entry; LICENSE offers either
  'xmldom@0.1.19': '(LGPL OR MIT)',
};

// Recognizable license texts, for packages whose manifest declares no license or points at a file
const LICENSE_TEXT_PATTERN_LIST: [RegExp, string][] = [
  [/\bMIT License\b/i, 'MIT'],
  [/Permission is hereby granted, free of charge, to any person obtaining a copy/i, 'MIT'],
  [/Apache License,? Version 2\.0/i, 'Apache-2.0'],
  [/\bISC License\b/i, 'ISC'],
];
const LICENSE_FILE_NAME_LIST = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md'];

function readLicenseFile(lockPath: string, fileNameList = LICENSE_FILE_NAME_LIST): string | undefined {
  for (const fileName of fileNameList) {
    const filePath = path.join(ROOT_DIR, lockPath, fileName);
    if (!fs.existsSync(filePath)) continue;
    const head = fs.readFileSync(filePath, 'utf-8').slice(0, 1000);
    const match = LICENSE_TEXT_PATTERN_LIST.find(([pattern]) => pattern.test(head));
    return match ? match[1] : undefined;
  }
  return undefined;
}

// Older packages omit `license` from the lockfile but declare it in their own package.json
function readInstalledLicense(lockPath: string): string | undefined {
  const manifestPath = path.join(ROOT_DIR, lockPath, 'package.json');
  if (!fs.existsSync(manifestPath)) return undefined;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PackageManifest;
  if (typeof manifest.license === 'string') return manifest.license;
  if (manifest.license?.type) return manifest.license.type;
  if (Array.isArray(manifest.licenses)) {
    return manifest.licenses.map((entry) => entry.type ?? 'UNKNOWN').join(' OR ');
  }
  return undefined;
}

// Splits an SPDX expression on an operator at parenthesis depth 0 only, so grouping is preserved
function splitTopLevel(expression: string, operator: 'AND' | 'OR'): string[] {
  const partList: string[] = [];
  const token = ` ${operator} `;
  let depth = 0;
  let start = 0;
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (depth === 0 && expression.startsWith(token, index)) {
      partList.push(expression.slice(start, index));
      start = index + token.length;
      index = start;
    } else {
      index += 1;
    }
  }
  partList.push(expression.slice(start));
  return partList.map((part) => part.trim());
}

// True when the opening parenthesis at index 0 closes at the last character, as in "(A OR B)" but not "(A) AND (B)"
function isWrappedInParens(expression: string): boolean {
  if (!expression.startsWith('(') || !expression.endsWith(')')) return false;
  let depth = 0;
  for (let index = 0; index < expression.length; index += 1) {
    if (expression[index] === '(') depth += 1;
    else if (expression[index] === ')') depth -= 1;
    if (depth === 0 && index < expression.length - 1) return false;
  }
  return true;
}

function stripOuterParens(expression: string): string {
  let trimmed = expression.trim();
  while (isWrappedInParens(trimmed)) trimmed = trimmed.slice(1, -1).trim();
  return trimmed;
}

// SPDX precedence: OR binds loosest, then AND; an OR is permissive when any option is, an AND only when every part is
function isPermissive(license: string): boolean {
  const expression = stripOuterParens(license);
  const orPartList = splitTopLevel(expression, 'OR');
  if (orPartList.length > 1) return orPartList.some(isPermissive);
  const andPartList = splitTopLevel(expression, 'AND');
  if (andPartList.length > 1) return andPartList.every(isPermissive);
  // "X WITH exception" keeps X's terms plus an extra permission
  const [licenseId] = expression.split(' WITH ');
  return PERMISSIVE_LICENSE_SET.has(licenseId.trim());
}

// Pins the classifier in every repo that copies this file; a wrong answer stops generation
const CLASSIFIER_CASE_LIST: [string, boolean][] = [
  ['MIT', true],
  ['(MIT OR CC0-1.0)', true],
  ['Apache-2.0 AND MIT', true],
  ['GPL-3.0-only AND (MIT OR Apache-2.0)', false],
  ['(MIT OR Apache-2.0) AND GPL-3.0-only', false],
  ['MIT OR GPL-3.0-only AND LGPL-2.1-only', true],
  ['(GPL-3.0-only OR LGPL-3.0-only) AND MIT', false],
  ['((MIT))', true],
  ['GPL-2.0-only WITH Classpath-exception-2.0', false],
  ['NotARealLicense', false],
];
for (const [expression, isExpected] of CLASSIFIER_CASE_LIST) {
  if (isPermissive(expression) !== isExpected) throw new Error(`License classifier regression: ${expression} should be ${isExpected ? 'permissive' : 'reviewed'}`);
}

function readPackageRowList(): PackageRow[] {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package-lock.json'), 'utf-8')) as LockFile;
  const rowByKey = new Map<string, PackageRow>();
  for (const [lockPath, entry] of Object.entries(lock.packages)) {
    // Workspace roots (paths with no node_modules/ segment) are first-party code, not dependencies
    if (!lockPath || entry.link || !lockPath.includes('node_modules/')) continue;
    const name = lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
    const version = entry.version ?? 'unknown';
    const key = `${name}@${version}`;
    const existing = rowByKey.get(key);
    // A version installed at several paths counts as production if any copy is
    if (existing) {
      existing.isDev = existing.isDev && Boolean(entry.dev);
      continue;
    }
    const declared = LICENSE_OVERRIDE_BY_KEY[key] ?? entry.license ?? readInstalledLicense(lockPath);
    // npm's "SEE LICENSE IN <file>" names the file to read instead of an SPDX id
    const seeFileName = declared ? /^SEE LICENSE IN (.+)$/i.exec(declared)?.[1] : undefined;
    const license = (seeFileName ? readLicenseFile(lockPath, [seeFileName]) : undefined) ?? declared ?? readLicenseFile(lockPath) ?? 'UNKNOWN';
    rowByKey.set(key, { name, version, license, isDev: Boolean(entry.dev) });
  }
  return [...rowByKey.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function renderTable(rowList: PackageRow[]): string {
  const lineList = ['| Package | Version | License |', '| --- | --- | --- |'];
  for (const row of rowList) lineList.push(`| ${row.name} | ${row.version} | ${row.license} |`);
  return lineList.join('\n');
}

function renderSummary(rowList: PackageRow[]): string {
  const countByLicense = new Map<string, { productionCount: number; devCount: number }>();
  for (const row of rowList) {
    const counts = countByLicense.get(row.license) ?? { productionCount: 0, devCount: 0 };
    if (row.isDev) counts.devCount += 1;
    else counts.productionCount += 1;
    countByLicense.set(row.license, counts);
  }
  const lineList = ['| License | Production | Development |', '| --- | --- | --- |'];
  const sortedList = [...countByLicense.entries()].sort((a, b) => b[1].productionCount + b[1].devCount - (a[1].productionCount + a[1].devCount) || a[0].localeCompare(b[0]));
  for (const [license, counts] of sortedList) lineList.push(`| ${license} | ${counts.productionCount} | ${counts.devCount} |`);
  return lineList.join('\n');
}

function render(rowList: PackageRow[]): string {
  const productionList = rowList.filter((row) => !row.isDev);
  const devList = rowList.filter((row) => row.isDev);
  const internalList = productionList.filter((row) => row.name.startsWith(INTERNAL_SCOPE));
  const reviewList = rowList.filter((row) => !row.name.startsWith(INTERNAL_SCOPE) && !isPermissive(row.license));
  return [
    '# Third-Party Licenses',
    '',
    'Generated by `npm run licenses` from `package-lock.json`. Do not edit by hand; regenerate it in any PR that changes dependencies.',
    '',
    `${productionList.length} production and ${devList.length} development packages. Internal \`${INTERNAL_SCOPE}*\` packages are Aceable proprietary (\`UNLICENSED\`).`,
    '',
    '## Summary',
    '',
    renderSummary(rowList),
    '',
    '## Needs License Review',
    '',
    `Licenses outside the permissive set (${[...PERMISSIVE_LICENSE_SET].join(', ')}), excluding internal packages.`,
    '',
    reviewList.length ? renderTable(reviewList) : 'None.',
    '',
    '## Internal Packages',
    '',
    renderTable(internalList),
    '',
    '## Production Dependencies',
    '',
    renderTable(productionList.filter((row) => !row.name.startsWith(INTERNAL_SCOPE))),
    '',
    '## Development Dependencies',
    '',
    renderTable(devList),
    '',
  ].join('\n');
}

const rowList = readPackageRowList();
fs.writeFileSync(OUTPUT_FILE, render(rowList));
console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_FILE)} (${rowList.length} packages)`);
