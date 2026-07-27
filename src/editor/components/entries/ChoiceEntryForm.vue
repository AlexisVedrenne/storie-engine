<template>
  <div class="entry-form">
    <div class="row">
      <q-btn-toggle
        dense
        :model-value="target.mode"
        :options="[
          { label: 'SMS (contact)', value: 'contact' },
          { label: 'DM Insta (thread)', value: 'thread' },
        ]"
        @update:model-value="setMode"
      />
      <q-select
        v-if="target.mode === 'contact'"
        dense
        outlined
        emit-value
        map-options
        class="target-select"
        label="Contact"
        :options="contactOptions"
        v-model="entry.contact"
      />
      <q-select
        v-else
        dense
        outlined
        emit-value
        map-options
        class="target-select"
        label="Thread"
        :options="threadOptions"
        v-model="entry.thread"
      />
    </div>

    <q-input dense outlined label="Prompt" v-model="entry.prompt" />

    <div class="section-title">Options de réponse</div>
    <q-expansion-item
      v-for="(option, i) in entry.options"
      :key="i"
      class="option-card"
      :label="option.text || '(texte vide)'"
    >
      <template #header>
        <q-item-section>{{ option.text || '(texte vide)' }}</q-item-section>
        <q-item-section side>
          <q-btn dense flat round icon="close" size="sm" @click.stop="removeOption(i)" />
        </q-item-section>
      </template>

      <div class="option-body">
        <q-input dense outlined label="Texte de l'option" v-model="option.text" />

        <div class="sub-title">Condition (requires, optionnel)</div>
        <RequiresBuilder :model-value="option.requires" @update:model-value="(v) => (option.requires = v)" />

        <div class="sub-title">Effets (optionnel)</div>
        <EffectsBuilder :model-value="option.effects" @update:model-value="(v) => (option.effects = v)" />

        <div class="sub-title">Réaction immédiate (then)</div>
        <TimelineEditor :entries="ensureThen(option)" />
      </div>
    </q-expansion-item>
    <q-btn dense flat icon="add" label="Ajouter une option" @click="addOption" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'

const props = defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()

const contactOptions = story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: c.name, value: c.id }))
const threadOptions = computed(() => {
  const groups = (story.project?.threads || []).map((t) => ({ label: `${t.name} (groupe)`, value: t.id }))
  const oneToOne = story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: `${c.name} (1:1)`, value: c.id }))
  return [...groups, ...oneToOne]
})

const target = computed(() => ({ mode: props.entry.thread ? 'thread' : 'contact' }))

function setMode(mode) {
  if (mode === 'contact') {
    props.entry.thread = undefined
    if (!props.entry.contact) props.entry.contact = contactOptions[0]?.value
  } else {
    props.entry.contact = undefined
    if (!props.entry.thread) props.entry.thread = threadOptions.value[0]?.value
  }
}

function ensureThen(option) {
  if (!option.then) option.then = []
  return option.then
}

function addOption() {
  if (!props.entry.options) props.entry.options = []
  props.entry.options.push({ text: '', then: [] })
}
function removeOption(i) {
  props.entry.options.splice(i, 1)
}
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.target-select {
  flex: 1;
}

.section-title,
.sub-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
  margin-top: 4px;
}

.option-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.option-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}
</style>
