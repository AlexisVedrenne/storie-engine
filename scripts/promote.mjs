// Interactive menu for promoting a branch through this repo's protected
// flow (current branch -> dev -> release -> master). Every hop needs a
// pull request (direct pushes are rejected — see the "GH013: Repository
// rule violations" errors that motivated this script), merged with admin
// bypass since `enforce_admins` still applies review requirements to
// everyone EXCEPT the repo admin bypass actor (see the release PR's own
// discussion for the full story).
//
// Usage: node scripts/promote.mjs
// Picks a hop from a menu, runs it, asks again — loops until you choose
// "Quitter" or Ctrl+C.
//
// Requires: GitHub CLI (`gh`) installed and authenticated. Run from
// inside the repo — every `gh` call here resolves owner/repo from the
// current directory's git remote, nothing hardcoded.
import { spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

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

function currentBranch() {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf-8' })
  return result.stdout.trim()
}

function promote(from, to) {
  console.log(`\n=== ${from} -> ${to} ===`)

  if (from === to) {
    console.log(`Tu es déjà sur ${to}, rien à promouvoir.`)
    return
  }

  const aheadBy = gh(['api', `repos/{owner}/{repo}/compare/${to}...${from}`, '--jq', '.ahead_by'], {
    capture: true,
  })
  if (aheadBy === '0') {
    console.log(`${from} déjà fusionné dans ${to}, rien à promouvoir.`)
    return
  }

  // Plain '.[0].number' — jq on an empty PR list prints the literal
  // string "null", checked for below.
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
  console.log(`${from} -> ${to} : fait.`)
}

const rl = readline.createInterface({ input: stdin, output: stdout })

async function menu() {
  // Read fresh every loop — after promoting current-branch -> dev, a
  // later 'git checkout' by the user (outside this script) shouldn't
  // require restarting it to pick that up.
  const branch = currentBranch()
  console.log(`\nBranche actuelle : ${branch}`)
  console.log(`  1) ${branch} -> dev`)
  console.log('  2) dev -> release')
  console.log('  3) release -> master')
  console.log('  4) Quitter')
  const answer = (await rl.question('Choix : ')).trim()

  switch (answer) {
    case '1':
      promote(branch, 'dev')
      break
    case '2':
      promote('dev', 'release')
      break
    case '3':
      promote('release', 'master')
      break
    case '4':
      rl.close()
      console.log('À plus.')
      return
    default:
      console.log('Choix invalide, réessaie (1-4).')
  }

  await menu()
}

await menu()
