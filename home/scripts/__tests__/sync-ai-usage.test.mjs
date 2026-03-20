import { spawnSync } from 'node:child_process'
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(new URL('../../../', import.meta.url).pathname)
const sourceScriptsDir = path.join(repoRoot, 'home', 'scripts')
const tempDirs = []

function createTempRepo(scriptNames) {
  const baseDir = mkdtempSync(path.join(tmpdir(), 'sync-ai-usage-'))
  const repoDir = path.join(baseDir, 'repo')
  const homeDir = path.join(baseDir, 'home')
  const binDir = path.join(baseDir, 'bin')

  tempDirs.push(baseDir)

  mkdirSync(path.join(repoDir, 'home', 'scripts'), { recursive: true })
  mkdirSync(path.join(repoDir, 'home', 'ai', 'usages'), { recursive: true })
  mkdirSync(homeDir, { recursive: true })
  mkdirSync(binDir, { recursive: true })

  for (const scriptName of scriptNames) {
    const sourcePath = path.join(sourceScriptsDir, scriptName)
    const targetPath = path.join(repoDir, 'home', 'scripts', scriptName)

    cpSync(sourcePath, targetPath)
    chmodSync(targetPath, 0o755)
  }

  return { baseDir, repoDir, homeDir, binDir }
}

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content)
  chmodSync(filePath, 0o755)
}

function installCommonFakes(binDir, stateDir) {
  const gitLogPath = path.join(stateDir, 'git.log')
  const stashMarkerPath = path.join(stateDir, 'stash-created')
  const stashMessagePath = path.join(stateDir, 'stash-message')

  writeExecutable(
    path.join(binDir, 'ccusage'),
    `#!/bin/bash
set -euo pipefail
cat <<'JSON'
{"daily":[{"date":"2026-03-20","inputTokens":10,"outputTokens":5,"cacheCreationTokens":0,"cacheReadTokens":0,"totalTokens":15,"totalCost":0.01,"modelsUsed":["claude-sonnet-4-6"],"modelBreakdowns":[]}]}
JSON
`,
  )

  writeExecutable(
    path.join(binDir, 'pnpx'),
    `#!/bin/bash
set -euo pipefail
cat <<'JSON'
{"daily":[{"date":"Mar 20, 2026","inputTokens":10,"cachedInputTokens":2,"outputTokens":5,"reasoningOutputTokens":1,"totalTokens":18,"costUSD":0.02,"models":{}}]}
JSON
`,
  )

  writeExecutable(
    path.join(binDir, 'git'),
    `#!/bin/bash
set -euo pipefail
printf '%s\\n' "$*" >> "${gitLogPath}"

case "\${1:-}" in
  pull)
    if [[ "\${FAKE_GIT_REQUIRE_STASH_BEFORE_PULL:-0}" == "1" ]] && [[ ! -f "${stashMarkerPath}" ]]; then
      echo "pull requires stash first" >&2
      exit 7
    fi
    exit "\${FAKE_GIT_PULL_EXIT:-0}"
    ;;
  status)
    printf '%s' "\${FAKE_GIT_STATUS_OUTPUT:-}"
    ;;
  stash)
    case "\${2:-}" in
      push)
        touch "${stashMarkerPath}"
        message=""
        while [[ $# -gt 0 ]]; do
          if [[ "\${1:-}" == "--message" ]]; then
            message="\${2:-}"
            break
          fi
          shift
        done
        printf '%s' "$message" > "${stashMessagePath}"
        exit 0
        ;;
      list)
        if [[ -f "${stashMarkerPath}" ]]; then
          printf 'stash@{0} %s\n' "$(cat "${stashMessagePath}")"
        fi
        exit 0
        ;;
      drop)
        rm -f "${stashMarkerPath}" "${stashMessagePath}"
        exit 0
        ;;
    esac
    ;;
  add)
    exit 0
    ;;
  commit)
    exit "\${FAKE_GIT_COMMIT_EXIT:-0}"
    ;;
  push)
    exit "\${FAKE_GIT_PUSH_EXIT:-0}"
    ;;
  *)
    exit 0
    ;;
esac
`,
  )

  writeExecutable(
    path.join(binDir, 'osascript'),
    `#!/bin/bash
set -euo pipefail
exit 0
`,
  )

  return { gitLogPath }
}

function installGitThatRequiresPullBeforeCollection(binDir, stateDir, markerPath) {
  const gitLogPath = path.join(stateDir, 'git.log')

  writeExecutable(
    path.join(binDir, 'git'),
    `#!/bin/bash
set -euo pipefail
printf '%s\\n' "$*" >> "${gitLogPath}"

case "\${1:-}" in
  pull)
    if [[ -f "${markerPath}" ]]; then
      echo "pull happened after collection" >&2
      exit 9
    fi
    exit 0
    ;;
  status)
    printf '%s' ' M home/ai/usages/test-device-2026-03.json\n'
    ;;
  add|commit|push)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`,
  )

  return { gitLogPath }
}

