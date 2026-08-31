// "Test as player" mode (pilier 07) — generates fake entity instances/
// collection entries for whatever a custom app's blocks actually reference,
// so an author can preview a `list`/`schedule`/`ledger` block without first
// playing through whichever chapter would normally populate real data (or
// authoring `schema.seed` rows by hand just to check a layout).
//
// Reuses collectScreenVariables.js (built for the live variable inspector)
// to find which entity schemas / flag collections are actually touched,
// rather than re-deriving that from the block tree a second time.
import { collectScreenVariables } from '@/engine/customApps/collectScreenVariables'

const TEST_INSTANCE_COUNT = 3
const TEST_LEDGER_ROWS = 5
const PLACEHOLDER_LABELS = ['Alpha', 'Bêta', 'Gamma']

function fakeFieldValue(field, index, contacts) {
  if (field.type === 'number') return (index + 1) * 10
  if (field.type === 'boolean') return index % 2 === 0
  if (field.type === 'ref:contact') return contacts?.[index % (contacts.length || 1)]?.id || ''
  // schedule/ref:entity are structured data a single fake value can't fake
  // meaningfully — left empty, same "absent = no matching data" spirit
  // every other block here already has for a field with nothing set.
  if (field.type === 'schedule' || field.type === 'ref:entity')
    return field.type === 'schedule' ? [] : ''
  return `${field.label || field.key} ${PLACEHOLDER_LABELS[index] || index + 1}`
}

// Returns `{ entities, flagCollections }`, both keyed the same way
// `story.entities`/`story.flagCollections` already are — the caller merges
// them into the live preview's own state (see EditorPage.vue's
// `toggleTestMode`), it's never written back to the project itself.
export function generateTestData(app, gameConfig, contacts) {
  const allBlocks = (app?.screens || []).flatMap((s) => s.blocks || [])
  const referenced = collectScreenVariables(allBlocks)

  const schemaIds = new Set(referenced.filter((v) => v.kind === 'entity').map((v) => v.schemaId))
  const collectionKeys = new Set(
    referenced.filter((v) => v.kind === 'collection').map((v) => v.key),
  )

  const entities = {}
  for (const schemaId of schemaIds) {
    const schema = gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
    if (!schema) continue
    const instances = {}
    for (let i = 0; i < TEST_INSTANCE_COUNT; i++) {
      const fields = {}
      for (const field of schema.fields || []) {
        fields[field.key] = fakeFieldValue(field, i, contacts)
      }
      instances[`test-${schemaId}-${i + 1}`] = fields
    }
    entities[schemaId] = instances
  }

  const flagCollections = {}
  for (const key of collectionKeys) {
    const entries = {}
    for (let i = 0; i < TEST_LEDGER_ROWS; i++) {
      entries[`test-${i + 1}`] = (i + 1) * 10 + Math.floor(Math.random() * 9)
    }
    flagCollections[key] = entries
  }

  return { entities, flagCollections }
}
