#!/usr/bin/env node
/**
 * Writes src/build-meta.json from package.json + git (when available).
 * Used by npm prebuild and can be run before commit/push.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const repoRoot = join(root, '..', '..')
const outPath = join(root, 'src', 'build-meta.json')

function git(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function readExistingMeta() {
  try {
    if (existsSync(outPath)) return JSON.parse(readFileSync(outPath, 'utf8'))
  } catch {
    /* ignore */
  }
  return {}
}

const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const existing = readExistingMeta()

let version = process.env.VITE_APP_VERSION || process.env.APP_VERSION || ''
if (!version) {
  const versionFile = join(repoRoot, 'VERSION')
  if (existsSync(versionFile)) {
    version = readFileSync(versionFile, 'utf8').trim()
  }
}
if (!version && existsSync('/VERSION')) {
  version = readFileSync('/VERSION', 'utf8').trim()
}
version = version || existing.version || pkg.version || '0.0.0'

let gitSha =
  process.env.VITE_GIT_SHA ||
  process.env.GIT_SHA ||
  git('git rev-parse --short HEAD', repoRoot) ||
  git('git rev-parse --short HEAD', root) ||
  ''

if (!gitSha || gitSha === 'unknown') {
  gitSha = existing.gitSha && existing.gitSha !== 'pending' ? existing.gitSha : 'dev'
}

const buildTime =
  process.env.VITE_BUILD_TIME ||
  process.env.BUILD_TIME ||
  new Date().toISOString()

const meta = {
  version,
  gitSha,
  buildTime,
  label: `v${version} · ${gitSha}`,
}

writeFileSync(outPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

if (pkg.version !== version) {
  pkg.version = version
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}

console.log(`[version] ${meta.label}`)
