<template>
  <div class="requires-builder">
    <q-btn
      v-if="!revealed"
      dense
      flat
      no-caps
      icon="add"
      label="Ajouter une condition"
      class="btn-ghost"
      @click="revealed = true"
    />

    <template v-else>
    <p class="intro">
      Toutes les conditions ci-dessous doivent être vraies pour que ce contenu apparaisse. Rien
      d'ajouté = toujours affiché.
    </p>

    <div class="section-title">
      Stats du joueur (flags)
      <FieldHelp
        text="Un flag est une valeur mémorisée par l'histoire (un nombre qui s'accumule, comme la confiance, ou un vrai/faux ponctuel) — posée ailleurs via un Effet, relue ici pour faire varier le contenu."
      />
    </div>
    <div v-if="!flagRows.length" class="empty-hint">Aucune condition de stat.</div>
    <div v-for="(row, i) in flagRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeFlagRow(i)">
        <q-tooltip>Retirer cette condition</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <FlagNameField v-model="row.key" @update:model-value="sync" />
        <q-select
          dense
          outlined
          class="mode-select"
          label="Condition"
          v-model="row.mode"
          :options="FLAG_MODES"
          emit-value
          map-options
          @update:model-value="sync"
        />
        <q-toggle v-if="row.mode === 'bool'" v-model="row.boolValue" label="vrai" @update:model-value="sync" />
        <q-input
          v-else-if="row.mode === 'exact'"
          dense
          outlined
          type="number"
          class="num-input"
          label="valeur"
          v-model.number="row.exactValue"
          @update:model-value="sync"
        />
        <q-input
          v-else-if="row.mode === 'min'"
          dense
          outlined
          type="number"
          class="num-input"
          label="min"
          v-model.number="row.min"
          @update:model-value="sync"
        />
        <q-input
          v-else-if="row.mode === 'max'"
          dense
          outlined
          type="number"
          class="num-input"
          label="max"
          v-model.number="row.max"
          @update:model-value="sync"
        />
        <template v-else-if="row.mode === 'range'">
          <q-input dense outlined type="number" class="num-input" label="min" v-model.number="row.min" @update:model-value="sync" />
          <q-input dense outlined type="number" class="num-input" label="max" v-model.number="row.max" @update:model-value="sync" />
        </template>
      </div>
    </div>
    <q-btn dense flat no-caps icon="add" label="Ajouter une condition de stat" class="btn-ghost" @click="addFlagRow" />

    <div class="section-title">
      Abonnements Pixly
      <FieldHelp
        text="Vérifie si le joueur suit (ou non) ce personnage sur Pixly au moment où l'histoire atteint cette entrée."
      />
    </div>
    <div v-if="!followingRows.length" class="empty-hint">Aucune condition d'abonnement.</div>
    <div v-for="(row, i) in followingRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeFollowingRow(i)">
        <q-tooltip>Retirer cette condition</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <q-select
          dense
          outlined
          class="key-input"
          v-model="row.contactId"
          :options="contactOptions"
          emit-value
          map-options
          label="Personnage"
          @update:model-value="sync"
        >
          <template #selected>
            <span class="selected-row">
              <span class="option-dot" :style="{ background: contactColor(row.contactId) }" />
              {{ contactLabel(row.contactId) }}
            </span>
          </template>
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <span class="option-dot" :style="{ background: contactColor(scope.opt.value) }" />
              </q-item-section>
              <q-item-section>{{ scope.opt.label }}</q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-toggle v-model="row.expected" label="le joueur le suit" @update:model-value="sync" />
      </div>
    </div>
    <q-btn dense flat no-caps icon="add" label="Ajouter une condition d'abonnement" class="btn-ghost" @click="addFollowingRow" />
    </template>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useContactOptions } from '@/editor/composables/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import FlagNameField from '@/editor/components/FlagNameField.vue'