function installFakeCrontab(binDir, crontabPath) {
  writeExecutable(
    path.join(binDir, 'crontab'),
    `#!/bin/bash
set -euo pipefail

if [[ "\${1:-}" == "-l" ]]; then
  if [[ -f "${crontabPath}" ]]; then
    cat "${crontabPath}"
    exit 0
  fi
  exit 1
fi

if [[ "\${1:-}" == "-" ]] || [[ $# -eq 0 ]]; then
  cat > "${crontabPath}"
  exit 0
fi

echo "unsupported crontab invocation: $*" >&2
exit 1
`,
  )
}

function runScript(scriptPath, env, cwd) {
  return spawnSync(scriptPath, {
    cwd,
    env,
    encoding: 'utf8',
  })
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('sync-ai-usage collects data and performs git sync when usage files changed', () => {
  const { baseDir, repoDir, homeDir, binDir } = createTempRepo([
    'collect-claude-usage.sh',
    'collect-codex-usage.sh',
    'sync-ai-usage.sh',
  ])
  const { gitLogPath } = installCommonFakes(binDir, baseDir)

  const result = runScript(
    path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh'),
    {
      HOME: homeDir,
      PATH: '',
      BLOG_SYNC_PROJECT_DIR: repoDir,
      BLOG_SYNC_PATH_PREFIX: binDir,
      BLOG_SYNC_DEVICE_NAME: 'test-device',
      BLOG_SYNC_YEAR_MONTH: '2026-03',
      FAKE_GIT_STATUS_OUTPUT:
        ' M home/ai/usages/test-device-2026-03.json\n M home/ai/usages/test-device-codex-2026-03.json\n',
    },
    repoDir,
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.equal(
    existsSync(path.join(repoDir, 'home', 'ai', 'usages', 'test-device-2026-03.json')),
    true,
  )
  assert.equal(
    existsSync(path.join(repoDir, 'home', 'ai', 'usages', 'test-device-codex-2026-03.json')),
    true,
  )

  const gitLog = readFileSync(gitLogPath, 'utf8')
  assert.match(gitLog, /pull --rebase origin master/)
  assert.match(gitLog, /status --porcelain home\/ai\/usages\//)
  assert.match(gitLog, /commit -m chore\(ai\): sync usage data for test-device 2026-03/)
  assert.match(gitLog, /push origin HEAD:master/)
})

test('sync-ai-usage skips commit and push when git status reports no changes', () => {
  const { baseDir, repoDir, homeDir, binDir } = createTempRepo([
    'collect-claude-usage.sh',
    'collect-codex-usage.sh',
    'sync-ai-usage.sh',
  ])
  const { gitLogPath } = installCommonFakes(binDir, baseDir)

  const result = runScript(
    path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh'),
    {
      HOME: homeDir,
      PATH: '',
      BLOG_SYNC_PROJECT_DIR: repoDir,
      BLOG_SYNC_PATH_PREFIX: binDir,
      BLOG_SYNC_DEVICE_NAME: 'test-device',
      BLOG_SYNC_YEAR_MONTH: '2026-03',
      FAKE_GIT_STATUS_OUTPUT: '',
    },
    repoDir,
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)

  const gitLog = readFileSync(gitLogPath, 'utf8')
  assert.match(gitLog, /pull --rebase origin master/)
  assert.doesNotMatch(gitLog, /commit -m/)
  assert.doesNotMatch(gitLog, /push origin HEAD:master/)
})

test('sync-ai-usage pulls latest changes before collectors mutate tracked files', () => {
  const { baseDir, repoDir, homeDir, binDir } = createTempRepo([
    'sync-ai-usage.sh',
  ])
  const markerPath = path.join(baseDir, 'collection-started')
  const usagesDir = path.join(repoDir, 'home', 'ai', 'usages')
  const scriptsDir = path.join(repoDir, 'home', 'scripts')
  const { gitLogPath } = installGitThatRequiresPullBeforeCollection(binDir, baseDir, markerPath)

  writeExecutable(
    path.join(binDir, 'ccusage'),
    `#!/bin/bash
set -euo pipefail
exit 0
`,
  )

  writeExecutable(
    path.join(binDir, 'pnpx'),
    `#!/bin/bash
set -euo pipefail
exit 0
`,
  )

  writeExecutable(
    path.join(binDir, 'osascript'),
    `#!/bin/bash
set -euo pipefail
exit 0
`,
  )

  writeExecutable(
    path.join(scriptsDir, 'collect-claude-usage.sh'),
    `#!/bin/bash
set -euo pipefail
touch "${markerPath}"
cat <<'JSON' > "${path.join(usagesDir, 'test-device-2026-03.json')}"
{"daily":[]}
JSON
`,
  )

  writeExecutable(
    path.join(scriptsDir, 'collect-codex-usage.sh'),
    `#!/bin/bash
set -euo pipefail
touch "${markerPath}"
cat <<'JSON' > "${path.join(usagesDir, 'test-device-codex-2026-03.json')}"
{"daily":[]}
JSON
`,
  )

  const result = runScript(
    path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh'),
    {
      HOME: homeDir,
      PATH: '',
      BLOG_SYNC_PROJECT_DIR: repoDir,
      BLOG_SYNC_PATH_PREFIX: binDir,
      BLOG_SYNC_DEVICE_NAME: 'test-device',
      BLOG_SYNC_YEAR_MONTH: '2026-03',
    },
    repoDir,
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)

  const gitLog = readFileSync(gitLogPath, 'utf8')
  assert.match(gitLog, /^pull --rebase origin master/m)
})

test('sync-ai-usage stages only the current device files', () => {
  const { baseDir, repoDir, homeDir, binDir } = createTempRepo([
    'collect-claude-usage.sh',
    'collect-codex-usage.sh',
    'sync-ai-usage.sh',
  ])
  const { gitLogPath } = installCommonFakes(binDir, baseDir)

  writeFileSync(path.join(repoDir, 'home', 'ai', 'usages', 'someone-else-2026-03.json'), '{"daily":[]}')

  const result = runScript(
    path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh'),
    {
      HOME: homeDir,
      PATH: '',
      BLOG_SYNC_PROJECT_DIR: repoDir,
      BLOG_SYNC_PATH_PREFIX: binDir,
      BLOG_SYNC_DEVICE_NAME: 'test-device',
      BLOG_SYNC_YEAR_MONTH: '2026-03',
      FAKE_GIT_STATUS_OUTPUT:
        ' M home/ai/usages/test-device-2026-03.json\n M home/ai/usages/test-device-codex-2026-03.json\n?? home/ai/usages/someone-else-2026-03.json\n',
    },
    repoDir,
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)

  const gitLog = readFileSync(gitLogPath, 'utf8')
  assert.match(
    gitLog,
    /add home\/ai\/usages\/test-device-2026-03\.json home\/ai\/usages\/test-device-codex-2026-03\.json/,
  )
  assert.doesNotMatch(gitLog, /someone-else-2026-03\.json/)
})

test('sync-ai-usage stashes current-device usage files before pull when they are already dirty', () => {
  const { baseDir, repoDir, homeDir, binDir } = createTempRepo([
    'collect-claude-usage.sh',
    'collect-codex-usage.sh',
    'sync-ai-usage.sh',
  ])
  const { gitLogPath } = installCommonFakes(binDir, baseDir)

  const result = runScript(
    path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh'),
    {
      HOME: homeDir,
      PATH: '',
      BLOG_SYNC_PROJECT_DIR: repoDir,
      BLOG_SYNC_PATH_PREFIX: binDir,
      BLOG_SYNC_DEVICE_NAME: 'test-device',
      BLOG_SYNC_YEAR_MONTH: '2026-03',
      FAKE_GIT_REQUIRE_STASH_BEFORE_PULL: '1',
      FAKE_GIT_STATUS_OUTPUT:
        ' M home/ai/usages/test-device-2026-03.json\n D home/ai/usages/test-device-codex-2026-03.json\n',
    },
    repoDir,
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)

  const gitLog = readFileSync(gitLogPath, 'utf8')
  assert.match(gitLog, /stash push --include-untracked --message blog-sync-prepull-test-device-2026-03-/)
  assert.match(gitLog, /pull --rebase origin master/)
  assert.match(gitLog, /stash drop stash@\{0\}/)
})

test('install-cron and uninstall-cron manage the matching crontab entry', () => {
  const { baseDir, repoDir, homeDir, binDir } = createTempRepo([
    'sync-ai-usage.sh',
    'install-cron.sh',
    'uninstall-cron.sh',
  ])
  const crontabPath = path.join(baseDir, 'crontab.txt')

  installFakeCrontab(binDir, crontabPath)

  const env = {
    HOME: homeDir,
    PATH: '',
    BLOG_SYNC_PATH_PREFIX: binDir,
  }

  const installPath = path.join(repoDir, 'home', 'scripts', 'install-cron.sh')
  const uninstallPath = path.join(repoDir, 'home', 'scripts', 'uninstall-cron.sh')

  const firstInstall = runScript(installPath, env, repoDir)
  assert.equal(firstInstall.status, 0, firstInstall.stderr || firstInstall.stdout)

  const cronAfterInstall = readFileSync(crontabPath, 'utf8')
  assert.match(cronAfterInstall, /# AI Usage Data Sync - Runs daily at 23:00/)
  assert.match(
    cronAfterInstall,
    new RegExp(
      `0 23 \\* \\* \\* ${path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} >> ~/Library/Logs/blog-sync/cron\\.log 2>&1`,
    ),
  )

  const secondInstall = runScript(installPath, env, repoDir)
  assert.equal(secondInstall.status, 0, secondInstall.stderr || secondInstall.stdout)
  assert.match(secondInstall.stdout, /Cron job already exists/)

  const uninstall = runScript(uninstallPath, env, repoDir)
  assert.equal(uninstall.status, 0, uninstall.stderr || uninstall.stdout)

  const cronAfterUninstall = existsSync(crontabPath) ? readFileSync(crontabPath, 'utf8') : ''
  assert.doesNotMatch(
    cronAfterUninstall,
    new RegExp(path.join(repoDir, 'home', 'scripts', 'sync-ai-usage.sh').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  )
})
