<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Contact (appelant)" :options="contactOptions" v-model="entry.contact" />

    <div class="section-title">Script de l'appel</div>
    <div v-for="(line, i) in scriptRows" :key="i" class="row">
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="from-select"
        :options="fromOptions"
        v-model="line.from"
        @update:model-value="sync"
      />
      <q-input dense outlined class="text-input" v-model="line.text" @update:model-value="sync" />
      <q-btn dense flat round icon="close" size="sm" @click="removeLine(i)" />
    </div>
    <q-btn dense flat icon="add" label="Ajouter une réplique" @click="addLine" />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

const props = defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()
const contactOptions = story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: c.name, value: c.id }))
const fromOptions = [{ label: 'Moi', value: 'me' }, ...contactOptions]

const scriptRows = reactive((props.entry.script || []).map((l) => reactive({ ...l })))

function addLine() {
  scriptRows.push(reactive({ from: 'me', text: '' }))
  sync()
}
function removeLine(i) {
  scriptRows.splice(i, 1)
  sync()
}
function sync() {
  props.entry.script = scriptRows.map((l) => ({ from: l.from, text: l.text }))
}
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.from-select {
  width: 140px;
}

.text-input {
  flex: 1;
}
</style>