// `requires: { flags?: { key: value|bool|{min}|{max}|{min,max} }, following?: { contactId: bool } } | null`
// See NTR docs/story-engine.md section 5. Edits build a fresh `requires`
// object on every change and assign it back via v-model — no reactive
// round-trip watcher needed since nothing re-derives rows after mount.
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const FLAG_MODES = [
  { label: 'vrai / faux', value: 'bool' },
  { label: 'est exactement…', value: 'exact' },
  { label: 'au moins…', value: 'min' },
  { label: 'au plus…', value: 'max' },
  { label: 'entre… et…', value: 'range' },
]

const { contactOptions, contactColor, contactLabel } = useContactOptions()

function flagRowFrom(key, expected) {
  if (typeof expected === 'boolean') return reactive({ key, mode: 'bool', boolValue: expected, exactValue: 0, min: 0, max: 0 })
  if (expected && typeof expected === 'object') {
    if ('min' in expected && 'max' in expected) return reactive({ key, mode: 'range', boolValue: true, exactValue: 0, min: expected.min, max: expected.max })
    if ('min' in expected) return reactive({ key, mode: 'min', boolValue: true, exactValue: 0, min: expected.min, max: 0 })
    if ('max' in expected) return reactive({ key, mode: 'max', boolValue: true, exactValue: 0, min: 0, max: expected.max })
  }
  return reactive({ key, mode: 'exact', boolValue: true, exactValue: expected ?? 0, min: 0, max: 0 })
}

const flagRows = reactive(
  Object.entries(props.modelValue?.flags || {}).map(([key, expected]) => flagRowFrom(key, expected)),
)
const followingRows = reactive(
  Object.entries(props.modelValue?.following || {}).map(([contactId, expected]) => reactive({ contactId, expected })),
)

// Collapsed behind a single "+ Ajouter une condition" row when there's
// nothing set yet — RequiresBuilder renders at 3 nesting levels (chapter,
// every timeline entry, every choice option, see docs/ui-ux-audit.md point
// 3) and the full intro+2-sections form is ~15 lines of empty boilerplate
// repeated at each one. Stays revealed once true (including after the user
// removes their last row mid-edit) so it never collapses out from under
// them while they're actively working in it.
const revealed = ref(flagRows.length > 0 || followingRows.length > 0)

function addFlagRow() {
  flagRows.push(reactive({ key: '', mode: 'bool', boolValue: true, exactValue: 0, min: 0, max: 0 }))
}
function removeFlagRow(i) {
  flagRows.splice(i, 1)
  sync()
}
function addFollowingRow() {
  followingRows.push(reactive({ contactId: contactOptions.value[0]?.value || '', expected: true }))
}
function removeFollowingRow(i) {
  followingRows.splice(i, 1)
  sync()
}

function sync() {
  const flags = {}
  for (const row of flagRows) {
    if (!row.key) continue
    if (row.mode === 'bool') flags[row.key] = row.boolValue
    else if (row.mode === 'exact') flags[row.key] = row.exactValue
    else if (row.mode === 'min') flags[row.key] = { min: row.min }
    else if (row.mode === 'max') flags[row.key] = { max: row.max }
    else if (row.mode === 'range') flags[row.key] = { min: row.min, max: row.max }
  }
  const following = {}
  for (const row of followingRows) {
    if (!row.contactId) continue
    following[row.contactId] = row.expected
  }
  const hasFlags = Object.keys(flags).length > 0
  const hasFollowing = Object.keys(following).length > 0
  if (!hasFlags && !hasFollowing) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', {
    ...(hasFlags ? { flags } : {}),
    ...(hasFollowing ? { following } : {}),
  })
}
</script>

<style scoped>
.requires-builder {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.intro {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: var(--space-2);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.row-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  padding-right: var(--space-6);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.row-fields {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.row-remove {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
}

.key-input {
  flex: 1 1 160px;
  min-width: 140px;
}

.selected-row {
  display: inline-flex;
  align-items: center;
}

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.mode-select {
  flex: 0 0 150px;
}

.num-input {
  flex: 0 0 90px;
}
</style>
