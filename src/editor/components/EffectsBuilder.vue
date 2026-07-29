<template>
  <div class="effects-builder">
    <p class="intro">
      Modifie l'état du jeu quand cette entrée se joue — rien n'est montré au joueur, contrairement
      à un message ou une story. Toutes les sections ci-dessous sont optionnelles.
    </p>

    <div class="section-title">
      Stats du joueur (flags)
      <FieldHelp
        text="Un flag est une valeur mémorisée (nombre qui s'accumule, ou vrai/faux ponctuel) — relis-la plus tard via une Condition (requires) pour faire varier l'histoire."
      />
    </div>
    <div v-if="!flagRows.length" class="empty-hint">Aucune stat modifiée.</div>
    <div v-for="(row, i) in flagRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeFlagRow(i)">
        <q-tooltip>Retirer</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <FlagNameField v-model="row.key" @update:model-value="sync" />
        <q-select
          dense
          outlined
          class="mode-select"
          label="Action"
          v-model="row.mode"
          :options="FLAG_EFFECT_MODES"
          emit-value
          map-options
          @update:model-value="sync"
        />
        <q-input
          v-if="row.mode === 'delta'"
          dense
          outlined
          type="number"
          class="num-input"
          label="+/-"
          v-model.number="row.delta"
          @update:model-value="sync"
        />
      </div>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      label="Ajouter une stat à modifier"
      class="btn-ghost"
      @click="addFlagRow"
    />

    <div class="section-title top-gap">Widgets du téléphone</div>

    <q-expansion-item
      dense-toggle
      label="Météo"
      caption="Change le widget météo de l'écran d'accueil"
      v-model="sections.weather"
      @update:model-value="sync"
    >
      <div class="grid">
        <q-input dense outlined label="Ville" v-model="weather.city" @update:model-value="sync" />
        <q-input
          dense
          outlined
          type="number"
          label="Température"
          v-model.number="weather.temp"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          label="Condition"
          v-model="weather.condition"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          label="Icône (emoji)"
          v-model="weather.icon"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          label="Légende"
          v-model="weather.caption"
          @update:model-value="sync"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      label="Pas (steps)"
      caption="Widget podomètre de l'écran d'accueil"
      v-model="sections.steps"
      @update:model-value="sync"
    >
      <div class="grid">
        <q-input
          dense
          outlined
          type="number"
          label="Pas actuels"
          v-model.number="steps.value"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          type="number"
          label="Objectif"
          v-model.number="steps.goal"
          @update:model-value="sync"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      label="Batterie"
      caption="Fixe le % affiché — utile pour une tension narrative (batterie qui se vide)"
      v-model="sections.battery"
      @update:model-value="sync"
    >
      <q-input
        dense
        outlined
        type="number"
        label="% batterie"
        v-model.number="battery.value"
        @update:model-value="sync"
      />
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      label="Réseau"
      caption="Barres de réseau + Wi-Fi affichés dans la barre de statut"
      v-model="sections.network"
      @update:model-value="sync"
    >
      <div class="grid">
        <q-input
          dense
          outlined
          type="number"
          label="Barres (0-4)"
          v-model.number="network.signal"
          @update:model-value="sync"
        />
        <q-toggle v-model="network.wifi" label="Wi-Fi" @update:model-value="sync" />
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      label="Horloge"
      caption="Fige l'heure affichée (verrouillage, barre de statut) au lieu de l'heure réelle"
      v-model="sections.clock"
      @update:model-value="sync"
    >
      <q-select
        dense
        outlined
        :options="CLOCK_MODES"
        v-model="clock.mode"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <q-input
        v-if="clock.mode === 'set'"
        dense
        outlined
        label="HH:MM"
        v-model="clock.value"
        @update:model-value="sync"
      />
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      label="Date"
      caption="Fige la date affichée au lieu de la date réelle"
      v-model="sections.date"
      @update:model-value="sync"
    >
      <q-select
        dense
        outlined
        :options="CLOCK_MODES"
        v-model="date.mode"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <q-input
        v-if="date.mode === 'set'"
        dense
        outlined
        label="JJ/MM/AAAA"
        v-model="date.value"
        @update:model-value="sync"
      />
    </q-expansion-item>

    <div class="section-title top-gap">
      Réseau social (Pixly)
      <FieldHelp
        text="Fait varier le nombre d'abonnés/abonnements affiché sur le profil d'un personnage."
      />
    </div>
    <div v-if="!socialRows.length" class="empty-hint">Aucun changement d'abonnés.</div>
    <div v-for="(row, i) in socialRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeSocialRow(i)">
        <q-tooltip>Retirer</q-tooltip>
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
        <q-input
          dense
          outlined
          type="number"
          class="num-input"
          label="+abonnés"
          v-model.number="row.followers"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          type="number"
          class="num-input"
          label="+abonnements"
          v-model.number="row.following"
          @update:model-value="sync"
        />
      </div>
    </div>
    <q-btn dense flat no-caps icon="add" label="Ajouter" class="btn-ghost" @click="addSocialRow" />

    <div class="section-title top-gap">
      Nouveaux abonnés
      <FieldHelp
        text="Ces personnages se mettent à suivre le joueur — déclenche une notification 'a commencé à te suivre'."
      />
    </div>
    <q-select
      dense
      outlined
      multiple
      emit-value
      map-options
      placeholder="Aucun"
      :options="contactOptions"
      v-model="newFollowerIds"
      @update:model-value="sync"
    >
      <template #selected-item="scope">
        <q-chip dense removable @remove="scope.removeAtIndex(scope.index)">
          <span class="chip-dot" :style="{ background: contactColor(scope.opt.value) }" />
          {{ scope.opt.label }}
        </q-chip>
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
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import FlagNameField from '@/editor/components/FlagNameField.vue'

