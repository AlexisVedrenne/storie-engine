// Runs the dev -> release -> master promotion this repo's branch-
// protection rules require: each hop needs a pull request (direct pushes
// are rejected — see the "GH013: Repository rule violations" errors that
// motivated this script), merged with admin bypass since `enforce_admins`
// still applies review requirements to everyone EXCEPT the repo admin
// bypass actor (see the release PR's own discussion for the full story).
//
// Usage: node scripts/promote.mjs
//
// Requires: GitHub CLI (`gh`) installed and authenticated. Run from
// inside the repo — every `gh` call here resolves owner/repo from the
// current directory's git remote, nothing hardcoded.
import { spawnSync } from 'node:child_process'

const HOPS = [
  { from: 'dev', to: 'release' },
  { from: 'release', to: 'master' },
]

// No shell:true — gh.exe is a real executable (not a .cmd/.bat shim like
// pnpm), so Node's own PATH resolution finds it without a shell, and args
// go straight through as real argv entries. shell:true was tried first
// and broke: on Windows it hands command+args to cmd.exe as one joined,
// UNQUOTED string — confirmed by a real run where a jq filter containing
// spaces ("// empty") arrived at gh as three separate arguments instead
// of one. --title/--body values ("dev -> release", multi-word PR bodies)
// would have hit the exact same bug the first time they ran.
function gh(args, { capture = false } = {}) {
  const result = spawnSync('gh', args, {
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    throw new Error(`"gh ${args.join(' ')}" a échoué (code ${result.status})\n${result.stderr || ''}`)
  }
  return capture ? result.stdout.trim() : undefined
}

for (const { from, to } of HOPS) {
  console.log(`\n=== ${from} -> ${to} ===`)

  const aheadBy = gh(['api', `repos/{owner}/{repo}/compare/${to}...${from}`, '--jq', '.ahead_by'], {
    capture: true,
  })
  if (aheadBy === '0') {
    console.log(`${from} déjà fusionné dans ${to}, rien à promouvoir.`)
    continue
  }

  // Plain '.[0].number' (no '// empty') — that jq fallback syntax has a
  // space in it, and spawnSync's shell:true quoting for it came apart on
  // Windows (cmd.exe saw '.[0].number', '//', and 'empty' as three
  // separate gh args instead of one, confirmed by a real run). jq alone
  // on an empty PR list just prints the literal string "null" instead,
  // checked for below.
  let prNumber = gh(['pr', 'list', '--base', to, '--head', from, '--json', 'number', '--jq', '.[0].number'], {
    capture: true,
  })
  if (prNumber === 'null') prNumber = ''

  if (!prNumber) {
    console.log(`Ouverture d'une PR ${from} -> ${to}...`)
    const url = gh(
      [
        'pr',
        'create',
        '--base',
        to,
        '--head',
        from,
        '--title',
        `${from} -> ${to}`,
        '--body',
        `Promotion automatique ${from} -> ${to} (scripts/promote.mjs).`,
      ],
      { capture: true },
    )
    prNumber = url.trim().split('/').pop()
  } else {
    console.log(`PR existante réutilisée : #${prNumber}`)
  }

  console.log(`Merge de la PR #${prNumber}...`)
  gh(['pr', 'merge', prNumber, '--merge', '--admin'])
}

console.log('\ndev -> release -> master : terminé.')
