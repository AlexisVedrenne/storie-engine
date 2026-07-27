<template>
  <div class="effects-builder">
    <div class="section-title">Flags</div>
    <div v-for="(row, i) in flagRows" :key="i" class="row">
      <q-input dense outlined class="key-input" v-model="row.key" label="Flag" @update:model-value="sync" />
      <q-select
        dense
        outlined
        class="mode-select"
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
      <q-btn dense flat round icon="close" size="sm" @click="removeFlagRow(i)" />
    </div>
    <q-btn dense flat icon="add" label="Ajouter un flag" @click="addFlagRow" />

    <q-expansion-item dense-toggle label="Météo" v-model="sections.weather" @update:model-value="sync">
      <div class="grid">
        <q-input dense outlined label="Ville" v-model="weather.city" @update:model-value="sync" />
        <q-input dense outlined type="number" label="Température" v-model.number="weather.temp" @update:model-value="sync" />
        <q-input dense outlined label="Condition" v-model="weather.condition" @update:model-value="sync" />
        <q-input dense outlined label="Icône (emoji)" v-model="weather.icon" @update:model-value="sync" />
        <q-input dense outlined label="Légende" v-model="weather.caption" @update:model-value="sync" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle label="Pas (steps)" v-model="sections.steps" @update:model-value="sync">
      <div class="grid">
        <q-input dense outlined type="number" label="Pas actuels" v-model.number="steps.value" @update:model-value="sync" />
        <q-input dense outlined type="number" label="Objectif" v-model.number="steps.goal" @update:model-value="sync" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle label="Batterie" v-model="sections.battery" @update:model-value="sync">
      <q-input dense outlined type="number" label="% batterie" v-model.number="battery.value" @update:model-value="sync" />
    </q-expansion-item>

    <q-expansion-item dense-toggle label="Réseau" v-model="sections.network" @update:model-value="sync">
      <div class="grid">
        <q-input dense outlined type="number" label="Barres (0-4)" v-model.number="network.signal" @update:model-value="sync" />
        <q-toggle v-model="network.wifi" label="Wi-Fi" @update:model-value="sync" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle label="Horloge" v-model="sections.clock" @update:model-value="sync">
      <q-select
        dense
        outlined
        :options="CLOCK_MODES"
        v-model="clock.mode"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <q-input v-if="clock.mode === 'set'" dense outlined label="HH:MM" v-model="clock.value" @update:model-value="sync" />
    </q-expansion-item>

    <q-expansion-item dense-toggle label="Date" v-model="sections.date" @update:model-value="sync">
      <q-select
        dense
        outlined
        :options="CLOCK_MODES"
        v-model="date.mode"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <q-input v-if="date.mode === 'set'" dense outlined label="JJ/MM/AAAA" v-model="date.value" @update:model-value="sync" />
    </q-expansion-item>

    <div class="section-title">Social (abonnés/abonnements d'un contact)</div>
    <div v-for="(row, i) in socialRows" :key="i" class="row">
      <q-select
        dense
        outlined
        class="key-input"
        v-model="row.contactId"
        :options="contactOptions"
        emit-value
        map-options
        label="Contact"
        @update:model-value="sync"
      />
      <q-input dense outlined type="number" class="num-input" label="+abonnés" v-model.number="row.followers" @update:model-value="sync" />
      <q-input dense outlined type="number" class="num-input" label="+abonnements" v-model.number="row.following" @update:model-value="sync" />
      <q-btn dense flat round icon="close" size="sm" @click="removeSocialRow(i)" />
    </div>
    <q-btn dense flat icon="add" label="Ajouter" @click="addSocialRow" />

    <div class="section-title">Nouveaux abonnés (te suivent)</div>
    <q-select
      dense
      outlined
      multiple
      emit-value
      map-options
      :options="contactOptions"
      v-model="newFollowerIds"
      @update:model-value="sync"
    />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

// `effects: { flags?, weather?, steps?, stepsGoal?, battery?, network?,
// clock?, date?, social?, newFollower? }` — see NTR docs/story-engine.md
// section 6. Same "rebuild whole object on every change" approach as
// RequiresBuilder.vue, no reactive round-trip watcher.
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

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

const contactOptions = story.contactsList.map((c) => ({ label: c.name, value: c.id }))
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
const clock = reactive({ mode: initial.clock === null ? 'clear' : initial.clock ? 'set' : 'unset', value: initial.clock || '' })
const date = reactive({ mode: initial.date === null ? 'clear' : initial.date ? 'set' : 'unset', value: initial.date || '' })

const socialRows = reactive(
  Object.entries(initial.social || {}).map(([contactId, d]) =>
    reactive({ contactId, followers: d.followers, following: d.following }),
  ),
)
const newFollowerIds = ref(
  Array.isArray(initial.newFollower) ? [...initial.newFollower] : initial.newFollower ? [initial.newFollower] : [],
)

function addFlagRow() {
  flagRows.push(reactive({ key: '', mode: 'delta', delta: 1 }))
}
function removeFlagRow(i) {
  flagRows.splice(i, 1)
  sync()
}
function addSocialRow() {
  socialRows.push(reactive({ contactId: contactOptions[0]?.value || '', followers: 0, following: 0 }))
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
    const w = {};
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
  gap: 6px;
}

.section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
  margin-top: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-input {
  flex: 1;
  min-width: 120px;
}

.mode-select {
  width: 170px;
}

.num-input {
  width: 100px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px 4px;
}
</style>