// `effects: { flags?, weather?, steps?, stepsGoal?, battery?, network?,
// clock?, date?, social?, newFollower? }` — see NTR docs/story-engine.md
// section 6. Same "rebuild whole object on every change" approach as
// RequiresBuilder.vue, no reactive round-trip watcher.
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const FLAG_EFFECT_MODES = [
  { label: 'ajoute/retire (nombre)', value: 'delta' },
  { label: 'passe à vrai', value: 'true' },
  { label: 'passe à faux', value: 'false' },
]
const CLOCK_MODES = [
  { label: 'ne pas toucher', value: 'unset' },
  { label: 'fixer à…', value: 'set' },
  { label: 'libérer (revenir à l’heure réelle)', value: 'clear' },
]

const { contactOptions, contactColor, contactLabel } = useContactOptions()
const initial = props.modelValue || {}

const flagRows = reactive(
  Object.entries(initial.flags || {}).map(([key, v]) =>
    reactive(
      typeof v === 'boolean'
        ? { key, mode: v ? 'true' : 'false', delta: 0 }
        : { key, mode: 'delta', delta: v },
    ),
  ),
)

const sections = reactive({
  weather: Boolean(initial.weather),
  steps: initial.steps !== undefined || initial.stepsGoal !== undefined,
  battery: initial.battery !== undefined,
  network: Boolean(initial.network),
  clock: 'clock' in initial,
  date: 'date' in initial,
})

const weather = reactive({ ...initial.weather })
const steps = reactive({ value: initial.steps, goal: initial.stepsGoal })
const battery = reactive({ value: initial.battery })
const network = reactive({ signal: initial.network?.signal, wifi: initial.network?.wifi ?? true })
const clock = reactive({
  mode: initial.clock === null ? 'clear' : initial.clock ? 'set' : 'unset',
  value: initial.clock || '',
})
const date = reactive({
  mode: initial.date === null ? 'clear' : initial.date ? 'set' : 'unset',
  value: initial.date || '',
})

const socialRows = reactive(
  Object.entries(initial.social || {}).map(([contactId, d]) =>
    reactive({ contactId, followers: d.followers, following: d.following }),
  ),
)
const newFollowerIds = ref(
  Array.isArray(initial.newFollower)
    ? [...initial.newFollower]
    : initial.newFollower
      ? [initial.newFollower]
      : [],
)

function addFlagRow() {
  flagRows.push(reactive({ key: '', mode: 'delta', delta: 1 }))
}
function removeFlagRow(i) {
  flagRows.splice(i, 1)
  sync()
}
function addSocialRow() {
  socialRows.push(
    reactive({ contactId: contactOptions.value[0]?.value || '', followers: 0, following: 0 }),
  )
}
function removeSocialRow(i) {
  socialRows.splice(i, 1)
  sync()
}

function sync() {
  const effects = {}

  const flags = {}
  for (const row of flagRows) {
    if (!row.key) continue
    if (row.mode === 'true') flags[row.key] = true
    else if (row.mode === 'false') flags[row.key] = false
    else flags[row.key] = row.delta
  }
  if (Object.keys(flags).length) effects.flags = flags

  if (sections.weather) {
    const w = {}
    for (const k of ['city', 'temp', 'condition', 'icon', 'caption']) {
      if (weather[k] !== undefined && weather[k] !== '') w[k] = weather[k]
    }
    if (Object.keys(w).length) effects.weather = w
  }
  if (sections.steps) {
    if (steps.value !== undefined && steps.value !== null) effects.steps = steps.value
    if (steps.goal !== undefined && steps.goal !== null) effects.stepsGoal = steps.goal
  }
  if (sections.battery && battery.value !== undefined && battery.value !== null) {
    effects.battery = battery.value
  }
  if (sections.network) {
    const n = {}
    if (network.signal !== undefined && network.signal !== null) n.signal = network.signal
    if (network.wifi !== undefined) n.wifi = network.wifi
    if (Object.keys(n).length) effects.network = n
  }
  if (sections.clock) {
    effects.clock = clock.mode === 'clear' ? null : clock.mode === 'set' ? clock.value : undefined
    if (effects.clock === undefined) delete effects.clock
  }
  if (sections.date) {
    effects.date = date.mode === 'clear' ? null : date.mode === 'set' ? date.value : undefined
    if (effects.date === undefined) delete effects.date
  }

  const social = {}
  for (const row of socialRows) {
    if (!row.contactId) continue
    const d = {}
    if (row.followers) d.followers = row.followers
    if (row.following) d.following = row.following
    if (Object.keys(d).length) social[row.contactId] = d
  }
  if (Object.keys(social).length) effects.social = social

  if (newFollowerIds.value.length === 1) effects.newFollower = newFollowerIds.value[0]
  else if (newFollowerIds.value.length > 1) effects.newFollower = [...newFollowerIds.value]

  emit('update:modelValue', Object.keys(effects).length ? effects : undefined)
}
</script>

<style scoped>
.effects-builder {
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

.section-title.top-gap {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
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

.option-dot,
.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.mode-select {
  flex: 0 0 170px;
}

.num-input {
  flex: 0 0 100px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  padding: var(--space-2) var(--space-1);
}
</style>
